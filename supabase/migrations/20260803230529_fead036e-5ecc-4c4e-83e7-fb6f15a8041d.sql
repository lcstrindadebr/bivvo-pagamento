CREATE TABLE public.channels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL UNIQUE,
    label text NOT NULL,
    included integer NOT NULL DEFAULT 0,
    unit_price numeric NOT NULL DEFAULT 0,
    emoji text,
    icon_url text,
    sort_order integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

GRANT SELECT ON public.channels TO anon, authenticated;
GRANT ALL ON public.channels TO service_role;
GRANT ALL ON public.channels TO authenticated; -- Allow admins (via RLS)

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels are publicly readable" ON public.channels FOR SELECT USING (true);
CREATE POLICY "Admins manage everything" ON public.channels FOR ALL USING (public.is_admin());

-- Seed initial channels from current hardcoded list
INSERT INTO public.channels (slug, label, included, unit_price, emoji, icon_url, sort_order)
VALUES 
('waof',   'WhatsApp API Oficial',     1, 100, '📱', 'https://cdn.simpleicons.org/whatsapp/%2325D366', 1),
('wano',   'WhatsApp API não oficial', 1, 50,  '💬', 'https://cdn.simpleicons.org/whatsapp/%2325D366', 2),
('ig',     'Instagram',                1, 50,  '📸', 'https://cdn.simpleicons.org/instagram/%23E4405F', 3),
('fb',     'Facebook',                 1, 50,  '📘', 'https://cdn.simpleicons.org/facebook/%231877F2', 4),
('email',  'E-mail',                   1, 50,  '✉️',  'https://cdn.simpleicons.org/gmail/%23EA4335', 5),
('olx',    'OLX',                      0, 100, '🏷️', 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/OLX_2019.svg/512px-OLX_2019.svg.png', 6),
('tiktok', 'TikTok',                   0, 100, '🎵', 'https://cdn.simpleicons.org/tiktok/%23000000', 7),
('ml',     'Mercado Livre',            0, 100, '🛒', 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small.png', 8),
('li',     'LinkedIn',                 0, 100, '💼', 'https://cdn.simpleicons.org/linkedin/%230A66C2', 9),
('yt',     'YouTube',                  0, 100, '▶️',  'https://cdn.simpleicons.org/youtube/%23FF0000', 10),
('woo',    'WooCommerce',              0, 100, '🛍️', 'https://cdn.simpleicons.org/woocommerce/%2396588A', 11)
ON CONFLICT (slug) DO NOTHING;