
-- Finance snapshots & events for intelligent financial tracking

CREATE TABLE IF NOT EXISTS public.finance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  reference_id text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_events_type_ref
  ON public.finance_events(event_type, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_events_occurred_at
  ON public.finance_events(occurred_at);

CREATE INDEX IF NOT EXISTS idx_finance_events_type
  ON public.finance_events(event_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_events TO authenticated;
GRANT ALL ON public.finance_events TO service_role;

ALTER TABLE public.finance_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage finance_events"
  ON public.finance_events FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


CREATE TABLE IF NOT EXISTS public.finance_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL UNIQUE,
  gross_revenue numeric(14,2) NOT NULL DEFAULT 0,
  net_revenue numeric(14,2) NOT NULL DEFAULT 0,
  refunds numeric(14,2) NOT NULL DEFAULT 0,
  chargebacks numeric(14,2) NOT NULL DEFAULT 0,
  expenses_total numeric(14,2) NOT NULL DEFAULT 0,
  affiliate_commissions_paid numeric(14,2) NOT NULL DEFAULT 0,
  net_profit numeric(14,2) NOT NULL DEFAULT 0,
  active_subscriptions integer NOT NULL DEFAULT 0,
  overdue_value numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finance_daily_snapshots_date
  ON public.finance_daily_snapshots(date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_daily_snapshots TO authenticated;
GRANT ALL ON public.finance_daily_snapshots TO service_role;

ALTER TABLE public.finance_daily_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage finance_daily_snapshots"
  ON public.finance_daily_snapshots FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_finance_daily_snapshots_updated_at
  BEFORE UPDATE ON public.finance_daily_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Helper to upsert snapshot deltas atomically
CREATE OR REPLACE FUNCTION public.apply_finance_event(
  p_date date,
  p_gross numeric,
  p_net numeric,
  p_refund numeric,
  p_chargeback numeric,
  p_expense numeric,
  p_commission numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    net_revenue = public.finance_daily_snapshots.net_revenue + COALESCE(p_net,0),
    refunds = public.finance_daily_snapshots.refunds + COALESCE(p_refund,0),
    chargebacks = public.finance_daily_snapshots.chargebacks + COALESCE(p_chargeback,0),
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
