// ============================================================
// asaas-webhook — autossuficiente (bundle de _shared inline)
// Gerado automaticamente. Cole no editor de Edge Functions do Supabase.
// ============================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==================== _shared/cors.ts ====================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};


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


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const WEBHOOK_SECRET = Deno.env.get('ASAAS_WEBHOOK_SECRET');
    const authHeader = req.headers.get('asaas-access-token');

    // Validação de token de segurança (configurado no Asaas)
    if (!WEBHOOK_SECRET) {
      console.error('Webhook: ASAAS_WEBHOOK_SECRET não configurado no servidor');
      return new Response(JSON.stringify({ error: 'Configuração de segurança pendente' }), { status: 503 });
    }

    if (authHeader !== WEBHOOK_SECRET) {
      console.error('Webhook: Token inválido ou ausente');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    console.log('Webhook recebido:', body.event, body.payment?.id);

    // Salvar log do webhook
    await supabase.from('asaas_webhooks').insert({
      event_id: body.id,
      event_type: body.event,
      payload: body,
      status: 'received'
    });

    const payment = body.payment;
    if (!payment) return new Response('OK');

    // 1. Pagamento Confirmado / Recebido
    if (['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(body.event)) {
      // Buscar pagamento em nosso banco
      const { data: dbPayment } = await supabase
        .from('payments')
        .select('*, users(id, email)')
        .eq('asaas_payment_id', payment.id)
        .maybeSingle();

      if (dbPayment && dbPayment.status !== 'approved') {
        // Atualizar status do pagamento
        await supabase.from('payments').update({ status: 'approved' }).eq('id', dbPayment.id);

        // Ativar usuário
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        expirationDate.setDate(expirationDate.getDate() + 3); // 3 days grace period

        
        await supabase.from('users').update({
          status: 'ativo',
          plano_ativo: dbPayment.plan,
          data_expiracao: expirationDate.toISOString(),
          overdue_since: null,
          asaas_subscription_id: payment.subscription || dbPayment.asaas_subscription_id
        }).eq('id', dbPayment.user_id);

        // Provisiona tenant Bivvo (idempotente)
        try {
          await runProvisionAndPersist(supabase, dbPayment.user_id);
        } catch (e) {
          console.error('Falha ao provisionar tenant Bivvo (webhook):', e);
        }

        // Atualizar venda do afiliado
        await supabase.from('affiliate_sales')
          .update({ status: 'paid' })
          .eq('asaas_payment_id', payment.id);
          
        // Aprovar comissões pendentes desta venda
        const { data: sale } = await supabase.from('affiliate_sales').select('id').eq('asaas_payment_id', payment.id).maybeSingle();
        if (sale) {
          await supabase.from('affiliate_commissions')
            .update({ status: 'approved' })
            .eq('sale_id', sale.id)
            .eq('status', 'pending');
        }

        console.log('Pagamento aprovado via Webhook:', payment.id);
      }
    }

    // 2. Pagamento Atrasado / Vencido
    if (body.event === 'PAYMENT_OVERDUE') {
       console.log('Pagamento atrasado:', payment.id);
       // Marca overdue_since do usuário (se ainda não estava marcado)
       const { data: overduePayment } = await supabase
         .from('payments')
         .select('user_id')
         .eq('asaas_payment_id', payment.id)
         .maybeSingle();
       if (overduePayment?.user_id) {
         const { data: u } = await supabase
           .from('users')
           .select('overdue_since')
           .eq('id', overduePayment.user_id)
           .maybeSingle();
         if (!u?.overdue_since) {
           await supabase.from('users').update({
             status: 'overdue',
             overdue_since: new Date().toISOString(),
           }).eq('id', overduePayment.user_id);
         }
       }
    }

    // 3. Assinatura Cancelada
    if (body.event === 'SUBSCRIPTION_DELETED') {
      const subscriptionId = body.subscription?.id;
      if (subscriptionId) {
        await supabase.from('users').update({ status: 'inativo' }).eq('asaas_subscription_id', subscriptionId);
        await supabase.from('affiliate_sales').update({ status: 'cancelled' }).eq('asaas_subscription_id', subscriptionId);
        console.log('Assinatura cancelada via Webhook:', subscriptionId);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Webhook Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
