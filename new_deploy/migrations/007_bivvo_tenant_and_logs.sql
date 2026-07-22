-- =============================================================================
-- Migration 007 — Provisionamento Bivvo, PF/PJ, Logs do sistema e inadimplência
-- Idempotente. Rodar após 006_finance_metrics.sql.
-- =============================================================================

-- 1) Colunas em public.users -------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS person_type      text,               -- 'FISICA' | 'JURIDICA'
  ADD COLUMN IF NOT EXISTS company_name     text,               -- razão social (PJ)
  ADD COLUMN IF NOT EXISTS cpf              text,               -- CPF/CNPJ (identity Bivvo)
  ADD COLUMN IF NOT EXISTS bivvo_config     jsonb,              -- config contratada (plano, canais, extras)
  ADD COLUMN IF NOT EXISTS bivvo_tenant_id  text,               -- ID do tenant na Bivvo
  ADD COLUMN IF NOT EXISTS overdue_since    timestamptz,        -- início da inadimplência
  ADD COLUMN IF NOT EXISTS inactivated_at   timestamptz;        -- inativação (local ou Bivvo)

CREATE INDEX IF NOT EXISTS idx_users_bivvo_tenant_id ON public.users (bivvo_tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_overdue_since   ON public.users (overdue_since);

-- 2) Tabela system_logs (logs de Edge Functions e integrações) ---------------
CREATE TABLE IF NOT EXISTS public.system_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source     text NOT NULL,             -- ex: 'bivvo-api', 'asaas-webhook'
  level      text NOT NULL DEFAULT 'info', -- info | warn | error
  message    text NOT NULL,
  context    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL    ON public.system_logs TO service_role;

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem system_logs" ON public.system_logs;
CREATE POLICY "Admins leem system_logs"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_source     ON public.system_logs (source);
CREATE INDEX IF NOT EXISTS idx_system_logs_level      ON public.system_logs (level);

-- 3) Tabela audit_logs (trilha de auditoria de mudanças administrativas) -----
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid,
  action     text NOT NULL,
  table_name text,
  record_id  text,
  old_data   jsonb,
  new_data   jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL    ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins leem audit_logs" ON public.audit_logs;
CREATE POLICY "Admins leem audit_logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record     ON public.audit_logs (table_name, record_id);

-- 4) Toggle do campo de cupom no checkout ------------------------------------
INSERT INTO public.settings (key, value)
VALUES ('checkout_coupon_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 5) Agendamento diário de inativação de inadimplentes (>=5 dias) -----------
-- Requer extensão pg_cron. Se não estiver disponível, ignore este bloco e
-- rode manualmente a Edge Function 'auto-inactivate-overdue' via cron externo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- placeholder: agendamento é configurado no painel Supabase (cron)
    NULL;
  END IF;
END$$;
