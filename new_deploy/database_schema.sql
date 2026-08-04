-- ==========================================================
-- BIVVO COMPLETE DATABASE SCHEMA (VPS/EXTERNAL DEPLOY)
-- Updated: 2026-08-04
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'affiliate');
    END IF;
END
$$;

-- 3. CORE TABLES

CREATE TABLE IF NOT EXISTS public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL UNIQUE,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

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
    person_type text,
    company_name text,
    bivvo_tenant_id text,
    bivvo_status text,
    bivvo_status_checked_at timestamptz,
    tenant_provisioned_at timestamptz,
    tenant_provision_error text,
    overdue_since timestamptz,
    inactivated_at timestamptz,
    bivvo_config jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

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

CREATE TABLE IF NOT EXISTS public.channels (
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

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  completed_at timestamptz,
  subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  waiting_third_party boolean NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. UTILITY FUNCTIONS (Security Definer)

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean AS $$
   SELECT EXISTS (
     SELECT 1
     FROM public.user_roles
     WHERE user_id = _user_id
       AND role = _role
   )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. INITIAL ADMIN SEED

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@bivvo.com.br';
  v_password TEXT := '@Skol6678';
BEGIN
  -- Criação do usuário na tabela de autenticação (Schema Auth)
  -- Nota: Em VPS externas, o schema auth é gerenciado pelo Supabase/Docker
  -- Este bloco tenta garantir a existência do admin localmente se possível.
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NULL THEN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud)
      VALUES (gen_random_uuid(), v_email, crypt(v_password, gen_salt('bf')), now(), '{"role": "admin"}', '{"full_name": "Admin Bivvo"}', now(), now(), 'authenticated', 'authenticated')
      RETURNING id INTO v_user_id;
    END IF;
  END IF;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin') ON CONFLICT DO NOTHING;
    INSERT INTO public.users (id, name, email, status) VALUES (v_user_id, 'Admin Bivvo', v_email, 'ativo') ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;
