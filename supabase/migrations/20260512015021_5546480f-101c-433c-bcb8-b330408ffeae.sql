-- Add columns to link affiliate sales with Asaas entities
ALTER TABLE public.affiliate_sales 
ADD COLUMN IF NOT EXISTS asaas_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Add index for performance on subscription lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_sales_asaas_sub_id ON public.affiliate_sales(asaas_subscription_id);

-- Track if a commission is a recurring one
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- Create an index for recurring commission lookups
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_is_recurring ON public.affiliate_commissions(is_recurring);

-- Ensure we can link commissions back to sales easily
ALTER TABLE public.affiliate_commissions
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT;

CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_asaas_payment_id ON public.affiliate_commissions(asaas_payment_id);
