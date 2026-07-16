import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET');
    const authHeader = req.headers.get('asaas-access-token');

    // Validação de token de segurança (configurado no Asaas)
    if (WEBHOOK_SECRET && authHeader !== WEBHOOK_SECRET) {
      console.error('Webhook: Token inválido');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    console.log('Webhook recebido:', body.event, body.payment?.id);

    // Salvar log do webhook
    await supabase.from('asaas_webhooks').insert({
      event_id: body.id,
      event_type: body.event,
      payload: body,
      status: 'received'
    });

    const payment = body.payment;
    if (!payment) return new Response('OK');

    const paymentDate = (payment.paymentDate || payment.confirmedDate || payment.dateCreated || new Date().toISOString()).slice(0, 10);

    const recordFinanceEvent = async (
      eventType: string,
      referenceId: string,
      amount: number,
      netAmount: number,
      metadata: Record<string, unknown>,
      snapshot: { gross?: number; net?: number; refund?: number; chargeback?: number },
    ) => {
      // Idempotência por (event_type, reference_id)
      const { data: existing } = await supabase
        .from('finance_events')
        .select('id')
        .eq('event_type', eventType)
        .eq('reference_id', referenceId)
        .maybeSingle();
      if (existing) return;
      await supabase.from('finance_events').insert({
        event_type: eventType,
        reference_id: referenceId,
        amount,
        net_amount: netAmount,
        occurred_at: new Date().toISOString(),
        metadata,
      });
      await supabase.rpc('apply_finance_event', {
        p_date: paymentDate,
        p_gross: snapshot.gross || 0,
        p_net: snapshot.net || 0,
        p_refund: snapshot.refund || 0,
        p_chargeback: snapshot.chargeback || 0,
        p_expense: 0,
        p_commission: 0,
      });
    };

    // 1. Pagamento Confirmado / Recebido
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(body.event)) {
      // Buscar pagamento em nosso banco
      const { data: dbPayment } = await supabase
        .from('payments')
        .select('*, users(id, email)')
        .eq('asaas_payment_id', payment.id)
        .maybeSingle();

      if (dbPayment && dbPayment.status !== 'approved') {
        // Atualizar status do pagamento
        await supabase.from('payments').update({ status: 'approved' }).eq('id', dbPayment.id);

        // Ativar usuário
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        expirationDate.setDate(expirationDate.getDate() + 3); // 3 days grace period

        
        await supabase.from('users').update({
          status: 'ativo',
          plano_ativo: dbPayment.plan,
          data_expiracao: expirationDate.toISOString(),
          asaas_subscription_id: payment.subscription || dbPayment.asaas_subscription_id
        }).eq('id', dbPayment.user_id);

        // Atualizar venda do afiliado
        await supabase.from('affiliate_sales')
          .update({ status: 'paid' })
          .eq('asaas_payment_id', payment.id);
          
        // Aprovar comissões pendentes desta venda
        const { data: sale } = await supabase.from('affiliate_sales').select('id').eq('asaas_payment_id', payment.id).maybeSingle();
        if (sale) {
          await supabase.from('affiliate_commissions')
            .update({ status: 'approved' })
            .eq('sale_id', sale.id)
            .eq('status', 'pending');
        }

        console.log('Pagamento aprovado via Webhook:', payment.id);
      }

      // Registrar evento financeiro (idempotente)
      const gross = Number(payment.value) || 0;
      const net = Number(payment.netValue) || gross;
      await recordFinanceEvent(
        'payment_received',
        payment.id,
        gross,
        net,
        { billingType: payment.billingType, customer: payment.customer },
        { gross, net },
      );
    }

    // 2. Pagamento Atrasado / Vencido
    if (body.event === 'PAYMENT_OVERDUE') {
       console.log('Pagamento atrasado:', payment.id);
    }

    // 2b. Reembolso
    if (body.event === 'PAYMENT_REFUNDED') {
      const refundValue = Number(payment.value) || 0;
      await recordFinanceEvent(
        'payment_refunded',
        payment.id,
        refundValue,
        refundValue,
        { customer: payment.customer },
        { refund: refundValue },
      );
    }

    // 2c. Chargeback
    if (body.event === 'PAYMENT_CHARGEBACK_REQUESTED' || body.event === 'PAYMENT_CHARGEBACK_DISPUTE') {
      const cbValue = Number(payment.value) || 0;
      await recordFinanceEvent(
        'payment_chargeback',
        payment.id,
        cbValue,
        cbValue,
        { customer: payment.customer, event: body.event },
        { chargeback: cbValue },
      );
    }

    // 3. Assinatura Cancelada
    if (body.event === 'SUBSCRIPTION_DELETED') {
      const subscriptionId = body.subscription?.id;
      if (subscriptionId) {
        await supabase.from('users').update({ status: 'inativo' }).eq('asaas_subscription_id', subscriptionId);
        await supabase.from('affiliate_sales').update({ status: 'cancelled' }).eq('asaas_subscription_id', subscriptionId);
        console.log('Assinatura cancelada via Webhook:', subscriptionId);
      }
    }


    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
