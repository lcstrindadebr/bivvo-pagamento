-- =====================================================================
-- 004_security_and_settings.sql
-- Atualizações posteriores ao 003:
--   1. Coluna `assigned_to` em tasks (delegação por admin)
--   2. Endurecimento de RLS (customers, subscriptions, tasks, coupons,
--      official_templates, settings, storage)
--   3. Whitelist pública de settings (branding, contatos, analytics)
--   4. Hardening de funções (search_path fixo, GRANTs restritos)
--   5. Revogações no papel `anon` para reduzir exposição do GraphQL
--
-- Aplicação esperada:
--   psql "$DATABASE_URL" -f new_deploy/migrations/004_security_and_settings.sql
-- =====================================================================

-- 1) Coluna de delegação em tasks (idempotente)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Substituir políticas permissivas por versões restritas
DROP POLICY IF EXISTS "Admins can do everything on customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can do everything on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.official_templates;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
DROP POLICY IF EXISTS "Everyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

CREATE POLICY "Admins manage official_templates"
  ON public.official_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Settings: leitura pública apenas de uma whitelist de chaves
DROP POLICY IF EXISTS "Public can read site_url" ON public.settings;
DROP POLICY IF EXISTS "Public can read whitelisted settings" ON public.settings;
CREATE POLICY "Public can read whitelisted settings"
  ON public.settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY[
    'site_url',
    'site_name',
    'support_email',
    'support_whatsapp',
    'cnpj',
    'address',
    'timezone',
    'brand_logo_url',
    'brand_logo_dark_url',
    'favicon_url',
    'brand_color_primary',
    'brand_color_accent',
    'brand_theme_default',
    'ga_id',
    'meta_pixel_id'
  ]));

CREATE POLICY "Admins read all settings"
  ON public.settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert settings"
  ON public.settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update settings"
  ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete settings"
  ON public.settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Storage: restringir buckets
DROP POLICY IF EXISTS "Public Access for payout-proofs" ON storage.objects;
CREATE POLICY "Admins can read payout-proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payout-proofs' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public Access to marketing bucket" ON storage.objects;
DROP POLICY IF EXISTS "Marketing public read" ON storage.objects;
CREATE POLICY "Authenticated can read marketing bucket"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'marketing');

-- 5) Hardening de funções
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.track_affiliate_click(text, text, text, text, text) SET search_path = public;

REVOKE ALL ON FUNCTION public.fn_on_affiliate_commission_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_on_affiliate_commission_deleted() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_affiliate_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) TO anon, authenticated;

-- 6) Reduzir exposição do GraphQL/PostgREST (revogar SELECT do papel anon)
REVOKE SELECT ON public.users                 FROM anon;
REVOKE SELECT ON public.payments              FROM anon;
REVOKE SELECT ON public.audit_logs            FROM anon;
REVOKE SELECT ON public.asaas_webhooks        FROM anon;
REVOKE SELECT ON public.customers             FROM anon;
REVOKE SELECT ON public.subscriptions         FROM anon;
REVOKE SELECT ON public.affiliate_commissions FROM anon;
REVOKE SELECT ON public.affiliate_sales       FROM anon;
REVOKE SELECT ON public.affiliate_clicks      FROM anon;
REVOKE SELECT ON public.user_roles            FROM anon;
REVOKE SELECT ON public.expenses              FROM anon;
REVOKE SELECT ON public.tasks                 FROM anon;
REVOKE SELECT ON public.official_templates    FROM anon;
REVOKE SELECT ON public.marketing_materials   FROM anon;
REVOKE SELECT ON public.coupons               FROM anon;

REVOKE SELECT ON public.audit_logs     FROM authenticated;
REVOKE SELECT ON public.asaas_webhooks FROM authenticated;

-- =====================================================================
-- FIM
-- =====================================================================
