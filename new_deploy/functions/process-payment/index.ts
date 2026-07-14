// ============================================================
// process-payment — autossuficiente (sem imports de _shared)
// Cria assinatura de Cartão de Crédito no Asaas com cálculo Bivvo embutido.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLANS = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
} as const;
const EXTRA_USER_PRICE = 35;
const TELEFONIA_PRICE = 100;
const CANAIS_DEF = [
  { id: 'waof', included: 1, unit: 100 }, { id: 'wano', included: 1, unit: 50 },
  { id: 'ig', included: 1, unit: 50 },    { id: 'fb', included: 1, unit: 50 },
  { id: 'email', included: 1, unit: 50 }, { id: 'olx', included: 0, unit: 100 },
  { id: 'tiktok', included: 0, unit: 100 },{ id: 'ml', included: 0, unit: 100 },
  { id: 'li', included: 0, unit: 100 },   { id: 'yt', included: 0, unit: 100 },
  { id: 'woo', included: 0, unit: 100 },
] as const;
function round2(n: number) { return Math.round(n * 100) / 100; }
function quoteBivvo(cfg: any) {
  const plan = PLANS[cfg.plan as keyof typeof PLANS];
  if (!plan) throw new Error('Plano inválido');
  const users = Math.max(1, Math.floor(cfg.users || plan.users));
  const extraUsers = Math.max(0, users - plan.users);
  const extraCost = extraUsers * EXTRA_USER_PRICE;
  const basePromo = plan.promo + extraCost;
  const baseFull = plan.full + extraCost;
  const base1m = basePromo;
  const baseRec = cfg.protagonista ? base1m : baseFull;
  const discountPercent = Math.min(30, Math.max(0, cfg.channelsDiscount || 0));
  const discountFactor = 1 - (discountPercent / 100);
  let channelsTotal = 0;
  const cfgChannels = cfg.channels || {};
  for (const c of CANAIS_DEF) {
    const qty = Math.max(0, Math.floor(cfgChannels[c.id] || 0));
    const extra = Math.max(0, qty - c.included);
    if (extra > 0) channelsTotal += round2(extra * c.unit * discountFactor);
  }
  const telCost = cfg.telefonia ? TELEFONIA_PRICE : 0;
  const total1m = round2(base1m + channelsTotal + telCost);
  const totalRec = round2(baseRec + channelsTotal + telCost);
  const planLabel = extraUsers > 0 ? `Plano Personalizado (${plan.name} + ${extraUsers}u)` : `Plano ${plan.name} (${plan.users}u)`;
  return { planLabel, total1m, totalRec };
}

async function asaasFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.description || `Asaas Error ${response.status}`);
    return data;
  }
  if (!response.ok) throw new Error(`Asaas HTTP Error ${response.status}`);
  return await response.text();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!ASAAS_API_KEY || !ASAAS_BASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configuração incompleta no servidor (Secrets).');
    }

    const body = await req.json();
    const { plan, customerData, cardData, bivvoConfig, affiliateSlug, trackingId } = body;
    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let amount: number, recurringAmount: number, planLabel: string;
    if (bivvoConfig) {
      const q = quoteBivvo(bivvoConfig);
      amount = q.total1m; recurringAmount = q.totalRec;
      planLabel = `Plano ${q.planLabel}`;
    } else {
      const { data: pData } = await supabase.from('plans').select('price, name').eq('slug', plan).eq('active', true).single();
      if (!pData) throw new Error('Plano não encontrado.');
      amount = recurringAmount = Number(pData.price);
      planLabel = `Plano ${pData.name}`;
    }

    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanPhone = customerData.whatsapp.replace(/\D/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');
    const cleanCard = cardData.number.replace(/\s/g, '');

    const { data: user, error: uErr } = await supabase.from('users').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      whatsapp: cleanPhone, cpf: cleanCpf,
      billing_name: customerData.billingName.trim(),
      cep: cleanCep,
      endereco: customerData.endereco.trim(),
      numero: customerData.numero.trim(),
      complemento: customerData.complemento?.trim() || '',
      bairro: customerData.bairro.trim(),
      cidade: customerData.cidade.trim(),
      estado: customerData.estado.toUpperCase(),
    }, { onConflict: 'email' }).select('id, asaas_customer_id').single();
    if (uErr) throw uErr;

    let asaasCustomerId = user.asaas_customer_id;
    if (asaasCustomerId) {
      try {
        const existing = await asaasFetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, { headers: { 'access_token': ASAAS_API_KEY } });
        if (existing?.deleted === true) asaasCustomerId = null;
      } catch { asaasCustomerId = null; }
    }
    if (!asaasCustomerId) {
      const cRes = await asaasFetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customerData.name.trim(), cpfCnpj: cleanCpf,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanPhone, postalCode: cleanCep,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          externalReference: user.id, notificationDisabled: true,
        }),
      });
      asaasCustomerId = cRes.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
    }

    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    const sRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: recurringAmount,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: `Assinatura ${planLabel}`,
        externalReference: `${user.id}_${plan}`,
        creditCard: {
          holderName: cardData.holderName.trim(),
          number: cleanCard,
          expiryMonth: cardData.expiryMonth,
          expiryYear: cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear,
          ccv: cardData.ccv,
        },
        creditCardHolderInfo: {
          name: customerData.billingName.trim(),
          email: customerData.email.toLowerCase().trim(),
          cpfCnpj: cleanCpf,
          postalCode: cleanCep,
          addressNumber: customerData.numero.trim(),
          address: customerData.endereco.trim(),
          phone: cleanPhone,
        },
        discount: amount < recurringAmount ? { value: round2(recurringAmount - amount), type: 'FIXED', dueDateLimitDays: 0 } : undefined,
        remoteIp,
      }),
    });

    let firstPayment: any = null;
    for (let i = 0; i < 5; i++) {
      const pRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions/${sRes.id}/payments`, { headers: { 'access_token': ASAAS_API_KEY } });
      if (pRes.data?.length > 0) { firstPayment = pRes.data[0]; break; }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (!firstPayment) throw new Error('Cobrança não localizada no Asaas.');

    const isApproved = ['CONFIRMED', 'RECEIVED'].includes(firstPayment.status);

    const { data: dbPayment } = await supabase.from('payments').insert({
      user_id: user.id, plan, amount,
      status: isApproved ? 'approved' : 'pending',
      asaas_payment_id: firstPayment.id, asaas_subscription_id: sRes.id,
    }).select('id').single();

    if (isApproved) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);
      expDate.setDate(expDate.getDate() + 3);
      await supabase.from('users').update({
        status: 'ativo', plano_ativo: plan,
        data_expiracao: expDate.toISOString(),
        asaas_subscription_id: sRes.id,
      }).eq('id', user.id);
    }

    if (affiliateSlug && dbPayment) {
      const { data: aff } = await supabase.from('affiliates').select('id, commission_percent').eq('slug', affiliateSlug).eq('status', 'active').maybeSingle();
      if (aff) {
        const { data: sale } = await supabase.from('affiliate_sales').insert({
          affiliate_id: aff.id, payment_id: dbPayment.id, user_id: user.id,
          plan_slug: plan, plan_label: planLabel, config: bivvoConfig || {},
          amount_first: amount, amount_recurring: recurringAmount,
          commission_percent: aff.commission_percent,
          status: isApproved ? 'paid' : 'pending',
          tracking_id: trackingId,
          asaas_payment_id: firstPayment.id, asaas_subscription_id: sRes.id,
        }).select('id').single();
        if (sale) {
          await supabase.from('affiliate_commissions').insert({
            affiliate_id: aff.id, sale_id: sale.id,
            sale_amount: amount, commission_percent: aff.commission_percent,
            commission_amount: round2((amount * aff.commission_percent) / 100),
            kind: 'first', status: isApproved ? 'approved' : 'pending',
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, paymentId: dbPayment?.id, asaasId: sRes.id, status: isApproved ? 'approved' : 'pending', userId: user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Process Payment Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
