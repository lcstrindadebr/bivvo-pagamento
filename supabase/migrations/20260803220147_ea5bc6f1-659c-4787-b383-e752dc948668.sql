-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'affiliate');
    END IF;
END
$$;

-- 3. TABLES

-- Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Users (Profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    whatsapp text,
    cpf text,
    billing_name text,
    cep text,
    endereco text,
    numero text,
    complemento text,
    bairro text,
    cidade text,
    estado text,
    plano_ativo text,
    data_expiracao timestamptz,
    asaas_customer_id text,
    status text DEFAULT 'pending',
    asaas_subscription_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    plan_slug text NOT NULL,
    users_count int NOT NULL DEFAULT 1,
    channels_config jsonb NOT NULL DEFAULT '{}',
    is_protagonista boolean NOT NULL DEFAULT false,
    has_telefonia boolean NOT NULL DEFAULT false,
    channels_discount int NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled')),
    account_created boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    plan text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending',
    asaas_payment_id text,
    asaas_subscription_id text,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Plans
CREATE TABLE IF NOT EXISTS public.plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    price numeric NOT NULL,
    price_recurring numeric NOT NULL DEFAULT 0,
    description text,
    features jsonb NOT NULL DEFAULT '[]',
    popular boolean DEFAULT false,
    sort_order integer DEFAULT 0,
    active boolean DEFAULT true,
    gradient text DEFAULT 'from-blue-500 to-indigo-500',
    icon text DEFAULT 'Package',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO public.settings (key, value)
VALUES ('site_url', '')
ON CONFLICT (key) DO NOTHING;

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value numeric NOT NULL,
    active boolean DEFAULT true,
    expires_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Affiliates
CREATE TABLE IF NOT EXISTS public.affiliates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    whatsapp text,
    document text,
    slug text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'active',
    commission_percent numeric NOT NULL DEFAULT 20,
    commission_recurring boolean NOT NULL DEFAULT false,
    pix_key text,
    pix_key_type text,
    bank_name text,
    bank_agency text,
    bank_account text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Affiliate Sales
CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    plan_slug text NOT NULL,
    plan_label text NOT NULL,
    config jsonb NOT NULL DEFAULT '{}',
    amount_first numeric NOT NULL,
    amount_recurring numeric NOT NULL,
    commission_percent numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    asaas_payment_id text,
    asaas_subscription_id text,
    asaas_customer_id text,
    tracking_id text,
    cancellation_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Affiliate Commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    sale_id uuid NOT NULL REFERENCES public.affiliate_sales(id) ON DELETE CASCADE,
    sale_amount numeric NOT NULL,
    commission_percent numeric NOT NULL,
    commission_amount numeric NOT NULL,
    kind text NOT NULL, -- 'first' or 'recurring'
    status text NOT NULL DEFAULT 'pending',
    is_recurring boolean DEFAULT false,
    reference_date timestamptz DEFAULT now(),
    paid_at timestamptz,
    asaas_payment_id text,
    payment_proof_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Affiliate Clicks
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    referrer text,
    path text,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    description text NOT NULL,
    amount numeric(10,2) NOT NULL,
    category text NOT NULL,
    date timestamptz NOT NULL DEFAULT now(),
    type text NOT NULL DEFAULT 'fixed',
    payment_method text DEFAULT 'one_time' CHECK (payment_method IN ('one_time', 'recurring', 'installments')),
    is_automatic boolean DEFAULT false,
    metadata jsonb DEFAULT '{}',
    installments_total integer,
    installment_number integer,
    recurring_interval text CHECK (recurring_interval IN ('monthly', 'weekly', 'yearly')),
    parent_id uuid REFERENCES public.expenses(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    table_name text,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now()
);

-- Asaas Webhooks
CREATE TABLE IF NOT EXISTS public.asaas_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text UNIQUE,
    event_type text,
    payload jsonb,
    status text DEFAULT 'pending',
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Marketing Materials
CREATE TABLE IF NOT EXISTS public.marketing_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    url text NOT NULL,
    preview_url text,
    type text NOT NULL, -- 'image', 'video', 'pdf'
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean AS $$
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
   )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.track_affiliate_click(p_affiliate_slug text, p_ip text, p_ua text, p_ref text, p_path text)
RETURNS void AS $$
DECLARE
    v_affiliate_id UUID;
BEGIN
    SELECT id INTO v_affiliate_id FROM public.affiliates WHERE slug = p_affiliate_slug;

    IF v_affiliate_id IS NOT NULL THEN
        INSERT INTO public.affiliate_clicks (affiliate_id, ip_address, user_agent, referrer, path)
        VALUES (v_affiliate_id, p_ip, p_ua, p_ref, p_path);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_on_affiliate_commission_created()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.expenses (
        description,
        amount,
        category,
        date,
        type,
        is_automatic,
        metadata
    ) VALUES (
        'Comissão Afiliado - ' || NEW.id,
        NEW.commission_amount,
        'Comissões (Afiliados)',
        NEW.created_at,
        'variable',
        true,
        jsonb_build_object('commission_id', NEW.id, 'affiliate_id', NEW.affiliate_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.fn_on_affiliate_commission_deleted()
RETURNS trigger AS $$
BEGIN
    DELETE FROM public.expenses
    WHERE metadata->>'commission_id' = OLD.id::text;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE OR REPLACE FUNCTION public.protect_affiliate_fields()
RETURNS trigger AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  
  IF NEW.commission_percent IS DISTINCT FROM OLD.commission_percent
     OR NEW.commission_recurring IS DISTINCT FROM OLD.commission_recurring
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Somente administradores podem alterar campos protegidos.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) TO anon;

-- ENABLE RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- TRIGGERS
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('customers', 'users', 'subscriptions', 'plans', 'coupons', 'affiliates', 'affiliate_sales', 'affiliate_commissions', 'expenses', 'marketing_materials')
    LOOP
        EXECUTE format('CREATE TRIGGER update_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', t, t);
    END LOOP;
END;
$$;

CREATE TRIGGER on_affiliate_commission_created
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.fn_on_affiliate_commission_created();

CREATE TRIGGER on_affiliate_commission_deleted
BEFORE DELETE ON public.affiliate_commissions
FOR EACH ROW EXECUTE FUNCTION public.fn_on_affiliate_commission_deleted();

CREATE TRIGGER protect_affiliate_fields_trigger
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.protect_affiliate_fields();

-- POLICIES
CREATE POLICY "Admins manage everything" ON public.customers FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.users FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.subscriptions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.user_roles FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.payments FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.plans FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.coupons FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.affiliates FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.affiliate_sales FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.affiliate_commissions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.expenses FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.audit_logs FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.asaas_webhooks FOR ALL USING (public.is_admin());
CREATE POLICY "Admins manage everything" ON public.settings FOR ALL USING (public.is_admin());

CREATE POLICY "Public can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Plans are publicly readable" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Coupons are viewable by everyone" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Affiliate sees self" ON public.affiliates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Affiliate updates own profile" ON public.affiliates FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Affiliate sees own sales" ON public.affiliate_sales FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliate sees own commissions" ON public.affiliate_commissions FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Affiliate sees own clicks" ON public.affiliate_clicks FOR SELECT USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Public can track clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Materials are viewable by affiliates" ON public.marketing_materials FOR SELECT USING (public.has_role(auth.uid(), 'affiliate') OR public.is_admin());