-- =============================================================================
-- Migration 009 — Token de integração da API Bivvo (admin_secrets)
-- Idempotente. Rodar após 008_missing_admin_and_finance.sql.
-- Garante que exista a tabela admin_secrets e a chave 'bivvo_api_token'
-- usada pela aba Configurações → Integrações.
-- =============================================================================

-- 1) Garante a tabela admin_secrets (caso a migration 008 ainda não tenha rodado)
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key        text PRIMARY KEY,
  value      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage admin_secrets" ON public.admin_secrets;
CREATE POLICY "Admins manage admin_secrets"
  ON public.admin_secrets FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_admin_secrets_updated_at ON public.admin_secrets;
CREATE TRIGGER update_admin_secrets_updated_at
  BEFORE UPDATE ON public.admin_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Seed do slot do token da Bivvo (valor vazio; admin preenche pela UI)
INSERT INTO public.admin_secrets (key, value)
VALUES ('bivvo_api_token', '')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.admin_secrets IS
  'Segredos administrativos acessíveis somente via Edge Functions com service_role. Ex.: bivvo_api_token.';
