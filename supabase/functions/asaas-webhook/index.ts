import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

// Asaas payment events we care about
const PAYMENT_EVENTS = [
  'PAYMENT_RECEIVED',      // Payment confirmed
  'PAYMENT_CONFIRMED',     // Payment confirmed (alternative)
  'PAYMENT_OVERDUE',       // Payment overdue
  'PAYMENT_DELETED',       // Payment deleted
  'PAYMENT_REFUNDED',      // Payment refunded
  'PAYMENT_CHARGEBACK_REQUESTED', // Chargeback requested
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
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const ASAAS_WEBHOOK_TOKEN = Deno.env.get('ASAAS_WEBHOOK_TOKEN');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase configuration');
    }

    // Optional: Validate webhook token if configured
    if (ASAAS_WEBHOOK_TOKEN) {
      const receivedToken = req.headers.get('asaas-access-token');
      if (receivedToken !== ASAAS_WEBHOOK_TOKEN) {
        console.error('Invalid webhook token');
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const payload: AsaasWebhookPayload = await req.json();
    console.log('Received Asaas webhook:', JSON.stringify(payload));

    const { event, payment } = payload;

    // Only process payment events
    if (!PAYMENT_EVENTS.includes(event) || !payment) {
      console.log('Ignoring non-payment event:', event);
      return new Response(JSON.stringify({ success: true, message: 'Event ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const newStatus = mapAsaasEventToStatus(event);

    if (!newStatus) {
      console.log('No status mapping for event:', event);
      return new Response(JSON.stringify({ success: true, message: 'Event not mapped' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${event} for payment ${payment.id}, new status: ${newStatus}`);

    // Find payment in our database
    const { data: existingPayment, error: findError } = await supabase
      .from('payments')
      .select('id, user_id, plan, status')
      .eq('asaas_payment_id', payment.id)
      .maybeSingle();

    if (findError) {
      console.error('Error finding payment:', findError);
      throw new Error('Database error finding payment');
    }

    if (!existingPayment) {
      // Try to find by subscription ID
      if (payment.subscription) {
        const { data: subPayment, error: subError } = await supabase
          .from('payments')
          .select('id, user_id, plan, status')
          .eq('asaas_subscription_id', payment.subscription)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subError || !subPayment) {
          console.log('Payment not found in database:', payment.id);
          return new Response(JSON.stringify({ success: true, message: 'Payment not found' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update the payment with the Asaas payment ID
        await supabase
          .from('payments')
          .update({ asaas_payment_id: payment.id })
          .eq('id', subPayment.id);

        Object.assign(existingPayment || {}, subPayment);
      } else {
        console.log('Payment not found in database:', payment.id);
        return new Response(JSON.stringify({ success: true, message: 'Payment not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const paymentRecord = existingPayment!;

    // Update payment status
    const updateData: Record<string, unknown> = { status: newStatus };
    
    if (newStatus === 'paid') {
      updateData.paid_at = payment.confirmedDate || payment.paymentDate || new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', paymentRecord.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw new Error('Failed to update payment status');
    }

    console.log(`Payment ${paymentRecord.id} updated to status: ${newStatus}`);

    // If payment is confirmed, update user's subscription status
    if (newStatus === 'paid' && paymentRecord.user_id) {
      // Calculate expiration date (30 days from now for monthly)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const { error: userError } = await supabase
        .from('users')
        .update({
          plano_ativo: paymentRecord.plan,
          status: 'active',
          data_expiracao: expirationDate.toISOString(),
        })
        .eq('id', paymentRecord.user_id);

      if (userError) {
        console.error('Error updating user subscription:', userError);
        // Don't throw - payment was already updated
      } else {
        console.log(`User ${paymentRecord.user_id} subscription activated: ${paymentRecord.plan}`);
      }
    }

    // If payment failed/overdue, update user status
    if (['overdue', 'cancelled', 'refunded', 'chargeback'].includes(newStatus) && paymentRecord.user_id) {
      const { error: userError } = await supabase
        .from('users')
        .update({ status: newStatus === 'overdue' ? 'overdue' : 'inactive' })
        .eq('id', paymentRecord.user_id);

      if (userError) {
        console.error('Error updating user status:', userError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      paymentId: paymentRecord.id,
      status: newStatus 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Webhook processing failed',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
