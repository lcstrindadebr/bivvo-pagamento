// ============================================================
// create-subscription — autossuficiente (bundle de _shared inline)
// Gerado automaticamente. Cole no editor de Edge Functions do Supabase.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==================== _shared/cors.ts ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};


// ==================== _shared/bivvo-logic.ts ====================
const PLANS = {
  standard: { name: 'STANDARD', users: 3, promo: 169.90, full: 197.90 },
  silver:   { name: 'SILVER',   users: 6, promo: 287.90, full: 389.90 },
  pro:      { name: 'PRO',      users: 12, promo: 429.90, full: 527.90 },
} as const;

const EXTRA_USER_PRICE = 35;
const TELEFONIA_PRICE = 100;

const CANAIS_DEF = [
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

function round2(n: number) { return Math.round(n * 100) / 100; }

function quoteBivvo(cfg: any) {
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

// ─────────────────────────────────────────────
// Diff canônico entre duas bivvo_config
// Fonte única da verdade para "precisa sincronizar Bivvo/Asaas"
// ─────────────────────────────────────────────
interface BivvoConfigDiff {
  bivvoRelevantChanged: boolean;
  asaasValueChanged: boolean;
  changedFields: string[];
  previousRecurringValue: number | null;
  newRecurringValue: number | null;
}

const BIVVO_RELEVANT_KEYS = ['plan', 'users', 'telefonia', 'disparo', 'protagonista'];

function normalizeBivvoConfig(cfg: any): any {
  if (!cfg || typeof cfg !== 'object') return null;
  const channels: Record<string, number> = {};
  const src = cfg.channels || {};
  for (const c of CANAIS_DEF) {
    const q = Math.max(0, Math.floor(Number(src[c.id]) || 0));
    if (q > 0) channels[c.id] = q;
  }
  return {
    plan: String(cfg.plan || 'standard'),
    users: Math.max(1, Math.floor(Number(cfg.users) || 0)),
    channels,
    telefonia: !!cfg.telefonia,
    disparo: !!cfg.disparo,
    protagonista: !!cfg.protagonista,
  };
}

function computeConfigDiff(before: any, after: any): BivvoConfigDiff {
  const a = normalizeBivvoConfig(before);
  const b = normalizeBivvoConfig(after);
  const changed: string[] = [];

  if (!a && b) {
    // primeira configuração
    return {
      bivvoRelevantChanged: true,
      asaasValueChanged: true,
      changedFields: ['*'],
      previousRecurringValue: null,
      newRecurringValue: safeQuoteRec(b),
    };
  }
  if (a && !b) {
    return {
      bivvoRelevantChanged: true,
      asaasValueChanged: true,
      changedFields: ['*'],
      previousRecurringValue: safeQuoteRec(a),
      newRecurringValue: null,
    };
  }
  if (!a && !b) {
    return { bivvoRelevantChanged: false, asaasValueChanged: false, changedFields: [], previousRecurringValue: null, newRecurringValue: null };
  }

  for (const k of BIVVO_RELEVANT_KEYS) {
    if ((a as any)[k] !== (b as any)[k]) changed.push(k);
  }
  // Canais
  const allChKeys = new Set([...Object.keys(a.channels), ...Object.keys(b.channels)]);
  for (const k of allChKeys) {
    if ((a.channels[k] || 0) !== (b.channels[k] || 0)) changed.push(`channels.${k}`);
  }

  const prevRec = safeQuoteRec(a);
  const newRec = safeQuoteRec(b);
  const asaasValueChanged = Math.abs((prevRec || 0) - (newRec || 0)) > 0.005;

  return {
    bivvoRelevantChanged: changed.length > 0,
    asaasValueChanged,
    changedFields: changed,
    previousRecurringValue: prevRec,
    newRecurringValue: newRec,
  };
}

function safeQuoteRec(cfg: any): number | null {
  try { return quoteBivvo(cfg).totalRec; } catch { return null; }
}


// ==================== _shared/asaas.ts ====================
async function asaasFetch(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    const data = await response.json();
    if (!response.ok) throw new Error(data.errors?.[0]?.description || `Asaas Error ${response.status}`);
    return data;
  }
  if (!response.ok) throw new Error(`Asaas HTTP Error ${response.status}`);
  return await response.text();
}


// ==================== _shared/bivvo-api.ts ====================
// Helper para provisionar tenant + usuário na API adm.bivvo.com.br
// Utilizado por process-payment, create-subscription e asaas-webhook.

const BIVVO_API_URL = (
  Deno.env.get("BIVVO_API_URL") || "https://adm.bivvo.com.br"
).replace(/\/+$/, "");

// Menu base SEM MassDispatch — MassDispatch só é adicionado se cliente contratar disparo em massa.
const DEFAULT_MENU = [
  "Groups",
  "Kanban",
  "Tasks",
  "Api",
  "ChatBot",
  "Reports",
  "Campaigns",
  "PrivateChat",
  "Teams",
  "AllowedChannels",
];

// Canais permitidos por padrão conforme especificação 4.2
const DEFAULT_ALLOWED_CHANNELS = [
  "waba",
  "baileys",
  "whatsapp",
  "telegram",
  "webchat",
  "webmail",
  "wabaoauth",
  "instagramoauth",
  "facebookoauth",
];

interface UserRow {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  company_name?: string | null;
  person_type?: string | null;
  asaas_customer_id: string | null;
  bivvo_tenant_id?: string | null;
  tenant_provisioned_at?: string | null;
}

interface BivvoCfg {
  plan?: string;
  users?: number;
  channels?: Record<string, number>;
  telefonia?: boolean;
  disparo?: boolean;
  protagonista?: boolean;
}

function normalizeBearer(rawToken: string, source: string) {
  const raw = rawToken.trim();
  if (!raw) throw new Error("Token da API Bivvo vazio");
  const hadBearerPrefix = raw.toLowerCase().startsWith("bearer ");
  const token = hadBearerPrefix ? raw.slice(7).trim() : raw;
  return {
    header: `Bearer ${token}`,
    source,
    tokenLength: token.length,
    hadBearerPrefix,
  };
}

async function getBivvoAuth(supabase?: any) {
  if (supabase) {
    try {
      const { data } = await supabase
        .from("admin_secrets")
        .select("value")
        .eq("key", "bivvo_api_token")
        .maybeSingle();
      const dbToken = typeof data?.value === "string" ? data.value.trim() : "";
      if (dbToken)
        return normalizeBearer(dbToken, "admin_secrets.bivvo_api_token");
    } catch (err) {
      console.warn(
        "[Bivvo] Não foi possível ler admin_secrets.bivvo_api_token; usando fallback do ambiente.",
        err,
      );
    }
  }

  const envToken = Deno.env.get("BIVVO_API_TOKEN")?.trim();
  if (!envToken) throw new Error("Token da API Bivvo não configurado");
  return normalizeBearer(envToken, "BIVVO_API_TOKEN");
}

function onlyDigits(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits || undefined;
}

function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    const k = key.toLowerCase();
    if (
      k.includes("token") ||
      k.includes("password") ||
      k.includes("secret") ||
      k === "authorization"
    ) {
      out[key] = "[redacted]";
    } else {
      out[key] = redactSensitive(val);
    }
  }
  return out;
}

function computeUsers(cfg: BivvoCfg): number {
  const planUsers: Record<string, number> = { standard: 3, silver: 6, pro: 12 };
  const base = planUsers[cfg.plan || ""] || 0;
  return Math.max(1, Math.floor(cfg.users || base || 1));
}

function computeChannelLimits(cfg: BivvoCfg) {
  const ch = cfg.channels || {};
  const waof = Math.max(0, Math.floor(ch.waof || 0)); // WhatsApp API Oficial
  const wano = Math.max(0, Math.floor(ch.wano || 0)); // WhatsApp Não Oficial
  const ig = Math.max(0, Math.floor(ch.ig || 0));
  const fb = Math.max(0, Math.floor(ch.fb || 0));
  return {
    waba: waof,
    baileys: wano,
    whatsapp: 0,
    meow: 0,
    evo: 0,
    zapi: 0,
    uazapi: 0,
    telegram: 0,
    hub: 0,
    webchat: 0,
    webmail: 0,
    wabaoauth: waof,
    instagramoauth: ig,
    facebookoauth: fb,
  };
}

function computeMaxConnections(cfg: BivvoCfg) {
  const ch = cfg.channels || {};
  // maxConnections representa a quantidade contratada; não deve duplicar waof
  // porque waof também é espelhado em wabaoauth dentro de channelConnectionLimits.
  const total = ["waof", "wano", "ig", "fb"].reduce((sum, key) => {
    return sum + Math.max(0, Math.floor(Number(ch[key]) || 0));
  }, 0);
  return Math.max(1, total);
}

function buildMenuVisibility(cfg: BivvoCfg): string[] {
  const menu = [...DEFAULT_MENU];
  if (cfg.disparo) {
    // Insere logo após Groups conforme padrão Bivvo
    menu.splice(1, 0, "MassDispatch");
  }
  return menu;
}

async function callStoreTenant(
  user: UserRow,
  cfg: BivvoCfg,
  asaasToken: string,
  supabase?: any,
) {
  const maxUsers = computeUsers(cfg);
  const limits = computeChannelLimits(cfg);
  const maxConnections = computeMaxConnections(cfg);
  const auth = await getBivvoAuth(supabase);

  const isPJ = (user.person_type || "").toUpperCase() === "JURIDICA";
  const tenantName = isPJ && user.company_name ? user.company_name : user.name;
  const identity = onlyDigits(user.cpf);
  if (!identity) {
    throw new Error("CPF/CNPJ do cliente ausente — não é possível criar tenant na Bivvo.");
  }

  const storePayload = {
    status: "active",
    name: tenantName,
    maxUsers,
    maxConnections,
    acceptTerms: true,
    email: user.email,
    identity,
    password: "@Bivvo123456",
    userName: user.name,
    profile: "admin",
    paymentGateway: "asaas",
    asaasCustomerId: user.asaas_customer_id,
    asaasToken,
    asaas: "enabled",
  };

  console.log(
    "[Bivvo] storeTenant →",
    tenantName,
    `${maxUsers}u`,
    `${maxConnections}c`,
  );
  await log.info("bivvo-api", `storeTenant → ${tenantName}`, {
    userId: user.id,
    endpoint: `${BIVVO_API_URL}/tenantApiStoreTenant`,
    authSource: auth.source,
    tokenLength: auth.tokenLength,
    hadBearerPrefix: auth.hadBearerPrefix,
    email: user.email,
    maxUsers,
    maxConnections,
    limits,
    payload: redactSensitive(storePayload),
  });
  const res = await fetch(`${BIVVO_API_URL}/tenantApiStoreTenant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth.header,
    },
    body: JSON.stringify(storePayload),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  console.log(
    "[Bivvo] storeTenant status:",
    res.status,
    "body:",
    text.slice(0, 800),
  );
  await log.info("bivvo-api", `storeTenant response ${res.status}`, {
    userId: user.id,
    status: res.status,
    ok: res.ok,
    body: json ?? text.slice(0, 2000),
  });
  if (!res.ok) {
    await log.error("bivvo-api", `storeTenant falhou ${res.status}`, {
      userId: user.id,
      body: text.slice(0, 2000),
    });
    throw new Error(`storeTenant ${res.status}: ${text.slice(0, 500)}`);
  }
  const tenantId = String(
    json?.tenant?.id ??
      json?.id ??
      json?.tenantId ??
      json?.data?.id ??
      json?.data?.tenant?.id ??
      "",
  );
  return { tenantId, response: json, maxUsers, maxConnections, limits };
}

async function fetchRemoteTenant(
  tenantIdField: number | string,
  auth: { header: string },
  userId?: string,
) {
  try {
    const res = await fetch(`${BIVVO_API_URL}/tenantApiShowTenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: auth.header,
      },
      body: JSON.stringify({ id: tenantIdField }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    const tenantData = Array.isArray(json?.tenant)
      ? json.tenant[0]
      : (json?.tenant ?? json?.data?.tenant ?? json?.data ?? json);
    await log.info("bivvo-api", `showTenant lookup id:${tenantIdField}`, {
      userId,
      status: res.status,
      found: Boolean(tenantData),
      keys: tenantData && typeof tenantData === "object" ? Object.keys(tenantData) : [],
    });
    return tenantData && typeof tenantData === "object" ? tenantData : null;
  } catch (e) {
    await log.error("bivvo-api", `showTenant lookup falhou`, {
      userId,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

async function fetchIdentityFromAsaas(
  asaasCustomerId: string,
  userId?: string,
): Promise<string | undefined> {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  const baseUrl = (Deno.env.get("ASAAS_BASE_URL") || "https://api.asaas.com/v3").replace(/\/+$/, "");
  if (!apiKey || !asaasCustomerId) return undefined;
  try {
    const res = await fetch(`${baseUrl}/customers/${asaasCustomerId}`, {
      method: "GET",
      headers: { access_token: apiKey, Accept: "application/json" },
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* ignore */ }
    const identity = onlyDigits(json?.cpfCnpj);
    await log.info("bivvo-api", `asaas customer lookup → ${asaasCustomerId}`, {
      userId,
      status: res.status,
      found: Boolean(identity),
    });
    return identity;
  } catch (e) {
    await log.error("bivvo-api", `asaas customer lookup falhou`, {
      userId,
      error: e instanceof Error ? e.message : String(e),
    });
    return undefined;
  }
}

async function resolveIdentity(
  user: UserRow,
  auth: { header: string },
  tenantIdField: number | string,
  supabase?: any,
): Promise<string> {
  let identity = onlyDigits(user.cpf);
  if (identity) return identity;

  // 1º fallback: showTenant na Bivvo
  const remote = await fetchRemoteTenant(tenantIdField, auth, user.id);
  identity = onlyDigits(remote?.identity ?? remote?.cpf ?? remote?.cnpj);

  // 2º fallback: customer no Asaas
  if (!identity && user.asaas_customer_id) {
    identity = await fetchIdentityFromAsaas(user.asaas_customer_id, user.id);
  }

  if (identity && supabase) {
    try {
      await supabase.from("users").update({ cpf: identity }).eq("id", user.id);
      await log.info("bivvo-api", `hidratado cpf legado`, {
        userId: user.id,
        tenantId: String(tenantIdField),
      });
    } catch (e) {
      console.warn("[Bivvo] falha ao persistir cpf hidratado:", e);
    }
  }
  if (!identity) {
    throw new Error(
      "Identidade CPF/CNPJ do tenant Bivvo não encontrada (local, Bivvo e Asaas).",
    );
  }
  return identity;
}

async function callUpdateTenant(
  user: UserRow,
  cfg: BivvoCfg,
  ctx: {
    maxUsers: number;
    maxConnections: number;
    limits: ReturnType<typeof computeChannelLimits>;
    status?: string;
  },
  supabase?: any,
) {
  const tenantIdRaw = user.bivvo_tenant_id
    ? String(user.bivvo_tenant_id).trim()
    : "";
  if (!tenantIdRaw) {
    throw new Error(
      "Tenant Bivvo não encontrado (bivvo_tenant_id ausente). Provisione a conta antes de atualizar.",
    );
  }
  const tenantIdNum = Number(tenantIdRaw);
  const tenantIdField: number | string =
    /^\d+$/.test(tenantIdRaw) && Number.isSafeInteger(tenantIdNum)
      ? tenantIdNum
      : tenantIdRaw;
  const auth = await getBivvoAuth(supabase);

  const identity = await resolveIdentity(user, auth, tenantIdField, supabase);
  const status = ctx.status || "active";
  const isInactivation = status === "inactive";

  // Payload conforme spec oficial do tenantApiUpdateTenant:
  // - identifica o tenant por `identity` (CPF/CNPJ)
  // - payload enxuto, apenas campos que estamos alterando
  const updatePayload: Record<string, unknown> = {
    identity,
    status,
  };

  if (!isInactivation) {
    updatePayload.menuVisibility = buildMenuVisibility(cfg);
    updatePayload.allowedChannels = DEFAULT_ALLOWED_CHANNELS;
    updatePayload.channelConnectionLimits = ctx.limits;
    updatePayload.maxUsers = ctx.maxUsers;
    updatePayload.maxConnections = ctx.maxConnections;
  }

  console.log(
    "[Bivvo] updateTenant → identity:",
    identity,
    "status:",
    status,
    "keys:",
    Object.keys(updatePayload),
  );
  await log.info("bivvo-api", `updateTenant → identity:${identity} status:${status}`, {
    userId: user.id,
    endpoint: `${BIVVO_API_URL}/tenantApiUpdateTenant`,
    authSource: auth.source,
    tokenLength: auth.tokenLength,
    hadBearerPrefix: auth.hadBearerPrefix,
    tenantIdRaw,
    payload: redactSensitive(updatePayload),
  });
  const res = await fetch(`${BIVVO_API_URL}/tenantApiUpdateTenant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth.header,
    },
    body: JSON.stringify(updatePayload),
  });
  const text = await res.text();
  console.log(
    "[Bivvo] updateTenant status:",
    res.status,
    "body:",
    text.slice(0, 800),
  );
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* keep text */
  }
  await log.info("bivvo-api", `updateTenant response ${res.status}`, {
    userId: user.id,
    status: res.status,
    ok: res.ok,
    body: json ?? text.slice(0, 2000),
  });
  if (!res.ok) {
    await log.error("bivvo-api", `updateTenant falhou ${res.status}`, {
      userId: user.id,
      body: text.slice(0, 2000),
    });
    throw new Error(`updateTenant ${res.status}: ${text.slice(0, 500)}`);
  }
  return json ?? { raw: text };
}

/**
 * Consulta o tenant na Bivvo e retorna { status, raw } para verificação pós-update.
 * Não lança em erro de rede/HTTP — devolve status: null para o chamador decidir.
 */
async function verifyTenantStatus(
  tenantId: string | number,
  supabase?: any,
  userId?: string,
): Promise<{ status: string | null; httpStatus: number; raw: any }> {
  const auth = await getBivvoAuth(supabase);
  const idNum = Number(tenantId);
  const idField: number | string =
    /^\d+$/.test(String(tenantId)) && Number.isSafeInteger(idNum) ? idNum : String(tenantId);
  try {
    const res = await fetch(`${BIVVO_API_URL}/tenantApiShowTenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: auth.header,
      },
      body: JSON.stringify({ id: idField }),
    });
    const text = await res.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep text */ }
    const tenantData = Array.isArray(json?.tenant)
      ? json.tenant[0]
      : (json?.tenant ?? json?.data?.tenant ?? json?.data ?? json);
    const status = tenantData?.status ? String(tenantData.status).toLowerCase() : null;
    await log.info("bivvo-api", `verifyTenantStatus id:${idField} → ${status ?? "n/a"}`, {
      userId,
      httpStatus: res.status,
      status,
    });
    return { status, httpStatus: res.status, raw: json ?? text.slice(0, 2000) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log.error("bivvo-api", `verifyTenantStatus falhou: ${msg}`, { userId, tenantId });
    return { status: null, httpStatus: 0, raw: { error: msg } };
  }
}

async function provisionBivvoTenant(
  user: UserRow,
  cfg: BivvoCfg,
  supabase?: any,
) {
  // Se já foi totalmente provisionado, não refaz
  if (user.bivvo_tenant_id && user.tenant_provisioned_at) {
    console.log(
      "[Bivvo] Tenant já provisionado:",
      user.id,
      "→",
      user.bivvo_tenant_id,
    );
    return { skipped: true, tenantId: user.bivvo_tenant_id };
  }

  const asaasToken = Deno.env.get("BIVVO_ASAAS_TOKEN");
  if (!asaasToken) throw new Error("BIVVO_ASAAS_TOKEN não configurado");
  if (!user.asaas_customer_id) throw new Error("Cliente sem asaas_customer_id");

  // Sempre recomputa contexto (limites/usuários) — necessário para o update também
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = computeMaxConnections(cfg);

  let tenantId = user.bivvo_tenant_id || "";
  let storeResponse: any = null;

  // ── Fase 1: Store (só se ainda não temos tenant_id) ──
  if (!tenantId) {
    const stored = await callStoreTenant(user, cfg, asaasToken, supabase);
    tenantId = stored.tenantId;
    storeResponse = stored.response;

    // Persiste tenant_id IMEDIATAMENTE para não perder caso o update falhe
    if (supabase && tenantId) {
      await supabase
        .from("users")
        .update({ bivvo_tenant_id: tenantId })
        .eq("id", user.id);
      console.log("[Bivvo] tenant_id salvo:", tenantId);
    }

    // Pequena espera para a Bivvo consolidar o tenant antes do update
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    console.log("[Bivvo] Tenant já existia (retomando update):", tenantId);
  }

  // ── Fase 2: Update (sempre referenciando pelo tenant id) ──
  const userForUpdate: UserRow = { ...user, bivvo_tenant_id: tenantId };
  const updateResponse = await callUpdateTenant(
    userForUpdate,
    cfg,
    { maxUsers, maxConnections, limits },
    supabase,
  );

  return { skipped: false, tenantId, storeResponse, updateResponse };
}

async function runProvisionAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!user) throw new Error("Usuário não encontrado: " + userId);
  if (!user.bivvo_config) {
    console.warn(
      "[Bivvo] User sem bivvo_config, pulando provisionamento:",
      userId,
    );
    return { skipped: true, reason: "no_config" };
  }
  try {
    const res = await provisionBivvoTenant(user, user.bivvo_config, supabase);
    const nowIso = new Date().toISOString();
    await supabase
      .from("users")
      .update({
        bivvo_tenant_id: res.tenantId || user.bivvo_tenant_id,
        tenant_provisioned_at: nowIso,
        tenant_provision_error: null,
        bivvo_config_synced_bivvo: user.bivvo_config,
        bivvo_config_synced_bivvo_at: nowIso,
      })
      .eq("id", userId);
    // Log
    try {
      await supabase.from("bivvo_config_change_logs").insert({
        user_id: userId,
        action: "sync_bivvo",
        config_after: user.bivvo_config,
        bivvo_relevant_changed: true,
        asaas_value_changed: false,
        notes:
          `Provisionamento tenant ${res.tenantId || user.bivvo_tenant_id || ""}`.trim(),
      });
    } catch (e) {
      console.error("[Bivvo] log sync_bivvo falhou:", e);
    }
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Bivvo] Erro provisionando tenant:", err);
    await log.error("bivvo-api", `runProvisionAndPersist erro: ${msg}`, {
      userId,
    });
    await supabase
      .from("users")
      .update({
        tenant_provision_error: msg.slice(0, 1000),
      })
      .eq("id", userId);
    return { skipped: false, error: msg };
  }
}

async function runUpdateAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!user) throw new Error("Usuário não encontrado: " + userId);
  if (!user.bivvo_config) {
    console.warn("[Bivvo] User sem bivvo_config, pulando atualização:", userId);
    return { skipped: true, reason: "no_config" };
  }

  const cfg = user.bivvo_config as BivvoCfg;
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = computeMaxConnections(cfg);

  try {
    await log.info("bivvo-api", `runUpdateAndPersist → ${user.id}`, { userId });
    const updateResponse = await callUpdateTenant(
      user,
      cfg,
      { maxUsers, maxConnections, limits },
      supabase,
    );
    const nowIso = new Date().toISOString();
    await supabase
      .from("users")
      .update({
        tenant_provisioned_at: nowIso,
        tenant_provision_error: null,
        bivvo_config_synced_bivvo: cfg,
        bivvo_config_synced_bivvo_at: nowIso,
      })
      .eq("id", userId);
    try {
      await supabase.from("bivvo_config_change_logs").insert({
        user_id: userId,
        action: "sync_bivvo",
        config_after: cfg,
        bivvo_relevant_changed: true,
        asaas_value_changed: false,
        notes: `Atualização tenant ${user.bivvo_tenant_id || ""}`.trim(),
      });
    } catch (e) {
      console.error("[Bivvo] log sync_bivvo falhou:", e);
    }
    return {
      skipped: false,
      tenantId: user.bivvo_tenant_id || null,
      updateResponse,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Bivvo] Erro atualizando tenant:", err);
    await log.error("bivvo-api", `runUpdateAndPersist erro: ${msg}`, {
      userId,
    });
    await supabase
      .from("users")
      .update({
        tenant_provision_error: msg.slice(0, 1000),
      })
      .eq("id", userId);
    return { skipped: false, error: msg };
  }
}

async function runInactivateAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from("users")
    .select(
      "id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at",
    )
    .eq("id", userId)
    .maybeSingle();
  if (!user) throw new Error("Usuário não encontrado: " + userId);

  const cfg = (user.bivvo_config as BivvoCfg) || {};
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = computeMaxConnections(cfg);

  try {
    await log.info("bivvo-api", `runInactivateAndPersist → ${user.id}`, {
      userId,
    });
    const updateResponse = await callUpdateTenant(
      user,
      cfg,
      { maxUsers, maxConnections, limits, status: "inactive" },
      supabase,
    );

    // Verificação pós-update: confirmar que o tenant realmente ficou inativo na Bivvo.
    // Faz até 3 tentativas com backoff, pois a API pode levar alguns segundos para consolidar.
    let verifyResult: Awaited<ReturnType<typeof verifyTenantStatus>> | null = null;
    let confirmed = false;
    if (user.bivvo_tenant_id) {
      const delays = [1500, 2500, 4000];
      for (let attempt = 0; attempt < delays.length; attempt++) {
        await new Promise((r) => setTimeout(r, delays[attempt]));
        verifyResult = await verifyTenantStatus(user.bivvo_tenant_id, supabase, user.id);
        if (verifyResult.status === "inactive" || verifyResult.status === "inativo") {
          confirmed = true;
          break;
        }
        await log.warn(
          "bivvo-api",
          `Verificação de inatividade tentativa ${attempt + 1} retornou status="${verifyResult.status}"`,
          { userId: user.id, tenantId: user.bivvo_tenant_id },
        );
      }
    }

    if (!confirmed) {
      const statusVisto = verifyResult?.status ?? "desconhecido";
      const errMsg = `Update retornou OK mas verificação falhou: tenant ainda com status="${statusVisto}" na Bivvo.`;
      await log.error("bivvo-api", errMsg, {
        userId: user.id,
        tenantId: user.bivvo_tenant_id,
        verifyResult,
      });
      await supabase
        .from("users")
        .update({ tenant_provision_error: errMsg.slice(0, 1000) })
        .eq("id", userId);
      return {
        skipped: false,
        tenantId: user.bivvo_tenant_id || null,
        updateResponse,
        verified: false,
        verifyResult,
        error: errMsg,
      };
    }

    await supabase
      .from("users")
      .update({
        status: "inativo",
        tenant_provision_error: null,
      })
      .eq("id", userId);
    return {
      skipped: false,
      tenantId: user.bivvo_tenant_id || null,
      updateResponse,
      verified: true,
      verifyResult,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Bivvo] Erro inativando tenant:", err);
    await log.error("bivvo-api", `runInactivateAndPersist erro: ${msg}`, {
      userId,
    });
    await supabase
      .from("users")
      .update({
        tenant_provision_error: msg.slice(0, 1000),
      })
      .eq("id", userId);
    return { skipped: false, error: msg };
  }
}


// ==================== _shared/logger.ts ====================
// Persistent logger — grava logs em public.system_logs
// para acompanhar as chamadas de APIs externas (ex: Bivvo, Asaas).

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Level = 'info' | 'warn' | 'error' | 'debug';

let cached: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  return cached;
}

function safeCtx(ctx: unknown): unknown {
  if (ctx == null) return null;
  try {
    // Trunca strings gigantes para evitar poluir a tabela
    const s = JSON.stringify(ctx, (_k, v) => {
      if (typeof v === 'string' && v.length > 4000) return v.slice(0, 4000) + '…[truncated]';
      return v;
    });
    return JSON.parse(s);
  } catch {
    return { raw: String(ctx).slice(0, 4000) };
  }
}

async function logEvent(
  source: string,
  level: Level,
  message: string,
  context?: unknown,
): Promise<void> {
  // Sempre loga no console também
  const line = `[${source}] ${message}`;
  if (level === 'error') console.error(line, context ?? '');
  else if (level === 'warn') console.warn(line, context ?? '');
  else console.log(line, context ?? '');

  try {
    await admin().from('system_logs').insert({
      source,
      level,
      message: message.slice(0, 2000),
      context: safeCtx(context) as any,
    });
  } catch (err) {
    console.error('[logger] Falha ao gravar system_logs:', err);
  }
}

const log = {
  info: (source: string, message: string, context?: unknown) => logEvent(source, 'info', message, context),
  warn: (source: string, message: string, context?: unknown) => logEvent(source, 'warn', message, context),
  error: (source: string, message: string, context?: unknown) => logEvent(source, 'error', message, context),
  debug: (source: string, message: string, context?: unknown) => logEvent(source, 'debug', message, context),
};


// ==================== _shared/coupon.ts ====================
// Shared coupon logic for payment edge functions
interface AppliedCoupon {
  id: string;
  code: string;
  discount_percent: number;
}

async function validateAndLoadCoupon(
  supabase: any,
  code: string | undefined | null,
): Promise<AppliedCoupon | null> {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();
  if (!clean) return null;

  // Check if coupon field is enabled globally
  const { data: setting } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "checkout_coupon_enabled")
    .maybeSingle();
  const enabled = (setting?.value ?? "true") !== "false";
  if (!enabled) throw new Error("Cupons desabilitados.");

  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("id, code, discount_percent, max_uses, current_uses, valid_from, valid_until, active")
    .eq("code", clean)
    .maybeSingle();
  if (error) throw error;
  if (!coupon) throw new Error("Cupom inválido.");
  if (!coupon.active) throw new Error("Cupom inativo.");
  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    throw new Error("Cupom ainda não é válido.");
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    throw new Error("Cupom expirado.");
  }
  if (coupon.max_uses != null && coupon.current_uses >= coupon.max_uses) {
    throw new Error("Cupom esgotado.");
  }
  return {
    id: coupon.id,
    code: coupon.code,
    discount_percent: Number(coupon.discount_percent),
  };
}

async function incrementCouponUse(supabase: any, couponId: string) {
  try {
    // Fetch current value and increment
    const { data } = await supabase
      .from("coupons")
      .select("current_uses")
      .eq("id", couponId)
      .maybeSingle();
    await supabase
      .from("coupons")
      .update({ current_uses: (data?.current_uses ?? 0) + 1 })
      .eq("id", couponId);
  } catch (e) {
    console.error("Falha ao incrementar uso do cupom:", e);
  }
}


// --- Validation Utils ---
const VALID_STATES = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11 || /^(\d)\1{10}$/.test(clean)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i)) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i)) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  return rev === parseInt(clean.charAt(10));
}


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY || !ASAAS_BASE_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Configuração incompleta no servidor (Secrets).');
    }

    const body = await req.json();
    const { plan, billingType, customerData, bivvoConfig, affiliateSlug, trackingId, couponCode } = body;
    
    // Get remote IP from headers (Supabase adds this)
    const remoteIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "127.0.0.1";

    // 1. Database Client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 2. Resolve Price & Plan
    let amount: number, recurringAmount: number, planLabel: string;
    if (bivvoConfig) {
      const quote = quoteBivvo(bivvoConfig);
      amount = quote.total1m;
      recurringAmount = quote.totalRec;
      planLabel = quote.planLabel;
    } else {
      const { data: pData } = await supabase.from('plans').select('price, name').eq('slug', plan).eq('active', true).single();
      if (!pData) throw new Error('Plano não encontrado.');
      amount = recurringAmount = Number(pData.price);
      planLabel = `Plano ${pData.name}`;
    }

    // 2.1 Validate coupon (if provided) and apply discount to first month
    const appliedCoupon = await validateAndLoadCoupon(supabase, couponCode);
    if (appliedCoupon) {
      amount = round2(amount * (1 - appliedCoupon.discount_percent / 100));
      if (amount < 0) amount = 0;
    }
    const isFreeCoupon = !!appliedCoupon && appliedCoupon.discount_percent >= 100;

    // 3. User & Customer Management
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanPhone = customerData.whatsapp.replace(/\D/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');

    // Upsert User
    const { data: user, error: uErr } = await supabase.from('users').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      person_type: customerData.personType || null,
      company_name: customerData.personType === 'JURIDICA' ? (customerData.companyName || '').trim() : null,
      whatsapp: cleanPhone,
      cpf: cleanCpf,
      billing_name: customerData.billingName.trim(),
      cep: cleanCep,
      endereco: customerData.endereco.trim(),
      numero: customerData.numero.trim(),
      complemento: customerData.complemento?.trim() || '',
      bairro: customerData.bairro.trim(),
      cidade: customerData.cidade.trim(),
      estado: customerData.estado.toUpperCase(),
      bivvo_config: bivvoConfig || null,
    }, { onConflict: 'email' }).select('id, asaas_customer_id').single();
    if (uErr) throw uErr;

    // Upsert Customer (Lead tracking)
    await supabase.from('customers').upsert({
      email: customerData.email.toLowerCase().trim(),
      name: customerData.name.trim(),
      phone: cleanPhone,
    }, { onConflict: 'email' });

    // (free-coupon path handled AFTER Asaas customer creation, so we can still
    // create the recurring subscription that will charge from month 2 onward)




    // 4. Asaas Integration - validate existing customer, recreate if removed
    let asaasCustomerId = user.asaas_customer_id;
    if (asaasCustomerId) {
      try {
        const existing = await asaasFetch(`${ASAAS_BASE_URL}/customers/${asaasCustomerId}`, {
          headers: { 'access_token': ASAAS_API_KEY },
        });
        if (existing?.deleted === true) {
          console.log('Cliente Asaas removido, será recriado:', asaasCustomerId);
          asaasCustomerId = null;
        }
      } catch (e) {
        console.log('Cliente Asaas inválido, será recriado:', asaasCustomerId, e.message);
        asaasCustomerId = null;
      }
    }

    if (!asaasCustomerId) {
      const cRes = await asaasFetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          name: customerData.name.trim(),
          company: customerData.personType === 'JURIDICA' ? (customerData.companyName || '').trim() : undefined,
          cpfCnpj: cleanCpf,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanPhone,
          postalCode: cleanCep,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          externalReference: user.id,
          notificationDisabled: false,
        }),
      });
      asaasCustomerId = cRes.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', user.id);
    }

    // ===== 100% coupon: primeiro mês grátis, mas assinatura recorrente segue no Asaas =====
    if (isFreeCoupon) {
      const nextDue = new Date();
      nextDue.setDate(nextDue.getDate() + 30); // pula o primeiro ciclo
      console.log('[Cupom 100%] Criando assinatura recorrente com 1º mês grátis:', billingType);
      const sRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType,
          nextDueDate: nextDue.toISOString().split('T')[0],
          value: recurringAmount,
          cycle: 'MONTHLY',
          description: `Assinatura ${planLabel} (1º mês grátis - cupom ${appliedCoupon!.code})`,
          externalReference: `${user.id}_${plan}`,
          remoteIp,
        }),
      });

      const { data: dbPayment } = await supabase.from('payments').insert({
        user_id: user.id,
        plan,
        amount: 0,
        status: 'approved',
        paid_at: new Date().toISOString(),
        asaas_subscription_id: sRes.id,
        bivvo_config: bivvoConfig || null,
      }).select('id').single();

      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + 1);
      expDate.setDate(expDate.getDate() + 3);
      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expDate.toISOString(),
        asaas_subscription_id: sRes.id,
      }).eq('id', user.id);

      await incrementCouponUse(supabase, appliedCoupon!.id);
      try { await runProvisionAndPersist(supabase, user.id); }
      catch (e) { console.error('Falha provisionamento (cupom 100%):', e); }

      return new Response(JSON.stringify({
        success: true,
        paymentId: dbPayment?.id,
        subscriptionId: sRes.id,
        status: 'approved',
        freeCoupon: true,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }


    // 5. Create Subscription
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (billingType === 'BOLETO' ? 3 : 1));

    console.log('Criando assinatura no Asaas...', billingType);
    const sRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'access_token': ASAAS_API_KEY },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        value: recurringAmount,
        discount: amount < recurringAmount ? { value: round2(recurringAmount - amount), type: 'FIXED', dueDateLimitDays: 0 } : undefined,
        cycle: 'MONTHLY',
        description: `Assinatura ${planLabel}`,
        externalReference: `${user.id}_${plan}`,
        remoteIp,
      }),
    });
    console.log('Assinatura criada:', sRes.id);

    // 6. Fetch First Payment for PIX/Boleto Details
    let firstPayment: any = null;
    for (let i = 0; i < 5; i++) {
      const pRes = await asaasFetch(`${ASAAS_BASE_URL}/subscriptions/${sRes.id}/payments`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      if (pRes.data?.length > 0) {
        firstPayment = pRes.data[0];
        break;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
    if (!firstPayment) throw new Error('Não foi possível gerar a cobrança inicial no Asaas.');

    // Details for UI
    let paymentDetails: any = {};
    if (billingType === 'PIX') {
      const pix = await asaasFetch(`${ASAAS_BASE_URL}/payments/${firstPayment.id}/pixQrCode`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      paymentDetails = { pixQrCode: pix.encodedImage, pixCopyPaste: pix.payload, expiresAt: pix.expirationDate };
    } else if (billingType === 'BOLETO') {
      const bar = await asaasFetch(`${ASAAS_BASE_URL}/payments/${firstPayment.id}/identificationField`, {
        headers: { 'access_token': ASAAS_API_KEY },
      });
      paymentDetails = { boletoUrl: firstPayment.bankSlipUrl, barCode: bar.identificationField, dueDate: firstPayment.dueDate };
    }

    // 7. DB Payment Record
    const { data: dbPayment } = await supabase.from('payments').insert({
      user_id: user.id,
      plan,
      amount,
      status: 'pending',
      asaas_payment_id: firstPayment.id,
      asaas_subscription_id: sRes.id,
      bivvo_config: bivvoConfig || null,
    }).select('id').single();

    if (appliedCoupon) {
      await incrementCouponUse(supabase, appliedCoupon.id);
    }


    // 8. Affiliate Tracking
    if (affiliateSlug && dbPayment) {
      const { data: aff } = await supabase.from('affiliates').select('id, commission_percent').eq('slug', affiliateSlug).eq('status', 'active').maybeSingle();
      if (aff) {
        const { data: sale } = await supabase.from('affiliate_sales').insert({
          affiliate_id: aff.id,
          payment_id: dbPayment.id,
          user_id: user.id,
          plan_slug: plan,
          plan_label: planLabel,
          config: bivvoConfig || {},
          amount_first: amount,
          amount_recurring: recurringAmount,
          commission_percent: aff.commission_percent,
          status: 'pending',
          tracking_id: trackingId,
          asaas_payment_id: firstPayment.id,
          asaas_subscription_id: sRes.id,
        }).select('id').single();
        if (sale) {
          await supabase.from('affiliate_commissions').insert({
            affiliate_id: aff.id,
            sale_id: sale.id,
            sale_amount: amount,
            commission_percent: aff.commission_percent,
            commission_amount: round2((amount * aff.commission_percent) / 100),
            kind: 'first',
            status: 'pending',
          });
        }
      }
    }

    return new Response(JSON.stringify({ success: true, paymentId: dbPayment?.id, asaasPaymentId: firstPayment.id, subscriptionId: sRes.id, ...paymentDetails }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Create Subscription Error:', err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});