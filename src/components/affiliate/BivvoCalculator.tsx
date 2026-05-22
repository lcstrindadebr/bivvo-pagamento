import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Link2, FileText, Info, Users, Smartphone, Plus, Minus, 
  CheckCircle2, Loader2, MessageSquare, Instagram, Facebook, 
  Mail, Tag, Music2, ShoppingCart, Linkedin, Youtube, ShoppingBag,
  Zap, ArrowRight, ShieldCheck, TrendingUp, HelpCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLANS, CANAIS_DEF, quoteBivvo, fmtBRL, encodeBivvoConfig, type PlanSlug, type BivvoConfig, loadPlansFromDB } from '@/lib/bivvo-calc';
import { useAppUrl } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';

interface Props {
  affiliateSlug?: string;
  mode?: 'affiliate' | 'customer';
  onCheckout?: (config: BivvoConfig) => void;
}

export default function BivvoCalculator({ affiliateSlug, mode = 'affiliate', onCheckout }: Props) {
  const { toast } = useToast();
  const baseUrl = useAppUrl();
  const [isLoaded, setIsLoaded] = useState(false);
  const [plan, setPlan] = useState<PlanSlug>('silver');
  const [users, setUsers] = useState(6);
  const [protagonista, setProtagonista] = useState(false);
  const [telefonia, setTelefonia] = useState(false);
  const [channelsDiscount, setChannelsDiscount] = useState(0);
  const [channels, setChannels] = useState<Record<string, number>>({});

  useEffect(() => {
    loadPlansFromDB().then(() => {
      setIsLoaded(true);
      setChannels(Object.fromEntries(CANAIS_DEF.map(c => [c.id, c.included])));
    });
  }, []);

  // Handle plan auto-switching based on users
  useEffect(() => {
    if (!isLoaded) return;
    
    if (users <= 3 && plan !== 'standard') {
      setPlan('standard');
    } else if (users > 3 && users <= 6 && plan !== 'silver') {
      setPlan('silver');
    } else if (users > 6 && users <= 12 && plan !== 'pro') {
      setPlan('pro');
    } else if (users > 12 && plan !== 'pro') {
      // If users exceed pro, we keep it as pro (the quote function handles "Plano Personalizado")
      setPlan('pro');
    }
  }, [users, isLoaded]);

  const config: BivvoConfig = { plan, users, protagonista, telefonia, channels, channelsDiscount };
  const quote = useMemo(() => {
    try { return quoteBivvo(config); } catch { return null; }
  }, [plan, users, protagonista, telefonia, channels, channelsDiscount]);

  const checkoutUrl = useMemo(() => {
    if (!affiliateSlug) return '';
    const cfg = encodeBivvoConfig(config);
    return `${baseUrl}/checkout/${plan}?aff=${affiliateSlug}&cfg=${cfg}`;
  }, [affiliateSlug, plan, users, protagonista, telefonia, channels, channelsDiscount, baseUrl]);

  const proposalText = useMemo(() => {
    if (!quote) return '';
    const lines = quote.channelLines.map(l => `  • ${l.emoji} ${l.label} (${l.qty}×) → ${fmtBRL(l.amount)}`).join('\n');
    const protText = quote.protagonista
      ? `✅ *Modo Preço Protagonista* — cliente paga *${fmtBRL(quote.total1m)}* todos os meses`
      : `💰 1º mês: *${fmtBRL(quote.total1m)}*\n↻ A partir do 2º mês: *${fmtBRL(quote.totalRec)}*/mês`;
    const extras = (quote.channelLines.length || quote.telCost)
      ? `\n📡 *Adicionais:*\n${lines}${quote.channelsDiscountPercent > 0 ? `\n  • 📉 Desconto adicional → ${quote.channelsDiscountPercent}%` : ''}${quote.telCost ? '\n  • 📞 Telefonia → R$ 100,00' : ''}` : '';
    return `📋 *Proposta Comercial — Bivvo*
━━━━━━━━━━━━━━━━━━━━━━━
📦 *${quote.planLabel}*
👥 *Usuários:* ${quote.users}${quote.extraUsers > 0 ? ` (${quote.extraUsers} extras × R$ 35,00)` : ''}${extras}
━━━━━━━━━━━━━━━━━━━━━━━
${protText}${checkoutUrl ? `\n\n🔗 Link de checkout:\n${checkoutUrl}` : ''}`;
  }, [quote, checkoutUrl]);

  const copy = (txt: string, label = 'Copiado') => {
    navigator.clipboard.writeText(txt);
    toast({ 
      title: label,
      description: "Conteúdo copiado para a área de transferência."
    });
  };

  if (!isLoaded) return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted-foreground animate-pulse">Carregando planos e preços...</p>
      </div>
    </div>
  );

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-8 max-w-7xl mx-auto">
      <div className="space-y-10">
        {/* SECTION 1: PLAN SELECTION */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b pb-4 border-border/60">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-primary">Plano Base</h3>
              <p className="text-sm text-muted-foreground font-medium">Escolha o ponto de partida ideal para sua operação</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(Object.keys(PLANS) as PlanSlug[]).map(k => {
              const p = PLANS[k];
              const active = plan === k;
              const isSilver = k === 'silver';
              
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setPlan(k); setUsers(p.users); }}
                  className={cn(
                    "relative flex flex-col p-6 rounded-xl border transition-all duration-300 text-left",
                    active 
                      ? "border-primary bg-primary/[0.02] shadow-[0_0_0_1px_rgba(0,32,58,1)]" 
                      : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                  )}
                >
                  {isSilver && (
                    <div className="absolute -top-3 left-6 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-widest shadow-sm">
                      Recomendado
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className={cn(
                      "text-xs font-bold uppercase tracking-widest",
                      active ? "text-primary" : "text-muted-foreground"
                    )}>
                      {p.name}
                    </span>
                    {active && <CheckCircle2 className="h-4 w-4 text-primary fill-primary/10" />}
                  </div>
                  
                  <div className="mt-auto space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold tracking-tight text-primary">{fmtBRL(p.promo)}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">/1º Mês</span>
                    </div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Recorrência: {fmtBRL(p.full)}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground italic">Inclui {p.users} usuários</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: CUSTOMIZATION */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b pb-4 border-border/60">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-primary">Configurações e Adicionais</h3>
              <p className="text-sm text-muted-foreground font-medium">Personalize a capacidade e recursos extras</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* USERS CARD */}
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold uppercase tracking-widest text-primary">Equipe de Atendimento</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">Adicione mais usuários à sua operação</p>
                </div>
                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 font-bold px-3 py-1">
                  {fmtBRL(35)}/u
                </Badge>
              </div>
              
              <div className="flex items-center justify-center gap-10">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setUsers(u => Math.max(1, u - 1))}
                  className="h-14 w-14 rounded-full border-2 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                >
                  <Minus className="h-6 w-6" />
                </Button>
                
                <div className="flex flex-col items-center">
                  <motion.span 
                    key={users}
                    initial={{ scale: 1.1, opacity: 0.8 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-black text-primary tabular-nums tracking-tighter"
                  >
                    {users}
                  </motion.span>
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.3em] mt-1">Colaboradores</span>
                </div>

                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setUsers(u => u + 1)}
                  className="h-14 w-14 rounded-full border-2 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
              
              <div className="pt-6 border-t border-border/40">
                {isLoaded && users > PLANS[plan].users ? (
                  <div className="flex items-center gap-3 text-[11px] font-bold text-primary bg-primary/[0.03] p-4 rounded-lg border border-primary/10">
                    <Zap className="h-4 w-4 fill-primary/10" />
                    <span>+{users - PLANS[plan].users} usuários extras inclusos na proposta</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-center text-muted-foreground font-medium">Utilizando capacidade padrão do plano</p>
                )}
              </div>
            </div>

            {/* TELEPHONY CARD */}
            <div className="bg-card rounded-xl p-8 border border-border shadow-sm flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-bold uppercase tracking-widest text-primary">Telefonia WA</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-medium">Chamadas profissionais integradas</p>
                  </div>
                  <Switch checked={telefonia} onCheckedChange={setTelefonia} className="data-[state=checked]:bg-primary" />
                </div>
                
                <div className="bg-primary/[0.01] rounded-lg border border-border/60 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /></div>
                    <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">Chamadas de áudio e vídeo ilimitadas para seus atendentes.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /></div>
                    <p className="text-[11px] font-medium leading-relaxed text-muted-foreground">Gravação de chamadas disponível no histórico do cliente.</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-6 border-t border-border/40 mt-auto">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Investimento Mensal</span>
                <div className="text-2xl font-bold text-primary">{fmtBRL(100)}</div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION: CHANNELS */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm">3</span>
            Canais de Atendimento
          </h3>
          
          <div className="card-glass rounded-2xl p-6 border border-border/50 space-y-6">
            {mode === 'affiliate' && (
              <div className="bg-accent/5 p-4 rounded-xl border border-accent/20 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-widest text-accent">Desconto nos Canais</Label>
                  <Badge className="bg-accent text-white font-mono">{channelsDiscount}%</Badge>
                </div>
                <input 
                  type="range" min="0" max="30" step="5"
                  value={channelsDiscount} 
                  onChange={e => setChannelsDiscount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-accent/20 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CANAIS_DEF.map(c => {
                const qty = channels[c.id] ?? 0;
                
                const getIcon = (id: string) => {
                  switch (id) {
                    case 'waof':
                    case 'wano': return <MessageSquare className="h-4 w-4" />;
                    case 'ig': return <Instagram className="h-4 w-4" />;
                    case 'fb': return <Facebook className="h-4 w-4" />;
                    case 'email': return <Mail className="h-4 w-4" />;
                    case 'olx': return <Tag className="h-4 w-4" />;
                    case 'tiktok': return <Music2 className="h-4 w-4" />;
                    case 'ml': return <ShoppingCart className="h-4 w-4" />;
                    case 'li': return <Linkedin className="h-4 w-4" />;
                    case 'yt': return <Youtube className="h-4 w-4" />;
                    case 'woo': return <ShoppingBag className="h-4 w-4" />;
                    default: return <MessageSquare className="h-4 w-4" />;
                  }
                };

                return (
                  <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/40 hover:bg-background/60 transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center text-muted-foreground group-hover:text-accent group-hover:border-accent/30 transition-colors">
                        {getIcon(c.id)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider">{c.label}</span>
                        <span className="text-[10px] text-muted-foreground font-medium">
                          {c.included} incl. · {fmtBRL(c.unit)}/extra
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-background/80 rounded-full p-1 border shadow-sm">
                      <button 
                        onClick={() => setChannels(s => ({ ...s, [c.id]: Math.max(0, qty - 1) }))}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent/10 hover:text-accent transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black tabular-nums">{qty}</span>
                      <button 
                        onClick={() => setChannels(s => ({ ...s, [c.id]: qty + 1 }))}
                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-accent/10 hover:text-accent transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {mode === 'affiliate' && (
          <section className="space-y-4 p-5 rounded-2xl border-2 border-dashed border-border/60">
            <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              Modo Afiliado
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
              <div className="space-y-0.5">
                <div className="text-sm font-bold">Preço Protagonista</div>
                <div className="text-xs text-muted-foreground">Valor promocional torna-se a recorrência fixa.</div>
              </div>
              <Switch checked={protagonista} onCheckedChange={setProtagonista} className="data-[state=checked]:bg-accent" />
            </div>
          </section>
        )}
      </div>

      {/* SUMMARY PANEL */}
      <aside className="relative">
        <div className="card-glass rounded-[2rem] p-6 border-2 border-accent/20 sticky top-24 space-y-6 shadow-2xl shadow-accent/5 overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Resumo do Investimento</span>
            <Badge variant="outline" className="text-[10px] font-bold border-accent/30 text-accent uppercase tracking-wider px-2 py-0">
              {quote?.planLabel}
            </Badge>
          </div>

          {quote && (
            <div className="space-y-6 relative z-10">
              {/* PRICE BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Total 1º Mês</span>
                    <span className="text-xs text-muted-foreground font-medium italic">Valor promocional</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={quote.total1m}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-3xl font-black text-accent tabular-nums"
                    >
                      {fmtBRL(quote.total1m)}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recorrência Mensal</span>
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={quote.totalRec}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-lg font-bold tabular-nums"
                    >
                      {fmtBRL(quote.totalRec)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {quote.protagonista && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-[11px] font-bold leading-tight">Valor fixo de {fmtBRL(quote.total1m)} garantido para sempre!</span>
                </div>
              )}

              {/* DETAILS LIST */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest border-b border-border/40 pb-3">
                  <span className="text-muted-foreground">Detalhamento</span>
                  <span className="text-accent">Subtotal</span>
                </div>
                
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <ShieldCheck className="h-3 w-3" /> Plano Base
                  </span>
                  <span>{fmtBRL(quote.base1m)}</span>
                </div>

                {quote.channelLines.length > 0 && (
                  <div className="space-y-2 py-1">
                    {quote.channelLines.map(l => {
                      const getIcon = (id: string) => {
                        switch (id) {
                          case 'waof':
                          case 'wano': return <MessageSquare className="h-3 w-3" />;
                          case 'ig': return <Instagram className="h-3 w-3" />;
                          case 'fb': return <Facebook className="h-3 w-3" />;
                          case 'email': return <Mail className="h-3 w-3" />;
                          case 'olx': return <Tag className="h-3 w-3" />;
                          case 'tiktok': return <Music2 className="h-3 w-3" />;
                          case 'ml': return <ShoppingCart className="h-3 w-3" />;
                          case 'li': return <Linkedin className="h-3 w-3" />;
                          case 'yt': return <Youtube className="h-3 w-3" />;
                          case 'woo': return <ShoppingBag className="h-3 w-3" />;
                          default: return <MessageSquare className="h-3 w-3" />;
                        }
                      };

                      return (
                        <div key={l.id} className="flex justify-between text-[10px] font-medium animate-in fade-in slide-in-from-right-2">
                          <span className="text-muted-foreground flex items-center gap-2">
                            {getIcon(l.id)} {l.label} ({l.qty}x)
                            {quote.channelsDiscountPercent > 0 && (
                              <Badge variant="outline" className="text-[7px] h-3 px-1 border-accent/20 text-accent bg-accent/5">-{quote.channelsDiscountPercent}%</Badge>
                            )}
                          </span>
                          <span>{fmtBRL(l.amount)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {quote.telCost > 0 && (
                  <div className="flex justify-between text-[11px] font-bold pt-2 border-t border-border/40">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Smartphone className="h-3 w-3" /> Telefonia
                    </span>
                    <span>{fmtBRL(quote.telCost)}</span>
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="space-y-4 pt-6">
                {mode === 'customer' ? (
                  <div className="space-y-6">
                    <Button 
                      onClick={() => onCheckout?.(config)} 
                      className="w-full bg-accent hover:bg-accent/90 text-white h-16 text-lg font-black rounded-xl shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                    >
                      <span>Ativar Plataforma</span>
                      <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    
                    {/* Payment Icons */}
                    <div className="flex flex-col items-center gap-4">
                      <div className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pagamento Seguro</div>
                      <div className="flex items-center justify-center gap-6 opacity-70 grayscale hover:grayscale-0 transition-all">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto object-contain" />
                        <img src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png" alt="Pix" className="h-5 w-auto object-contain" />
                        <div className="flex flex-col items-center gap-0.5 border border-border/60 rounded px-1.5 py-0.5 bg-white shadow-sm">
                          <div className="flex gap-0.5">
                            {[1,1,1,1].map((_,i)=><div key={i} className="w-[1px] h-3 bg-black"/>)}
                            {[1,1,1].map((_,i)=><div key={i} className="w-[2px] h-3 bg-black"/>)}
                          </div>
                          <span className="text-[7px] font-bold text-black leading-none uppercase">Boleto</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : affiliateSlug && (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => copy(checkoutUrl, 'Link copiado')} 
                      className="w-full rounded-xl h-14 font-black uppercase tracking-wider text-xs shadow-md shadow-accent/10" 
                    >
                      <Link2 className="h-4 w-4 mr-2" />Copiar Link Checkout
                    </Button>
                    <Button 
                      onClick={() => copy(proposalText, 'Proposta copiada')} 
                      variant="outline" 
                      className="w-full rounded-xl h-14 font-black uppercase tracking-wider text-xs border-2 hover:bg-accent/5 hover:text-accent shadow-sm" 
                    >
                      <FileText className="h-4 w-4 mr-2" />Copiar Proposta
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function round2(n: number) { return Math.round(n * 100) / 100; }