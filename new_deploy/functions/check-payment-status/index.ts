// ============================================================
// check-payment-status — autossuficiente (sem imports de _shared)
// Consulta status de payment/subscription no Asaas.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) throw new Error('Configuração do Asaas ausente.');

    const { asaasId, type } = await req.json();
    if (!asaasId) throw new Error('Identificador (asaasId) não fornecido.');

    const endpoint = type === 'subscription'
      ? `${ASAAS_BASE_URL}/subscriptions/${asaasId}`
      : `${ASAAS_BASE_URL}/payments/${asaasId}`;

    const result = await asaasFetch(endpoint, { headers: { 'access_token': ASAAS_API_KEY } });

    const approved = ['CONFIRMED', 'RECEIVED', 'ACTIVE'];
    const rejected = ['REFUNDED', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'];

    let mappedStatus: 'APPROVED' | 'REJECTED' | 'PENDING' = 'PENDING';
    if (approved.includes(result.status)) mappedStatus = 'APPROVED';
    else if (rejected.includes(result.status) || result.status === 'OVERDUE') mappedStatus = 'REJECTED';

    return new Response(JSON.stringify({ success: true, originalStatus: result.status, status: mappedStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Erro ao verificar status';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
