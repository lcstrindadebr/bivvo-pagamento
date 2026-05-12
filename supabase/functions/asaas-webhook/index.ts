import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

// Asaas events we care about
const EVENTS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'SUBSCRIPTION_DELETED',
  'SUBSCRIPTION_CANCELLED',
];

// Map Asaas events to our status
function mapAsaasEventToStatus(event: string): string | null {
  switch (event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED':
      return 'paid';
    case 'PAYMENT_OVERDUE':
      return 'overdue';
    case 'PAYMENT_DELETED':
      return 'cancelled';
    case 'PAYMENT_REFUNDED':
      return 'refunded';
    case 'PAYMENT_CHARGEBACK_REQUESTED':
      return 'chargeback';
    case 'SUBSCRIPTION_DELETED':
    case 'SUBSCRIPTION_CANCELLED':
      return 'cancelled';
    default:
      return null;
  }
}

interface AsaasWebhookPayload {
  event: string;
  payment?: {
    id: string;
    customer: string;
    value: number;
    status: string;
    billingType: string;
    subscription?: string;
    externalReference?: string;
    paymentDate?: string;
    confirmedDate?: string;
  };
  subscription?: {
    id: string;
    customer: string;
    status: string;
    externalReference?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (ASAAS_WEBHOOK_TOKEN) {
      const receivedToken = req.headers.get('asaas-access-token');
      if (receivedToken !== ASAAS_WEBHOOK_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
      }
    }

    const payload: AsaasWebhookPayload = await req.json();
    const { event, payment, subscription } = payload;

    if (!EVENTS.includes(event)) {
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), { headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const newStatus = mapAsaasEventToStatus(event);

    // Handle Subscription events
    if (event === 'SUBSCRIPTION_DELETED' || event === 'SUBSCRIPTION_CANCELLED') {
      const subId = subscription?.id;
      if (subId) {
        await supabase.from('users').update({ status: 'inactive' }).eq('asaas_subscription_id', subId);
        await supabase.from('payments').update({ status: 'cancelled' }).eq('asaas_subscription_id', subId);
        await supabase.from('affiliate_sales').update({ status: 'cancelled' }).eq('asaas_subscription_id', subId);
        await supabase.from('affiliate_commissions').update({ status: 'cancelled' }).eq('status', 'pending').match({ asaas_subscription_id: subId });
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    if (!payment) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    // Find payment in our database
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id, user_id, plan, status, asaas_subscription_id')
      .eq('asaas_payment_id', payment.id)
      .maybeSingle();

    if (!paymentRecord && payment.subscription) {
      // If payment not found, it might be a recurring one. Let's check if we have the subscription.
      const { data: sub } = await supabase.from('payments').select('user_id, plan').eq('asaas_subscription_id', payment.subscription).limit(1).maybeSingle();
      if (sub && newStatus === 'paid') {
        // Create the recurring payment record
        await supabase.from('payments').insert({
          user_id: sub.user_id,
          plan: sub.plan,
          amount: payment.value,
          status: 'paid',
          paid_at: payment.confirmedDate || payment.paymentDate || new Date().toISOString(),
          asaas_payment_id: payment.id,
          asaas_subscription_id: payment.subscription
        });
      }
    } else if (paymentRecord) {
      const updateData: any = { status: newStatus };
      if (newStatus === 'paid') updateData.paid_at = payment.confirmedDate || payment.paymentDate || new Date().toISOString();
      await supabase.from('payments').update(updateData).eq('id', paymentRecord.id);
    }

    // Update User
    if (payment.customer && (newStatus === 'paid' || ['overdue', 'cancelled', 'refunded'].includes(newStatus || ''))) {
      const userStatus = newStatus === 'paid' ? 'active' : (newStatus === 'overdue' ? 'overdue' : 'inactive');
      const updateObj: any = { status: userStatus };
      if (newStatus === 'paid') {
        const exp = new Date(); exp.setDate(exp.getDate() + 32); // buffer
        updateObj.data_expiracao = exp.toISOString();
      }
      await supabase.from('users').update(updateObj).eq('asaas_customer_id', payment.customer);
    }

    // --- Affiliate Logic ---
    if (payment.subscription) {
      const { data: sale } = await supabase.from('affiliate_sales')
        .select('*')
        .eq('asaas_subscription_id', payment.subscription)
        .maybeSingle();

      if (sale) {
        if (newStatus === 'paid') {
          // Check if this is a recurring payment or the first one
          const isFirst = payment.id === sale.asaas_payment_id;
          
          if (isFirst) {
            await supabase.from('affiliate_sales').update({ status: 'paid' }).eq('id', sale.id);
            await supabase.from('affiliate_commissions').update({ status: 'approved' }).match({ sale_id: sale.id, kind: 'first', status: 'pending' });
          } else {
            // Check if recurring commission already exists for this specific payment
            const { data: exists } = await supabase.from('affiliate_commissions')
              .select('id').match({ sale_id: sale.id, asaas_payment_id: payment.id }).maybeSingle();
            
            if (!exists) {
              const { data: aff } = await supabase.from('affiliates').select('commission_recurring').eq('id', sale.affiliate_id).maybeSingle();
              if (aff?.commission_recurring) {
                const commission = Math.round(Number(sale.amount_recurring) * Number(sale.commission_percent)) / 100;
                await supabase.from('affiliate_commissions').insert({
                  affiliate_id: sale.affiliate_id,
                  sale_id: sale.id,
                  sale_amount: sale.amount_recurring,
                  commission_percent: sale.commission_percent,
                  commission_amount: commission,
                  kind: 'recurring',
                  status: 'approved',
                  is_recurring: true,
                  asaas_payment_id: payment.id
                });
              }
            }
          }
        } else if (['cancelled', 'refunded', 'chargeback'].includes(newStatus || '')) {
          await supabase.from('affiliate_sales').update({ status: 'cancelled' }).eq('id', sale.id);
          await supabase.from('affiliate_commissions').update({ status: 'cancelled' }).match({ sale_id: sale.id, status: 'pending' });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: corsHeaders });
  }
});
