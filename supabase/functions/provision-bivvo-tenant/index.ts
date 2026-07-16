import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { runProvisionAndPersist, runUpdateAndPersist, runInactivateAndPersist } from "../_shared/bivvo-api.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { userId, mode } = await req.json();
    if (!userId) throw new Error('userId obrigatório');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let result;
    if (mode === 'inactivate') {
      result = await runInactivateAndPersist(supabase, userId);
    } else if (mode === 'update') {
      result = await runUpdateAndPersist(supabase, userId);
    } else {
      result = await runProvisionAndPersist(supabase, userId);
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('provision-bivvo-tenant error:', err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
