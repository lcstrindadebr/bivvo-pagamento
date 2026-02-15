import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdmin(supabase: any, authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Não autenticado');

  const { data: role } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (!role) throw new Error('Acesso negado');
  return user;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY')!;
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    await verifyAdmin(supabase, authHeader);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // LIST SUBSCRIPTIONS FROM ASAAS
    if (action === 'list-subscriptions') {
      const offset = url.searchParams.get('offset') || '0';
      const limit = url.searchParams.get('limit') || '20';
      const status = url.searchParams.get('status') || '';

      let asaasUrl = `${ASAAS_BASE_URL}/subscriptions?offset=${offset}&limit=${limit}`;
      if (status) asaasUrl += `&status=${status}`;

      const response = await fetch(asaasUrl, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      const result = await response.json();

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LIST USERS (local DB)
    if (action === 'list-users') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // LIST PAYMENTS (local DB)
    if (action === 'list-payments') {
      const { data, error } = await supabase
        .from('payments')
        .select('*, users(name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const status = message.includes('autenticado') || message.includes('negado') ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
