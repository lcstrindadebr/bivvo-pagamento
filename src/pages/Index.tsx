import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Check, Sparkles, Shield, Zap, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import bivvoLogo from '@/assets/bivvo-logo.png';
import { formatCurrency } from '@/lib/validators';
import { supabase } from '@/integrations/supabase/client';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string;
  icon: string;
  features: PlanFeature[];
  popular: boolean;
  gradient: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Shield, Crown, Sparkles,
};

const Index = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (data) setPlans(data as any);
      setLoading(false);
    };
    fetchPlans();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="relative py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <img src={bivvoLogo} alt="Bivvo" className="h-8" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            Escolha o plano ideal para você
          </div>
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Potencialize seu negócio
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Selecione o plano que melhor se adapta às suas necessidades e comece a transformar seus resultados hoje mesmo.
          </p>
        </div>
      </section>

      {/* Plans Grid */}
      <section className="relative py-8 px-4 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[500px] rounded-3xl" />
              ))
            ) : (
              plans.map((plan) => {
                const IconComponent = ICON_MAP[plan.icon] || Zap;
                const gradientColor = plan.gradient.includes('blue') ? '#3b82f6' : plan.gradient.includes('violet') ? '#8b5cf6' : '#f59e0b';
                return (
                  <div
                    key={plan.id}
                    className={`relative card-glass rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                      plan.popular ? 'ring-2 ring-accent shadow-xl shadow-accent/10' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-accent to-primary text-white text-xs font-semibold shadow-lg">
                          <Sparkles className="h-3 w-3" />
                          Mais popular
                        </span>
                      </div>
                    )}

                    <div className="space-y-6">
                      <div className="text-center space-y-4 pt-2">
                        <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${plan.gradient} p-0.5`}>
                          <div className="w-full h-full rounded-2xl bg-background/90 flex items-center justify-center">
                            <IconComponent className="h-7 w-7" style={{ color: gradientColor }} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">{formatCurrency(plan.price)}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                      </div>

                      <ul className="space-y-3">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                              feature.included 
                                ? 'bg-success/20 text-success' 
                                : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              <Check className="h-3 w-3" />
                            </div>
                            <span className={`text-sm ${!feature.included ? 'text-muted-foreground line-through' : ''}`}>
                              {feature.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        onClick={() => navigate(`/checkout/${plan.slug}`)}
                        className={`w-full h-12 text-base font-semibold rounded-xl transition-all ${
                          plan.popular
                            ? 'bg-gradient-to-r from-accent to-primary hover:opacity-90 shadow-lg shadow-accent/30'
                            : 'bg-foreground/10 hover:bg-foreground/20 text-foreground'
                        }`}
                      >
                        Assinar agora
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative py-12 px-4 border-t border-border/50">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-success/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-success" />
              </div>
              <p className="text-sm font-medium">Pagamento seguro</p>
              <p className="text-xs text-muted-foreground">SSL 256-bit</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm font-medium">Ativação imediata</p>
              <p className="text-xs text-muted-foreground">Acesso instantâneo</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Garantia de 7 dias</p>
              <p className="text-xs text-muted-foreground">Satisfação garantida</p>
            </div>
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-amber-500" />
              </div>
              <p className="text-sm font-medium">Suporte dedicado</p>
              <p className="text-xs text-muted-foreground">Equipe especializada</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 text-center text-sm text-muted-foreground">
        <p>© 2025 Bivvo. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
