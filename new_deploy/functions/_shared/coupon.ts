// Shared coupon logic for payment edge functions
export interface AppliedCoupon {
  id: string;
  code: string;
  discount_percent: number;
}

export async function validateAndLoadCoupon(
  supabase: any,
  code: string | undefined | null,
): Promise<AppliedCoupon | null> {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  if (!clean) return null;

  // Check if coupon field is enabled globally
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "checkout_coupon_enabled")
    .maybeSingle();
  const enabled = (setting?.value ?? "true") !== "false";
  if (!enabled) throw new Error("Cupons desabilitados.");

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
  return {
    id: coupon.id,
    code: coupon.code,
    discount_percent: Number(coupon.discount_percent),
  };
}

export async function incrementCouponUse(supabase: any, couponId: string) {
  try {
    // Fetch current value and increment
    const { data } = await supabase
      .from("coupons")
      .select("current_uses")
      .eq("id", couponId)
      .maybeSingle();
    await supabase
      .from("coupons")
      .update({ current_uses: (data?.current_uses ?? 0) + 1 })
      .eq("id", couponId);
  } catch (e) {
    console.error("Falha ao incrementar uso do cupom:", e);
  }
}
