GRANT SELECT ON public.plans TO anon, authenticated;
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
$$;