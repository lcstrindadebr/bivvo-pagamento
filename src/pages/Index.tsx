import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import bivvoLogo from '@/assets/bivvo-logo.png';
import BivvoCalculator from '@/components/affiliate/BivvoCalculator';
import { encodeBivvoConfig, loadPlansFromDB, type BivvoConfig } from '@/lib/bivvo-calc';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoaded, setIsLoaded] = useState(false);
  const aff = searchParams.get('aff');

  useEffect(() => {
    loadPlansFromDB().then(() => setIsLoaded(true));
  }, []);

  useEffect(() => {
    if (aff) {
      const trackClick = async () => {
        try {
          await supabase.rpc('track_affiliate_click', {
            p_affiliate_slug: aff,
            p_ip: null, // Managed by PG if needed or ignored
            p_ua: navigator.userAgent,
            p_ref: document.referrer,
            p_path: window.location.pathname
          });
        } catch (e) {
          console.error('Click tracking failed:', e);
        }
      };
      trackClick();
    }
  }, [aff]);

  const handleCheckout = (config: BivvoConfig) => {
    const cfg = encodeBivvoConfig(config);
    const params = new URLSearchParams();
    if (aff) params.set('aff', aff);
    params.set('cfg', cfg);
    navigate(`/checkout/${config.plan}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="relative py-6 px-4 border-b border-border/30 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={bivvoLogo} alt="Bivvo" className="h-8" />
        </div>
      </header>

      {/* Main Content (Calculator) */}
      <section id="pricing" className="relative py-12 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-border/30 rounded-xl p-[1.25rem] md:p-[1.5rem] transition-all duration-200">
            {isLoaded ? (
              <BivvoCalculator 
                mode="customer" 
                onCheckout={handleCheckout}
              />
            ) : (
              <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
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