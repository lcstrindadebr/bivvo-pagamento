import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { quoteBivvo, round2 } from "../_shared/bivvo-logic.ts";
import { asaasFetch } from "../_shared/asaas.ts";
import { runProvisionAndPersist } from "../_shared/bivvo-api.ts";
import { validateAndLoadCoupon, incrementCouponUse } from "../_shared/coupon.ts";


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
    const { plan, customerData, cardData, bivvoConfig, affiliateSlug, trackingId, couponCode } = body;
    
    // Get remote IP from headers (Supabase adds this)
    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    // 1. Database Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Resolve Price
    let amount: number, recurringAmount: number, planLabel: string;
    if (bivvoConfig) {
      const q = quoteBivvo(bivvoConfig);
      amount = q.total1m;
      recurringAmount = q.totalRec;
      planLabel = `Plano ${q.planLabel}`;
    } else {
      const { data: pData } = await supabase.from('plans').select('price, name').eq('slug', plan).eq('active', true).single();
      if (!pData) throw new Error('Plano não encontrado.');
      amount = recurringAmount = Number(pData.price);
      planLabel = `Plano ${pData.name}`;
    }

    // 2.1 Validate coupon (if provided) and apply discount to first month
    const appliedCoupon = await validateAndLoadCoupon(supabase, couponCode);
    const originalAmount = amount;
    if (appliedCoupon) {
      amount = round2(amount * (1 - appliedCoupon.discount_percent / 100));
      if (amount < 0) amount = 0;
    }
    const isFreeCoupon = !!appliedCoupon && appliedCoupon.discount_percent >= 100;

    // 3. User Management
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanPhone = customerData.whatsapp.replace(/\D/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');
    const cleanCard = isFreeCoupon ? '' : (cardData?.number || '').replace(/\s/g, '');

    const { data: user, error: uErr } = await supabase.from('users').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      person_type: customerData.personType || null,
      company_name: customerData.personType === 'JURIDICA' ? (customerData.companyName || '').trim() : null,
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
      bivvo_config: bivvoConfig || null,
    }, { onConflict: 'email' }).select('id, asaas_customer_id').single();
    if (uErr) throw uErr;

    // (free-coupon path handled AFTER Asaas customer + subscription creation
    // so the recurring subscription is set up and starts charging from month 2)




    // 4. Asaas Customer - validate existing, recreate if removed
    let asaasCustomerId = user.asaas_customer_id;
    if (asaasCustomerId) {
      try {
        const existing = await asaasFetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, {
          headers: { 'access_token': ASAAS_API_KEY },
        });
        if (existing?.deleted === true) {
          console.log('Cliente Asaas removido, será recriado:', asaasCustomerId);
          asaasCustomerId = null;
        }
      } catch (e) {
        console.log('Cliente Asaas inválido, será recriado:', asaasCustomerId, e.message);
        asaasCustomerId = null;
      }
    }

    if (!asaasCustomerId) {
      const cRes = await asaasFetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customerData.name.trim(),
          company: customerData.personType === 'JURIDICA' ? (customerData.companyName || '').trim() : undefined,
          cpfCnpj: cleanCpf,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanPhone,
          postalCode: cleanCep,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          externalReference: user.id,
          notificationDisabled: true,
        }),
      });
      asaasCustomerId = cRes.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
    }

    // ===== 100% coupon: primeiro mês grátis; assinatura recorrente cria mesmo assim =====
    if (isFreeCoupon) {
      const nextDueFree = new Date();
      nextDueFree.setDate(nextDueFree.getDate() + 30);
      console.log('[Cupom 100%] Criando assinatura CC com 1º mês grátis');
      const sRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          value: recurringAmount,
          nextDueDate: nextDueFree.toISOString().split('T')[0],
          cycle: 'MONTHLY',
          description: `Assinatura ${planLabel} (1º mês grátis - cupom ${appliedCoupon!.code})`,
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
          remoteIp,
        }),
      });

      const { data: dbPayment } = await supabase.from('payments').insert({
        user_id: user.id,
        plan,
        amount: 0,
        status: 'approved',
        paid_at: new Date().toISOString(),
        asaas_subscription_id: sRes.id,
        bivvo_config: bivvoConfig || null,
      }).select('id').single();

      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);
      expDate.setDate(expDate.getDate() + 3);
      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expDate.toISOString(),
        asaas_subscription_id: sRes.id,
      }).eq('id', user.id);

      await incrementCouponUse(supabase, appliedCoupon!.id);
      try { await runProvisionAndPersist(supabase, user.id); }
      catch (e) { console.error('Falha provisionamento (cupom 100%):', e); }

      return new Response(JSON.stringify({
        success: true,
        paymentId: dbPayment?.id,
        subscriptionId: sRes.id,
        status: 'approved',
        userId: user.id,
        freeCoupon: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 5. Create Credit Card Subscription

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

    // 6. Fetch First Payment status
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
    if (!firstPayment) throw new Error('Cobrança não localizada no Asaas.');

    const isApproved = ['CONFIRMED', 'RECEIVED'].includes(firstPayment.status);

    // 7. DB Payment & User Status
    const { data: dbPayment } = await supabase.from('payments').insert({
      user_id: user.id,
      plan,
      amount,
      status: isApproved ? 'approved' : 'pending',
      asaas_payment_id: firstPayment.id,
      asaas_subscription_id: sRes.id,
      bivvo_config: bivvoConfig || null,
    }).select('id').single();

    if (isApproved) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);
      expDate.setDate(expDate.getDate() + 3); // 3 days grace period

      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expDate.toISOString(),
        asaas_subscription_id: sRes.id,
      }).eq('id', user.id);

      // Provisiona tenant Bivvo (não falha o pagamento se der erro)
      try {
        await runProvisionAndPersist(supabase, user.id);
      } catch (e) {
        console.error('Falha ao provisionar tenant Bivvo:', e);
      }
    }

    if (appliedCoupon) {
      await incrementCouponUse(supabase, appliedCoupon.id);
    }


    // 8. Affiliate tracking (Simplified for portability)
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
          status: isApproved ? 'paid' : 'pending',
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
            status: isApproved ? 'approved' : 'pending',
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
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});