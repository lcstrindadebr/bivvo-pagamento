CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key TEXT PRIMARY KEY,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage admin_secrets"
  ON public.admin_secrets
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_admin_secrets_updated_at
  BEFORE UPDATE ON public.admin_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
