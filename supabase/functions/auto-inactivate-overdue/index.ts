import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { runInactivateAndPersist } from "../_shared/bivvo-api.ts";
import { log } from "../_shared/logger.ts";

// Inativa automaticamente contas Bivvo com 5+ dias de inadimplência.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 5);

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, overdue_since, status, bivvo_tenant_id')
      .eq('status', 'overdue')
      .lte('overdue_since', cutoff.toISOString())
      .not('bivvo_tenant_id', 'is', null);

    if (error) throw error;

    await log.info('auto-inactivate-overdue', `Encontrados ${users?.length || 0} usuários para inativar`, { cutoff: cutoff.toISOString() });

    const results: any[] = [];
    for (const u of users || []) {
      try {
        const r = await runInactivateAndPersist(supabase, u.id);
        results.push({ userId: u.id, email: u.email, ok: !r.error, result: r });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await log.error('auto-inactivate-overdue', `Erro ao inativar ${u.id}: ${msg}`, { userId: u.id });
        results.push({ userId: u.id, email: u.email, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('auto-inactivate-overdue error:', err);
    return new Response(JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
