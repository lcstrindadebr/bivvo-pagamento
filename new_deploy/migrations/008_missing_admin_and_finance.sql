-- =============================================================================
-- Migration 008 — Admin secrets, Bivvo config change logs, Finance snapshots/events
-- Idempotente. Rodar após 007_bivvo_tenant_and_logs.sql.
-- =============================================================================

-- 1) admin_secrets ----------------------------------------------------------
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
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_admin_secrets_updated_at ON public.admin_secrets;
CREATE TRIGGER update_admin_secrets_updated_at
  BEFORE UPDATE ON public.admin_secrets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Colunas de rastreio do Setup Bivvo em users ---------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_config_previous          jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_updated_at        timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo      jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo_at   timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_value numeric,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_at   timestamptz;

-- 3) bivvo_config_change_logs ----------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_bivvo_config_change_logs_user_id
  ON public.bivvo_config_change_logs(user_id, created_at DESC);

GRANT SELECT ON public.bivvo_config_change_logs TO authenticated;
GRANT ALL ON public.bivvo_config_change_logs TO service_role;

ALTER TABLE public.bivvo_config_change_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view config change logs" ON public.bivvo_config_change_logs;
CREATE POLICY "Admins can view config change logs"
  ON public.bivvo_config_change_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) finance_daily_snapshots -----------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_finance_daily_snapshots_date
  ON public.finance_daily_snapshots(date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_daily_snapshots TO authenticated;
GRANT ALL ON public.finance_daily_snapshots TO service_role;

ALTER TABLE public.finance_daily_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage finance_daily_snapshots" ON public.finance_daily_snapshots;
CREATE POLICY "Admins manage finance_daily_snapshots"
  ON public.finance_daily_snapshots FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS update_finance_daily_snapshots_updated_at ON public.finance_daily_snapshots;
CREATE TRIGGER update_finance_daily_snapshots_updated_at
  BEFORE UPDATE ON public.finance_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) finance_events ---------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_finance_events_occurred_at ON public.finance_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_finance_events_type        ON public.finance_events(event_type);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_events_type_ref
  ON public.finance_events(event_type, reference_id) WHERE reference_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_events TO authenticated;
GRANT ALL ON public.finance_events TO service_role;

ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage finance_events" ON public.finance_events;
CREATE POLICY "Admins manage finance_events"
  ON public.finance_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 6) Função apply_finance_event --------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_finance_event(
  p_date       date,
  p_gross      numeric,
  p_net        numeric,
  p_refund     numeric,
  p_chargeback numeric,
  p_expense    numeric,
  p_commission numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.finance_daily_snapshots (
    date, gross_revenue, net_revenue, refunds, chargebacks,
    expenses_total, affiliate_commissions_paid, net_profit
  ) VALUES (
    p_date,
    COALESCE(p_gross,0),
    COALESCE(p_net,0),
    COALESCE(p_refund,0),
    COALESCE(p_chargeback,0),
    COALESCE(p_expense,0),
    COALESCE(p_commission,0),
    COALESCE(p_net,0) - COALESCE(p_refund,0) - COALESCE(p_chargeback,0)
      - COALESCE(p_expense,0) - COALESCE(p_commission,0)
  )
  ON CONFLICT (date) DO UPDATE SET
    gross_revenue = public.finance_daily_snapshots.gross_revenue + COALESCE(p_gross,0),
    net_revenue   = public.finance_daily_snapshots.net_revenue + COALESCE(p_net,0),
    refunds       = public.finance_daily_snapshots.refunds + COALESCE(p_refund,0),
    chargebacks   = public.finance_daily_snapshots.chargebacks + COALESCE(p_chargeback,0),
    expenses_total = public.finance_daily_snapshots.expenses_total + COALESCE(p_expense,0),
    affiliate_commissions_paid = public.finance_daily_snapshots.affiliate_commissions_paid + COALESCE(p_commission,0),
    net_profit = (public.finance_daily_snapshots.net_revenue + COALESCE(p_net,0))
               - (public.finance_daily_snapshots.refunds + COALESCE(p_refund,0))
               - (public.finance_daily_snapshots.chargebacks + COALESCE(p_chargeback,0))
               - (public.finance_daily_snapshots.expenses_total + COALESCE(p_expense,0))
               - (public.finance_daily_snapshots.affiliate_commissions_paid + COALESCE(p_commission,0)),
    updated_at = now();
END;
$$;
