// Shared Bivvo pricing calculator. KEEP IN SYNC with src/lib/bivvo-calc.ts

export const PLANS = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
} as const;

export const EXTRA_USER_PRICE = 35;
export const TELEFONIA_PRICE = 100;

export const CANAIS_DEF = [
  { id: 'waof',   label: 'WhatsApp API Oficial',     included: 1, unit: 100 },
  { id: 'wano',   label: 'WhatsApp API não oficial', included: 1, unit: 50  },
  { id: 'ig',     label: 'Instagram',                included: 1, unit: 50  },
  { id: 'fb',     label: 'Facebook',                 included: 1, unit: 50  },
  { id: 'email',  label: 'E-mail',                   included: 1, unit: 50  },
  { id: 'olx',    label: 'OLX',                      included: 0, unit: 100 },
  { id: 'tiktok', label: 'TikTok',                   included: 0, unit: 100 },
  { id: 'ml',     label: 'Mercado Livre',            included: 0, unit: 100 },
  { id: 'li',     label: 'LinkedIn',                 included: 0, unit: 100 },
  { id: 'yt',     label: 'YouTube',                  included: 0, unit: 100 },
  { id: 'woo',    label: 'WooCommerce',              included: 0, unit: 100 },
] as const;

export type PlanSlug = keyof typeof PLANS;

export interface BivvoConfig {
  plan: PlanSlug;
  users: number;
  channels?: Record<string, number>;
  telefonia?: boolean;
  protagonista?: boolean;
}

export interface BivvoQuote {
  planSlug: string;
  planLabel: string;
  users: number;
  extraUsers: number;
  base1m: number;
  baseRec: number;
  channelsTotal: number;
  telCost: number;
  total1m: number;
  totalRec: number;
  protagonista: boolean;
  channelLines: Array<{ id: string; label: string; qty: number; amount: number }>;
}

export function quoteBivvo(cfg: BivvoConfig): BivvoQuote {
  const plan = PLANS[cfg.plan];
  if (!plan) throw new Error('Plano inválido');

  const users = Math.max(1, Math.floor(cfg.users || plan.users));
  const extraUsers = Math.max(0, users - 12);
  const extraCost = extraUsers * EXTRA_USER_PRICE;

  let baseFull = plan.full;
  let basePromo = plan.promo;
  if (extraUsers > 0) {
    baseFull = PLANS.pro.full + extraCost;
    basePromo = PLANS.pro.promo + extraCost;
  }

  const base1m = basePromo;
  const baseRec = cfg.protagonista ? base1m : baseFull;

  const channels = cfg.channels || {};
  let channelsTotal = 0;
  const channelLines: BivvoQuote['channelLines'] = [];
  const discountFactor = 1 - (Math.min(30, Math.max(0, cfg.channelsDiscount || 0)) / 100);

  for (const c of CANAIS_DEF) {
    const qty = Math.max(0, Math.floor(channels[c.id] || 0));
    const extra = Math.max(0, qty - c.included);
    if (extra > 0) {
      const amount = extra * c.unit * discountFactor;
      channelsTotal += amount;
      channelLines.push({ id: c.id, label: c.label, qty: extra, amount: round2(amount) });
    }
  }

  const telCost = cfg.telefonia ? TELEFONIA_PRICE : 0;
  const total1m = round2(base1m + channelsTotal + telCost);
  const totalRec = round2(baseRec + channelsTotal + telCost);

  const planLabel = extraUsers > 0
    ? `Plano Personalizado (PRO+${extraUsers}u)`
    : `Plano ${plan.name} (${plan.users}u)`;

  return {
    planSlug: cfg.plan,
    planLabel,
    users,
    extraUsers,
    base1m: round2(base1m),
    baseRec: round2(baseRec),
    channelsTotal: round2(channelsTotal),
    telCost,
    total1m,
    totalRec,
    protagonista: !!cfg.protagonista,
    channelLines,
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }
