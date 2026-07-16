import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { runProvisionAndPersist } from "../_shared/bivvo-api.ts";


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
          overdue_since: null,
          asaas_subscription_id: payment.subscription || dbPayment.asaas_subscription_id
        }).eq('id', dbPayment.user_id);

        // Provisiona tenant Bivvo (idempotente)
        try {
          await runProvisionAndPersist(supabase, dbPayment.user_id);
        } catch (e) {
          console.error('Falha ao provisionar tenant Bivvo (webhook):', e);
        }

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
    }

    // 2. Pagamento Atrasado / Vencido
    if (body.event === 'PAYMENT_OVERDUE') {
       console.log('Pagamento atrasado:', payment.id);
       // Marca overdue_since do usuário (se ainda não estava marcado)
       const { data: overduePayment } = await supabase
         .from('payments')
         .select('user_id')
         .eq('asaas_payment_id', payment.id)
         .maybeSingle();
       if (overduePayment?.user_id) {
         const { data: u } = await supabase
           .from('users')
           .select('overdue_since')
           .eq('id', overduePayment.user_id)
           .maybeSingle();
         if (!u?.overdue_since) {
           await supabase.from('users').update({
             status: 'overdue',
             overdue_since: new Date().toISOString(),
           }).eq('id', overduePayment.user_id);
         }
       }
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
