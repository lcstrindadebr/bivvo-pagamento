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

  useEffect(() => {
    if (!isLoaded) return;
    if (users <= 3 && plan !== 'standard') setPlan('standard');
    else if (users > 3 && users <= 6 && plan !== 'silver') setPlan('silver');
    else if (users > 6 && users <= 12 && plan !== 'pro') setPlan('pro');
    else if (users > 12 && plan !== 'pro') setPlan('pro');
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
    return `📋 *Proposta Comercial — Bivvo*\n━━━━━━━━━━━━━━━━━━━━━━━\n📦 *${quote.planLabel}*\n👥 *Usuários:* ${quote.users}${quote.extraUsers > 0 ? ` (${quote.extraUsers} extras × R$ 35,00)` : ''}${extras}\n━━━━━━━━━━━━━━━━━━━━━━━\n${protText}${checkoutUrl ? `\n\n🔗 Link de checkout:\n${checkoutUrl}` : ''}`;
  }, [quote, checkoutUrl]);

  const copy = (txt: string, label = 'Copiado') => {
    navigator.clipboard.writeText(txt);
    toast({ title: label, description: "Conteúdo copiado para a área de transferência." });
  };

  const getChannelIcon = (id: string) => {
    switch (id) {
      case 'waof':
      case 'wano': return <MessageSquare className="h-5 w-5" />;
      case 'ig': return <Instagram className="h-5 w-5" />;
      case 'fb': return <Facebook className="h-5 w-5" />;
      case 'email': return <Mail className="h-5 w-5" />;
      case 'olx': return <Tag className="h-5 w-5" />;
      case 'tiktok': return <Music2 className="h-5 w-5" />;
      case 'ml': return <ShoppingCart className="h-5 w-5" />;
      case 'li': return <Linkedin className="h-5 w-5" />;
      case 'yt': return <Youtube className="h-5 w-5" />;
      case 'woo': return <ShoppingBag className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  if (!isLoaded) return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Sincronizando precificação...</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Header Section */}
          <div className="space-y-2 pb-6 border-b">
            <h2 className="text-3xl font-bold tracking-tight text-primary">Configurador de Soluções</h2>
            <p className="text-muted-foreground max-w-2xl">Desenhe a estrutura ideal para o seu atendimento multicanal com precisão e transparência.</p>
          </div>

          {/* Step 1: Base Tier */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">1</div>
              <h3 className="text-xl font-bold text-primary tracking-tight">Escalabilidade da Operação</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Object.keys(PLANS) as PlanSlug[]).map(k => {
                const p = PLANS[k];
                const active = plan === k;
                const isSilver = k === 'silver';
                
                return (
                  <button
                    key={k}
                    onClick={() => { setPlan(k); setUsers(p.users); }}
                    className={cn(
                      "relative flex flex-col p-6 rounded-xl border transition-all duration-300 text-left h-full",
                      active 
                        ? "border-primary bg-primary/[0.02] ring-1 ring-primary shadow-lg" 
                        : "border-border bg-card hover:border-primary/40 hover:bg-slate-50/50 shadow-sm"
                    )}
                  >
                    {isSilver && (
                      <Badge className="absolute -top-3 right-4 bg-primary text-white font-bold px-3 py-1">RECOMENDADO</Badge>
                    )}
                    
                    <div className="flex justify-between items-start mb-6">
                      <span className={cn(
                        "text-[11px] font-black uppercase tracking-[0.2em]",
                        active ? "text-primary" : "text-muted-foreground"
                      )}>
                        {p.name}
                      </span>
                      {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
                    </div>
                    
                    <div className="mt-auto space-y-4">
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-primary">{fmtBRL(p.promo)}</span>
                          <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">/1º mês</span>
                        </div>
                        <p className="text-[11px] font-semibold text-muted-foreground mt-1 italic">
                          A partir do 2º mês: {fmtBRL(p.full)}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-border/60 flex items-center gap-3">
                        <Users className="h-4 w-4 text-primary/60" />
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Inclui {p.users} usuários</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Step 2: Customization */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">2</div>
              <h3 className="text-xl font-bold text-primary tracking-tight">Capacidade e Especialização</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Users Adjustment */}
              <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary uppercase tracking-tight">Expansão de Time</h4>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Adicione braços à operação</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-primary/20 text-primary font-bold">{fmtBRL(35)}/usuário</Badge>
                </div>
                
                <div className="p-8 flex items-center justify-center gap-12">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setUsers(u => Math.max(1, u - 1))}
                    className="h-16 w-16 rounded-full border-2 hover:bg-primary hover:text-white transition-all shadow-md group"
                  >
                    <Minus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </Button>
                  
                  <div className="flex flex-col items-center">
                    <motion.span 
                      key={users}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-6xl font-black text-primary tracking-tighter tabular-nums"
                    >
                      {users}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.4em] mt-1">Total Equipe</span>
                  </div>

                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => setUsers(u => u + 1)}
                    className="h-16 w-16 rounded-full border-2 hover:bg-primary hover:text-white transition-all shadow-md group"
                  >
                    <Plus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                  </Button>
                </div>
                
                <div className="p-4 bg-primary/[0.02] border-t text-center">
                   {isLoaded && users > PLANS[plan].users ? (
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                        ESTRUTURA: {PLANS[plan].users} inclusos + {users - PLANS[plan].users} adicionais
                      </span>
                   ) : (
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Capacidade dentro do plano base</span>
                   )}
                </div>
              </div>

              {/* Telephony Option */}
              <div className="bg-white rounded-xl border border-border shadow-sm flex flex-col">
                <div className="p-6 bg-slate-50/50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary uppercase tracking-tight">Telefonia WA</h4>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Voz e vídeo integrados</p>
                    </div>
                  </div>
                  <Switch checked={telefonia} onCheckedChange={setTelefonia} className="data-[state=checked]:bg-primary" />
                </div>
                
                <div className="p-6 flex-1 space-y-4">
                  <p className="text-xs text-muted-foreground leading-relaxed font-medium">Habilite chamadas de voz e áudio profissionais diretamente no fluxo de atendimento dos seus colaboradores.</p>
                  <ul className="space-y-2">
                    {['Histórico centralizado', 'Monitoria em tempo real', 'Qualidade enterprise'].map((t, i) => (
                      <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                        <CheckCircle2 className="h-3 w-3 text-primary" /> {t}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 border-t flex items-center justify-between">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assinatura Mensal</span>
                  <span className="text-lg font-black text-primary">{fmtBRL(100)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Step 3: Channels */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold">3</div>
              <h3 className="text-xl font-bold text-primary tracking-tight">Ecosistema Multicanal</h3>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm p-8">
              {mode === 'affiliate' && (
                <div className="mb-10 p-6 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center gap-8">
                  <div className="space-y-1 min-w-[200px]">
                    <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                      <Settings2 className="h-4 w-4" /> Margem de Negociação
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase">Desconto comercial aplicado</p>
                  </div>
                  <div className="flex-1 flex items-center gap-4">
                    <input 
                      type="range" min="0" max="30" step="5"
                      value={channelsDiscount} 
                      onChange={e => setChannelsDiscount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <Badge className="bg-primary text-white font-black text-base px-4 py-1">{channelsDiscount}%</Badge>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {CANAIS_DEF.map(c => {
                  const qty = channels[c.id] ?? 0;
                  return (
                    <div key={c.id} className="group p-5 rounded-xl border border-border bg-white transition-all hover:border-primary/30 hover:shadow-md flex flex-col">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-lg bg-slate-50 text-slate-600 border flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                          {getChannelIcon(c.id)}
                        </div>
                        <div>
                          <h5 className="text-[11px] font-black uppercase tracking-widest text-primary leading-tight mb-1">{c.label}</h5>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider italic">
                            {c.included > 0 ? `${c.included} INCLUSO` : 'OPCIONAL'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="mt-auto flex items-center justify-between gap-4 pt-4 border-t border-dashed">
                        <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setChannels(s => ({ ...s, [c.id]: Math.max(0, qty - 1) }))}
                            className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm font-black tabular-nums text-primary">{qty}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setChannels(s => ({ ...s, [c.id]: qty + 1 }))}
                            className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] text-muted-foreground font-bold uppercase">Unidade Extra</p>
                          <p className="text-xs font-black text-primary">{fmtBRL(c.unit)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Affiliate Only: Settings */}
          {mode === 'affiliate' && (
            <section className="bg-primary/[0.03] border-2 border-dashed border-primary/20 rounded-xl p-8 space-y-6">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-black text-primary uppercase tracking-[0.2em]">Condições de Afiliado</h3>
              </div>
              
              <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-primary uppercase tracking-tight">Preço Protagonista</h4>
                  <p className="text-xs text-muted-foreground font-medium italic">Transforma o valor promocional do 1º mês em mensalidade vitalícia.</p>
                </div>
                <Switch checked={protagonista} onCheckedChange={setProtagonista} className="data-[state=checked]:bg-primary" />
              </div>
            </section>
          )}
        </div>

        {/* Right Column - Proposal Summary */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-6">
          <div className="bg-primary rounded-2xl shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/[0.03] rounded-full -mr-24 -mt-24 blur-3xl" />
            
            <div className="p-8 relative z-10">
              <div className="flex items-center justify-between mb-10">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Resumo da Solução</span>
                <Badge className="bg-white/10 text-white border-white/20 text-[9px] font-black uppercase px-3 py-1">
                  BIVVO CORE
                </Badge>
              </div>

              {quote && (
                <div className="space-y-10">
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Adesão / 1º Mês</p>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={quote.total1m}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-5xl font-black text-white tracking-tighter tabular-nums"
                      >
                        {fmtBRL(quote.total1m)}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="pt-8 border-t border-white/10 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">Recorrência Mensal</p>
                    <AnimatePresence mode="wait">
                      <motion.div 
                        key={quote.totalRec}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-3xl font-bold text-white/90 tracking-tight tabular-nums"
                      >
                        {fmtBRL(quote.totalRec)}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  <div className="pt-4">
                    {mode === 'customer' ? (
                      <Button 
                        onClick={() => onCheckout?.(config)} 
                        className="w-full bg-white text-primary hover:bg-slate-100 h-16 text-xl font-black rounded-xl transition-all shadow-xl group"
                      >
                        ASSINAR AGORA
                        <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    ) : (
                      <div className="space-y-3">
                        <Button 
                          onClick={() => copy(checkoutUrl, 'Checkout copiado')} 
                          className="w-full bg-white text-primary hover:bg-slate-100 h-14 text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg"
                        >
                          <Link2 className="mr-2 h-4 w-4" /> COPIAR LINK CHECKOUT
                        </Button>
                        <Button 
                          onClick={() => copy(proposalText, 'Proposta copiada')} 
                          variant="outline"
                          className="w-full bg-transparent text-white border-white/20 hover:bg-white/10 h-14 text-xs font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          <FileText className="mr-2 h-4 w-4" /> GERAR PROPOSTA TEXTO
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b">
              <Layers className="h-5 w-5 text-primary" />
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary">Composição do Investimento</h4>
            </div>

            {quote && (
              <div className="space-y-6">
                <div className="flex justify-between items-center group">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Base {quote.planSlug}</span>
                  <span className="text-sm font-black text-primary">{fmtBRL(quote.base1m)}</span>
                </div>

                {quote.channelLines.length > 0 && (
                  <div className="space-y-4 pt-4 border-t border-dashed">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Adicionais Multicanal</p>
                    {quote.channelLines.map(l => (
                      <div key={l.id} className="flex justify-between items-center group animate-in fade-in slide-in-from-right-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                          {l.label} ({l.qty}x)
                        </span>
                        <span className="text-xs font-black text-primary">{fmtBRL(l.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {quote.telCost > 0 && (
                  <div className="flex justify-between items-center pt-4 border-t border-dashed group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                      Telefonia WhatsApp
                    </span>
                    <span className="text-xs font-black text-primary">{fmtBRL(quote.telCost)}</span>
                  </div>
                )}

                {quote.protagonista && (
                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 flex gap-4">
                    <Zap className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Oferta Protagonista</p>
                      <p className="text-[10px] text-primary/70 font-bold uppercase leading-relaxed italic">Valor promocional vitalício garantido.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-6 border-t flex flex-col items-center gap-4">
               <div className="flex gap-4 opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6 w-auto" />
                  <img src="https://www.bcb.gov.br/content/estabilidadefinanceira/piximg/logo_pix.png" alt="Pix" className="h-5 w-auto" />
                  <div className="h-5 w-12 bg-slate-200 rounded flex flex-col justify-center items-center gap-[1px]">
                    <div className="flex gap-[1px]">{[1,2,3,4,5,6].map(i=><div key={i} className="w-[1px] h-2 bg-slate-400"/>)}</div>
                    <div className="text-[4px] font-black text-slate-500 leading-none">BOLETO</div>
                  </div>
               </div>
               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tecnologia Certificada Bivvo</p>
            </div>
          </div>

          <button className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl border border-dashed border-border hover:bg-slate-50 transition-all group">
            <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-xs font-black text-muted-foreground uppercase tracking-widest group-hover:text-primary transition-colors">Solicitar Suporte Comercial</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
