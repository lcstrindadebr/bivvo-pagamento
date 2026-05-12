import { useNavigate, useSearchParams } from 'react-router-dom';
import bivvoLogo from '@/assets/bivvo-logo.png';
import BivvoCalculator from '@/components/affiliate/BivvoCalculator';
import { encodeBivvoConfig, type BivvoConfig } from '@/lib/bivvo-calc';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const aff = searchParams.get('aff');

  const handleCheckout = (config: BivvoConfig) => {
    const cfg = encodeBivvoConfig(config);
    const params = new URLSearchParams();
    if (aff) params.set('aff', aff);
    params.set('cfg', cfg);
    navigate(`/checkout/${config.plan}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative py-6 px-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <img src={bivvoLogo} alt="Bivvo" className="h-8" />
        </div>
      </header>

      {/* Main Content (Calculator) */}
      <section id="pricing" className="relative py-12 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-4 md:p-8 shadow-2xl shadow-accent/5">
            <BivvoCalculator 
              mode="customer" 
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-border/50 text-center text-sm text-muted-foreground">
        <div className="max-w-6xl mx-auto space-y-4">
          <img src={bivvoLogo} alt="Bivvo" className="h-6 mx-auto opacity-50 grayscale" />
          <p>© 2026 Bivvo. Todos os direitos reservados. CNPJ 00.000.000/0001-00</p>
          <div className="flex justify-center gap-6 mt-4">
            <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;