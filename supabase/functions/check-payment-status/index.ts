import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { asaasFetch } from "../_shared/asaas.ts";


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL');

    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) {
      throw new Error('Configuração do Asaas (API Key ou URL) não encontrada.');
    }

    const { asaasId, type } = await req.json();

    if (!asaasId) {
      throw new Error('Identificador (asaasId) não fornecido.');
    }

    console.log('Checking payment status for:', asaasId, 'type:', type);

    let endpoint = type === 'subscription' 
      ? `${ASAAS_BASE_URL}/subscriptions/${asaasId}`
      : `${ASAAS_BASE_URL}/payments/${asaasId}`;

    const result = await asaasFetch(endpoint, {
      headers: {
        'access_token': ASAAS_API_KEY,
      },
    });

    console.log('Asaas status response:', JSON.stringify(result));

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