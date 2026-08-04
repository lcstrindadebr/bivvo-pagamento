
-- Colunas de tracking em users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_config_previous jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo_at timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_value numeric,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_at timestamptz;

-- Tabela de log de mudanças
CREATE TABLE IF NOT EXISTS public.bivvo_config_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_email text,
  changed_by_name text,
  action text NOT NULL CHECK (action IN ('edit','sync_bivvo','sync_asaas','rollback')),
  config_before jsonb,
  config_after jsonb,
  asaas_value_before numeric,
  asaas_value_after numeric,
  bivvo_relevant_changed boolean NOT NULL DEFAULT false,
  asaas_value_changed boolean NOT NULL DEFAULT false,
  changed_fields text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bivvo_config_change_logs_user_id
  ON public.bivvo_config_change_logs(user_id, created_at DESC);

GRANT SELECT ON public.bivvo_config_change_logs TO authenticated;
GRANT ALL ON public.bivvo_config_change_logs TO service_role;

ALTER TABLE public.bivvo_config_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config change logs"
  ON public.bivvo_config_change_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
UPDATE public.users
SET bivvo_tenant_id = tenant_bivvo
WHERE tenant_bivvo IS NOT NULL
  AND (bivvo_tenant_id IS NULL OR bivvo_tenant_id = '');

ALTER TABLE public.users DROP COLUMN IF EXISTS tenant_bivvo;-- 1. EXTENSIONS
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
CREATE POLICY "Materials are viewable by affiliates" ON public.marketing_materials FOR SELECT USING (public.has_role(auth.uid(), 'affiliate') OR public.is_admin());-- MIGRATION 003
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
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS tenant_provision_error text;
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@bivvo.com.br';
  v_password TEXT := '@Skol6678';
BEGIN
  -- 1. Verificar se o usuário já existe na tabela de autenticação
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Criar novo usuário na auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(v_password, extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}',
      '{"full_name": "Administrador Bivvo"}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      false
    ) RETURNING id INTO v_user_id;
  ELSE
    -- Atualizar usuário existente
    UPDATE auth.users 
    SET 
      encrypted_password = extensions.crypt(v_password, extensions.gen_salt('bf')),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"], "role": "admin"}',
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;
  END IF;

  -- 2. Garantir que a Role de Admin esteja na tabela user_roles
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');

  -- 3. Garantir que o perfil exista na tabela public.users
  INSERT INTO public.users (id, name, email, status, updated_at)
  VALUES (v_user_id, 'Administrador Bivvo', v_email, 'ativo', now())
  ON CONFLICT (email) DO UPDATE SET 
    id = v_user_id,
    name = 'Administrador Bivvo',
    status = 'ativo',
    updated_at = now();

END $$;-- Corrigir seed de cupons
INSERT INTO public.coupons (code, discount_type, discount_value, active)
VALUES ('BIVVO10', 'percentage', 10, true)
ON CONFLICT (code) DO NOTHING;ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_status text,
  ADD COLUMN IF NOT EXISTS bivvo_status_checked_at timestamptz;-- 1. Criação da tabela de segredos de administrador (caso não exista por migrações anteriores)
CREATE TABLE IF NOT EXISTS public.admin_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Habilitação de RLS e Políticas Restritivas
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política existente para garantir um estado limpo
DROP POLICY IF EXISTS "Admins manage secrets" ON public.admin_secrets;

-- Política: Somente admins podem ver ou gerenciar segredos
CREATE POLICY "Admins manage secrets" 
ON public.admin_secrets 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- 3. Grants de Acesso à API (Data API)
-- Bloqueamos anon e restringimos authenticated ao admin via RLS
REVOKE ALL ON public.admin_secrets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

-- 4. Função de Log de Auditoria Avançada (Security Definer)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para logar alterações em segredos
DROP TRIGGER IF EXISTS audit_admin_secrets ON public.admin_secrets;
CREATE TRIGGER audit_admin_secrets
AFTER INSERT OR UPDATE OR DELETE ON public.admin_secrets
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
-- Revogar execução pública de funções críticas SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_on_affiliate_commission_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_on_affiliate_commission_deleted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_affiliate_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) FROM PUBLIC;

-- Garantir acesso apenas a roles autenticadas e serviço
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_action() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_on_affiliate_commission_created() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_on_affiliate_commission_deleted() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_affiliate_fields() TO authenticated, service_role;

-- track_affiliate_click precisa de acesso anônimo pois é usado no checkout sem login
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) TO anon, authenticated, service_role;
INSERT INTO public.plans (slug, name, price, price_recurring, description, features, popular, sort_order, active, gradient, icon)
VALUES 
('standard', 'Standard', 349.00, 349.00, 'Ideal para pequenas equipes.', '[{"text": "Até 3 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Suporte por Chat", "included": true}]', false, 1, true, 'from-blue-500 to-indigo-500', 'Package'),
('silver', 'Silver', 549.00, 549.00, 'Para empresas em crescimento.', '[{"text": "Até 6 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Suporte Prioritário", "included": true}]', true, 2, true, 'from-blue-600 to-cyan-500', 'Zap'),
('pro', 'Pro', 949.00, 949.00, 'Solução completa para grandes operações.', '[{"text": "Até 12 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Gerente de Conta", "included": true}]', false, 3, true, 'from-indigo-600 to-purple-600', 'Shield')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  price_recurring = EXCLUDED.price_recurring,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  popular = EXCLUDED.popular,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  gradient = EXCLUDED.gradient,
  icon = EXCLUDED.icon;GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT SELECT, INSERT ON public.customers TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT ON public.users TO anon;
GRANT SELECT, INSERT ON public.subscriptions TO anon, authenticated;
GRANT SELECT, INSERT ON public.payments TO anon, authenticated;
GRANT SELECT ON public.affiliates TO anon, authenticated;

-- Ensure RLS policies exist for plans (public read)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'plans' AND policyname = 'Allow public select'
    ) THEN
        CREATE POLICY "Allow public select" ON public.plans FOR SELECT USING (true);
    END IF;
END
$$;CREATE TABLE public.channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    label text NOT NULL,
    included integer NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    emoji text,
    icon_url text,
    sort_order integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.channels TO anon, authenticated;
GRANT ALL ON public.channels TO service_role;
GRANT ALL ON public.channels TO authenticated; -- Allow admins (via RLS)

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are publicly readable" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Admins manage everything" ON public.channels FOR ALL USING (public.is_admin());

-- Seed initial channels from current hardcoded list
INSERT INTO public.channels (slug, label, included, unit_price, emoji, icon_url, sort_order)
VALUES 
('waof',   'WhatsApp API Oficial',     1, 100, '📱', 'https://cdn.simpleicons.org/whatsapp/%2325D366', 1),
('wano',   'WhatsApp API não oficial', 1, 50,  '💬', 'https://cdn.simpleicons.org/whatsapp/%2325D366', 2),
('ig',     'Instagram',                1, 50,  '📸', 'https://cdn.simpleicons.org/instagram/%23E4405F', 3),
('fb',     'Facebook',                 1, 50,  '📘', 'https://cdn.simpleicons.org/facebook/%231877F2', 4),
('email',  'E-mail',                   1, 50,  '✉️',  'https://cdn.simpleicons.org/gmail/%23EA4335', 5),
('olx',    'OLX',                      0, 100, '🏷️', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/OLX_2019.svg/512px-OLX_2019.svg.png', 6),
('tiktok', 'TikTok',                   0, 100, '🎵', 'https://cdn.simpleicons.org/tiktok/%23000000', 7),
('ml',     'Mercado Livre',            0, 100, '🛒', 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small.png', 8),
('li',     'LinkedIn',                 0, 100, '💼', 'https://cdn.simpleicons.org/linkedin/%230A66C2', 9),
('yt',     'YouTube',                  0, 100, '▶️',  'https://cdn.simpleicons.org/youtube/%23FF0000', 10),
('woo',    'WooCommerce',              0, 100, '🛍️', 'https://cdn.simpleicons.org/woocommerce/%2396588A', 11)
ON CONFLICT (slug) DO NOTHING;DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
CREATE POLICY "Admins manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.users (id, email, name, status, bivvo_status)
SELECT id, email, 'Admin Bivvo', 'active', 'active'
FROM auth.users
WHERE email = 'admin@bivvo.com.br'
ON CONFLICT (id) DO UPDATE SET bivvo_status = 'active';

GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
