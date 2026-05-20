export const PLANS = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
} as const;

export const EXTRA_USER_PRICE = 35;
export const TELEFONIA_PRICE = 100;

export const CANAIS_DEF = [
  { id: 'waof',   label: 'WhatsApp API Oficial',     included: 1, unit: 100, emoji: '📱' },
  { id: 'wano',   label: 'WhatsApp API não oficial', included: 1, unit: 50,  emoji: '💬' },
  { id: 'ig',     label: 'Instagram',                included: 1, unit: 50,  emoji: '📸' },
  { id: 'fb',     label: 'Facebook',                 included: 1, unit: 50,  emoji: '📘' },
  { id: 'email',  label: 'E-mail',                   included: 1, unit: 50,  emoji: '✉️'  },
  { id: 'olx',    label: 'OLX',                      included: 0, unit: 100, emoji: '🏷️' },
  { id: 'tiktok', label: 'TikTok',                   included: 0, unit: 100, emoji: '🎵' },
  { id: 'ml',     label: 'Mercado Livre',            included: 0, unit: 100, emoji: '🛒' },
  { id: 'li',     label: 'LinkedIn',                 included: 0, unit: 100, emoji: '💼' },
  { id: 'yt',     label: 'YouTube',                  included: 0, unit: 100, emoji: '▶️'  },
  { id: 'woo',    label: 'WooCommerce',              included: 0, unit: 100, emoji: '🛍️' },
] as const;

export function round2(n: number) { return Math.round(n * 100) / 100; }

export function quoteBivvo(cfg: any) {
  const plan = PLANS[cfg.plan as keyof typeof PLANS];
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
  const channelLines: any[] = [];
  const cfgChannels = cfg.channels || {};
  for (const c of CANAIS_DEF) {
    const qty = Math.max(0, Math.floor(cfgChannels[c.id] || 0));
    const extra = Math.max(0, qty - c.included);
    if (extra > 0) {
      const amount = round2(extra * c.unit * discountFactor);
      channelsTotal += amount;
      channelLines.push({ id: c.id, label: c.label, emoji: c.emoji, qty: extra, amount });
    }
  }
  const telCost = cfg.telefonia ? TELEFONIA_PRICE : 0;
  const total1m = round2(base1m + channelsTotal + telCost);
  const totalRec = round2(baseRec + channelsTotal + telCost);
  const planLabel = extraUsers > 0 ? `Plano Personalizado (${plan.name} + ${extraUsers}u)` : `Plano ${plan.name} (${plan.users}u)`;
  
  return {
    planSlug: cfg.plan,
    planLabel,
    users,
    extraUsers,
    base1m,
    baseRec,
    channelsTotal,
    channelsDiscountPercent: discountPercent,
    telCost,
    total1m,
    totalRec,
    protagonista: cfg.protagonista,
    channelLines
  };
}
