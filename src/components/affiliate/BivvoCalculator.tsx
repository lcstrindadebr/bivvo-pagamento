import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Link2, FileText, Info, Users, Smartphone, Plus, Minus, 
  CheckCircle2, Loader2, MessageSquare, Instagram, Facebook, 
  Mail, Tag, Music2, ShoppingCart, Linkedin, Youtube, ShoppingBag,
  Zap, ArrowRight, ShieldCheck, TrendingUp, HelpCircle, 
  ChevronRight, Phone, Globe, Layers, Settings2
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

        {/* SECTION 3: CHANNELS */}
        <section className="space-y-6">
          <div className="flex items-end justify-between border-b pb-4 border-border/60">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold tracking-tight text-primary">Canais Adicionais</h3>
              <p className="text-sm text-muted-foreground font-medium">Expanda sua presença multicanal</p>
            </div>
          </div>
          
          <div className="bg-card rounded-xl p-8 border border-border shadow-sm">
            {mode === 'affiliate' && (
              <div className="mb-8 p-6 rounded-xl bg-primary/[0.02] border border-primary/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-xs font-black uppercase tracking-[0.2em] text-primary">Desconto nos Canais</Label>
                    <p className="text-[10px] text-muted-foreground font-medium">Aplicar desconto comercial exclusivo para o cliente</p>
                  </div>
                  <Badge className="bg-primary text-white font-bold h-7 px-3">{channelsDiscount}%</Badge>
                </div>
                <div className="relative pt-2">
                  <input 
                    type="range" min="0" max="30" step="5"
                    value={channelsDiscount} 
                    onChange={e => setChannelsDiscount(parseInt(e.target.value))}
                    className="w-full h-2 bg-primary/10 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between mt-2">
                    {[0, 5, 10, 15, 20, 25, 30].map(val => (
                      <span key={val} className="text-[8px] font-black text-muted-foreground uppercase">{val}%</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  <div key={c.id} className="flex flex-col p-5 rounded-xl border border-border bg-background transition-all hover:border-primary/20 hover:shadow-sm group">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center border border-primary/5 group-hover:bg-primary/10 transition-colors">
                        {getIcon(c.id)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-widest text-primary">{c.label}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {c.included} incl. · {fmtBRL(c.unit)}/extra
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-border/40">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setChannels(s => ({ ...s, [c.id]: Math.max(0, qty - 1) }))}
                          className="h-8 w-8 rounded-full hover:bg-primary/5 hover:text-primary"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums text-primary">{qty}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => setChannels(s => ({ ...s, [c.id]: qty + 1 }))}
                          className="h-8 w-8 rounded-full hover:bg-primary/5 hover:text-primary"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {qty > c.included && (
                        <div className="text-[10px] font-bold text-primary">
                          +{qty - c.included} extra
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {mode === 'affiliate' && (
          <section className="p-8 rounded-xl border border-dashed border-border bg-primary/[0.01] space-y-6">
            <div className="flex items-center gap-3 border-b pb-4 border-border/40">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em]">Painel do Afiliado</h3>
            </div>
            
            <div className="flex items-center justify-between p-6 rounded-xl bg-white border border-border shadow-sm group hover:border-primary/30 transition-all">
              <div className="space-y-1">
                <div className="text-sm font-bold text-primary uppercase tracking-tight">Preço Protagonista</div>
                <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                  Fixar o valor promocional como mensalidade vitalícia.
                </p>
              </div>
              <Switch checked={protagonista} onCheckedChange={setProtagonista} className="data-[state=checked]:bg-primary" />
            </div>
          </section>
        )}
      </div>

      {/* SUMMARY PANEL */}
      <aside className="relative lg:h-full">
        <div className="sticky top-24 space-y-6">
          <div className="bg-primary rounded-2xl p-8 text-white shadow-2xl shadow-primary/20 overflow-hidden relative group transition-all">
            {/* Decorative element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/10 transition-all pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Investimento Total</span>
                <Badge className="bg-white/10 text-white border-white/20 text-[10px] font-bold uppercase tracking-widest px-2 py-0">
                  {quote?.planLabel.split(' ')[1]}
                </Badge>
              </div>

              {quote && (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Primeiro Mês</p>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={quote.total1m}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-black tracking-tighter"
                      >
                        {fmtBRL(quote.total1m)}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="pt-6 border-t border-white/10 space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Recorrência Mensal</p>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={quote.totalRec}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-2xl font-bold tracking-tight text-white/90"
                      >
                        {fmtBRL(quote.totalRec)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}

              <div className="pt-2">
                {mode === 'customer' ? (
                  <Button 
                    onClick={() => onCheckout?.(config)} 
                    className="w-full bg-white text-primary hover:bg-white/90 h-16 text-lg font-black rounded-xl transition-all shadow-xl group"
                  >
                    <span>Assinar Agora</span>
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => copy(checkoutUrl, 'Link copiado')} 
                      className="w-full bg-white text-primary hover:bg-white/90 h-14 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                    >
                      <Link2 className="h-4 w-4 mr-2" />Copiar Checkout
                    </Button>
                    <Button 
                      onClick={() => copy(proposalText, 'Proposta copiada')} 
                      variant="outline"
                      className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 h-14 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      <FileText className="h-4 w-4 mr-2" />Copiar Proposta
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAILED SUMMARY CARD */}
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b pb-4 border-border/60 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Detalhamento
            </h4>
            
            {quote && (
              <div className="space-y-5">
                <div className="flex justify-between items-center group">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Plano Base</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{fmtBRL(quote.base1m)}</span>
                </div>

                {quote.channelLines.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Canais Extras</p>
                    {quote.channelLines.map(l => (
                      <div key={l.id} className="flex justify-between items-center animate-in fade-in slide-in-from-right-2">
                        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                          {l.label} ({l.qty}x)
                        </span>
                        <span className="text-sm font-bold text-primary">{fmtBRL(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {quote.telCost > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-border/40 group">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-3.5 w-3.5 text-primary/40 group-hover:text-primary transition-colors" />
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Telefonia</span>
                    </div>
                    <span className="text-sm font-bold text-primary">{fmtBRL(quote.telCost)}</span>
                  </div>
                )}

                {quote.protagonista && (
                  <div className="p-4 rounded-xl bg-primary/[0.03] border border-primary/10 flex items-start gap-3">
                    <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-[11px] font-black uppercase tracking-widest text-primary">Preço Protagonista</p>
                      <p className="text-[10px] text-primary/70 font-medium leading-relaxed italic">
                        Valor promocional de {fmtBRL(quote.total1m)} fixado permanentemente como sua recorrência mensal.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* HELP CARD */}
          <div className="bg-primary/[0.01] rounded-2xl p-6 border border-dashed border-border flex items-center gap-4 group hover:bg-primary/[0.03] transition-all cursor-help">
            <div className="h-10 w-10 rounded-full bg-primary/5 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-primary uppercase tracking-widest">Dúvidas?</p>
              <p className="text-[10px] text-muted-foreground font-medium">Consulte os termos de uso ou fale com um consultor.</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function round2(n: number) { return Math.round(n * 100) / 100; }