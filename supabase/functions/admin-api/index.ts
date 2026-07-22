import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { computeConfigDiff, normalizeBivvoConfig, quoteBivvo } from "../_shared/bivvo-logic.ts";



function slugify(str: string): string {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function verifyAdmin(supabase: any, authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) throw new Error('Não autenticado');
  const { data: role } = await supabase
    .from('user_roles').select('role')
    .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role) throw new Error('Acesso negado');
  return user;
}

async function logAction(supabase: any, user: any, action: string, tableName?: string, recordId?: string, oldData?: any, newData?: any) {
  try {
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData
    });
  } catch (e) {
    console.error('Audit Log Error:', e);
  }
}

const BIVVO_STATUS_CACHE_MS = 5 * 60 * 1000; // 5 min

async function refreshBivvoStatuses(supabase: any, userMap: Map<string, any>) {
  // Load Bivvo API token once
  const { data: secret } = await supabase
    .from('admin_secrets').select('value').eq('key', 'bivvo_api_token').maybeSingle();
  const rawToken = (secret as any)?.value?.trim();
  const auth = rawToken
    ? (rawToken.toLowerCase().startsWith('bearer ') ? rawToken : `Bearer ${rawToken}`)
    : null;

  const now = Date.now();
  const entries = Array.from(userMap.entries());

  await Promise.all(entries.map(async ([key, u]: [string, any]) => {
    if (!u || !u.id) {
      console.warn('[Bivvo] skip: user sem id', key);
      return;
    }

    const persist = async (newStatus: string, extra: Record<string, any> = {}) => {
      const payload: Record<string, any> = {
        bivvo_status: newStatus,
        bivvo_status_checked_at: new Date().toISOString(),
        ...extra,
      };
      const { error: upErr } = await supabase.from('users').update(payload).eq('id', u.id);
      if (upErr) {
        console.error(`[Bivvo] falha ao atualizar users.id=${u.id}:`, upErr.message);
      } else {
        console.log(`[Bivvo] persist user=${u.id} status=${newStatus}`, Object.keys(extra));
      }
      u.bivvo_status = newStatus;
    };


    // No tenant assigned → status "Inserir ID"
    if (!u.bivvo_tenant_id || String(u.bivvo_tenant_id).trim() === '') {
      await persist('Inserir ID');
      return;
    }

    if (!auth) {
      console.warn('[Bivvo] token não configurado — pulando consulta e mantendo status');
      await persist('Erro API');
      return;
    }

    const parsedId = Number(String(u.bivvo_tenant_id).trim());
    if (!Number.isFinite(parsedId)) {
      await persist('ID inválido');
      return;
    }

    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      console.log(`[Bivvo] check user=${u.id} tenant_id=${parsedId}`);
      const res = await fetch('https://adm.bivvo.com.br/tenantApiShowTenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': auth },
        body: JSON.stringify({ id: parsedId }),
        signal: ctrl.signal,
      });
      clearTimeout(to);
      const ct = res.headers.get('content-type') || '';
      const raw = ct.includes('application/json') ? await res.json() : await res.text();
      console.log(`[Bivvo] resp user=${u.id} tenant=${parsedId} http=${res.status} body=`, typeof raw === 'string' ? raw.slice(0,500) : JSON.stringify(raw).slice(0,500));

      let newStatus = 'Não possui Tenant';
      const extra: Record<string, any> = {};
      if (res.ok && typeof raw === 'object' && raw !== null) {
        // A API Bivvo devolve { tenant: [ { id, status, name, identity, ... } ] }
        let tenant: any = (raw as any).tenant ?? (raw as any).data?.tenant ?? (raw as any).data ?? raw;
        if (Array.isArray(tenant)) tenant = tenant[0];
        const st = String(tenant?.status ?? '').toLowerCase().trim();
        if (st === 'active') newStatus = 'active';
        else if (st === 'inactive') newStatus = 'inactive';
        else if (tenant && (tenant.id || tenant.name)) newStatus = st || 'inactive';
        else newStatus = 'Não possui Tenant';

        // Hidrata CPF/CNPJ do tenant remoto quando não existir localmente (clientes legados)
        const remoteIdentity = String(tenant?.identity ?? tenant?.cpfCnpj ?? '').replace(/\D/g, '');
        if (remoteIdentity && !String(u.cpf ?? '').replace(/\D/g, '')) {
          extra.cpf = remoteIdentity;
        }
      } else if (res.status >= 500) {
        newStatus = 'Erro API';
      }

      await persist(newStatus, extra);

    } catch (e) {
      console.error('[Bivvo] check failed user', u.id, 'tenant', parsedId, e);
      await persist('Erro API');
    }
  }));
}

async function enrichCustomers(supabase: any, customerIds: string[], ASAAS_BASE_URL: string, ASAAS_API_KEY: string) {
  if (customerIds.length === 0) return new Map();

  // 1. Try local DB first (rico: pega bivvo_tenant_id + contatos já salvos)
  const { data: localUsers } = await supabase
    .from('users')
    .select('id, name, email, whatsapp, cpf, asaas_customer_id, bivvo_tenant_id, status, bivvo_status, bivvo_status_checked_at')
    .in('asaas_customer_id', customerIds);

  const userMap = new Map(localUsers?.map((u: any) => [u.asaas_customer_id, u]) || []);
  const missingIds = customerIds.filter(id => !userMap.has(id));

  // 2. Fetch missing from Asaas e persistir em `users` (sem duplicar)
  if (missingIds.length > 0) {
    console.log(`Buscando ${missingIds.length} clientes no Asaas:`, missingIds);
    const fetched = await Promise.all(missingIds.map(async (id) => {
      try {
        const cleanId = id.trim();
        const url = `${ASAAS_BASE_URL}/customers/${cleanId}`;
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json',
            'User-Agent': 'BivvoAdmin/1.0'
          }
        });

        if (res.ok) {
          const c = await res.json();
          return {
            asaas_customer_id: id,
            name: c.name || 'Sem nome',
            email: c.email || '',
            whatsapp: c.mobilePhone || c.phone || '',
            cpf: c.cpfCnpj || '',
          };
        } else {
          const status = res.status;
          const text = await res.text();
          console.error(`Erro Asaas (Status ${status}) para ${id}: ${text}`);
          if (status === 404) {
            return { asaas_customer_id: id, name: 'Cliente não encontrado', email: '' };
          }
        }
      } catch (e) {
        console.error(`Exceção ao buscar cliente ${id}:`, e);
      }
      return { asaas_customer_id: id, name: 'Erro na API Asaas', email: '' };
    }));

    // Persistir no banco (sem duplicidade). Se já existe email igual, apenas atualiza asaas_customer_id.
    for (const u of fetched) {
      if (!u.email || u.name === 'Cliente não encontrado' || u.name === 'Erro na API Asaas') {
        userMap.set(u.asaas_customer_id, u);
        continue;
      }
      try {
        // 1) Se já existe por asaas_customer_id, NÃO sobrescreve contato — apenas usa o que está local
        const { data: byAsaas } = await supabase
          .from('users').select('id').eq('asaas_customer_id', u.asaas_customer_id).maybeSingle();

        if (!byAsaas) {
          // 2) Tenta pelo email (upgrade do registro existente): só vincula o asaas_customer_id, sem tocar contato
          const { data: byEmail } = await supabase
            .from('users').select('id').eq('email', u.email).maybeSingle();

          if (byEmail) {
            await supabase.from('users').update({
              asaas_customer_id: u.asaas_customer_id,
            }).eq('id', byEmail.id);
          } else {
            // 3) Cria novo (sem duplicar) — preenche contato apenas na criação
            await supabase.from('users').insert({
              name: u.name, email: u.email, whatsapp: u.whatsapp, cpf: u.cpf,
              asaas_customer_id: u.asaas_customer_id, status: 'active',
            });
          }
        }

        // Recarrega o registro completo do banco
        const { data: fresh } = await supabase
          .from('users')
          .select('id, name, email, whatsapp, cpf, asaas_customer_id, bivvo_tenant_id, status, bivvo_status, bivvo_status_checked_at')
          .eq('asaas_customer_id', u.asaas_customer_id).maybeSingle();
        userMap.set(u.asaas_customer_id, fresh || u);
      } catch (e) {
        console.error('Falha ao persistir cliente Asaas em users:', e);
        userMap.set(u.asaas_customer_id, u);
      }
    }
  }

  return userMap;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');
    const user = await verifyAdmin(supabase, authHeader);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'get-bivvo-token') {
      const { data } = await supabase
        .from('admin_secrets').select('value').eq('key', 'bivvo_api_token').maybeSingle();
      return new Response(JSON.stringify({ value: (data as any)?.value || '' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'save-bivvo-token' && req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const value = String(body?.value ?? '').trim();
      const { error } = await supabase
        .from('admin_secrets')
        .upsert({ key: 'bivvo_api_token', value }, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      await logAction(supabase, user, 'save-bivvo-token', 'admin_secrets', 'bivvo_api_token');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-subscriptions') {
      const offset = url.searchParams.get('offset') || '0';
      const limit = url.searchParams.get('limit') || '20';
      const status = url.searchParams.get('status') || '';
      const customer = url.searchParams.get('customer') || '';
      const billingType = url.searchParams.get('billingType') || '';
      const externalReference = url.searchParams.get('externalReference') || '';
      
      let asaasUrl = `${ASAAS_BASE_URL}/subscriptions?offset=${offset}&limit=${limit}`;
      if (status) asaasUrl += `&status=${status}`;
      if (customer) asaasUrl += `&customer=${customer}`;
      if (billingType) asaasUrl += `&billingType=${billingType}`;
      if (externalReference) asaasUrl += `&externalReference=${externalReference}`;
      
      const response = await fetch(asaasUrl, { headers: { 'access_token': ASAAS_API_KEY } });
      const result = await response.json();
      
      // Enrich with customer names
      if (result.data && result.data.length > 0) {
        const customerIds = [...new Set(result.data.map((s: any) => s.customer))].filter(Boolean) as string[];
        console.log(`Enriquecendo ${customerIds.length} clientes para assinaturas`);
        const userMap = await enrichCustomers(supabase, customerIds, ASAAS_BASE_URL, ASAAS_API_KEY);

        // Buscar pagamentos OVERDUE para determinar adimplência por assinatura/cliente
        const overdueSubs = new Set<string>();
        const overdueCustomers = new Set<string>();
        try {
          let od_offset = 0;
          const od_limit = 100;
          while (true) {
            const odRes = await fetch(`${ASAAS_BASE_URL}/payments?status=OVERDUE&limit=${od_limit}&offset=${od_offset}`, {
              headers: { 'access_token': ASAAS_API_KEY },
            });
            const odJson = await odRes.json();
            const items: any[] = odJson.data || [];
            for (const p of items) {
              if (p.deleted) continue;
              if (p.subscription) overdueSubs.add(p.subscription);
              if (p.customer) overdueCustomers.add(p.customer);
            }
            if (!odJson.hasMore || items.length < od_limit) break;
            od_offset += od_limit;
            if (od_offset > 1000) break;
          }
        } catch (e) {
          console.error('[list-subscriptions] Falha ao consultar OVERDUE:', e);
        }

        result.data = result.data.map((s: any) => {
          const userData: any = userMap.get(s.customer);
          const isOverdue = overdueSubs.has(s.id) || overdueCustomers.has(s.customer);
          return {
            ...s,
            customerName: userData?.name || 'Desconhecido',
            customerEmail: userData?.email || '',
            customerWhatsapp: userData?.whatsapp || '',
            customerCpf: userData?.cpf || '',
            tenantBivvo: userData?.bivvo_tenant_id || '',
            bivvoStatus: userData?.bivvo_status || (userData?.bivvo_tenant_id ? 'Não possui Tenant' : 'Inserir ID'),
            localUserId: userData?.id || null,
            paymentStatus: isOverdue ? 'inadimplente' : 'adimplente',
          };
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-subscription-payments') {
      const id = url.searchParams.get('id');
      if (!id) throw new Error('ID da assinatura é obrigatório');
      
      const asaasUrl = `${ASAAS_BASE_URL}/subscriptions/${id}/payments`;
      const response = await fetch(asaasUrl, { headers: { 'access_token': ASAAS_API_KEY } });
      const result = await response.json();
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'finance-stats') {
      const dateStart = url.searchParams.get('dateCreated[ge]');
      const dateEnd = url.searchParams.get('dateCreated[le]');

      // Cache in-memory por 60s
      const cacheKey = `${dateStart || ''}|${dateEnd || ''}`;
      // deno-lint-ignore no-explicit-any
      const g = globalThis as any;
      if (!g.__finance_cache) g.__finance_cache = new Map();
      const cached = g.__finance_cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 60_000) {
        return new Response(JSON.stringify(cached.data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const EXCLUDED_STATUSES = ['DELETED', 'REMOVED_BY_USER', 'CANCELLED', 'REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL'];
      const PAID_STATUSES = ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'];
      const CYCLE_TO_MONTHLY: Record<string, number> = {
        WEEKLY: 4.33, BIWEEKLY: 2.17, MONTHLY: 1,
        BIMONTHLY: 0.5, QUARTERLY: 1/3, SEMIANNUALLY: 1/6, YEARLY: 1/12,
      };

      const asaasHeaders = { 'access_token': ASAAS_API_KEY };
      const paginate = async (path: string, filterFn: (item: any) => boolean): Promise<any[]> => {
        const out: any[] = [];
        let offset = 0;
        const limit = 100;
        while (true) {
          const sep = path.includes('?') ? '&' : '?';
          const u = `${ASAAS_BASE_URL}${path}${sep}limit=${limit}&offset=${offset}`;
          const r = await fetch(u, { headers: asaasHeaders });
          const j = await r.json();
          for (const item of (j.data || [])) if (filterFn(item)) out.push(item);
          if (!j.hasMore || (j.data || []).length < limit) break;
          offset += limit;
          if (offset > 5000) break;
        }
        return out;
      };

      // Build previous range (mesmo tamanho, imediatamente anterior)
      let previousStart: string | null = null;
      let previousEnd: string | null = null;
      let rangeDays = 30;
      if (dateStart && dateEnd) {
        const s = new Date(dateStart);
        const e = new Date(dateEnd);
        rangeDays = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1);
        const prevEnd = new Date(s.getTime() - 86_400_000);
        const prevStart = new Date(prevEnd.getTime() - (rangeDays - 1) * 86_400_000);
        previousStart = prevStart.toISOString().slice(0, 10);
        previousEnd = prevEnd.toISOString().slice(0, 10);
      }

      const paymentDateFilter = (field: 'dateCreated' | 'paymentDate', ds: string | null, de: string | null) => {
        let q = '';
        if (ds) q += `&${field}[ge]=${ds}`;
        if (de) q += `&${field}[le]=${de}`;
        return q.replace(/^&/, '?');
      };

      const fetchPayments = async (ds: string | null, de: string | null) => {
        const [byCreated, byPayment] = await Promise.all([
          paginate(
            `/payments${paymentDateFilter('dateCreated', ds, de)}`,
            (p: any) => p.subscription && !p.deleted && !EXCLUDED_STATUSES.includes(p.status),
          ),
          (ds || de)
            ? paginate(
                `/payments${paymentDateFilter('paymentDate', ds, de)}`,
                (p: any) => p.subscription && !p.deleted && !EXCLUDED_STATUSES.includes(p.status),
              )
            : Promise.resolve([] as any[]),
        ]);
        const map = new Map<string, any>();
        for (const p of byCreated) map.set(p.id, p);
        for (const p of byPayment) map.set(p.id, p);
        return Array.from(map.values());
      };

      // Range do mês vigente (independente do filtro selecionado)
      const _now = new Date();
      const monthStart = new Date(_now.getFullYear(), _now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(_now.getFullYear(), _now.getMonth() + 1, 0).toISOString().slice(0, 10);

      // Todas as chamadas Asaas em paralelo (subs + payments atual + payments anterior + saldo + overdue)
      const [allSubs, paymentsCurrent, paymentsPrevious, bankBalance, overduePayments] = await Promise.all([
        paginate('/subscriptions', () => true),
        fetchPayments(dateStart, dateEnd),
        previousStart ? fetchPayments(previousStart, previousEnd) : Promise.resolve([] as any[]),
        (async () => {
          try {
            const r = await fetch(`${ASAAS_BASE_URL}/finance/balance`, { headers: asaasHeaders });
            const j = await r.json();
            return Number(j?.balance) || 0;
          } catch { return 0; }
        })(),
        paginate('/payments?status=OVERDUE', (p: any) => !p.deleted && p.status === 'OVERDUE'),
      ]);

      const overdueValue = overduePayments.reduce((a: number, p: any) => a + (Number(p.value) || 0), 0);
      const overdueCount = overduePayments.length;

      // Enriquecer inadimplentes com nome/email do cliente
      let overdueList: any[] = [];
      if (overduePayments.length > 0) {
        const ids = [...new Set(overduePayments.map((p: any) => p.customer))];
        const uMap = await enrichCustomers(supabase, ids, ASAAS_BASE_URL, ASAAS_API_KEY);
        overdueList = overduePayments.map((p: any) => ({
          id: p.id,
          value: p.value,
          dueDate: p.dueDate,
          billingType: p.billingType,
          customer: p.customer,
          customerName: uMap.get(p.customer)?.name || 'Desconhecido',
          customerEmail: uMap.get(p.customer)?.email || '',
        }));
      }

      // Enriquecer somente pagamentos do período atual (economia)
      let payments = paymentsCurrent;
      if (payments.length > 0) {
        const customerIds = [...new Set(payments.map((p: any) => p.customer))];
        const userMap = await enrichCustomers(supabase, customerIds, ASAAS_BASE_URL, ASAAS_API_KEY);
        payments = payments.map((p: any) => ({
          ...p,
          customerName: userMap.get(p.customer)?.name || 'Desconhecido',
          customerEmail: userMap.get(p.customer)?.email || '',
        }));
      }

      // Ativos hoje / MRR / ARPU (snapshot atual, comum a ambos)
      const activeSubs = allSubs.filter((s: any) => !s.deleted && s.status === 'ACTIVE');
      const activeSubsCount = activeSubs.length;
      const mrr = activeSubs.reduce((a: number, s: any) => a + (Number(s.value) || 0) * (CYCLE_TO_MONTHLY[s.cycle] ?? 1), 0);
      const arpu = activeSubsCount > 0 ? mrr / activeSubsCount : 0;

      // Despesas do período (atual + anterior) em paralelo
      const fetchExpenses = async (ds: string | null, de: string | null) => {
        let q = supabase.from('expenses').select('amount, category');
        if (ds) q = q.gte('date', ds);
        if (de) q = q.lte('date', de);
        const { data } = await q;
        return data || [];
      };
      const [expensesCurrent, expensesPrevious, expensesMonth] = await Promise.all([
        fetchExpenses(dateStart, dateEnd),
        previousStart ? fetchExpenses(previousStart, previousEnd) : Promise.resolve([]),
        fetchExpenses(monthStart, monthEnd),
      ]);
      const monthlyExpenses = expensesMonth.reduce((a: number, e: any) => a + Number(e.amount), 0);

      // Comissões pendentes (global)
      const { data: comms } = await supabase
        .from('affiliate_commissions')
        .select('commission_amount, created_at, status')
        .eq('status', 'pending');

      // Cálculo por período
      const computeRange = (
        pays: any[],
        exps: any[],
        ds: string | null,
        de: string | null,
        includeBankBalance: boolean,
      ) => {
        const paidPays = pays.filter((p: any) => PAID_STATUSES.includes(p.status));
        const paidValue = paidPays.reduce((a, p) => a + (Number(p.value) || 0), 0);
        const paidNetValue = paidPays.reduce((a, p) => a + (Number(p.netValue) || Number(p.value) || 0), 0);
        const totalValue = pays.reduce((a, p) => a + (Number(p.value) || 0), 0);

        // Churn do período: deletadas/inactive/expired com data de saída no intervalo.
        // Asaas marca canceladas como deleted=true; usamos nextDueDate (última cobrança
        // que não aconteceria) ou dateCreated como fallback para posicionar no tempo.
        const rs = ds ? new Date(ds).getTime() : 0;
        const re = de ? new Date(de).getTime() + 86_400_000 : Date.now();
        const churnedInPeriod = allSubs.filter((s: any) => {
          const churned = s.deleted === true || ['INACTIVE', 'EXPIRED'].includes(s.status);
          if (!churned) return false;
          const ref = s.nextDueDate || s.dateCreated;
          if (!ref) return false;
          const t = new Date(ref).getTime();
          return t >= rs && t <= re;
        }).length;
        const activeAtStart = activeSubsCount + churnedInPeriod;
        const periodChurn = activeAtStart > 0 ? churnedInPeriod / activeAtStart : 0;
        const days = ds && de
          ? Math.max(1, Math.round((new Date(de).getTime() - new Date(ds).getTime()) / 86_400_000) + 1)
          : 30;
        const monthlyChurn = periodChurn * (30 / days);
        const churnRate = monthlyChurn * 100;
        const ltv = monthlyChurn > 0 ? arpu / monthlyChurn : 0;

        const otherExpenses = exps.filter((e: any) => e.category !== 'Comissões (Afiliados)');
        const periodCommissions = exps.filter((e: any) => e.category === 'Comissões (Afiliados)');
        const totalExpenses = otherExpenses.reduce((a: number, e: any) => a + Number(e.amount), 0);
        const periodCommValue = periodCommissions.reduce((a: number, e: any) => a + Number(e.amount), 0);
        const freeCash = paidNetValue - (totalExpenses + periodCommValue);
        const pendingValue = totalValue - paidValue;
        // Projeção do mês: (Saldo Bancário + Recebido líq. + Pendente Asaas) − (Despesas + Comissões)
        const baseProjection = paidNetValue + pendingValue - totalExpenses - periodCommValue;
        const projection = includeBankBalance ? bankBalance + baseProjection : baseProjection;

        return {
          totalPayments: pays.length,
          paidCount: paidPays.length,
          totalValue,
          paidValue,
          paidNetValue,
          churnRate,
          ltv,
          totalExpenses,
          freeCash,
          projection,
        };
      };

      const current = computeRange(paymentsCurrent, expensesCurrent, dateStart, dateEnd, true);
      const previous = previousStart
        ? computeRange(paymentsPrevious, expensesPrevious, previousStart, previousEnd, false)
        : null;

      // Δ helpers
      const pctDelta = (curr: number, prev: number): number | null => {
        if (prev === 0) return curr === 0 ? 0 : null; // infinito → null
        return ((curr - prev) / Math.abs(prev)) * 100;
      };
      const ppDelta = (curr: number, prev: number) => curr - prev; // pontos percentuais

      const deltas = previous ? {
        paidValue: pctDelta(current.paidValue, previous.paidValue),
        paidNetValue: pctDelta(current.paidNetValue, previous.paidNetValue),
        paidCount: pctDelta(current.paidCount, previous.paidCount),
        totalValue: pctDelta(current.totalValue, previous.totalValue),
        freeCash: pctDelta(current.freeCash, previous.freeCash),
        projection: pctDelta(current.projection, previous.projection),
        churnRate: ppDelta(current.churnRate, previous.churnRate),
      } : null;

      // Conversão global
      const [{ count: totalClicks }, { count: totalSalesCount }] = await Promise.all([
        supabase.from('affiliate_clicks').select('*', { count: 'exact', head: true }),
        supabase.from('affiliate_sales').select('*', { count: 'exact', head: true }),
      ]);

      const stats: any = {
        ...current,
        activeSubscriptions: activeSubsCount,
        mrr,
        arpu,
        bankBalance,
        monthlyExpenses,
        overdueValue,
        overdueCount,
        conversionRate: totalClicks ? ((totalSalesCount || 0) / totalClicks * 100) : 0,
        totalClicks: totalClicks || 0,
        retainedCommissions: 0,
        pendingAffiliatePayout: 0,
        payments,
        overdueList,
        previous,
        deltas,
        previousRange: previousStart ? { start: previousStart, end: previousEnd } : null,
      };

      const now = new Date();
      (comms || []).forEach((c: any) => {
        const createdAt = new Date(c.created_at);
        const diffDays = Math.ceil((now.getTime() - createdAt.getTime()) / 86_400_000);
        if (diffDays <= 7) stats.retainedCommissions += Number(c.commission_amount);
        else stats.pendingAffiliatePayout += Number(c.commission_amount);
      });

      g.__finance_cache.set(cacheKey, { ts: Date.now(), data: stats });

      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }




    if (action === 'list-expenses') {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create-expense' && req.method === 'POST') {
      const body = await req.json();
      const { payment_method, installments_total, recurring_interval, date, ...rest } = body;
      
      if (payment_method === 'installments' && installments_total > 1) {
        // Create first one and get its ID to be the parent
        const { data: parent, error: pErr } = await supabase.from('expenses').insert({
          ...rest,
          date,
          payment_method,
          installments_total,
          installment_number: 1,
        }).select('id').single();
        
        if (pErr) throw pErr;
        
        const installments = [];
        const startDate = new Date(date);
        
        for (let i = 2; i <= installments_total; i++) {
          const nextDate = new Date(startDate);
          nextDate.setMonth(startDate.getMonth() + (i - 1));
          
          installments.push({
            ...rest,
            date: nextDate.toISOString(),
            payment_method,
            installments_total,
            installment_number: i,
            parent_id: parent.id
          });
        }
        
        const { error: iErr } = await supabase.from('expenses').insert(installments);
        if (iErr) throw iErr;
      } else if (payment_method === 'recurring') {
        // Create first one and get ID
        const { data: parent, error: pErr } = await supabase.from('expenses').insert({
          ...rest,
          date,
          payment_method,
          recurring_interval: recurring_interval || 'monthly',
        }).select('id').single();
        
        if (pErr) throw pErr;
        
        const recurrences = [];
        const startDate = new Date(date);
        
        // Project for 12 occurrences
        for (let i = 1; i < 12; i++) {
          const nextDate = new Date(startDate);
          if (recurring_interval === 'weekly') {
            nextDate.setDate(startDate.getDate() + (i * 7));
          } else if (recurring_interval === 'yearly') {
            nextDate.setFullYear(startDate.getFullYear() + i);
          } else {
            nextDate.setMonth(startDate.getMonth() + i);
          }
          
          recurrences.push({
            ...rest,
            date: nextDate.toISOString(),
            payment_method,
            recurring_interval,
            parent_id: parent.id
          });
        }
        
        const { error: rErr } = await supabase.from('expenses').insert(recurrences);
        if (rErr) throw rErr;
      } else {
        // Normal one-time expense
        const { error } = await supabase.from('expenses').insert(body);
        if (error) throw error;
      }
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-expense' && req.method === 'POST') {
      const user = await verifyAdmin(supabase, authHeader);
      const { id } = await req.json();
      if (!id) throw new Error('id obrigatório');
      
      const { data: oldData } = await supabase.from('expenses').select('*').eq('id', id).single();
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      
      await logAction(supabase, user, 'delete-expense', 'expenses', id, oldData, null);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (action === 'list-users') {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list-payments') {
      const { data, error } = await supabase
        .from('payments').select('*, users(name, email)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-subscription' && req.method === 'POST') {
      const body = await req.json();
      const { id, ...payload } = body;
      if (!id) throw new Error('ID da assinatura é obrigatório');

      const asaasUrl = `${ASAAS_BASE_URL}/subscriptions/${id}`;
      console.log(`Atualizando assinatura ${id} no Asaas...`);
      
      const response = await fetch(asaasUrl, {
        method: 'PUT',
        headers: { 
          'access_token': ASAAS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...payload,
          updatePendingPayments: payload.updatePendingPayments ?? true
        })
      });

      const result = await response.json();
      if (!response.ok) {
        console.error('Erro Asaas update:', JSON.stringify(result));
        throw new Error(result.errors?.[0]?.description || `Asaas Error ${response.status}`);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── CUSTOMER (Asaas customer + local users) ─────────────
    if (action === 'update-customer' && req.method === 'POST') {
      const body = await req.json();
      const { asaasCustomerId, name, email, phone, mobilePhone, cpfCnpj,
              address, addressNumber, complement, province, postalCode,
              additionalEmails, observations } = body;
      if (!asaasCustomerId) throw new Error('asaasCustomerId é obrigatório');

      // Envia apenas campos preenchidos ao Asaas (evita sobrescrever com vazio)
      const asaasPayload: Record<string, any> = {};
      const map: Record<string, any> = {
        name, email, phone, mobilePhone, cpfCnpj,
        address, addressNumber, complement, province, postalCode,
        additionalEmails, observations,
      };
      for (const [k, v] of Object.entries(map)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') asaasPayload[k] = v;
      }

      const asaasResp = await fetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, {
        method: 'PUT',
        headers: {
          'access_token': ASAAS_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'BivvoAdmin/1.0',
        },
        body: JSON.stringify(asaasPayload),
      });
      const asaasResult = await asaasResp.json();
      if (!asaasResp.ok) {
        console.error('Erro Asaas update-customer:', JSON.stringify(asaasResult));
        throw new Error(asaasResult.errors?.[0]?.description || `Asaas Error ${asaasResp.status}`);
      }

      // Sincroniza local `users` sem duplicar
      const localUpdate: Record<string, any> = {};
      if (name) localUpdate.name = name;
      if (email) localUpdate.email = email;
      if (mobilePhone || phone) localUpdate.whatsapp = mobilePhone || phone;
      if (cpfCnpj) localUpdate.cpf = cpfCnpj;
      if (postalCode) localUpdate.cep = postalCode;
      if (address) localUpdate.endereco = address;
      if (addressNumber) localUpdate.numero = addressNumber;
      if (complement) localUpdate.complemento = complement;
      if (province) localUpdate.bairro = province;

      const { data: existing } = await supabase
        .from('users').select('id').eq('asaas_customer_id', asaasCustomerId).maybeSingle();

      if (existing) {
        await supabase.from('users').update(localUpdate).eq('id', existing.id);
      } else {
        // Não existe: cria (sem duplicar por email se possível)
        const byEmail = email
          ? (await supabase.from('users').select('id').eq('email', email).maybeSingle()).data
          : null;
        if (byEmail) {
          await supabase.from('users').update({ ...localUpdate, asaas_customer_id: asaasCustomerId }).eq('id', byEmail.id);
        } else {
          await supabase.from('users').insert({ ...localUpdate, asaas_customer_id: asaasCustomerId, status: 'active' });
        }
      }

      await logAction(supabase, user, 'update-customer', 'users', asaasCustomerId, null, asaasPayload);

      return new Response(JSON.stringify({ ok: true, asaas: asaasResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DELETE / RESTORE ASAAS CUSTOMER ─────────────────────
    if (action === 'delete-customer' && req.method === 'POST') {
      const { asaasCustomerId } = await req.json();
      if (!asaasCustomerId) throw new Error('asaasCustomerId é obrigatório');

      const resp = await fetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, {
        method: 'DELETE',
        headers: { 'access_token': ASAAS_API_KEY, 'User-Agent': 'BivvoAdmin/1.0' },
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('Erro Asaas delete-customer:', JSON.stringify(result));
        throw new Error(result.errors?.[0]?.description || `Asaas Error ${resp.status}`);
      }

      // Delete locally: payments, subscriptions, then user
      const { data: localUser } = await supabase.from('users')
        .select('id').eq('asaas_customer_id', asaasCustomerId).maybeSingle();
      if (localUser) {
        await supabase.from('payments').delete().eq('user_id', localUser.id);
        await supabase.from('subscriptions').delete().eq('user_id', localUser.id);
        await supabase.from('users').delete().eq('id', localUser.id);
      }

      await logAction(supabase, user, 'delete-customer', 'users', asaasCustomerId, null, result);

      return new Response(JSON.stringify({ ok: true, asaas: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'restore-customer' && req.method === 'POST') {
      const { asaasCustomerId } = await req.json();
      if (!asaasCustomerId) throw new Error('asaasCustomerId é obrigatório');

      const resp = await fetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}/restore`, {
        method: 'POST',
        headers: { 'access_token': ASAAS_API_KEY, 'accept': 'application/json', 'User-Agent': 'BivvoAdmin/1.0' },
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('Erro Asaas restore-customer:', JSON.stringify(result));
        throw new Error(result.errors?.[0]?.description || `Asaas Error ${resp.status}`);
      }

      await supabase.from('users')
        .update({ status: 'active' })
        .eq('asaas_customer_id', asaasCustomerId);

      await logAction(supabase, user, 'restore-customer', 'users', asaasCustomerId, null, result);

      return new Response(JSON.stringify({ ok: true, asaas: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── BIVVO CONFIG: editar, sincronizar Asaas, rollback, listar histórico ─────
    if (action === 'save-bivvo-config' && req.method === 'POST') {
      const body = await req.json();
      const { userId, config, notes } = body;
      if (!userId) throw new Error('userId é obrigatório');
      if (!config || typeof config !== 'object') throw new Error('config é obrigatório');

      const { data: current, error: fetchErr } = await supabase
        .from('users')
        .select('id, name, email, bivvo_config, bivvo_config_synced_bivvo, bivvo_config_synced_asaas_value')
        .eq('id', userId).maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!current) throw new Error('Cliente não encontrado');

      const before = current.bivvo_config || null;
      const after = normalizeBivvoConfig(config);
      if (!after) throw new Error('Config inválida após normalização');

      const diff = computeConfigDiff(before, after);
      const nowIso = new Date().toISOString();

      const { error: upErr } = await supabase.from('users').update({
        bivvo_config: after,
        bivvo_config_previous: before,
        bivvo_config_updated_at: nowIso,
      }).eq('id', userId);
      if (upErr) throw upErr;

      // Log
      await supabase.from('bivvo_config_change_logs').insert({
        user_id: userId,
        changed_by: user.id,
        changed_by_email: user.email || null,
        changed_by_name: (user.user_metadata as any)?.name || user.email || null,
        action: 'edit',
        config_before: before,
        config_after: after,
        bivvo_relevant_changed: diff.bivvoRelevantChanged,
        asaas_value_changed: diff.asaasValueChanged,
        changed_fields: diff.changedFields,
        asaas_value_before: diff.previousRecurringValue,
        asaas_value_after: diff.newRecurringValue,
        notes: notes || null,
      });

      // Recalcula flags "precisa sincronizar" baseado no que já foi sincronizado (não só before→after)
      const syncedBivvo = current.bivvo_config_synced_bivvo || null;
      const bivvoSyncDiff = computeConfigDiff(syncedBivvo, after);
      const syncedAsaasValue = current.bivvo_config_synced_asaas_value != null ? Number(current.bivvo_config_synced_asaas_value) : null;
      const newRec = diff.newRecurringValue;
      const needsAsaasUpdate = syncedAsaasValue == null
        ? true
        : (newRec != null && Math.abs(newRec - syncedAsaasValue) > 0.005);

      return new Response(JSON.stringify({
        ok: true,
        diff,
        needsBivvoUpdate: bivvoSyncDiff.bivvoRelevantChanged || !syncedBivvo,
        needsAsaasUpdate,
        newRecurringValue: newRec,
        syncedAsaasValue,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-subscription-value' && req.method === 'POST') {
      const body = await req.json();
      const { userId, subscriptionId } = body;
      if (!userId) throw new Error('userId é obrigatório');
      if (!subscriptionId) throw new Error('subscriptionId é obrigatório');

      const { data: current } = await supabase
        .from('users').select('id, bivvo_config, bivvo_config_synced_asaas_value')
        .eq('id', userId).maybeSingle();
      if (!current) throw new Error('Cliente não encontrado');
      if (!current.bivvo_config) throw new Error('Cliente sem bivvo_config');

      const quote = quoteBivvo(current.bivvo_config as any);
      const newValue = Math.round(quote.totalRec * 100) / 100;
      const prevValue = current.bivvo_config_synced_asaas_value != null ? Number(current.bivvo_config_synced_asaas_value) : null;

      const putRes = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'PUT',
        headers: { 'access_token': ASAAS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue, updatePendingPayments: true }),
      });
      const asaasJson = await putRes.json();
      if (!putRes.ok) {
        throw new Error(asaasJson?.errors?.[0]?.description || `Asaas Error ${putRes.status}`);
      }
      const returnedValue = Number(asaasJson?.value);
      if (Number.isFinite(returnedValue) && Math.abs(returnedValue - newValue) > 0.01) {
        throw new Error(`Divergência no valor Asaas: enviado ${newValue}, retornado ${returnedValue}`);
      }

      await supabase.from('users').update({
        bivvo_config_synced_asaas_value: newValue,
        bivvo_config_synced_asaas_at: new Date().toISOString(),
      }).eq('id', userId);

      await supabase.from('bivvo_config_change_logs').insert({
        user_id: userId,
        changed_by: user.id,
        changed_by_email: user.email || null,
        changed_by_name: (user.user_metadata as any)?.name || user.email || null,
        action: 'sync_asaas',
        asaas_value_before: prevValue,
        asaas_value_after: newValue,
        asaas_value_changed: true,
        bivvo_relevant_changed: false,
        notes: `Assinatura ${subscriptionId}`,
      });

      return new Response(JSON.stringify({ ok: true, newValue, previousValue: prevValue, asaas: asaasJson }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'rollback-bivvo-config' && req.method === 'POST') {
      const body = await req.json();
      const { userId } = body;
      if (!userId) throw new Error('userId é obrigatório');
      const { data: current } = await supabase
        .from('users').select('id, bivvo_config, bivvo_config_previous').eq('id', userId).maybeSingle();
      if (!current) throw new Error('Cliente não encontrado');
      if (!current.bivvo_config_previous) throw new Error('Não há configuração anterior para restaurar');

      const before = current.bivvo_config;
      const after = current.bivvo_config_previous;
      const diff = computeConfigDiff(before, after);

      await supabase.from('users').update({
        bivvo_config: after,
        bivvo_config_previous: before,
        bivvo_config_updated_at: new Date().toISOString(),
      }).eq('id', userId);

      await supabase.from('bivvo_config_change_logs').insert({
        user_id: userId,
        changed_by: user.id,
        changed_by_email: user.email || null,
        changed_by_name: (user.user_metadata as any)?.name || user.email || null,
        action: 'rollback',
        config_before: before,
        config_after: after,
        bivvo_relevant_changed: diff.bivvoRelevantChanged,
        asaas_value_changed: diff.asaasValueChanged,
        changed_fields: diff.changedFields,
        asaas_value_before: diff.previousRecurringValue,
        asaas_value_after: diff.newRecurringValue,
      });

      return new Response(JSON.stringify({ ok: true, diff }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'list-config-logs') {
      const userId = url.searchParams.get('userId');
      if (!userId) throw new Error('userId é obrigatório');
      const { data, error } = await supabase
        .from('bivvo_config_change_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-user-tenant' && req.method === 'POST') {
      const body = await req.json();
      const { asaasCustomerId, tenantBivvo } = body;
      if (!asaasCustomerId) throw new Error('asaasCustomerId é obrigatório');

      const { data: existing } = await supabase
        .from('users').select('id').eq('asaas_customer_id', asaasCustomerId).maybeSingle();

      if (existing) {
        const { error } = await supabase.from('users')
          .update({
            bivvo_tenant_id: tenantBivvo || null,
            bivvo_status: null,
            bivvo_status_checked_at: null,
            tenant_provisioned_at: null,
            tenant_provision_error: null,
          })
          .eq('id', existing.id);
        if (error) throw error;
      
      } else {
        const { error } = await supabase.from('users').insert({
          asaas_customer_id: asaasCustomerId,
          bivvo_tenant_id: tenantBivvo || null,
          name: 'Cliente Asaas',
          email: `${asaasCustomerId}@asaas.local`,
          status: 'active',
        });
        if (error) throw error;
      }

      await logAction(supabase, user, 'update-user-tenant', 'users', asaasCustomerId, null, { tenantBivvo });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'check-bivvo-tenant' && req.method === 'POST') {
      const body = await req.json();
      const tenantId = body?.tenantId;
      if (tenantId === undefined || tenantId === null || tenantId === '') {
        throw new Error('tenantId é obrigatório');
      }
      const parsedId = typeof tenantId === 'number' ? tenantId : Number(String(tenantId).trim());
      if (!Number.isFinite(parsedId)) throw new Error('tenantId inválido');

      const { data: secret, error: secretErr } = await supabase
        .from('admin_secrets').select('value').eq('key', 'bivvo_api_token').maybeSingle();
      if (secretErr) throw secretErr;
      const token = (secret as any)?.value?.trim();
      if (!token) throw new Error('Token da API Bivvo não configurado em Configurações → Integrações');

      const bivvoRes = await fetch('https://adm.bivvo.com.br/tenantApiShowTenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': token.toLowerCase().startsWith('bearer ') ? token : `Bearer ${token}` },
        body: JSON.stringify({ id: parsedId }),
      });
      const contentType = bivvoRes.headers.get('content-type') || '';
      const raw = contentType.includes('application/json') ? await bivvoRes.json() : await bivvoRes.text();
      console.log(`[Bivvo][manual] tenant=${parsedId} http=${bivvoRes.status} body=`, typeof raw === 'string' ? raw.slice(0,800) : JSON.stringify(raw).slice(0,800));

      if (!bivvoRes.ok) {
        return new Response(JSON.stringify({
          ok: false, exists: false, status: bivvoRes.status,
          error: typeof raw === 'string' ? raw : (raw?.message || raw?.error || 'Tenant não encontrado no Bivvo'),
          raw,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ ok: true, exists: true, tenant: raw, raw }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'refresh-all-bivvo-statuses' && req.method === 'POST') {
      const { data: usersWithTenant, error } = await supabase
        .from('users')
        .select('id, name, email, cpf, asaas_customer_id, bivvo_tenant_id, bivvo_status, bivvo_status_checked_at')
        .not('asaas_customer_id', 'is', null);

      if (error) throw error;

      const map = new Map<string, any>();
      for (const u of usersWithTenant ?? []) {
        map.set(u.asaas_customer_id, u);
      }
      console.log(`[Bivvo][refresh-all] processando ${map.size} usuários`);
      await refreshBivvoStatuses(supabase, map);

      const summary = { total: map.size, active: 0, inactive: 0, none: 0, fill: 0, error: 0 };
      for (const u of map.values()) {
        if (u.bivvo_status === 'active') summary.active++;
        else if (u.bivvo_status === 'inactive') summary.inactive++;
        else if (u.bivvo_status === 'Não possui Tenant') summary.none++;
        else if (u.bivvo_status === 'Inserir ID') summary.fill++;
        else if (u.bivvo_status === 'Erro API') summary.error++;
      }

      await logAction(supabase, user, 'refresh-all-bivvo-statuses', 'users', null, null, summary);

      return new Response(JSON.stringify({ ok: true, summary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── AFFILIATES ──────────────────────────────────────────


    if (action === 'list-affiliates') {
      const { data, error } = await supabase
        .from('affiliates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const ids = (data ?? []).map((a: any) => a.id);
      
      const { data: sales } = await supabase.from('affiliate_sales')
        .select('affiliate_id, amount_first, status, asaas_subscription_id, tracking_id')
        .in('affiliate_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
        
      const { data: comms } = await supabase.from('affiliate_commissions')
        .select('affiliate_id, commission_amount, status')
        .in('affiliate_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
        
      const stats = new Map<string, any>();
      for (const a of data ?? []) stats.set(a.id, { totalSold: 0, salesCount: 0, commGenerated: 0, commPaid: 0, commPending: 0, activeSubscriptions: 0 });
      
      for (const s of sales ?? []) {
        const st = stats.get(s.affiliate_id); if (!st) continue;
        st.salesCount++;
        if (s.status === 'paid') {
          st.totalSold += Number(s.amount_first);
          if (s.asaas_subscription_id) st.activeSubscriptions++;
        }
      }
      for (const c of comms ?? []) {
        const st = stats.get(c.affiliate_id); if (!st) continue;
        st.commGenerated += Number(c.commission_amount);
        if (c.status === 'paid') st.commPaid += Number(c.commission_amount);
        else if (['pending','approved'].includes(c.status)) st.commPending += Number(c.commission_amount);
      }
      const out = (data ?? []).map((a: any) => ({ ...a, stats: stats.get(a.id) }));
      return new Response(JSON.stringify({ data: out }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'create-affiliate' && req.method === 'POST') {
      const body = await req.json();
      const { name, email, password, whatsapp, document, commission_percent, commission_recurring, slug } = body;
      if (!name || !email || !password) throw new Error('Nome, email e senha obrigatórios');

      // Create auth user (or reuse existing one with same email)
      let uid: string;
      const { data: created, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name, role: 'affiliate' },
      });
      if (authErr) {
        const msg = String(authErr.message || '');
        const isDup = /already.*registered|already exists|duplicate/i.test(msg);
        if (!isDup) throw new Error(msg);

        // Lookup existing user by email
        const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
        if (listErr) throw new Error(listErr.message);
        const existing = list.users.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
        if (!existing) throw new Error('Email já cadastrado mas usuário não encontrado');

        // Verify it's not already linked to another affiliate
        const { data: existingAff } = await supabase.from('affiliates').select('id').eq('user_id', existing.id).maybeSingle();
        if (existingAff) throw new Error('Este email já está vinculado a outro afiliado');
        uid = existing.id;
      } else {
        uid = created.user!.id;
      }

      // Add affiliate role (ignore conflict)
      await supabase.from('user_roles').upsert({ user_id: uid, role: 'affiliate' }, { onConflict: 'user_id,role' });

      // Build slug
      let finalSlug = (slug || slugify(name) || 'aff-' + uid.slice(0, 6));
      // ensure unique
      for (let i = 0; i < 5; i++) {
        const { data: ex } = await supabase.from('affiliates').select('id').eq('slug', finalSlug).maybeSingle();
        if (!ex) break;
        finalSlug = `${finalSlug}-${Math.random().toString(36).slice(2, 5)}`;
      }

      const { data: aff, error: affErr } = await supabase.from('affiliates').insert({
        user_id: uid, name, email, whatsapp, document,
        commission_percent: commission_percent ?? 20,
        commission_recurring: commission_recurring ?? true,
        slug: finalSlug,
      }).select().single();
      if (affErr) {
        if (!authErr) await supabase.auth.admin.deleteUser(uid);
        throw new Error(affErr.message);
      }
      return new Response(JSON.stringify({ data: aff }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'update-affiliate' && req.method === 'POST') {
      const body = await req.json();
      const { id, ...patch } = body;
      if (!id) throw new Error('id obrigatório');
      const { error } = await supabase.from('affiliates').update(patch).eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list-affiliate-sales') {
      const affiliateId = url.searchParams.get('affiliateId');
      let q = supabase.from('affiliate_sales').select('*, affiliates(name, email)').order('created_at', { ascending: false });
      if (affiliateId) q = q.eq('affiliate_id', affiliateId);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'list-affiliate-commissions') {
      const affiliateId = url.searchParams.get('affiliateId');
      let q = supabase.from('affiliate_commissions')
        .select('*, affiliates(name, email, pix_key, pix_key_type)')
        .order('created_at', { ascending: false });
      if (affiliateId) q = q.eq('affiliate_id', affiliateId);
      const { data, error } = await q;
      if (error) throw error;
      return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-affiliate' && req.method === 'POST') {
      const { id } = await req.json();
      if (!id) throw new Error('id obrigatório');
      
      // Get the affiliate to find the user_id for auth deletion
      const { data: aff } = await supabase.from('affiliates').select('user_id').eq('id', id).maybeSingle();
      
      const { error } = await supabase.from('affiliates').delete().eq('id', id);
      if (error) throw error;
      
      // If found, delete the auth user as well
      if (aff?.user_id) {
        await supabase.auth.admin.deleteUser(aff.user_id);
      }
      
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-affiliate-sale' && req.method === 'POST') {
      const { id } = await req.json();
      if (!id) throw new Error('id obrigatório');
      const { error } = await supabase.from('affiliate_sales').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (action === 'delete-affiliate-commission' && req.method === 'POST') {
      const { id } = await req.json();
      if (!id) throw new Error('id obrigatório');
      const { error } = await supabase.from('affiliate_commissions').delete().eq('id', id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    if (action === 'mark-commission-paid' && req.method === 'POST') {
      const { id, payment_proof_url } = await req.json();
      if (!id) throw new Error('id obrigatório');
      
      // 1. Get commission details first to create expense
      const { data: comm } = await supabase
        .from('affiliate_commissions')
        .select('*, affiliates(name)')
        .eq('id', id)
        .single();
        
      if (!comm) throw new Error('Comissão não encontrada');
      if (comm.status === 'paid') {
        return new Response(JSON.stringify({ success: true, message: 'Já estava paga' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // 2. Update commission status
      const { error: updateErr } = await supabase.from('affiliate_commissions')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          payment_proof_url: payment_proof_url || null
        }).eq('id', id);
      if (updateErr) throw updateErr;

      // 3. Create expense automatically (check if already exists to avoid duplication)
      const { data: existingExpense } = await supabase.from('expenses')
        .select('id')
        .eq('metadata->>commission_id', id)
        .maybeSingle();

      if (!existingExpense) {
        const { error: expenseErr } = await supabase.from('expenses').insert({
          description: `Repasse Afiliado: ${comm.affiliates?.name || 'Afiliado'}`,
          amount: comm.commission_amount,
          category: 'Repasse Afiliado',
          type: 'variable',
          is_automatic: true,
          metadata: { commission_id: id, affiliate_id: comm.affiliate_id }
        });
        if (expenseErr) console.error('Erro ao criar despesa automática:', expenseErr);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = /autenticado|negado/i.test(message) ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
