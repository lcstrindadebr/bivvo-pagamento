-- MIGRATION 003
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',
  priority    TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.official_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  body_text   TEXT NOT NULL,
  media_type  TEXT DEFAULT 'none',
  media_url   TEXT,
  buttons     JSONB DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_templates TO authenticated;
GRANT ALL ON public.official_templates TO service_role;
ALTER TABLE public.official_templates ENABLE ROW LEVEL SECURITY;

-- MIGRATION 004 & Security Hardening
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.track_affiliate_click(text, text, text, text, text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;

DROP POLICY IF EXISTS "Public can view settings" ON public.settings;
CREATE POLICY "Public can read whitelisted settings"
  ON public.settings FOR SELECT TO anon, authenticated
  USING (key = ANY (ARRAY[
    'site_url', 'site_name', 'support_email', 'support_whatsapp', 'cnpj', 'address',
    'timezone', 'brand_logo_url', 'brand_logo_dark_url', 'favicon_url',
    'brand_color_primary', 'brand_color_accent', 'brand_theme_default', 'ga_id', 'meta_pixel_id'
  ]));

-- MIGRATION 005
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS waiting_third_party boolean NOT NULL DEFAULT false;

-- MIGRATION 006
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);

-- MIGRATION 007
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS person_type      text,
  ADD COLUMN IF NOT EXISTS company_name     text,
  ADD COLUMN IF NOT EXISTS bivvo_config     jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_tenant_id  text,
  ADD COLUMN IF NOT EXISTS overdue_since    timestamptz,
  ADD COLUMN IF NOT EXISTS inactivated_at   timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_bivvo_tenant_id ON public.users (bivvo_tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_overdue_since   ON public.users (overdue_since);

CREATE TABLE IF NOT EXISTS public.system_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source     text NOT NULL,
  level      text NOT NULL DEFAULT 'info',
  message    text NOT NULL,
  context    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_logs TO authenticated;
GRANT ALL    ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins leem system_logs" ON public.system_logs FOR SELECT TO authenticated USING (public.is_admin());

-- MIGRATION 008
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key        text PRIMARY KEY,
  value      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage admin_secrets" ON public.admin_secrets FOR ALL TO authenticated USING (public.is_admin());

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_config_previous          jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_updated_at        timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo      jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo_at   timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_value numeric,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_at   timestamptz;

CREATE TABLE IF NOT EXISTS public.bivvo_config_change_logs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by             uuid,
  changed_by_email       text,
  changed_by_name        text,
  action                 text NOT NULL CHECK (action IN ('edit','sync_bivvo','sync_asaas','rollback')),
  config_before          jsonb,
  config_after           jsonb,
  asaas_value_before     numeric,
  asaas_value_after      numeric,
  bivvo_relevant_changed boolean NOT NULL DEFAULT false,
  asaas_value_changed    boolean NOT NULL DEFAULT false,
  changed_fields         text[],
  notes                  text,
  created_at             timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bivvo_config_change_logs TO authenticated;
GRANT ALL ON public.bivvo_config_change_logs TO service_role;
ALTER TABLE public.bivvo_config_change_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view change logs" ON public.bivvo_config_change_logs FOR SELECT TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.finance_daily_snapshots (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date                       date NOT NULL UNIQUE,
  gross_revenue              numeric(14,2) NOT NULL DEFAULT 0,
  net_revenue                numeric(14,2) NOT NULL DEFAULT 0,
  refunds                    numeric(14,2) NOT NULL DEFAULT 0,
  chargebacks                numeric(14,2) NOT NULL DEFAULT 0,
  expenses_total             numeric(14,2) NOT NULL DEFAULT 0,
  affiliate_commissions_paid numeric(14,2) NOT NULL DEFAULT 0,
  net_profit                 numeric(14,2) NOT NULL DEFAULT 0,
  active_subscriptions       integer NOT NULL DEFAULT 0,
  overdue_value              numeric(14,2) NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_daily_snapshots TO authenticated;
GRANT ALL ON public.finance_daily_snapshots TO service_role;
ALTER TABLE public.finance_daily_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage snapshots" ON public.finance_daily_snapshots FOR ALL TO authenticated USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.finance_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type   text NOT NULL,
  reference_id text,
  amount       numeric(14,2) NOT NULL DEFAULT 0,
  net_amount   numeric(14,2),
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_events TO authenticated;
GRANT ALL ON public.finance_events TO service_role;
ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage events" ON public.finance_events FOR ALL TO authenticated USING (public.is_admin());

-- MIGRATION 009
INSERT INTO public.admin_secrets (key, value)
VALUES ('bivvo_api_token', '')
ON CONFLICT (key) DO NOTHING;

-- Final cleanup of RLS and grants
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage everything" ON public.audit_logs;
CREATE POLICY "Admins manage audit logs" ON public.audit_logs FOR ALL TO authenticated USING (public.is_admin());
