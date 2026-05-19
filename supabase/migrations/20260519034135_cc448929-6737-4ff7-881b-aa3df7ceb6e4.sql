-- Table for tracking affiliate link clicks
CREATE TABLE public.affiliate_clicks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all clicks"
    ON public.affiliate_clicks
    FOR SELECT
    USING (is_admin());

CREATE POLICY "Affiliates can view own clicks"
    ON public.affiliate_clicks
    FOR SELECT
    USING (affiliate_id IN (SELECT id FROM affiliates WHERE user_id = auth.uid()));

-- Index for performance
CREATE INDEX idx_aff_clicks_affiliate_id ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_aff_clicks_created_at ON public.affiliate_clicks(created_at);

-- Function to increment clicks (public-ish, but controlled by affiliate_id existence)
CREATE OR REPLACE FUNCTION public.track_affiliate_click(p_affiliate_slug TEXT, p_ip TEXT, p_ua TEXT, p_ref TEXT, p_path TEXT)
RETURNS VOID AS $$
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
