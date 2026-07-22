import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MessageCircle, ShieldCheck, Zap, BadgeCheck } from 'lucide-react';
import bivvoLogo from '@/assets/bivvo-logo.png';
import BivvoCalculator from '@/components/affiliate/BivvoCalculator';
import { encodeBivvoConfig, loadPlansFromDB, type BivvoConfig } from '@/lib/bivvo-calc';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/button';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: siteSettings } = useSiteSettings();
  const aff = searchParams.get('aff');

  const supportWhatsapp = (siteSettings?.support_whatsapp || '5511936230279').replace(/\D/g, '');
  const salesUrl = `https://wa.me/${supportWhatsapp}?text=${encodeURIComponent('Olá! Gostaria de falar com o time de vendas da Bivvo.')}`;

  useEffect(() => {
    loadPlansFromDB().then(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (!aff) return;
    (async () => {
      try {
        await supabase.rpc('track_affiliate_click', {
          p_affiliate_slug: aff,
          p_ip: null,
          p_ua: navigator.userAgent,
          p_ref: document.referrer,
          p_path: window.location.pathname,
        });
      } catch (e) {
        console.error('Click tracking failed:', e);
      }
    })();
  }, [aff]);

  const handleCheckout = (config: BivvoConfig) => {
    const cfg = encodeBivvoConfig(config);
    const params = new URLSearchParams();
    if (aff) params.set('aff', aff);
    params.set('cfg', cfg);
    navigate(`/checkout/${config.plan}?${params.toString()}`);
  };

  const integrations = [
    { name: 'WhatsApp API', logo: 'https://cdn.simpleicons.org/whatsapp/%2325D366' },
    { name: 'Instagram', logo: 'https://cdn.simpleicons.org/instagram/%23E4405F' },
    { name: 'Facebook', logo: 'https://cdn.simpleicons.org/facebook/%231877F2' },
    { name: 'Gmail', logo: 'https://cdn.simpleicons.org/gmail/%23EA4335' },
    { name: 'TikTok', logo: 'https://cdn.simpleicons.org/tiktok/%23000000' },
    { name: 'LinkedIn', logo: 'https://cdn.simpleicons.org/linkedin/%230A66C2' },
    { name: 'YouTube', logo: 'https://cdn.simpleicons.org/youtube/%23FF0000' },
    { name: 'WooCommerce', logo: 'https://cdn.simpleicons.org/woocommerce/%2396588A' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* HEADER STICKY */}
      <header className="relative sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2">
            <img src={bivvoLogo} alt="Bivvo" className="h-7 md:h-8" />
          </a>
          <Button
            asChild
            className="h-10 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20 px-4 md:px-5 text-sm font-semibold"
          >
            <a href={salesUrl} target="_blank" rel="noopener noreferrer" aria-label="Falar com vendas no WhatsApp">
              <MessageCircle className="h-4 w-4 md:mr-1.5" />
              <span className="hidden md:inline">Falar com vendas</span>
            </a>
          </Button>
        </div>
      </header>

      {/* CALCULATOR */}
      <main>
        <section id="pricing" className="relative px-4 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8 md:mb-10 max-w-2xl">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                Monte seu plano
              </span>
              <h1 className="mt-3 text-3xl md:text-5xl font-bold tracking-tight leading-[1.05] text-foreground">
                Escolha, personalize e assine em minutos.
              </h1>
              <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                Uma plataforma omnichannel para centralizar seu atendimento e vender mais — sem contratos longos.
              </p>
            </div>

            <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-3xl p-4 md:p-8 shadow-2xl shadow-accent/5">
              {isLoaded ? (
                <BivvoCalculator mode="customer" onCheckout={handleCheckout} />
              ) : (
                <div className="min-h-[400px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* TRUST ROW */}
        <section aria-labelledby="trust-heading" className="relative px-4 pb-16 md:pb-24">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Integrações e confiança
              </span>
              <h2 id="trust-heading" className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
                Conecte todos os canais em um só lugar
              </h2>
            </div>

            <div className="rounded-3xl border border-border/50 bg-background/40 backdrop-blur-xl p-6 md:p-10">
              <ul className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-6 md:gap-8 items-center">
                {integrations.map((i) => (
                  <li key={i.name} className="flex flex-col items-center gap-2 opacity-80 hover:opacity-100 transition-opacity">
                    <img src={i.logo} alt={i.name} className="h-8 w-8 md:h-9 md:w-9 object-contain" />
                    <span className="text-[10px] md:text-xs text-muted-foreground text-center">{i.name}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 pt-8 border-t border-border/40 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <BadgeCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Parceiro Oficial Meta</p>
                    <p className="text-xs text-muted-foreground">WhatsApp Business API</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Pagamento seguro</p>
                    <p className="text-xs text-muted-foreground">SSL 256-bit · PCI-DSS</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <Zap className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Ativação em minutos</p>
                    <p className="text-xs text-muted-foreground">Sem fidelidade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="relative py-12 px-4 border-t border-border/50 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto space-y-4">
          <img src={bivvoLogo} alt="Bivvo" className="h-6 mx-auto opacity-50 grayscale" />
          <p>© 2026 Bivvo. Todos os direitos reservados. CNPJ 61.912.973/0001-91</p>
          <div className="flex justify-center gap-6 mt-4">
            <Link to="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link>
            <Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
