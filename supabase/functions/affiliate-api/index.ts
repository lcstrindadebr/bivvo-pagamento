import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


async function getAffiliate(supabase: any, authHeader: string) {
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error('Não autenticado');
  const { data: aff } = await supabase
    .from('affiliates')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!aff) throw new Error('Acesso negado: não é afiliado');
  if (aff.status !== 'active') throw new Error('Afiliado inativo');
  return aff;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Não autenticado');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const aff = await getAffiliate(supabase, authHeader);

    if (action === 'me') {
      const { data: sales } = await supabase.from('affiliate_sales')
        .select('id')
        .eq('affiliate_id', aff.id)
        .eq('status', 'paid')
        .not('asaas_subscription_id', 'is', null);
      
      const { count: totalClicks } = await supabase.from('affiliate_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('affiliate_id', aff.id);
      
      const stats = {
        activeSubscriptions: sales?.length || 0,
        totalClicks: totalClicks || 0,
        conversionRate: totalClicks ? ((sales?.length || 0) / totalClicks * 100).toFixed(2) : 0
      };

      return new Response(JSON.stringify({ data: { ...aff, stats } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'conversion-stats') {
      const { data: clicks } = await supabase.from('affiliate_clicks')
        .select('created_at')
        .eq('affiliate_id', aff.id)
        .order('created_at', { ascending: false });
        
      const { data: sales } = await supabase.from('affiliate_sales')
        .select('created_at, status')
        .eq('affiliate_id', aff.id)
        .order('created_at', { ascending: false });

      return new Response(JSON.stringify({ data: { clicks, sales } }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sales') {
      const { data } = await supabase
        .from('affiliate_sales').select('*')
        .eq('affiliate_id', aff.id).order('created_at', { ascending: false });
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'commissions') {
      const { data } = await supabase
        .from('affiliate_commissions').select('*')
        .eq('affiliate_id', aff.id).order('created_at', { ascending: false });
      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'update-profile' && req.method === 'POST') {
      const body = await req.json();
      const allowed = ['name','whatsapp','document','pix_key','pix_key_type','bank_name','bank_agency','bank_account'];
      const patch: Record<string, unknown> = {};
      for (const k of allowed) if (k in body) patch[k] = body[k];
      const { error } = await supabase.from('affiliates').update(patch).eq('id', aff.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cancel-sale' && req.method === 'POST') {
      const { saleId, reason } = await req.json();
      if (!saleId || !reason) throw new Error('ID da venda e motivo são obrigatórios');

      const { data: sale, error: saleErr } = await supabase
        .from('affiliate_sales')
        .select('*')
        .eq('id', saleId)
        .eq('affiliate_id', aff.id)
        .maybeSingle();

      if (saleErr || !sale) throw new Error('Venda não encontrada ou não pertence a você');
      if (sale.status === 'cancelled') throw new Error('Venda já cancelada');

      const { error: updateErr } = await supabase
        .from('affiliate_sales')
        .update({ 
          status: 'cancelled',
          cancellation_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', saleId);

      if (updateErr) throw updateErr;

      await supabase
        .from('affiliate_commissions')
        .update({ status: 'cancelled' })
        .eq('sale_id', saleId)
        .eq('status', 'pending');

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro';
    const status = /autenticado|negado|inativo/i.test(message) ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
