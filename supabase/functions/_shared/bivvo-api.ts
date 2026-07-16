// Helper para provisionar tenant + usuário na API adm.bivvo.com.br
// Utilizado por process-payment e asaas-webhook.

const BIVVO_API_URL = Deno.env.get('BIVVO_API_URL') || 'https://adm.bivvo.com.br';

const CHANNEL_MENU = ['Groups', 'Kanban', 'Tasks', 'Api', 'ChatBot', 'Reports', 'Campaigns', 'PrivateChat', 'Teams', 'AllowedChannels'];

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
  const waof = Math.max(0, Math.floor(ch.waof || 0));
  const wano = Math.max(0, Math.floor(ch.wano || 0));
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
  const menu = [...CHANNEL_MENU];
  if (cfg.disparo) menu.splice(1, 0, 'MassDispatch');
  return menu;
}

export async function provisionBivvoTenant(user: UserRow, cfg: BivvoCfg) {
  if (user.bivvo_tenant_id && user.tenant_provisioned_at) {
    console.log('Tenant já provisionado para user', user.id, '→', user.bivvo_tenant_id);
    return { skipped: true, tenantId: user.bivvo_tenant_id };
  }

  const asaasToken = Deno.env.get('BIVVO_ASAAS_TOKEN');
  if (!asaasToken) throw new Error('BIVVO_ASAAS_TOKEN não configurado');
  if (!user.asaas_customer_id) throw new Error('Cliente sem asaas_customer_id');

  const maxUsers = computeUsers(cfg);
  const limits = computeChannelLimits(cfg);
  const maxConnections = totalConnections(limits);

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

  console.log('Bivvo storeTenant →', tenantName, maxUsers, 'users,', maxConnections, 'conns');
  const storeRes = await fetch(`${BIVVO_API_URL}/tenantApiStoreTenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: bearer() },
    body: JSON.stringify(storePayload),
  });
  const storeText = await storeRes.text();
  let storeJson: any = null;
  try { storeJson = JSON.parse(storeText); } catch { /* keep text */ }
  if (!storeRes.ok) {
    throw new Error(`storeTenant ${storeRes.status}: ${storeText.slice(0, 500)}`);
  }
  const tenantId = String(storeJson?.tenant?.id ?? storeJson?.id ?? storeJson?.tenantId ?? storeJson?.data?.id ?? '');
  console.log('Bivvo tenant criado:', tenantId, storeJson);

  // Update
  const identity = (user.cpf || '').replace(/\D/g, '');
  const updatePayload = {
    identity,
    status: 'active',
    menuVisibility: buildMenuVisibility(cfg),
    allowedChannels: ['waba', 'baileys', 'whatsapp', 'telegram', 'webchat', 'webmail', 'wabaoauth', 'instagramoauth', 'facebookoauth'],
    channelConnectionLimits: limits,
  };
  console.log('Bivvo updateTenant →', identity, updatePayload.menuVisibility);
  const updateRes = await fetch(`${BIVVO_API_URL}/tenantApiUpdateTenant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: bearer() },
    body: JSON.stringify(updatePayload),
  });
  const updateText = await updateRes.text();
  if (!updateRes.ok) {
    throw new Error(`updateTenant ${updateRes.status}: ${updateText.slice(0, 500)}`);
  }

  return { skipped: false, tenantId, storeResponse: storeJson };
}

export async function runProvisionAndPersist(
  supabase: any,
  userId: string,
) {
  const { data: user } = await supabase
    .from('users')
    .select('id, name, email, cpf, company_name, person_type, asaas_customer_id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at')
    .eq('id', userId)
    .maybeSingle();
  if (!user) throw new Error('Usuário não encontrado: ' + userId);
  if (!user.bivvo_config) {
    console.warn('User sem bivvo_config, pulando provisionamento:', userId);
    return { skipped: true, reason: 'no_config' };
  }
  try {
    const res = await provisionBivvoTenant(user, user.bivvo_config);
    await supabase.from('users').update({
      bivvo_tenant_id: res.tenantId || user.bivvo_tenant_id,
      tenant_provisioned_at: new Date().toISOString(),
      tenant_provision_error: null,
    }).eq('id', userId);
    return res;
  } catch (err) {
    console.error('Erro provisionando tenant:', err);
    await supabase.from('users').update({
      tenant_provision_error: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
    }).eq('id', userId);
    return { skipped: false, error: err instanceof Error ? err.message : String(err) };
  }
}
