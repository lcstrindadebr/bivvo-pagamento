-- Ensure RLS is enabled for all relevant tables
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
    DROP POLICY IF EXISTS "Admins can manage plans" ON public.plans;
    DROP POLICY IF EXISTS "Coupons are viewable by everyone" ON public.coupons;
    DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
    DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
    DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
    DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
    DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
    DROP POLICY IF EXISTS "Admins can manage payments" ON public.payments;
    DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
    DROP POLICY IF EXISTS "Affiliates can view own profile" ON public.affiliates;
    DROP POLICY IF EXISTS "Admins can manage affiliates" ON public.affiliates;
    DROP POLICY IF EXISTS "Affiliates can view own sales" ON public.affiliate_sales;
    DROP POLICY IF EXISTS "Admins can manage affiliate sales" ON public.affiliate_sales;
    DROP POLICY IF EXISTS "Affiliates can view own commissions" ON public.affiliate_commissions;
    DROP POLICY IF EXISTS "Admins can manage affiliate commissions" ON public.affiliate_commissions;
END $$;

-- PLANS
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Admins can manage plans" ON public.plans FOR ALL USING (public.is_admin());

-- COUPONS
CREATE POLICY "Coupons are viewable by everyone" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.is_admin());

-- USERS
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can manage users" ON public.users FOR ALL USING (public.is_admin());

-- USER_ROLES
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- CUSTOMERS (Admin only)
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (public.is_admin());

-- SUBSCRIPTIONS (Admin only, user info is in 'users' table)
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions FOR ALL USING (public.is_admin());

-- PAYMENTS
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.is_admin());

-- EXPENSES (Admin only)
CREATE POLICY "Admins can manage expenses" ON public.expenses FOR ALL USING (public.is_admin());

-- AFFILIATES
CREATE POLICY "Affiliates can view own profile" ON public.affiliates FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins can manage affiliates" ON public.affiliates FOR ALL USING (public.is_admin());

-- AFFILIATE_SALES
CREATE POLICY "Affiliates can view own sales" ON public.affiliate_sales FOR SELECT 
USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage affiliate sales" ON public.affiliate_sales FOR ALL USING (public.is_admin());

-- AFFILIATE_COMMISSIONS
CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions FOR SELECT 
USING (affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid()));
CREATE POLICY "Admins can manage affiliate commissions" ON public.affiliate_commissions FOR ALL USING (public.is_admin());
