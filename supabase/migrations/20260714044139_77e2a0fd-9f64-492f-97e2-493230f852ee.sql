
DROP POLICY IF EXISTS "Public can read site_url" ON public.settings;

CREATE POLICY "Public can read whitelisted settings"
  ON public.settings FOR SELECT
  TO anon, authenticated
  USING (key = ANY (ARRAY[
    'site_url',
    'site_name',
    'support_email',
    'support_whatsapp',
    'cnpj',
    'address',
    'timezone',
    'brand_logo_url',
    'brand_logo_dark_url',
    'favicon_url',
    'brand_color_primary',
    'brand_color_accent',
    'brand_theme_default',
    'ga_id',
    'meta_pixel_id'
  ]));
