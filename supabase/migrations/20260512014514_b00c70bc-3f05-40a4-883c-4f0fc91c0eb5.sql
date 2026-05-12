-- Add cancellation_reason to affiliate_sales
ALTER TABLE public.affiliate_sales 
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add payment_proof_url to affiliate_commissions
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Create storage bucket for payout proofs if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payout-proofs', 'payout-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payout-proofs
CREATE POLICY "Public Access for payout-proofs" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'payout-proofs');

CREATE POLICY "Admins can upload payout-proofs" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'payout-proofs' 
  AND (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

CREATE POLICY "Admins can update payout-proofs" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'payout-proofs' 
  AND (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);
