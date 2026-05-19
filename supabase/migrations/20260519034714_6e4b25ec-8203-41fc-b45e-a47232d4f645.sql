-- Create marketing_materials table
CREATE TABLE public.marketing_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'link', -- 'image', 'video', 'document', 'link'
  url TEXT NOT NULL,
  preview_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins have full access to marketing_materials"
ON public.marketing_materials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Affiliates can view marketing_materials"
ON public.marketing_materials
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'affiliate'
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_marketing_materials_updated_at
BEFORE UPDATE ON public.marketing_materials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage Bucket for marketing materials
INSERT INTO storage.buckets (id, name, public) VALUES ('marketing', 'marketing', true);

-- Storage policies
CREATE POLICY "Public Access to marketing bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'marketing');

CREATE POLICY "Admins can upload to marketing bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'marketing' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can update marketing bucket"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'marketing' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete from marketing bucket"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'marketing' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);