import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Configuração incompleta no servidor.");
    }

    const { code } = await req.json();
    const clean = String(code || "").trim().toUpperCase();
    if (!clean) throw new Error("Informe um código de cupom.");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verifica se o campo de cupom está habilitado
    const { data: setting } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "checkout_coupon_enabled")
      .maybeSingle();
    const enabled = (setting?.value ?? "true") !== "false";
    if (!enabled) throw new Error("O uso de cupons está desabilitado no momento.");

    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("id, code, discount_percent, max_uses, current_uses, valid_from, valid_until, active")
      .eq("code", clean)
      .maybeSingle();

    if (error) throw error;
    if (!coupon) throw new Error("Cupom inválido.");
    if (!coupon.active) throw new Error("Cupom inativo.");

    const now = Date.now();
    if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
      throw new Error("Cupom ainda não é válido.");
    }
    if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
      throw new Error("Cupom expirado.");
    }
    if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses) {
      throw new Error("Cupom esgotado.");
    }

    return new Response(
      JSON.stringify({
        success: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_percent: Number(coupon.discount_percent),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Erro" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
