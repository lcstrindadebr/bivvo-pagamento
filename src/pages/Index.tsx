import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sparkles, Shield, Zap, Crown } from 'lucide-react';
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
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <a href="#features" className="hover:text-accent transition-colors">Funcionalidades</a>
            <a href="#pricing" className="hover:text-accent transition-colors">Preços</a>
            <a href="#support" className="hover:text-accent transition-colors">Suporte</a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium animate-fade-in">
            <Sparkles className="h-4 w-4" />
            O Omni-channel mais completo do mercado
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Escalone seu atendimento<br />em um só lugar
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Personalize seu plano de acordo com sua necessidade. Pague apenas pelo que usar com total transparência e controle.
          </p>
        </div>
      </section>

      {/* Main Content (Calculator) */}
      <section id="pricing" className="relative py-8 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-4 md:p-8 shadow-2xl shadow-accent/5">
            <div className="mb-8 text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold">Simulador de Proposta</h2>
              <p className="text-muted-foreground">Arraste e configure seu ecossistema Bivvo</p>
            </div>
            
            <BivvoCalculator 
              mode="customer" 
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </section>

      {/* Features/Trust Section */}
      <section id="features" className="relative py-20 px-4 border-t border-border/50 bg-background/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold">Performance Extrema</h3>
              <p className="text-muted-foreground leading-relaxed">
                Nossa infraestrutura garante 99.9% de uptime para que você nunca perca uma venda ou atendimento.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-xl font-bold">Segurança de Dados</h3>
              <p className="text-muted-foreground leading-relaxed">
                Criptografia de ponta a ponta e conformidade total com a LGPD em todos os seus canais.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold">Suporte Premium</h3>
              <p className="text-muted-foreground leading-relaxed">
                Time técnico especializado pronto para te ajudar a configurar sua operação em minutos.
              </p>
            </div>
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