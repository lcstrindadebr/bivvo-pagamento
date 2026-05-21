-- Add price_recurring column
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_recurring NUMERIC(10, 2);

-- Update existing plans with their current recurring prices
UPDATE public.plans SET price_recurring = 197.90 WHERE slug = 'standard';
UPDATE public.plans SET price_recurring = 389.90 WHERE slug = 'silver';
UPDATE public.plans SET price_recurring = 527.90 WHERE slug = 'pro';

-- For any other plans, default price_recurring to the base price
UPDATE public.plans SET price_recurring = price WHERE price_recurring IS NULL;
