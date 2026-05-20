import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- Bivvo Calculation Logic (Standalone) ---
const PLANS = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
} as const;

const EXTRA_USER_PRICE = 35;
const TELEFONIA_PRICE = 100;

const CANAIS_DEF = [
  { id: 'waof',   label: 'WhatsApp API Oficial',     included: 1, unit: 100, emoji: '📱' },
  { id: 'wano',   label: 'WhatsApp API não oficial', included: 1, unit: 50,  emoji: '💬' },
  { id: 'ig',     label: 'Instagram',                included: 1, unit: 50,  emoji: '📸' },
  { id: 'fb',     label: 'Facebook',                 included: 1, unit: 50,  emoji: '📘' },
  { id: 'email',  label: 'E-mail',                   included: 1, unit: 50,  emoji: '✉️'  },
  { id: 'olx',    label: 'OLX',                      included: 0, unit: 100, emoji: '🏷️' },
  { id: 'tiktok', label: 'TikTok',                   included: 0, unit: 100, emoji: '🎵' },
  { id: 'ml',     label: 'Mercado Livre',            included: 0, unit: 100, emoji: '🛒' },
  { id: 'li',     label: 'LinkedIn',                 included: 0, unit: 100, emoji: '💼' },
  { id: 'yt',     label: 'YouTube',                  included: 0, unit: 100, emoji: '▶️'  },
  { id: 'woo',    label: 'WooCommerce',              included: 0, unit: 100, emoji: '🛍️' },
] as const;

type PlanSlug = keyof typeof PLANS;

interface BivvoConfig {
  plan: PlanSlug;
  users: number;
  channels: Record<string, number>;
  channelsDiscount?: number;
  telefonia: boolean;
  protagonista: boolean;
}

interface BivvoQuote {
  planSlug: PlanSlug;
  planLabel: string;
  users: number;
  extraUsers: number;
  base1m: number;
  baseRec: number;
  channelsTotal: number;
  channelsDiscountPercent: number;
  telCost: number;
  total1m: number;
  totalRec: number;
  protagonista: boolean;
  channelLines: Array<{ id: string; label: string; emoji: string; qty: number; amount: number }>;
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function quoteBivvo(cfg: BivvoConfig): BivvoQuote {
  const plan = PLANS[cfg.plan];
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
  const channelLines: BivvoQuote["channelLines"] = [];
  const cfgChannels = cfg.channels || {};
  for (const c of CANAIS_DEF) {
    const qty = Math.max(0, Math.floor(cfgChannels[c.id] || 0));
    const extra = Math.max(0, qty - c.included);
    if (extra > 0) {
      const amount = round2(extra * c.unit * discountFactor);
      channelsTotal += amount;
      channelLines.push({ id: c.id, label: c.label, emoji: c.emoji, qty: extra, amount });
    }
  }
  const telCost = cfg.telefonia ? TELEFONIA_PRICE : 0;
  const total1m = round2(base1m + channelsTotal + telCost);
  const totalRec = round2(baseRec + channelsTotal + telCost);
  const planLabel = extraUsers > 0 ? `Plano Personalizado (${plan.name} + ${extraUsers}u)` : `Plano ${plan.name} (${plan.users}u)`;
  
  return {
    planSlug: cfg.plan,
    planLabel,
    users,
    extraUsers,
    base1m,
    baseRec,
    channelsTotal,
    channelsDiscountPercent: discountPercent,
    telCost,
    total1m,
    totalRec,
    protagonista: cfg.protagonista,
    channelLines
  };
}

// --- Validation Utils ---
const VALID_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10));
}

// --- Asaas Fetch Wrapper ---
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { plan, billingType, customerData, bivvoConfig, affiliateSlug, trackingId } = body;

    // 1. Database Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Resolve Price & Plan
    let amount: number, recurringAmount: number, planLabel: string;
    if (bivvoConfig) {
      const quote = quoteBivvo(bivvoConfig);
      amount = quote.total1m;
      recurringAmount = quote.totalRec;
      planLabel = quote.planLabel;
    } else {
      const { data: pData } = await supabase.from('plans').select('price, name').eq('slug', plan).eq('active', true).single();
      if (!pData) throw new Error('Plano não encontrado.');
      amount = recurringAmount = Number(pData.price);
      planLabel = `Plano ${pData.name}`;
    }

    // 3. User & Customer Management
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanPhone = customerData.whatsapp.replace(/\D/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');

    // Upsert User
    const { data: user, error: uErr } = await supabase.from('users').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      whatsapp: cleanPhone,
      cpf: cleanCpf,
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

    // Upsert Customer (Lead tracking)
    await supabase.from('customers').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      phone: cleanPhone,
    }, { onConflict: 'email' });

    // 4. Asaas Integration
    let asaasCustomerId = user.asaas_customer_id;
    if (!asaasCustomerId) {
      const cRes = await asaasFetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customerData.name.trim(),
          cpfCnpj: cleanCpf,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanPhone,
          postalCode: cleanCep,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          externalReference: user.id,
          notificationDisabled: false,
        }),
      });
      asaasCustomerId = cRes.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
    }

    // 5. Create Subscription
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (billingType === 'BOLETO' ? 3 : 1));

    console.log('Criando assinatura no Asaas...', billingType);
    const sRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        value: recurringAmount,
        discount: amount < recurringAmount ? { value: round2(recurringAmount - amount), type: 'FIXED', dueDateLimitDays: 0 } : undefined,
        cycle: 'MONTHLY',
        description: `Assinatura ${planLabel}`,
        externalReference: `${user.id}_${plan}`,
      }),
    });
    console.log('Assinatura criada:', sRes.id);

    // 6. Fetch First Payment for PIX/Boleto Details
    let firstPayment: any = null;
    for (let i = 0; i < 5; i++) {
      const pRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions/${sRes.id}/payments`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      if (pRes.data?.length > 0) {
        firstPayment = pRes.data[0];
        break;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (!firstPayment) throw new Error('Não foi possível gerar a cobrança inicial no Asaas.');

    // Details for UI
    let paymentDetails: any = {};
    if (billingType === 'PIX') {
      const pix = await asaasFetch(`${ASAAS_BASE_URL}/payments/${firstPayment.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      paymentDetails = { pixQrCode: pix.encodedImage, pixCopyPaste: pix.payload, expiresAt: pix.expirationDate };
    } else if (billingType === 'BOLETO') {
      const bar = await asaasFetch(`${ASAAS_BASE_URL}/payments/${firstPayment.id}/identificationField`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      paymentDetails = { boletoUrl: firstPayment.bankSlipUrl, barCode: bar.identificationField, dueDate: firstPayment.dueDate };
    }

    // 7. DB Payment Record
    const { data: dbPayment } = await supabase.from('payments').insert({
      user_id: user.id,
      plan,
      amount,
      status: 'pending',
      asaas_payment_id: firstPayment.id,
      asaas_subscription_id: sRes.id,
    }).select('id').single();

    // 8. Affiliate Tracking
    if (affiliateSlug && dbPayment) {
      const { data: aff } = await supabase.from('affiliates').select('id, commission_percent').eq('slug', affiliateSlug).eq('status', 'active').maybeSingle();
      if (aff) {
        const { data: sale } = await supabase.from('affiliate_sales').insert({
          affiliate_id: aff.id,
          payment_id: dbPayment.id,
          user_id: user.id,
          plan_slug: plan,
          plan_label: planLabel,
          config: bivvoConfig || {},
          amount_first: amount,
          amount_recurring: recurringAmount,
          commission_percent: aff.commission_percent,
          status: 'pending',
          tracking_id: trackingId,
          asaas_payment_id: firstPayment.id,
          asaas_subscription_id: sRes.id,
        }).select('id').single();
        if (sale) {
          await supabase.from('affiliate_commissions').insert({
            affiliate_id: aff.id,
            sale_id: sale.id,
            sale_amount: amount,
            commission_percent: aff.commission_percent,
            commission_amount: round2((amount * aff.commission_percent) / 100),
            kind: 'first',
            status: 'pending',
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, paymentId: dbPayment?.id, asaasPaymentId: firstPayment.id, subscriptionId: sRes.id, ...paymentDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Create Subscription Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});