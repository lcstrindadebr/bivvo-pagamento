
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: Only admins can view roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create plans table
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  popular BOOLEAN NOT NULL DEFAULT false,
  gradient TEXT NOT NULL DEFAULT 'from-blue-500 to-cyan-500',
  icon TEXT NOT NULL DEFAULT 'Zap',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Plans are publicly readable (for checkout page)
CREATE POLICY "Plans are publicly readable"
ON public.plans
FOR SELECT
USING (true);

-- Only admins can manage plans
CREATE POLICY "Admins can insert plans"
ON public.plans
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update plans"
ON public.plans
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete plans"
ON public.plans
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Only admins can manage coupons
CREATE POLICY "Admins can view coupons"
ON public.coupons
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial plans from current hardcoded values
INSERT INTO public.plans (slug, name, price, description, features, popular, gradient, icon, sort_order) VALUES
('standard', 'Standard', 147.90, 'Ideal para começar', '[{"text": "Acesso à plataforma", "included": true}, {"text": "Suporte por email", "included": true}, {"text": "Atualizações mensais", "included": true}, {"text": "Relatórios básicos", "included": true}, {"text": "Integrações avançadas", "included": false}, {"text": "Suporte prioritário", "included": false}]', false, 'from-blue-500 to-cyan-500', 'Zap', 0),
('silver', 'Silver', 287.90, 'Mais recursos e suporte', '[{"text": "Acesso à plataforma", "included": true}, {"text": "Suporte por email", "included": true}, {"text": "Atualizações mensais", "included": true}, {"text": "Relatórios avançados", "included": true}, {"text": "Integrações avançadas", "included": true}, {"text": "Suporte prioritário", "included": false}]', true, 'from-violet-500 to-purple-600', 'Shield', 1),
('pro', 'Pro', 429.90, 'Experiência completa', '[{"text": "Acesso à plataforma", "included": true}, {"text": "Suporte por email", "included": true}, {"text": "Atualizações mensais", "included": true}, {"text": "Relatórios avançados", "included": true}, {"text": "Integrações avançadas", "included": true}, {"text": "Suporte prioritário 24/7", "included": true}]', false, 'from-amber-500 to-orange-600', 'Crown', 2);
