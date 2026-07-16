// Helper para provisionar tenant + usuário na API adm.bivvo.com.br
// Utilizado por process-payment, create-subscription e asaas-webhook.

import { log } from './logger.ts';

const BIVVO_API_URL = Deno.env.get('BIVVO_API_URL') || 'https://adm.bivvo.com.br';

// Menu base SEM MassDispatch — MassDispatch só é adicionado se cliente contratar disparo em massa.
const DEFAULT_MENU = ['Groups', 'Kanban', 'Tasks', 'Api', 'ChatBot', 'Reports', 'Campaigns', 'PrivateChat', 'Teams', 'AllowedChannels'];

// Canais permitidos por padrão conforme especificação 4.2
const DEFAULT_ALLOWED_CHANNELS = [
  'waba', 'baileys', 'whatsapp', 'telegram', 'webchat', 'webmail',
  'wabaoauth', 'instagramoauth', 'facebookoauth',
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

function bearer() {
  const token = Deno.env.get('BIVVO_API_TOKEN');
  if (!token) throw new Error('BIVVO_API_TOKEN não configurado');
  return `Bearer ${token}`;
}

function computeUsers(cfg: BivvoCfg): number {
  const planUsers: Record<string, number> = { standard: 3, silver: 6, pro: 12 };
  const base = planUsers[cfg.plan || ''] || 0;
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

function totalConnections(limits: ReturnType<typeof computeChannelLimits>) {
  return Object.values(limits).reduce((a, b) => a + b, 0);
}

function buildMenuVisibility(cfg: BivvoCfg): string[] {
  const menu = [...DEFAULT_MENU];
  if (cfg.disparo) {
    // Insere logo após Groups conforme padrão Bivvo
    menu.splice(1, 0, 'MassDispatch');
  }
  return menu;
}

async function callStoreTenant(user: UserRow, cfg: BivvoCfg, asaasToken: string) {
  const maxUsers = computeUsers(cfg);
  const limits = computeChannelLimits(cfg);
  const maxConnections = Math.max(1, totalConnections(limits));

  const isPJ = (user.person_type || '').toUpperCase() === 'JURIDICA';
  const tenantName = isPJ && user.company_name ? user.company_name : user.name;

  const storePayload = {
    status: 'active',
    name: tenantName,
    maxUsers,
    maxConnections,
    acceptTerms: true,
    email: user.email,
    password: '@Bivvo123456',
    userName: user.name,
    profile: 'admin',
    paymentGateway: 'asaas',
    asaasCustomerId: user.asaas_customer_id,
    asaasToken,
    asaas: 'enabled',
  };

  console.log('[Bivvo] storeTenant →', tenantName, `${maxUsers}u`, `${maxConnections}c`);
  await log.info('bivvo-api', `storeTenant → ${tenantName}`, {
    userId: user.id, email: user.email, maxUsers, maxConnections, limits, payload: storePayload,
  });
  const res = await fetch(`${BIVVO_API_URL}/tenantApiStoreTenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: bearer() },
    body: JSON.stringify(storePayload),
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  console.log('[Bivvo] storeTenant status:', res.status, 'body:', text.slice(0, 800));
  await log.info('bivvo-api', `storeTenant response ${res.status}`, {
    userId: user.id, status: res.status, ok: res.ok, body: json ?? text.slice(0, 2000),
  });
  if (!res.ok) {
    await log.error('bivvo-api', `storeTenant falhou ${res.status}`, { userId: user.id, body: text.slice(0, 2000) });
    throw new Error(`storeTenant ${res.status}: ${text.slice(0, 500)}`);
  }
  const tenantId = String(
    json?.tenant?.id ?? json?.id ?? json?.tenantId ?? json?.data?.id ?? json?.data?.tenant?.id ?? ''
  );
  return { tenantId, response: json, maxUsers, maxConnections, limits };
}

async function callUpdateTenant(
  user: UserRow,
  cfg: BivvoCfg,
  ctx: { maxUsers: number; maxConnections: number; limits: ReturnType<typeof computeChannelLimits>; status?: string },
) {
  const tenantId = user.bivvo_tenant_id ? String(user.bivvo_tenant_id) : '';
  if (!tenantId) {
    throw new Error('Tenant Bivvo não encontrado (bivvo_tenant_id ausente). Provisione a conta antes de atualizar.');
  }
  const updatePayload = {
    id: tenantId,
    status: ctx.status || 'active',
    maxUsers: ctx.maxUsers,
    maxConnections: ctx.maxConnections,
    paymentGateway: 'asaas',
    supportChatEnabled: 'enabled',
    menuVisibility: buildMenuVisibility(cfg),
    allowedChannels: DEFAULT_ALLOWED_CHANNELS,
    channelConnectionLimits: ctx.limits,
    oauthEnabled: false,
  };

  console.log('[Bivvo] updateTenant →', identity, 'menu:', updatePayload.menuVisibility, 'limits:', ctx.limits);
  await log.info('bivvo-api', `updateTenant → ${identity}`, {
    userId: user.id, payload: updatePayload,
  });
  const res = await fetch(`${BIVVO_API_URL}/tenantApiUpdateTenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: bearer() },
    body: JSON.stringify(updatePayload),
  });
  const text = await res.text();
  console.log('[Bivvo] updateTenant status:', res.status, 'body:', text.slice(0, 800));
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* keep text */ }
  await log.info('bivvo-api', `updateTenant response ${res.status}`, {
    userId: user.id, status: res.status, ok: res.ok, body: json ?? text.slice(0, 2000),
  });
  if (!res.ok) {
    await log.error('bivvo-api', `updateTenant falhou ${res.status}`, { userId: user.id, body: text.slice(0, 2000) });
    throw new Error(`updateTenant ${res.status}: ${text.slice(0, 500)}`);
  }
  return json ?? { raw: text };
}

export async function provisionBivvoTenant(user: UserRow, cfg: BivvoCfg, supabase?: any) {
  // Se já foi totalmente provisionado, não refaz
  if (user.bivvo_tenant_id && user.tenant_provisioned_at) {
    console.log('[Bivvo] Tenant já provisionado:', user.id, '→', user.bivvo_tenant_id);
    return { skipped: true, tenantId: user.bivvo_tenant_id };
  }

  const asaasToken = Deno.env.get('BIVVO_ASAAS_TOKEN');
  if (!asaasToken) throw new Error('BIVVO_ASAAS_TOKEN não configurado');
  if (!user.asaas_customer_id) throw new Error('Cliente sem asaas_customer_id');

  // Sempre recomputa contexto (limites/usuários) — necessário para o update também
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = Math.max(1, totalConnections(limits));

  let tenantId = user.bivvo_tenant_id || '';
  let storeResponse: any = null;

  // ── Fase 1: Store (só se ainda não temos tenant_id) ──
  if (!tenantId) {
    const stored = await callStoreTenant(user, cfg, asaasToken);
    tenantId = stored.tenantId;
    storeResponse = stored.response;

    // Persiste tenant_id IMEDIATAMENTE para não perder caso o update falhe
    if (supabase && tenantId) {
      await supabase.from('users')
        .update({ bivvo_tenant_id: tenantId })
        .eq('id', user.id);
      console.log('[Bivvo] tenant_id salvo:', tenantId);
    }

    // Pequena espera para a Bivvo consolidar o tenant antes do update
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    console.log('[Bivvo] Tenant já existia (retomando update):', tenantId);
  }

  // ── Fase 2: Update ──
  const updateResponse = await callUpdateTenant(user, cfg, { maxUsers, maxConnections, limits });

  return { skipped: false, tenantId, storeResponse, updateResponse };
}

export async function runProvisionAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new Error('Usuário não encontrado: ' + userId);
  if (!user.bivvo_config) {
    console.warn('[Bivvo] User sem bivvo_config, pulando provisionamento:', userId);
    return { skipped: true, reason: 'no_config' };
  }
  try {
    const res = await provisionBivvoTenant(user, user.bivvo_config, supabase);
    await supabase.from('users').update({
      bivvo_tenant_id: res.tenantId || user.bivvo_tenant_id,
      tenant_provisioned_at: new Date().toISOString(),
      tenant_provision_error: null,
    }).eq('id', userId);
    return res;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Bivvo] Erro provisionando tenant:', err);
    await log.error('bivvo-api', `runProvisionAndPersist erro: ${msg}`, { userId });
    await supabase.from('users').update({
      tenant_provision_error: msg.slice(0, 1000),
    }).eq('id', userId);
    return { skipped: false, error: msg };
  }
}

export async function runUpdateAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new Error('Usuário não encontrado: ' + userId);
  if (!user.bivvo_config) {
    console.warn('[Bivvo] User sem bivvo_config, pulando atualização:', userId);
    return { skipped: true, reason: 'no_config' };
  }

  const cfg = user.bivvo_config as BivvoCfg;
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = Math.max(1, totalConnections(limits));

  try {
    await log.info('bivvo-api', `runUpdateAndPersist → ${user.id}`, { userId });
    const updateResponse = await callUpdateTenant(user, cfg, { maxUsers, maxConnections, limits });
    await supabase.from('users').update({
      tenant_provisioned_at: new Date().toISOString(),
      tenant_provision_error: null,
    }).eq('id', userId);
    return { skipped: false, tenantId: user.bivvo_tenant_id || null, updateResponse };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Bivvo] Erro atualizando tenant:', err);
    await log.error('bivvo-api', `runUpdateAndPersist erro: ${msg}`, { userId });
    await supabase.from('users').update({
      tenant_provision_error: msg.slice(0, 1000),
    }).eq('id', userId);
    return { skipped: false, error: msg };
  }
}

export async function runInactivateAndPersist(supabase: any, userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new Error('Usuário não encontrado: ' + userId);
  if (!user.cpf) {
    return { skipped: true, reason: 'no_cpf' };
  }

  const cfg = (user.bivvo_config as BivvoCfg) || {};
  const limits = computeChannelLimits(cfg);
  const maxUsers = computeUsers(cfg);
  const maxConnections = Math.max(1, totalConnections(limits));

  try {
    await log.info('bivvo-api', `runInactivateAndPersist → ${user.id}`, { userId });
    const updateResponse = await callUpdateTenant(user, cfg, { maxUsers, maxConnections, limits, status: 'inactive' });
    await supabase.from('users').update({
      status: 'inativo',
      tenant_provision_error: null,
    }).eq('id', userId);
    return { skipped: false, tenantId: user.bivvo_tenant_id || null, updateResponse };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Bivvo] Erro inativando tenant:', err);
    await log.error('bivvo-api', `runInactivateAndPersist erro: ${msg}`, { userId });
    await supabase.from('users').update({
      tenant_provision_error: msg.slice(0, 1000),
    }).eq('id', userId);
    return { skipped: false, error: msg };
  }
}
