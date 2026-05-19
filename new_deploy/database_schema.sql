-- Bivvo Database Schema Export

-- Roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'affiliate');
    END IF;
END
$$;

-- Tables
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    name text NOT NULL,
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
    asaas_customer_id text,
    asaas_subscription_id text,
    status text DEFAULT 'pendente',
    data_expiracao timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(user_id, role)
);

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
    commission_recurring bool NOT NULL DEFAULT false,
    pix_key text,
    pix_key_type text,
    bank_name text,
    bank_agency text,
    bank_account text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id),
    plan text NOT NULL,
    amount numeric NOT NULL,
    status text DEFAULT 'pending',
    asaas_payment_id text,
    asaas_subscription_id text,
    paid_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliate_sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES public.affiliates(id) NOT NULL,
    payment_id uuid REFERENCES public.payments(id),
    user_id uuid REFERENCES public.users(id),
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

CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES public.affiliates(id) NOT NULL,
    sale_id uuid REFERENCES public.affiliate_sales(id) NOT NULL,
    sale_amount numeric NOT NULL,
    commission_percent numeric NOT NULL,
    commission_amount numeric NOT NULL,
    kind text NOT NULL, -- 'first' or 'recurring'
    status text NOT NULL DEFAULT 'pending',
    is_recurring bool DEFAULT false,
    reference_date timestamptz DEFAULT now(),
    paid_at timestamptz,
    asaas_payment_id text,
    payment_proof_url text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    description text NOT NULL,
    amount numeric NOT NULL,
    date timestamptz NOT NULL,
    category text NOT NULL,
    type text NOT NULL DEFAULT 'variable',
    payment_method text,
    recurring_interval text,
    installments_total int4 DEFAULT 1,
    installment_number int4 DEFAULT 1,
    parent_id uuid REFERENCES public.expenses(id),
    is_automatic bool DEFAULT false,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    table_name text,
    record_id text,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.asaas_webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id text UNIQUE,
    event_type text,
    payload jsonb,
    status text DEFAULT 'pending',
    processed_at timestamptz,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    price numeric NOT NULL,
    description text,
    features jsonb NOT NULL DEFAULT '[]',
    popular bool DEFAULT false,
    sort_order int4 DEFAULT 0,
    active bool DEFAULT true,
    gradient text DEFAULT 'from-blue-500 to-indigo-500',
    icon text DEFAULT 'Package',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id uuid REFERENCES public.affiliates(id) NOT NULL,
    referrer text,
    path text,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Basic Admin Policies (Example)
CREATE POLICY "Admins can do everything on user_roles" ON public.user_roles USING (EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'admin'));
