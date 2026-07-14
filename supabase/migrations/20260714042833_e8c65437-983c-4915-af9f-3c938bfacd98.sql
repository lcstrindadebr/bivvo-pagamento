
-- 1) Drop overly permissive policies
DROP POLICY IF EXISTS "Admins can do everything on customers" ON public.customers;
DROP POLICY IF EXISTS "Admins can do everything on subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.official_templates;
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
DROP POLICY IF EXISTS "Everyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

-- 2) Strict admin-only replacements
CREATE POLICY "Admins manage official_templates"
  ON public.official_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage tasks"
  ON public.tasks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read site_url"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (key = 'site_url');

CREATE POLICY "Admins read all settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert settings"
  ON public.settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete settings"
  ON public.settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3) Storage policies
DROP POLICY IF EXISTS "Public Access for payout-proofs" ON storage.objects;
CREATE POLICY "Admins can read payout-proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'payout-proofs' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Public Access to marketing bucket" ON storage.objects;
DROP POLICY IF EXISTS "Marketing public read" ON storage.objects;
CREATE POLICY "Authenticated can read marketing bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'marketing');

-- 4) Function hardening
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

-- 5) Reduce GraphQL exposure
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
