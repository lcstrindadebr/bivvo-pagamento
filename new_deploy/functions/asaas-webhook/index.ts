// ============================================================
// asaas-webhook — autossuficiente (sem imports de _shared)
// Recebe eventos do Asaas e atualiza pagamentos, usuários e afiliados.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET');
    const authHeader = req.headers.get('asaas-access-token');

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

    await supabase.from('asaas_webhooks').insert({
      event_id: body.id,
      event_type: body.event,
      payload: body,
      status: 'received'
    });

    const payment = body.payment;
    if (!payment) return new Response('OK');

    // 1. Pagamento Confirmado / Recebido
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(body.event)) {
      const { data: dbPayment } = await supabase
        .from('payments')
        .select('*, users(id, email)')
        .eq('asaas_payment_id', payment.id)
        .maybeSingle();

      if (dbPayment && dbPayment.status !== 'approved') {
        await supabase.from('payments').update({ status: 'approved' }).eq('id', dbPayment.id);

        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        expirationDate.setDate(expirationDate.getDate() + 3);

        await supabase.from('users').update({
          status: 'ativo',
          plano_ativo: dbPayment.plan,
          data_expiracao: expirationDate.toISOString(),
          asaas_subscription_id: payment.subscription || dbPayment.asaas_subscription_id
        }).eq('id', dbPayment.user_id);

        await supabase.from('affiliate_sales')
          .update({ status: 'paid' })
          .eq('asaas_payment_id', payment.id);

        const { data: sale } = await supabase.from('affiliate_sales').select('id').eq('asaas_payment_id', payment.id).maybeSingle();
        if (sale) {
          await supabase.from('affiliate_commissions')
            .update({ status: 'approved' })
            .eq('sale_id', sale.id)
            .eq('status', 'pending');
        }

        console.log('Pagamento aprovado via Webhook:', payment.id);
      }
    }

    // 2. Pagamento Atrasado
    if (body.event === 'PAYMENT_OVERDUE') {
      console.log('Pagamento atrasado:', payment.id);
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
