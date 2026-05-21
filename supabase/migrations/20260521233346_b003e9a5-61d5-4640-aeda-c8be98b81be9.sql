-- Add price_recurring column if it doesn't exist
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_recurring NUMERIC(10, 2);

-- Update existing plans with their current recurring prices for consistency
UPDATE public.plans SET price_recurring = 197.90 WHERE slug = 'standard';
UPDATE public.plans SET price_recurring = 389.90 WHERE slug = 'silver';
UPDATE public.plans SET price_recurring = 527.90 WHERE slug = 'pro';

-- For any other plans or new ones, default price_recurring to the base price if not specified
UPDATE public.plans SET price_recurring = price WHERE price_recurring IS NULL;

-- Ensure settings table exists for domain configuration
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Everyone can read settings') THEN
        CREATE POLICY "Everyone can read settings" ON public.settings FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can update settings') THEN
        CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- Insert default site_url
INSERT INTO public.settings (key, value)
VALUES ('site_url', '')
ON CONFLICT (key) DO NOTHING;
