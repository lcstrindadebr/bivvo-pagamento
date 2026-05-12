import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdmin(supabase: any, authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Não autenticado');
  const { data: role } = await supabase
    .from('user_roles').select('role')
    .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
  if (!role) throw new Error('Acesso negado');
  return user;
}

async function enrichCustomers(supabase: any, customerIds: string[], ASAAS_BASE_URL: string, ASAAS_API_KEY: string) {
  if (customerIds.length === 0) return new Map();

  // 1. Try local DB first
  const { data: localUsers } = await supabase
    .from('users')
    .select('name, email, asaas_customer_id')
    .in('asaas_customer_id', customerIds);

  const userMap = new Map(localUsers?.map((u: any) => [u.asaas_customer_id, u]) || []);
  const missingIds = customerIds.filter(id => !userMap.has(id));

  // 2. Fetch missing from Asaas
  if (missingIds.length > 0) {
    console.log(`Buscando ${missingIds.length} clientes no Asaas:`, missingIds);
    const fetched = await Promise.all(missingIds.map(async (id) => {
      try {
        const cleanId = id.trim();
        const url = `${ASAAS_BASE_URL}/customers/${cleanId}`;
        console.log(`Chamada Asaas: ${url}`);
        
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
          console.log(`Cliente encontrado: ${id} -> ${c.name}`);
          return { asaas_customer_id: id, name: c.name, email: c.email };
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

    fetched.forEach((u: any) => {
      userMap.set(u.asaas_customer_id, u);
    });
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
    await verifyAdmin(supabase, authHeader);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

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
        
        result.data = result.data.map((s: any) => {
          const userData = userMap.get(s.customer);
          return {
            ...s,
            customerName: userData?.name || 'Desconhecido',
            customerEmail: userData?.email || '',
          };
        });
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'finance-stats') {
      const dateStart = url.searchParams.get('dateCreated[ge]');
      const dateEnd = url.searchParams.get('dateCreated[le]');
      
      // Get payments (cobrancas) with filters
      let paymentsUrl = `${ASAAS_BASE_URL}/payments?limit=100`;
      if (dateStart) paymentsUrl += `&dateCreated[ge]=${dateStart}`;
      if (dateEnd) paymentsUrl += `&dateCreated[le]=${dateEnd}`;
      
      const paymentsRes = await fetch(paymentsUrl, { headers: { 'access_token': ASAAS_API_KEY } });
      const paymentsData = await paymentsRes.json();
      
      // Get subscriptions to count total recurring
      const subsUrl = `${ASAAS_BASE_URL}/subscriptions?limit=100`;
      const subsRes = await fetch(subsUrl, { headers: { 'access_token': ASAAS_API_KEY } });
      const subsData = await subsRes.json();

      // Enrich payments with customer names AND FILTER ONLY SUBSCRIPTION PAYMENTS
      let payments = (paymentsData.data || []).filter((p: any) => !!p.subscription);
      
      if (payments.length > 0) {
        const customerIds = [...new Set(payments.map((p: any) => p.customer))];
        const userMap = await enrichCustomers(supabase, customerIds, ASAAS_BASE_URL, ASAAS_API_KEY);
        
        payments = payments.map((p: any) => ({
          ...p,
          customerName: userMap.get(p.customer)?.name || 'Desconhecido',
          customerEmail: userMap.get(p.customer)?.email || '',
        }));
      }
      
      const stats = {
        totalPayments: payments.length,
        paidCount: payments.filter((p: any) => ['RECEIVED', 'CONFIRMED'].includes(p.status)).length,
        totalValue: payments.reduce((acc: number, p: any) => acc + (p.value || 0), 0),
        paidValue: payments.filter((p: any) => ['RECEIVED', 'CONFIRMED'].includes(p.status))
          .reduce((acc: number, p: any) => acc + (p.value || 0), 0),
        activeSubscriptions: subsData.totalCount || 0,
        payments
      };

      
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      const { id, ...payload } = await req.json();
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

    // ── AFFILIATES ──────────────────────────────────────────

    if (action === 'list-affiliates') {
      const { data, error } = await supabase
        .from('affiliates').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      const ids = (data ?? []).map((a: any) => a.id);
      
      const { data: sales } = await supabase.from('affiliate_sales')
        .select('affiliate_id, amount_first, status, asaas_subscription_id')
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

      // Create auth user
      const { data: created, error: authErr } = await supabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name, role: 'affiliate' },
      });
      if (authErr) throw new Error(authErr.message);
      const uid = created.user!.id;

      // Add affiliate role
      await supabase.from('user_roles').insert({ user_id: uid, role: 'affiliate' });

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
        await supabase.auth.admin.deleteUser(uid);
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

    if (action === 'mark-commission-paid' && req.method === 'POST') {
      const { id, payment_proof_url } = await req.json();
      if (!id) throw new Error('id obrigatório');
      const { error } = await supabase.from('affiliate_commissions')
        .update({ 
          status: 'paid', 
          paid_at: new Date().toISOString(),
          payment_proof_url: payment_proof_url || null
        }).eq('id', id);
      if (error) throw error;
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
