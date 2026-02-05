import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL');

    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) {
      throw new Error('Missing Asaas configuration');
    }

    const { asaasId, type } = await req.json();

    if (!asaasId) {
      throw new Error('Missing asaasId');
    }

    console.log('Checking payment status for:', asaasId, 'type:', type);

    let endpoint = type === 'subscription' 
      ? `${ASAAS_BASE_URL}/subscriptions/${asaasId}`
      : `${ASAAS_BASE_URL}/payments/${asaasId}`;

    const response = await fetch(endpoint, {
      headers: {
        'access_token': ASAAS_API_KEY,
      },
    });

    const result = await response.json();
    console.log('Asaas status response:', JSON.stringify(result));

    if (result.errors) {
      throw new Error(`Asaas error: ${result.errors[0]?.description || 'Unknown error'}`);
    }

    // Mapear status do Asaas para status simplificado
    let mappedStatus: 'APPROVED' | 'REJECTED' | 'PENDING';
    
    const approvedStatuses = ['CONFIRMED', 'RECEIVED', 'ACTIVE'];
    const rejectedStatuses = ['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'];
    
    if (approvedStatuses.includes(result.status)) {
      mappedStatus = 'APPROVED';
    } else if (rejectedStatuses.includes(result.status) || result.status === 'OVERDUE') {
      mappedStatus = 'REJECTED';
    } else {
      mappedStatus = 'PENDING';
    }

    return new Response(JSON.stringify({
      success: true,
      originalStatus: result.status,
      status: mappedStatus,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Status check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar status';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
