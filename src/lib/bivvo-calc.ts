// Shared Bivvo pricing calculator.
import { supabase } from '@/integrations/supabase/client';

export let PLANS: Record<string, { name: string; users: number; promo: number; full: number }> = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
};

export async function loadPlansFromDB() {
  try {
    const { data } = await supabase.from('plans').select('*').order('sort_order');
    if (data && data.length > 0) {
      const dbPlans: any = {};
      data.forEach(p => {
        dbPlans[p.slug] = {
          name: p.name,
          users: p.slug === 'standard' ? 3 : p.slug === 'silver' ? 6 : p.slug === 'pro' ? 12 : 0, // Fallback users
          promo: Number(p.price),
          full: Number(p.price_recurring || p.price)
        };
      });
      // Try to determine users from features if possible, or keep hardcoded defaults for standard slugs
      PLANS = dbPlans;
    }
  } catch (e) {
    console.error('Failed to load plans from DB:', e);
  }
}

export const EXTRA_USER_PRICE = 35;
export const TELEFONIA_PRICE = 100;
export const DISPARO_PRICE = 197;


export const CANAIS_DEF = [
  { id: 'waof',   label: 'WhatsApp API Oficial',     included: 1, unit: 100, emoji: '📱', logo: 'https://cdn.simpleicons.org/whatsapp/%2325D366' },
  { id: 'wano',   label: 'WhatsApp API não oficial', included: 1, unit: 50,  emoji: '💬', logo: 'https://cdn.simpleicons.org/whatsapp/%2325D366' },
  { id: 'ig',     label: 'Instagram',                included: 1, unit: 50,  emoji: '📸', logo: 'https://cdn.simpleicons.org/instagram/%23E4405F' },
  { id: 'fb',     label: 'Facebook',                 included: 1, unit: 50,  emoji: '📘', logo: 'https://cdn.simpleicons.org/facebook/%231877F2' },
  { id: 'email',  label: 'E-mail',                   included: 1, unit: 50,  emoji: '✉️',  logo: 'https://cdn.simpleicons.org/gmail/%23EA4335' },
  { id: 'olx',    label: 'OLX',                      included: 0, unit: 100, emoji: '🏷️', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/OLX_2019.svg/512px-OLX_2019.svg.png' },
  { id: 'tiktok', label: 'TikTok',                   included: 0, unit: 100, emoji: '🎵', logo: 'https://cdn.simpleicons.org/tiktok/%23000000' },
  { id: 'ml',     label: 'Mercado Livre',            included: 0, unit: 100, emoji: '🛒', logo: 'https://http2.mlstatic.com/frontend-assets/ui-navigation/5.21.22/mercadolibre/logo__small.png' },
  { id: 'li',     label: 'LinkedIn',                 included: 0, unit: 100, emoji: '💼', logo: 'https://cdn.simpleicons.org/linkedin/%230A66C2' },
  { id: 'yt',     label: 'YouTube',                  included: 0, unit: 100, emoji: '▶️',  logo: 'https://cdn.simpleicons.org/youtube/%23FF0000' },
  { id: 'woo',    label: 'WooCommerce',              included: 0, unit: 100, emoji: '🛍️', logo: 'https://cdn.simpleicons.org/woocommerce/%2396588A' },
] as const;

export type PlanSlug = keyof typeof PLANS;

export interface BivvoConfig {
  plan: PlanSlug;
  users: number;
  channels: Record<string, number>;
  channelsDiscount?: number;
  telefonia: boolean;
  disparo: boolean;
  disparoDiscount?: number;
  protagonista: boolean;
}


export interface BivvoQuote {
  planSlug: PlanSlug;
  planLabel: string;
  users: number;
  extraUsers: number;
  base1m: number;
  baseRec: number;
  channelsTotal: number;
  channelsDiscountPercent: number;
  telCost: number;
  disparoCost: number;
  disparoDiscountPercent: number;

  total1m: number;
  totalRec: number;
  protagonista: boolean;
  channelLines: Array<{ id: string; label: string; emoji: string; logo: string; qty: number; amount: number }>;
}

export function quoteBivvo(cfg: BivvoConfig): BivvoQuote {
  const plan = PLANS[cfg.plan];
  if (!plan) throw new Error('Plano inválido');
  
  const users = Math.max(1, Math.floor(cfg.users || plan.users));
  const extraUsers = Math.max(0, users - plan.users);
  const extraCost = extraUsers * EXTRA_USER_PRICE;
  
  const basePromo = plan.promo + extraCost;
  const baseFull = plan.full + extraCost;
  
  const base1m = basePromo;
  const baseRec = cfg.protagonista ? base1m : baseFull;

  const discountPercent = Math.min(30, Math.max(0, cfg.channelsDiscount || 0));
  const discountFactor = 1 - (discountPercent / 100);

  let channelsTotal = 0;
  const channelLines: BivvoQuote['channelLines'] = [];
  const cfgChannels = cfg.channels || {};
  
  for (const c of CANAIS_DEF) {
    const qty = Math.max(0, Math.floor(cfgChannels[c.id] || 0));
    const extra = Math.max(0, qty - c.included);
    if (extra > 0) {
      const amount = round2(extra * c.unit * discountFactor);
      channelsTotal += amount;
      channelLines.push({ id: c.id, label: c.label, emoji: c.emoji, logo: c.logo, qty: extra, amount });
    }
  }
  const telCost = cfg.telefonia ? TELEFONIA_PRICE : 0;
  const disparoDiscountPercent = Math.min(50, Math.max(0, cfg.disparoDiscount || 0));
  const disparoCost = cfg.disparo ? round2(DISPARO_PRICE * (1 - disparoDiscountPercent / 100)) : 0;
  const total1m = round2(base1m + channelsTotal + telCost + disparoCost);
  const totalRec = round2(baseRec + channelsTotal + telCost + disparoCost);

  
  const planLabel = extraUsers > 0
    ? `Plano Personalizado (${plan.name} + ${extraUsers}u)`
    : `Plano ${plan.name} (${plan.users}u)`;

  return {
    planSlug: cfg.plan,
    planLabel,
    users,
    extraUsers,
    base1m: round2(base1m),
    baseRec: round2(baseRec),
    channelsTotal: round2(channelsTotal),
    channelsDiscountPercent: discountPercent,
    telCost,
    disparoCost,
    disparoDiscountPercent,

    total1m,
    totalRec,
    protagonista: !!cfg.protagonista,
    channelLines,
  };
}

export const fmtBRL = (v: number) =>
  'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function round2(n: number) { return Math.round(n * 100) / 100; }

// ─────────────────────────────────────────────
// Normalização + diff (espelho client-side de _shared/bivvo-logic.ts)
// ─────────────────────────────────────────────
export function normalizeBivvoConfig(cfg: any): BivvoConfig | null {
  if (!cfg || typeof cfg !== 'object') return null;
  const channels: Record<string, number> = {};
  const src = cfg.channels || {};
  for (const c of CANAIS_DEF) {
    const q = Math.max(0, Math.floor(Number(src[c.id]) || 0));
    if (q > 0) channels[c.id] = q;
  }
  return {
    plan: String(cfg.plan || 'standard') as PlanSlug,
    users: Math.max(1, Math.floor(Number(cfg.users) || 0)),
    channels,
    telefonia: !!cfg.telefonia,
    disparo: !!cfg.disparo,
    protagonista: !!cfg.protagonista,
  };
}

export function configsEqual(a: any, b: any): boolean {
  const na = normalizeBivvoConfig(a);
  const nb = normalizeBivvoConfig(b);
  return JSON.stringify(na) === JSON.stringify(nb);
}

/** Retorna valor recorrente (totalRec) de uma bivvo_config normalizada, ou null se inválida. */
export function safeRecurring(cfg: any): number | null {
  const n = normalizeBivvoConfig(cfg);
  if (!n) return null;
  try { return quoteBivvo(n).totalRec; } catch { return null; }
}

export function encodeBivvoConfig(cfg: BivvoConfig): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
}
export function decodeBivvoConfig(s: string): BivvoConfig | null {
  try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch { return null; }
}
