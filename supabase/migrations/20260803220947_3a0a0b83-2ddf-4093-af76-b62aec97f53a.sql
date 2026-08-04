-- Corrigir seed de cupons
INSERT INTO public.coupons (code, discount_type, discount_value, active)
VALUES ('BIVVO10', 'percentage', 10, true)
ON CONFLICT (code) DO NOTHING;