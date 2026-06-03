import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, FileText, Info, Users, Smartphone, Plus, Minus, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
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
  const [disparo, setDisparo] = useState(false);
  const [disparoDiscount, setDisparoDiscount] = useState(0);
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
      setPlan('pro');
    }
  }, [users, isLoaded]);

  const config: BivvoConfig = { plan, users, protagonista, telefonia, disparo, disparoDiscount, channels, channelsDiscount };
  const quote = useMemo(() => {
    try { return quoteBivvo(config); } catch { return null; }
  }, [plan, users, protagonista, telefonia, disparo, disparoDiscount, channels, channelsDiscount]);

  const checkoutUrl = useMemo(() => {
    if (!affiliateSlug) return '';
    const cfg = encodeBivvoConfig(config);
    return `${baseUrl}/checkout/${plan}?aff=${affiliateSlug}&cfg=${cfg}`;
  }, [affiliateSlug, plan, users, protagonista, telefonia, disparo, disparoDiscount, channels, channelsDiscount, baseUrl]);


  const proposalText = useMemo(() => {
    if (!quote) return '';
    const lines = quote.channelLines.map(l => `  • ${l.emoji} ${l.label} (${l.qty}×) → ${fmtBRL(l.amount)}`).join('\n');
    const protText = quote.protagonista
      ? `✅ *Modo Preço Protagonista* — cliente paga *${fmtBRL(quote.total1m)}* todos os meses`
      : `💰 1º mês: *${fmtBRL(quote.total1m)}*\n↻ A partir do 2º mês: *${fmtBRL(quote.totalRec)}*/mês`;
    const extras = (quote.channelLines.length || quote.telCost || quote.disparoCost)
      ? `\n📡 *Adicionais:*\n${lines}${quote.channelsDiscountPercent > 0 ? `\n  • 📉 Desconto adicional → ${quote.channelsDiscountPercent}%` : ''}${quote.telCost ? `\n  • 📞 Telefonia → ${fmtBRL(quote.telCost)}` : ''}${quote.disparoCost ? `\n  • 🚀 Módulo de Disparo → ${fmtBRL(quote.disparoCost)}${quote.disparoDiscountPercent > 0 ? ` (-${quote.disparoDiscountPercent}%)` : ''}` : ''}` : '';
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
    <div className="grid lg:grid-cols-[1fr_380px] gap-8">
      <div className="space-y-8">
        {/* SECTION: PLAN SELECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm">1</span>
              Selecione seu Plano Base
            </h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">O 1º mês possui valor promocional. A partir do 2º mês vigora o valor integral.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(PLANS) as PlanSlug[]).map(k => {
              const p = PLANS[k];
              const active = plan === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => { setPlan(k); setUsers(p.users); }}
                  className={`relative flex flex-col p-4 rounded-2xl border-2 text-left transition-all duration-300 ${
                    active 
                    ? 'border-accent bg-accent/5 ring-4 ring-accent/5' 
                    : 'border-border/50 hover:border-accent/30 bg-background/50'
                  }`}
                >
                  {active && (
                    <div className="absolute top-3 right-3 z-10">
                      <CheckCircle2 className="h-5 w-5 text-accent" />
                    </div>
                  )}
                  <span className={`text-xs uppercase font-bold tracking-wider mb-1 ${active ? 'text-accent' : 'text-muted-foreground'}`}>
                    {p.name}
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-bold">{fmtBRL(p.promo)}</span>
                    <span className="text-xs text-muted-foreground font-medium">/1º mês</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Users className="h-3 w-3" />
                    Até {p.users} usuários
                  </div>
                  <div className="text-xs font-semibold mt-1">
                    Recorrência: {fmtBRL(p.full)}
                  </div>
                  {active && (
                    <motion.div 
                      layoutId="plan-active"
                      className="absolute inset-0 border-2 border-accent rounded-2xl pointer-events-none"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* SECTION: CUSTOMIZATION */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm">2</span>
            Personalize sua Experiência
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* USERS CARD */}
            <div className="card-glass rounded-2xl p-5 border border-border/50 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Usuários Adicionais</span>
                </div>
                <Badge variant="secondary" className="font-mono text-xs">
                  R$ 35,00/cada
                </Badge>
              </div>
              
              <div className="flex items-center justify-center gap-6 py-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setUsers(u => Math.max(1, u - 1))}
                  className="h-10 w-10 rounded-full border-2 hover:bg-accent/10 hover:text-accent shadow-sm"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center min-w-[80px]">
                  <motion.span 
                    key={users}
                    initial={{ scale: 1.2, color: '#e94560' }}
                    animate={{ scale: 1, color: 'currentColor' }}
                    className="text-5xl font-bold tabular-nums tracking-tighter"
                  >
                    {users}
                  </motion.span>
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] mt-1">Usuários</span>
                </div>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setUsers(u => u + 1)}
                  className="h-10 w-10 rounded-full border-2 hover:bg-accent/10 hover:text-accent shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {isLoaded && users > PLANS[plan].users && (
                <div className="text-xs text-center p-2 rounded-lg bg-accent/5 text-accent font-semibold animate-in fade-in zoom-in-95">
                  + {users - PLANS[plan].users} excedentes → {fmtBRL((users - PLANS[plan].users) * 35)}/mês
                </div>
              )}
            </div>

            {/* TELEPHONY CARD */}
            <div className="card-glass rounded-2xl p-5 border border-border/50 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Telefonia WhatsApp</span>
                </div>
                <Switch checked={telefonia} onCheckedChange={setTelefonia} className="data-[state=checked]:bg-accent" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Adicione recursos de telefonia diretamente no seu WhatsApp para uma comunicação profissional.
              </p>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custo Fixo</span>
                <span className="text-sm font-bold">{fmtBRL(100)}<span className="text-xs text-muted-foreground font-normal ml-1">/mês</span></span>
              </div>
            </div>

            {/* DISPARO CARD */}
            <div className="card-glass rounded-2xl p-5 border border-border/50 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Módulo de Disparo</span>
                </div>
                <Switch checked={disparo} onCheckedChange={setDisparo} className="data-[state=checked]:bg-accent" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Envie mensagens em massa de forma automatizada e eficiente para toda sua base de contatos.
              </p>
              {disparo && mode === 'affiliate' && (
                <div className="bg-accent/5 p-3 rounded-xl border border-accent/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-accent">Desconto Disparo</Label>
                    <Badge className="bg-accent text-white font-mono text-xs">{disparoDiscount}%</Badge>
                  </div>
                  <input
                    type="range" min="0" max="50" step="5"
                    value={disparoDiscount}
                    onChange={e => setDisparoDiscount(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-accent/20 rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              )}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Custo Fixo</span>
                <div className="text-right">
                  {disparo && disparoDiscount > 0 ? (
                    <>
                      <span className="text-xs text-muted-foreground line-through mr-2">{fmtBRL(197)}</span>
                      <span className="text-sm font-bold text-accent">{fmtBRL(197 * (1 - disparoDiscount/100))}<span className="text-xs text-muted-foreground font-normal ml-1">/mês</span></span>
                    </>
                  ) : (
                    <span className="text-sm font-bold">{fmtBRL(197)}<span className="text-xs text-muted-foreground font-normal ml-1">/mês</span></span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* SECTION: CHANNELS */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CANAIS_DEF.map(c => {
                const qty = channels[c.id] ?? 0;
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold flex items-center gap-2">
                        <img src={c.logo} alt={c.label} className="w-5 h-5 object-contain" /> {c.label}
                      </span>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {c.included} incl. · {fmtBRL(c.unit)}/extra
                      </span>
                    </div>
                    <div className="flex items-center gap-2 bg-background/50 rounded-lg p-1 border">
                      <button 
                        onClick={() => setChannels(s => ({ ...s, [c.id]: Math.max(0, qty - 1) }))}
                        className="w-6 h-6 flex items-center justify-center hover:text-accent transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold tabular-nums">{qty}</span>
                      <button 
                        onClick={() => setChannels(s => ({ ...s, [c.id]: qty + 1 }))}
                        className="w-6 h-6 flex items-center justify-center hover:text-accent transition-colors"
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
            <h3 className="text-xs font-bold flex items-center gap-2 text-muted-foreground uppercase tracking-widest">
              Modo Afiliado
            </h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-accent/5 border border-accent/10">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Preço Protagonista</div>
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
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resumo</span>
            <Badge variant="outline" className="text-xs font-bold border-accent/30 text-accent uppercase tracking-wider px-2 py-0">
              {quote?.planLabel}
            </Badge>
          </div>

          {quote && (
            <div className="space-y-6 relative z-10">
              {/* PRICE BREAKDOWN */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total 1º Mês</span>
                    <span className="text-xs text-muted-foreground font-medium italic">Valor promocional</span>
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={quote.total1m}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-3xl font-bold text-accent tabular-nums"
                    >
                      {fmtBRL(quote.total1m)}
                    </motion.span>
                  </AnimatePresence>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-border/50">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recorrência</span>
                  <AnimatePresence mode="wait">
                    <motion.span 
                      key={quote.totalRec}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-bold tabular-nums"
                    >
                      {fmtBRL(quote.totalRec)}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              {quote.protagonista && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/5 border border-green-500/20 text-green-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-bold leading-tight">Valor fixo de {fmtBRL(quote.total1m)} garantido!</span>
                </div>
              )}

              {/* DETAILS LIST */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-medium border-b border-border/40 pb-2">
                  <span className="text-muted-foreground">Plano Base</span>
                  <span>{fmtBRL(quote.base1m)}</span>
                </div>
                {quote.channelLines.length > 0 && (
                  <div className="space-y-1.5 py-1">
                    {quote.channelLines.map(l => (
                      <div key={l.id} className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-2">
                          <img src={l.logo} alt={l.label} className="w-3.5 h-3.5 object-contain" /> {l.label} ({l.qty})
                          {quote.channelsDiscountPercent > 0 && (
                            <span className="bg-accent/10 text-accent px-1 rounded text-[10px]">-{quote.channelsDiscountPercent}%</span>
                          )}
                        </span>
                        <span className="font-medium">{fmtBRL(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {quote.telCost > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">📞 Telefonia</span>
                    <span className="font-medium">{fmtBRL(quote.telCost)}</span>
                  </div>
                )}
                {quote.disparoCost > 0 && (
                  <div className="flex justify-between text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      🚀 Módulo de Disparo
                      {quote.disparoDiscountPercent > 0 && (
                        <span className="bg-accent/10 text-accent px-1 rounded text-[10px]">-{quote.disparoDiscountPercent}%</span>
                      )}
                    </span>
                    <span className="font-medium">{fmtBRL(quote.disparoCost)}</span>
                  </div>
                )}

              </div>

              {/* ACTIONS */}
              <div className="space-y-3 pt-4">
                {mode === 'customer' ? (
                  <div className="space-y-4">
                    <Button 
                      onClick={() => onCheckout?.(config)} 
                      className="w-full h-14 bg-gradient-to-r from-accent to-primary hover:opacity-90 text-white text-lg font-bold rounded-xl shadow-lg shadow-accent/20 transition-all active:scale-[0.98]"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Assinar Agora
                    </Button>
                    
                    {/* Payment Icons */}
                    <div className="flex items-center justify-center gap-6 opacity-90 pb-2">
                      <svg viewBox="0 0 48 48" className="h-4 w-auto" aria-label="Visa">
                        <path fill="#1A1F71" d="M35.33,12h-3.33L25.33,28.67l-3.33-16.67H18l-5.33,16.67H16l1.33-4.67h6.67l1.33,4.67H32L35.33,12z M20,20.67l2-7.33l2,7.33H20z M3.33,12L0,36h3.33l3.33-24H3.33z M48,12h-3.33l-3.33,12l-3.33-12H34.67L40,36h3.33L48,12z"/>
                        <path fill="#F79E1B" d="M11.33,12H8L2.67,36H6L11.33,12z"/>
                      </svg>
                      <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-7 w-auto object-contain" />
                      <img src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png" alt="Pix" className="h-6 w-auto object-contain" />
                      <div className="flex flex-col items-center gap-0.5 border border-border/60 rounded px-1.5 py-0.5 bg-white shadow-sm">
                        <div className="flex gap-0.5">
                          {[1,1,1,1].map((_,i)=><div key={i} className="w-[1px] h-3 bg-black"/>)}
                          {[1,1,1].map((_,i)=><div key={i} className="w-[2px] h-3 bg-black"/>)}
                          {[1,1].map((_,i)=><div key={i} className="w-[1px] h-3 bg-black"/>)}
                        </div>
                        <span className="text-[7px] font-bold text-black leading-none uppercase">Boleto</span>
                      </div>
                    </div>
                  </div>
                ) : affiliateSlug && (
                  <div className="space-y-3">
                    <Button 
                      onClick={() => copy(checkoutUrl, 'Link copiado')} 
                      className="w-full rounded-xl h-11 font-bold" 
                      size="sm"
                    >
                      <Link2 className="h-4 w-4 mr-2" />Copiar Link Checkout
                    </Button>
                    <Button 
                      onClick={() => copy(proposalText, 'Proposta copiada')} 
                      variant="outline" 
                      className="w-full rounded-xl h-11 font-bold border-2 hover:bg-accent/5 hover:text-accent" 
                      size="sm"
                    >
                      <FileText className="h-4 w-4 mr-2" />Copiar Proposta
                    </Button>
                    <textarea 
                      readOnly 
                      value={proposalText} 
                      className="w-full mt-2 p-3 text-xs rounded-xl border border-border/60 bg-muted/20 h-32 font-mono leading-relaxed" 
                    />
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
