import { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, FileText, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PLANS, CANAIS_DEF, quoteBivvo, fmtBRL, encodeBivvoConfig, type PlanSlug, type BivvoConfig } from '@/lib/bivvo-calc';


interface Props {
  affiliateSlug?: string;
  mode?: 'affiliate' | 'customer';
  onCheckout?: (config: BivvoConfig) => void;
}

export default function BivvoCalculator({ affiliateSlug, mode = 'affiliate', onCheckout }: Props) {
  const { toast } = useToast();
  const [plan, setPlan] = useState<PlanSlug>('silver');
  const [users, setUsers] = useState(6);
  const [protagonista, setProtagonista] = useState(false);
  const [telefonia, setTelefonia] = useState(false);
  const [channelsDiscount, setChannelsDiscount] = useState(0);
  const [channels, setChannels] = useState<Record<string, number>>(
    Object.fromEntries(CANAIS_DEF.map(c => [c.id, c.included]))
  );

  const config: BivvoConfig = { plan, users, protagonista, telefonia, channels, channelsDiscount };
  const quote = useMemo(() => {
    try { return quoteBivvo(config); } catch { return null; }
  }, [plan, users, protagonista, telefonia, channels, channelsDiscount]);

  const checkoutUrl = useMemo(() => {
    if (!affiliateSlug) return '';
    const cfg = encodeBivvoConfig(config);
    return `${window.location.origin}/checkout/${plan}?aff=${affiliateSlug}&cfg=${cfg}`;
  }, [affiliateSlug, plan, users, protagonista, telefonia, channels, channelsDiscount]);

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
    toast({ title: label });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-4">
        {/* PLAN */}
        <div className="card-glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold">📦 Plano base</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">O 1º mês é a oferta inicial e do 2º mês em diante passa a valor cheio recorrente mensal.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PLANS) as PlanSlug[]).map(k => {
              const p = PLANS[k];
              const active = plan === k;
              return (
                <button key={k} type="button" onClick={() => { setPlan(k); setUsers(p.users); }}
                  className={`text-left p-3 rounded-lg border transition ${active ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40'}`}>
                  <div className="font-mono text-xs font-semibold">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.users} usuários</div>
                  <div className="text-base font-bold mt-1 text-xs">1º mês: {fmtBRL(p.promo)}</div>
                  <div className="text-[10px] text-muted-foreground">2º mês: {fmtBRL(p.full)}</div>
                </button>
              );
            })}
          </div>
        </div>


        {/* USERS + PROT */}
        <div className="card-glass rounded-xl p-4 space-y-3">
          <div className="text-sm font-semibold">🎯 Negociação</div>
          {mode === 'affiliate' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
              <div>
                <div className="text-sm font-medium">Preço Protagonista</div>
                <div className="text-xs text-muted-foreground">Promo vira recorrência</div>
              </div>
              <Switch checked={protagonista} onCheckedChange={setProtagonista} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <Label className="flex-1">Nº de usuários</Label>
            <div className="flex items-center border rounded-md">
              <button onClick={() => setUsers(u => Math.max(1, u - 1))} className="w-8 h-8 hover:bg-muted">−</button>
              <Input type="number" value={users} onChange={e => setUsers(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-8 border-0 text-center" />
              <button onClick={() => setUsers(u => u + 1)} className="w-8 h-8 hover:bg-muted">+</button>
            </div>
          </div>
          {users > PLANS[plan].users && (
            <div className="text-xs p-2 rounded bg-amber-500/10 text-amber-700">
              {PLANS[plan].name} + {users - PLANS[plan].users} extras × R$ 35 = {fmtBRL((users - PLANS[plan].users) * 35)}
            </div>
          )}
        </div>

        {/* CHANNELS */}
        <div className="card-glass rounded-xl p-4 space-y-2">
          <div className="text-sm font-semibold">🔌 Canais adicionais</div>
          <div className="text-xs text-muted-foreground mb-2">Apenas o excedente do incluso é cobrado.</div>
          
          {mode === 'affiliate' && (
            <div className="bg-muted/30 p-3 rounded-lg border border-dashed my-4">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Desconto nos Canais Adicionais</Label>
                <Badge variant="secondary" className="text-xs">{channelsDiscount}%</Badge>
              </div>
              <input 
                type="range" 
                min="0" 
                max="30" 
                step="5"
                value={channelsDiscount} 
                onChange={e => setChannelsDiscount(parseInt(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>0%</span>
                <span>15%</span>
                <span>30%</span>
              </div>
            </div>
          )}


          <div className="grid sm:grid-cols-2 gap-2">
            {CANAIS_DEF.map(c => {
              const qty = channels[c.id] ?? 0;
              const extra = Math.max(0, qty - c.included);
              return (
                <div key={c.id} className="border rounded-lg p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{c.emoji} {c.label}</span>
                    <span className="text-muted-foreground">{c.included ? `${c.included} incl.` : 'extra'} · {fmtBRL(c.unit)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => setChannels(s => ({ ...s, [c.id]: Math.max(0, qty - 1) }))} className="w-6 h-6 border rounded hover:bg-muted">−</button>
                    <Input type="number" value={qty} onChange={e => setChannels(s => ({ ...s, [c.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-12 h-7 text-center text-xs" />
                    <button onClick={() => setChannels(s => ({ ...s, [c.id]: qty + 1 }))} className="w-6 h-6 border rounded hover:bg-muted">+</button>
                    {extra > 0 && (
                      <div className="ml-auto text-right">
                        {channelsDiscount > 0 && <div className="text-[10px] text-muted-foreground line-through decoration-destructive/50">{fmtBRL(extra * c.unit)}</div>}
                        <div className="text-xs font-medium">{fmtBRL(round2(extra * c.unit * (1 - channelsDiscount / 100)))}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* TEL */}
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">📞 Telefonia (WhatsApp)</div>
              <div className="text-xs text-muted-foreground">R$ 100,00/mês · sem desconto</div>
            </div>
            <Switch checked={telefonia} onCheckedChange={setTelefonia} />
          </div>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="space-y-4">
        <div className="card-glass rounded-xl p-4 sticky top-4">
          <div className="text-xs font-semibold text-muted-foreground mb-2">RESUMO</div>
          {quote && (
            <>
              <Badge variant="outline" className="mb-2">{quote.planLabel}</Badge>
              <div className="space-y-1 text-sm border-y py-2 my-2">
                <div className="flex justify-between"><span>Plano</span><span>{fmtBRL(quote.base1m)}</span></div>
                {quote.channelLines.map(l => (
                  <div key={l.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{l.emoji} {l.label} ×{l.qty} {quote.channelsDiscountPercent > 0 && <span className="text-[10px] text-accent">(-{quote.channelsDiscountPercent}%)</span>}</span>
                    <span>{fmtBRL(l.amount)}</span>
                  </div>
                ))}
                {quote.telCost > 0 && <div className="flex justify-between text-xs text-muted-foreground"><span>📞 Telefonia</span><span>{fmtBRL(quote.telCost)}</span></div>}
              </div>
              <div className="space-y-1">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={`total1m-${quote.total1m}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-between items-baseline"
                  >
                    <span className="text-xs text-muted-foreground">1º Mês</span>
                    <span className="text-xl font-bold text-accent">{fmtBRL(quote.total1m)}</span>
                  </motion.div>
                </AnimatePresence>
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={`totalRec-${quote.totalRec}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex justify-between items-baseline"
                  >
                    <span className="text-xs text-muted-foreground">Recorrente</span>
                    <span className="text-base font-semibold text-primary">{fmtBRL(quote.totalRec)}</span>
                  </motion.div>
                </AnimatePresence>
              </div>
              {quote.protagonista && <div className="text-xs p-2 rounded bg-green-500/10 text-green-700 mt-2">✅ Cliente paga {fmtBRL(quote.total1m)} para sempre</div>}
            </>
          )}

          {mode === 'affiliate' && affiliateSlug && (
            <div className="mt-4 space-y-2">
              <Button onClick={() => copy(checkoutUrl, 'Link copiado')} className="w-full" size="sm">
                <Link2 className="h-4 w-4 mr-2" />Copiar link checkout
              </Button>
              <Button onClick={() => copy(proposalText, 'Proposta copiada')} variant="outline" className="w-full" size="sm">
                <FileText className="h-4 w-4 mr-2" />Copiar proposta
              </Button>
              <textarea readOnly value={proposalText} className="w-full mt-2 p-2 text-[11px] rounded border bg-muted/30 h-40 font-mono" />
            </div>
          )}

          {mode === 'customer' && (
            <div className="mt-4">
              <Button onClick={() => onCheckout?.(config)} className="w-full bg-accent hover:bg-accent/90 text-white py-6 text-lg font-bold shadow-lg shadow-accent/20">
                Assinar agora
              </Button>
              <div className="mt-4 flex items-center justify-center gap-6 grayscale opacity-60">
                <img src="https://cdn.jsdelivr.net/gh/aayush-05/logos@main/logos/visa.svg" alt="Visa" className="h-4 w-auto" />
                <img src="https://cdn.jsdelivr.net/gh/aayush-05/logos@main/logos/mastercard.svg" alt="Mastercard" className="h-6 w-auto" />
                <img src="https://raw.githubusercontent.com/bacen/pix-dict-api/master/assets/logo-pix-png.png" alt="Pix" className="h-5 w-auto" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function round2(n: number) { return Math.round(n * 100) / 100; }
