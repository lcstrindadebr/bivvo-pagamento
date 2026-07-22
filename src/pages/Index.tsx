import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles, Zap, HeartHandshake, ShieldCheck, ArrowRight, MessageCircle, Rocket, CreditCard, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import bivvoLogo from '@/assets/bivvo-logo.png';
import BivvoCalculator from '@/components/affiliate/BivvoCalculator';
import { encodeBivvoConfig, loadPlansFromDB, type BivvoConfig } from '@/lib/bivvo-calc';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

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
            p_ip: null,
            p_ua: navigator.userAgent,
            p_ref: document.referrer,
            p_path: window.location.pathname,
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

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 overflow-x-hidden">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 gradient-mesh opacity-40 pointer-events-none" />
      {/* Decorative blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative py-4 px-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <img src={bivvoLogo} alt="Bivvo" className="h-8" />
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button onClick={() => scrollTo('recursos')} className="text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </button>
            <button onClick={() => scrollTo('como-funciona')} className="text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </button>
            <button onClick={() => scrollTo('faq')} className="text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </button>
          </nav>
          <Button
            size="sm"
            onClick={() => scrollTo('pricing')}
            className="bg-gradient-to-r from-accent to-primary hover:opacity-90 shadow-lg shadow-accent/20"
          >
            Montar plano <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 md:pt-24 pb-8 md:pb-12 px-4">
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="max-w-4xl mx-auto text-center space-y-6"
        >
          <Badge className="bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15 px-4 py-1.5 gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Parceiro Oficial Meta Business
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
            Atenda, venda e cresça
            <br />
            <span className="text-gradient">com toda sua operação em um só lugar.</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Centralize WhatsApp, Instagram, Facebook e todos seus canais em uma plataforma completa —
            configure seu plano abaixo e ative sua conta em minutos.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => scrollTo('pricing')}
              className="bg-gradient-to-r from-accent to-primary hover:opacity-90 shadow-xl shadow-accent/25 h-12 px-8"
            >
              Montar meu plano <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => scrollTo('como-funciona')}
              className="h-12 px-6"
            >
              <PlayCircle className="mr-2 h-4 w-4" /> Como funciona
            </Button>
          </div>

          <div id="recursos" className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-8 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: 'Setup em minutos', desc: 'Ative sua conta logo após o pagamento.' },
              { icon: HeartHandshake, title: 'Suporte humano', desc: 'Time real acompanha sua operação.' },
              { icon: ShieldCheck, title: 'Sem fidelidade', desc: 'Cancele quando quiser, sem multa.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="card-glass rounded-2xl p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Calculator */}
      <section id="pricing" className="relative py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 md:mb-10 space-y-2"
          >
            <h2 className="text-2xl md:text-4xl font-bold">Monte seu plano</h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
              Personalize usuários, canais e módulos — o preço atualiza em tempo real.
            </p>
          </motion.div>

          <div className="bg-background/40 backdrop-blur-xl border border-border/50 rounded-[2rem] md:rounded-[2.5rem] p-3 md:p-8 shadow-2xl shadow-accent/5">
            {isLoaded ? (
              <BivvoCalculator mode="customer" onCheckout={handleCheckout} />
            ) : (
              <div className="min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            Preço final, sem taxas escondidas
          </p>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="relative py-16 md:py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12 space-y-2">
            <h2 className="text-2xl md:text-4xl font-bold">Como funciona</h2>
            <p className="text-sm md:text-base text-muted-foreground">Do plano montado à conta ativa em 3 passos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { icon: Sparkles, step: '01', title: 'Configure', desc: 'Escolha usuários, canais e módulos que sua operação precisa.' },
              { icon: CreditCard, step: '02', title: 'Pague', desc: 'PIX, boleto ou cartão de crédito — 100% seguro via Asaas.' },
              { icon: Rocket, step: '03', title: 'Ative', desc: 'Sua conta Bivvo é provisionada automaticamente após o pagamento.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="card-glass rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl hover:shadow-accent/10 transition-all"
              >
                <span className="absolute top-4 right-4 text-6xl font-bold text-accent/5 group-hover:text-accent/10 transition-colors">
                  {item.step}
                </span>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                  <item.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10 space-y-2">
            <h2 className="text-2xl md:text-4xl font-bold">Perguntas frequentes</h2>
            <p className="text-sm md:text-base text-muted-foreground">Tudo que você precisa saber antes de começar.</p>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {[
              {
                q: 'Quais formas de pagamento vocês aceitam?',
                a: 'Aceitamos PIX, boleto bancário e cartão de crédito, com processamento seguro via Asaas.',
              },
              {
                q: 'Posso cancelar a qualquer momento?',
                a: 'Sim, não há fidelidade. Você pode cancelar sua assinatura a qualquer momento sem multa.',
              },
              {
                q: 'Quanto tempo leva para ativar minha conta?',
                a: 'Após a confirmação do pagamento, sua conta Bivvo é provisionada automaticamente em poucos minutos.',
              },
              {
                q: 'Como funciona o suporte?',
                a: 'Oferecemos suporte humano em horário comercial, com atendimento por WhatsApp e e-mail para todos os planos.',
              },
              {
                q: 'Posso migrar meus dados de outra plataforma?',
                a: 'Sim. Nosso time de onboarding auxilia na migração dos seus dados e configurações iniciais.',
              },
            ].map((item, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="card-glass rounded-2xl px-5 border-none"
              >
                <AccordionTrigger className="text-sm md:text-base font-medium hover:no-underline text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground mb-4">Ainda tem dúvidas?</p>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="card-glass border-accent/30 hover:bg-accent/10"
            >
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Falar com um especialista
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-12 px-4 border-t border-border/50 mt-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
            <div className="space-y-3">
              <img src={bivvoLogo} alt="Bivvo" className="h-7 opacity-80" />
              <p className="text-xs text-muted-foreground max-w-xs">
                Plataforma completa de atendimento multicanal, integrada aos principais canais do mercado.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Produto</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><button onClick={() => scrollTo('pricing')} className="hover:text-foreground transition-colors">Planos</button></li>
                <li><button onClick={() => scrollTo('recursos')} className="hover:text-foreground transition-colors">Recursos</button></li>
                <li><button onClick={() => scrollTo('faq')} className="hover:text-foreground transition-colors">FAQ</button></li>
              </ul>
            </div>
            <div className="space-y-3">
              <p className="text-sm font-semibold">Legal</p>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li><Link to="/termos-de-uso" className="hover:text-foreground transition-colors">Termos de Uso</Link></li>
                <li><Link to="/politica-de-privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-border/40 text-center text-xs text-muted-foreground">
            © 2026 Bivvo. Todos os direitos reservados. CNPJ 61.912.973/0001-91
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
