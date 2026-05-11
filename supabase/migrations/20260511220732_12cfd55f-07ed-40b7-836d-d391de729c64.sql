
-- AFFILIATES
CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  document TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  commission_percent NUMERIC NOT NULL DEFAULT 20,
  commission_recurring BOOLEAN NOT NULL DEFAULT true,
  slug TEXT NOT NULL UNIQUE,
  pix_key TEXT,
  pix_key_type TEXT,
  bank_name TEXT,
  bank_agency TEXT,
  bank_account TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_slug ON public.affiliates(slug);

ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage affiliates" ON public.affiliates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Affiliate sees self" ON public.affiliates
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Affiliate may update only safe fields (NOT commission, NOT status)
CREATE POLICY "Affiliate updates own profile" ON public.affiliates
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trigger to lock sensitive fields on self-update
CREATE OR REPLACE FUNCTION public.protect_affiliate_fields()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
     OR NEW.commission_recurring IS DISTINCT FROM OLD.commission_recurring
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.slug IS DISTINCT FROM OLD.slug
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não permitido alterar este campo';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER affiliates_protect BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.protect_affiliate_fields();

CREATE TRIGGER affiliates_updated_at BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AFFILIATE SALES
CREATE TABLE public.affiliate_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  user_id UUID,
  plan_slug TEXT NOT NULL,
  plan_label TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  amount_first NUMERIC NOT NULL,
  amount_recurring NUMERIC NOT NULL,
  commission_percent NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aff_sales_aff ON public.affiliate_sales(affiliate_id);
CREATE INDEX idx_aff_sales_status ON public.affiliate_sales(status);

ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sales" ON public.affiliate_sales
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Affiliate sees own sales" ON public.affiliate_sales
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE TRIGGER aff_sales_updated_at BEFORE UPDATE ON public.affiliate_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- COMMISSIONS
CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.affiliate_sales(id) ON DELETE CASCADE,
  sale_amount NUMERIC NOT NULL,
  commission_percent NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  kind TEXT NOT NULL DEFAULT 'first',
  status TEXT NOT NULL DEFAULT 'pending',
  reference_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_aff_comm_aff ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_aff_comm_sale ON public.affiliate_commissions(sale_id);
CREATE INDEX idx_aff_comm_status ON public.affiliate_commissions(status);

ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage commissions" ON public.affiliate_commissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Affiliate sees own commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated
  USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));

CREATE TRIGGER aff_comm_updated_at BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow user_roles inserts by admins (was missing) for promoting affiliates
CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users see own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Add affiliate_role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Replace existing plans with Bivvo calculator base plans
DELETE FROM public.plans;
INSERT INTO public.plans (slug, name, price, description, features, gradient, icon, popular, sort_order) VALUES
  ('standard','STANDARD',169.90,'3 usuários · valor promocional 1º mês',
   '["3 usuários","1 WhatsApp API Oficial","1 WhatsApp não oficial","1 Instagram","1 Facebook","1 E-mail"]'::jsonb,
   'from-blue-500 to-cyan-500','Zap',false,1),
  ('silver','SILVER',287.90,'6 usuários · plano mais vendido',
   '["6 usuários","1 WhatsApp API Oficial","1 WhatsApp não oficial","1 Instagram","1 Facebook","1 E-mail"]'::jsonb,
   'from-amber-400 to-yellow-500','Star',true,2),
  ('pro','PRO',429.90,'12 usuários · ideal para times maiores',
   '["12 usuários","1 WhatsApp API Oficial","1 WhatsApp não oficial","1 Instagram","1 Facebook","1 E-mail"]'::jsonb,
   'from-purple-500 to-pink-500','Crown',false,3);
