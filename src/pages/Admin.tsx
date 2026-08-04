import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, LogOut, Package, Ticket, Users, Pencil, Trash2, Handshake, LayoutDashboard, UserCheck, ExternalLink, Info, Check, X, TrendingUp, Receipt, Share2, Copy, Settings, Smartphone, CheckCircle2, FileText, RefreshCw, Ban } from 'lucide-react';

import AdminAffiliates from '@/components/admin/AdminAffiliates';
import { AdminFinanceDashboard } from '@/components/admin/AdminFinanceDashboard';
import AdminExpenses from '@/components/admin/AdminExpenses';
import { AdminMarketingMaterials } from '@/components/admin/AdminMarketingMaterials';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminTasks } from '@/components/admin/AdminTasks';
import { AdminOfficialTemplates } from '@/components/admin/AdminOfficialTemplates';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { useSaveSetting } from '@/hooks/useSaveSetting';


import bivvoLogo from '@/assets/bivvo-logo.png';
import { formatCurrency } from '@/lib/validators';
import { CANAIS_DEF, quoteBivvo, normalizeBivvoConfig, configsEqual, safeRecurring, fmtBRL } from '@/lib/bivvo-calc';

interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
  price_recurring: number;
  description: string;
  features: { text: string; included: boolean }[];
  popular: boolean;
  gradient: string;
  icon: string;
  sort_order: number;
  active: boolean;
}

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  current_uses: number;
  valid_until: string | null;
  active: boolean;
}

interface Subscription {
  id: string;
  customer: string;
  value: number;
  status: string;
  billingType: string;
  nextDueDate: string;
  description: string;
  cycle: string;
  customerName?: string;
  customerEmail?: string;
  customerWhatsapp?: string;
  customerCpf?: string;
  tenantBivvo?: string;
  bivvoStatus?: string;
  localUserId?: string | null;
  externalReference?: string;
  paymentStatus?: 'adimplente' | 'inadimplente';
}

const Admin = () => {
  const { isAdmin, loading: authLoading, adminFetch, adminPost } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: siteSettings } = useSiteSettings();
  const { save: saveSetting } = useSaveSetting();
  const couponFieldEnabled = (siteSettings?.checkout_coupon_enabled ?? 'true') !== 'false';

  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  // Plan form
  const [planDialog, setPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    slug: '', name: '', price: '', price_recurring: '', description: '', popular: false, gradient: 'from-blue-500 to-cyan-500', icon: 'Zap', sort_order: '0',
    features: [{ text: '', included: true }],
  });

  // Coupon form
  const [couponDialog, setCouponDialog] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '', discount_percent: '', max_uses: '', valid_until: '',
  });

  const [customerData, setCustomerData] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [subDetailsDialog, setSubDetailsDialog] = useState(false);
  const [selectedSubPayments, setSelectedSubPayments] = useState<any[]>([]);
  const [loadingSubPayments, setLoadingSubPayments] = useState(false);
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);

  const [editFormData, setEditFormData] = useState({
    value: '',
    status: '',
    billingType: '',
    nextDueDate: '',
    description: ''
  });

  // Tenant Bivvo (por cliente Asaas)
  const [tenantBivvo, setTenantBivvo] = useState('');
  const [savingTenant, setSavingTenant] = useState(false);
  const [isEditingTenant, setIsEditingTenant] = useState(false);
  const [confirmTenantOpen, setConfirmTenantOpen] = useState(false);
  const [refreshingBivvo, setRefreshingBivvo] = useState(false);
  const [contractedConfig, setContractedConfig] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<{ id?: string | null; bivvo_tenant_id?: string | null; tenant_provisioned_at?: string | null; tenant_provision_error?: string | null; person_type?: string | null; company_name?: string | null; bivvo_config_synced_bivvo?: any; bivvo_config_synced_asaas_value?: number | null; bivvo_config_previous?: any } | null>(null);
  const [tenantLoading, setTenantLoading] = useState(false);
  const [provisioningTenant, setProvisioningTenant] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState<{ plan: string; users: number; channels: Record<string, number>; telefonia: boolean; disparo: boolean; protagonista: boolean }>({ plan: 'standard', users: 3, channels: {}, telefonia: false, disparo: false, protagonista: false });
  const [savingConfig, setSavingConfig] = useState(false);
  const [syncingAsaas, setSyncingAsaas] = useState(false);
  const [configLogs, setConfigLogs] = useState<any[]>([]);
  const [showPlanHistoryOnly, setShowPlanHistoryOnly] = useState(false);
  // legado - mantido por compat
  const [legacyConfigForm, setLegacyConfigForm] = useState<{ plan: string; users: number; channels: Record<string, number>; telefonia: boolean; disparo: boolean; protagonista: boolean }>({ plan: 'standard', users: 3, channels: {}, telefonia: false, disparo: false, protagonista: false });
  const [savingLegacyConfig, setSavingLegacyConfig] = useState(false);

  const handleSaveLegacyConfig = async () => {
    if (!tenantInfo?.id) {
      toast({ title: 'Cliente não encontrado', variant: 'destructive' });
      return;
    }
    setSavingLegacyConfig(true);
    try {
      const payload = {
        plan: legacyConfigForm.plan,
        users: Number(legacyConfigForm.users) || 0,
        channels: Object.fromEntries(Object.entries(legacyConfigForm.channels).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
        telefonia: !!legacyConfigForm.telefonia,
        disparo: !!legacyConfigForm.disparo,
        protagonista: !!legacyConfigForm.protagonista,
        _addedByAdmin: true,
        _addedAt: new Date().toISOString(),
      };
      const { error } = await supabase.from('users').update({ bivvo_config: payload as any }).eq('id', tenantInfo.id);
      if (error) throw error;
      setContractedConfig(payload);
      toast({ title: 'Configuração salva', description: 'A configuração contratada foi adicionada para este cliente.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha ao salvar configuração.', variant: 'destructive' });
    } finally {
      setSavingLegacyConfig(false);
    }
  };

  const beginEditConfig = () => {
    const base = contractedConfig || {};
    setConfigForm({
      plan: String(base.plan || (plans[0]?.slug ?? 'standard')),
      users: Number(base.users) || 1,
      channels: { ...(base.channels || {}) },
      telefonia: !!base.telefonia,
      disparo: !!base.disparo,
      protagonista: !!base.protagonista,
    });
    setIsEditingConfig(true);
  };

  const handleSaveConfig = async () => {
    if (!tenantInfo?.id) {
      toast({ title: 'Cliente não encontrado', variant: 'destructive' });
      return;
    }
    setSavingConfig(true);
    try {
      const payload = {
        plan: configForm.plan,
        users: Number(configForm.users) || 1,
        channels: Object.fromEntries(Object.entries(configForm.channels).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, Number(v)])),
        telefonia: !!configForm.telefonia,
        disparo: !!configForm.disparo,
        protagonista: !!configForm.protagonista,
      };
      const res: any = await adminPost('save-bivvo-config', { userId: tenantInfo.id, config: payload });
      setContractedConfig(payload);
      setIsEditingConfig(false);
      const flags: string[] = [];
      if (res?.needsBivvoUpdate) flags.push('Bivvo');
      if (res?.needsAsaasUpdate) flags.push('Asaas');
      toast({
        title: 'Configuração salva',
        description: flags.length
          ? `Pendente sincronizar: ${flags.join(' + ')}`
          : 'Sem alterações que exijam sincronização.',
      });
      await reloadTenantInfo();
      await loadConfigLogs();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message || 'Falha ao salvar configuração.', variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSyncAsaas = async () => {
    if (!tenantInfo?.id || !selectedSub?.id) return;
    if (!confirm('Atualizar o valor recorrente desta assinatura no Asaas com base na configuração atual?')) return;
    setSyncingAsaas(true);
    try {
      const res: any = await adminPost('update-subscription-value', {
        userId: tenantInfo.id,
        subscriptionId: selectedSub.id,
      });
      toast({
        title: 'Valor Asaas atualizado',
        description: `De ${fmtBRL(Number(res?.previousValue) || 0)} para ${fmtBRL(Number(res?.newValue) || 0)}`,
      });
      await reloadTenantInfo();
      await loadConfigLogs();
    } catch (e: any) {
      toast({ title: 'Erro ao sincronizar Asaas', description: e?.message || 'Falha', variant: 'destructive' });
    } finally {
      setSyncingAsaas(false);
    }
  };

  const handleRollbackConfig = async () => {
    if (!tenantInfo?.id) return;
    if (!confirm('Restaurar a configuração anterior? Isso substitui a atual.')) return;
    try {
      await adminPost('rollback-bivvo-config', { userId: tenantInfo.id });
      toast({ title: 'Configuração restaurada', description: 'Reveja e sincronize se necessário.' });
      await reloadTenantInfo();
      await loadConfigLogs();
    } catch (e: any) {
      toast({ title: 'Erro ao restaurar', description: e?.message || 'Falha', variant: 'destructive' });
    }
  };

  const reloadTenantInfo = async () => {
    if (!tenantInfo?.id && !selectedSub?.customer) return;
    const q = supabase.from('users')
      .select('id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at, tenant_provision_error, person_type, company_name, bivvo_config_synced_bivvo, bivvo_config_synced_asaas_value, bivvo_config_previous');
    const { data } = tenantInfo?.id
      ? await q.eq('id', tenantInfo.id).maybeSingle()
      : await q.eq('asaas_customer_id', selectedSub!.customer).maybeSingle();
    if (data) {
      setTenantInfo(data as any);
      setContractedConfig(data.bivvo_config || null);
    }
  };

  const loadConfigLogs = async () => {
    if (!tenantInfo?.id) return;
    try {
      const res: any = await adminFetch('list-config-logs', { userId: tenantInfo.id });
      setConfigLogs(res?.data || []);
    } catch (e) {
      console.error('loadConfigLogs', e);
    }
  };

  // Derivados: precisa sincronizar Bivvo/Asaas?
  const needsBivvoSync = (() => {
    if (!contractedConfig) return false;
    if (!tenantInfo?.bivvo_config_synced_bivvo) return true;
    return !configsEqual(contractedConfig, tenantInfo.bivvo_config_synced_bivvo);
  })();
  const currentRecurring = safeRecurring(contractedConfig);
  const syncedAsaasValue = tenantInfo?.bivvo_config_synced_asaas_value != null ? Number(tenantInfo.bivvo_config_synced_asaas_value) : null;
  const needsAsaasSync = (() => {
    if (!contractedConfig || currentRecurring == null) return false;
    if (syncedAsaasValue == null) return false; // sem baseline não força; primeiro pgto define
    return Math.abs(currentRecurring - syncedAsaasValue) > 0.005;
  })();

  // Contato do cliente (Asaas + local)
  const [contactForm, setContactForm] = useState({
    name: '', email: '', mobilePhone: '', cpfCnpj: '',
    postalCode: '', address: '', addressNumber: '', complement: '', province: '',
  });
  const [savingContact, setSavingContact] = useState(false);

  const [subsFilter, setSubsFilter] = useState('');

  const [subsBillingFilter, setSubsBillingFilter] = useState('');
  const [subsCustomerSearch, setSubsCustomerSearch] = useState('');
  const [subsExtRefSearch, setSubsExtRefSearch] = useState('');
  const [subsOffset, setSubsOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    if (isAdmin) {
      loadPlans();
      loadCoupons();
      loadChannels();
      loadSubscriptions();
      loadCustomers();
    }
  }, [isAdmin]);

  const loadChannels = async () => {
    const { data } = await supabase.from('channels').select('*').order('sort_order');
    if (data) setChannels(data);
  };

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const { data } = await supabase
      .from('customers')
      .select('*, subscriptions(*)');
    if (data) setCustomerData(data);
    setLoadingCustomers(false);
  };

  const handleCreateAccount = async (customer: any) => {
    if (!confirm(`Deseja criar a conta para ${customer.name}?`)) return;
    
    setCreatingAccount(customer.id);
    try {
      const sub = customer.subscriptions?.[0];
      const payload = {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        plan: sub?.plan_slug,
        users: sub?.users_count,
        channels: sub?.channels_config,
        is_protagonista: sub?.is_protagonista,
        has_telefonia: sub?.has_telefonia
      };

      const response = await fetch('https://wbn.araise.com.br/webhook/105cb20e-0aa3-4800-a1ca-3ec7795bfe79', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Falha ao enviar webhook');

      // Update in DB
      const { error } = await supabase
        .from('subscriptions')
        .update({ account_created: true })
        .eq('customer_id', customer.id);

      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Conta criada e webhook enviado!' });
      loadCustomers();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao criar conta', variant: 'destructive' });
    } finally {
      setCreatingAccount(null);
    }
  };


  const handleUpdateSubscription = async () => {
    if (!selectedSub) return;
    if (!confirm('Tem certeza que deseja atualizar esta assinatura?')) return;

    setIsUpdatingSub(true);
    try {
      const payload = {
        id: selectedSub.id,
        value: parseFloat(editFormData.value),
        status: editFormData.status,
        billingType: editFormData.billingType,
        nextDueDate: editFormData.nextDueDate || undefined,
        description: editFormData.description,
        updatePendingPayments: true
      };

      await adminPost('update-subscription', payload);
      toast({ title: 'Sucesso', description: 'Assinatura atualizada no Asaas!' });
      loadSubscriptions();
      setSubDetailsDialog(false);
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao atualizar', variant: 'destructive' });
    } finally {
      setIsUpdatingSub(false);
    }
  };


  useEffect(() => {
    if (selectedSub) {
      // Reset imediato para evitar race condition entre trocas de cliente
      setTenantInfo(null);
      setContractedConfig(null);
      setConfigLogs([]);
      setTenantLoading(true);

      setEditFormData({
        value: String(selectedSub.value),
        status: selectedSub.status,
        billingType: selectedSub.billingType,
        nextDueDate: selectedSub.nextDueDate || '',
        description: selectedSub.description || ''
      });
      setTenantBivvo(selectedSub.tenantBivvo || '');
      setIsEditingTenant(false);
      setContactForm({
        name: selectedSub.customerName || '',
        email: selectedSub.customerEmail || '',
        mobilePhone: selectedSub.customerWhatsapp || '',
        cpfCnpj: selectedSub.customerCpf || '',
        postalCode: '', address: '', addressNumber: '', complement: '', province: '',
      });
      loadSubPayments(selectedSub.id);

      const targetCustomer = selectedSub.customer;
      supabase.from('users')
        .select('id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at, tenant_provision_error, person_type, company_name, bivvo_config_synced_bivvo, bivvo_config_synced_asaas_value, bivvo_config_previous')
        .eq('asaas_customer_id', targetCustomer)
        .maybeSingle()
        .then(async ({ data, error }) => {
          // Ignora se o usuário já trocou de cliente
          if (!selectedSub || selectedSub.customer !== targetCustomer) return;
          if (error) {
            console.error('Erro ao carregar tenant info:', error);
          }
          setContractedConfig(data?.bivvo_config || null);
          setTenantInfo((data as any) || null);
          setIsEditingConfig(false);
          if (data?.bivvo_tenant_id) {
            setTenantBivvo(String(data.bivvo_tenant_id));
          }
          if (data?.id) {
            try {
              const res: any = await adminFetch('list-config-logs', { userId: data.id });
              setConfigLogs(res?.data || []);
            } catch (e) { console.error(e); }
          } else {
            setConfigLogs([]);
          }
          setTenantLoading(false);
        });
    } else {
      setSelectedSubPayments([]);
      setContractedConfig(null);
      setTenantInfo(null);
      setTenantLoading(false);
    }
  }, [selectedSub]);

  const handleSaveTenant = async () => {
    if (!selectedSub) return;
    setSavingTenant(true);
    const trimmed = tenantBivvo.trim();
    try {
      await adminPost('update-user-tenant', {
        asaasCustomerId: selectedSub.customer,
        tenantBivvo: trimmed,
      });
      toast({ title: 'Salvo', description: 'Tenant Bivvo atualizado.' });
      // reflete no card selecionado + lista
      setSelectedSub(prev => prev ? { ...prev, tenantBivvo: trimmed, bivvoStatus: trimmed ? 'Verificando...' : 'Inserir ID' } : prev);
      setSubscriptions(prev => prev.map(s => s.customer === selectedSub.customer
        ? { ...s, tenantBivvo: trimmed, bivvoStatus: trimmed ? 'Verificando...' : 'Inserir ID' }
        : s));
      setIsEditingTenant(false);
      setConfirmTenantOpen(false);

      // Dispara consulta imediata ao Bivvo para refletir o status na hora
      if (trimmed) {
        try {
          const resp = await adminPost('check-bivvo-tenant', { tenantId: trimmed });
          let liveStatus = 'Não possui Tenant';
          if (resp?.ok && resp?.exists) {
            let tenant: any = resp.tenant?.tenant ?? resp.tenant?.data?.tenant ?? resp.tenant?.data ?? resp.tenant;
            if (Array.isArray(tenant)) tenant = tenant[0];
            const st = String(tenant?.status ?? '').toLowerCase().trim();
            if (st === 'active') liveStatus = 'active';
            else if (st === 'inactive') liveStatus = 'inactive';
            else if (tenant && (tenant.id || tenant.name)) liveStatus = st || 'inactive';
          }
          setSelectedSub(prev => prev ? { ...prev, bivvoStatus: liveStatus } : prev);
          setSubscriptions(prev => prev.map(s => s.customer === selectedSub.customer ? { ...s, bivvoStatus: liveStatus } : s));
        } catch (e) {
          console.warn('Falha ao consultar status Bivvo após salvar:', e);
        }
      }
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao salvar tenant', variant: 'destructive' });
    } finally {
      setSavingTenant(false);
    }
  };

  const handleProvisionTenant = async () => {
    if (!tenantInfo?.id) {
      toast({ title: 'Erro', description: 'Cliente não encontrado no banco.', variant: 'destructive' });
      return;
    }
    setProvisioningTenant(true);
    try {
      // Se a conta Bivvo já foi criada, dispara apenas o update (não refaz o store)
      const isProvisioned = !!tenantInfo?.bivvo_tenant_id && !!tenantInfo?.tenant_provisioned_at;
      const { data, error } = await supabase.functions.invoke('provision-bivvo-tenant', {
        body: { userId: tenantInfo.id, mode: isProvisioned ? 'update' : undefined },
      });
      if (error) throw error;
      if (data?.result?.error) throw new Error(data.result.error);
      toast({
        title: isProvisioned ? 'Tenant atualizado' : 'Tenant provisionado',
        description: data?.result?.skipped
          ? 'Tenant já estava provisionado.'
          : `Operação executada com sucesso${data?.result?.tenantId ? ` (ID: ${data.result.tenantId})` : ''}.`,
      });
      // Recarrega tenantInfo
      const { data: refreshed } = await supabase.from('users')
        .select('id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at, tenant_provision_error, person_type, company_name, bivvo_config_synced_bivvo, bivvo_config_synced_asaas_value, bivvo_config_previous')
        .eq('id', tenantInfo.id)
        .maybeSingle();
      if (refreshed) {
        setTenantInfo(refreshed);
        if (refreshed.bivvo_tenant_id) setTenantBivvo(String(refreshed.bivvo_tenant_id));
      }
    } catch (err) {
      toast({ title: 'Erro no provisionamento', description: err instanceof Error ? err.message : 'Falha ao provisionar tenant', variant: 'destructive' });
    } finally {
      setProvisioningTenant(false);
    }
  };

  const handleInactivateTenant = async () => {
    if (!tenantInfo?.id) {
      toast({ title: 'Erro', description: 'Cliente não encontrado no banco.', variant: 'destructive' });
      return;
    }
    if (!confirm('Tem certeza que deseja INATIVAR a conta Bivvo deste cliente? O acesso do cliente será bloqueado.')) return;
    setProvisioningTenant(true);
    try {
      const { data, error } = await supabase.functions.invoke('provision-bivvo-tenant', {
        body: { userId: tenantInfo.id, mode: 'inactivate' },
      });
      if (error) throw error;
      if (data?.result?.error) throw new Error(data.result.error);
      toast({ title: 'Conta inativada', description: 'A conta Bivvo foi marcada como inativa via API.' });
      const { data: refreshed } = await supabase.from('users')
        .select('id, bivvo_config, bivvo_tenant_id, tenant_provisioned_at, tenant_provision_error, person_type, company_name, bivvo_config_synced_bivvo, bivvo_config_synced_asaas_value, bivvo_config_previous')
        .eq('id', tenantInfo.id)
        .maybeSingle();
      if (refreshed) setTenantInfo(refreshed);
    } catch (err) {
      toast({ title: 'Erro ao inativar', description: err instanceof Error ? err.message : 'Falha ao inativar conta', variant: 'destructive' });
    } finally {
      setProvisioningTenant(false);
    }
  };



  const handleRefreshAllBivvo = async () => {
    setRefreshingBivvo(true);
    try {
      const res: any = await adminPost('refresh-all-bivvo-statuses', {});
      const s = res?.summary || {};
      toast({
        title: 'Consulta Bivvo concluída',
        description: `Total: ${s.total ?? 0} · Ativos: ${s.active ?? 0} · Inativos: ${s.inactive ?? 0} · Sem tenant: ${s.none ?? 0} · Inserir ID: ${s.fill ?? 0} · Erros: ${s.error ?? 0}`,
      });
      await loadSubscriptions({});
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao consultar Bivvo', variant: 'destructive' });
    } finally {
      setRefreshingBivvo(false);
    }
  };




  const handleSaveContact = async () => {
    if (!selectedSub) return;
    setSavingContact(true);
    try {
      await adminPost('update-customer', {
        asaasCustomerId: selectedSub.customer,
        ...contactForm,
      });
      toast({ title: 'Sucesso', description: 'Dados de contato atualizados no Asaas e no banco.' });
      setSelectedSub(prev => prev ? {
        ...prev,
        customerName: contactForm.name || prev.customerName,
        customerEmail: contactForm.email || prev.customerEmail,
        customerWhatsapp: contactForm.mobilePhone || prev.customerWhatsapp,
        customerCpf: contactForm.cpfCnpj || prev.customerCpf,
      } : prev);
      loadSubscriptions();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao atualizar', variant: 'destructive' });
    } finally {
      setSavingContact(false);
    }
  };

  const [customerActionLoading, setCustomerActionLoading] = useState(false);
  const handleDeleteCustomer = async () => {
    if (!selectedSub) return;
    if (!confirm(`Remover o cliente ${selectedSub.customerName} do Asaas?\n\nIsso cancelará futuras cobranças. O cliente poderá ser restaurado depois.`)) return;
    setCustomerActionLoading(true);
    try {
      await adminPost('delete-customer', { asaasCustomerId: selectedSub.customer });
      toast({ title: 'Cliente removido', description: 'Cliente removido do Asaas e do banco de dados.' });
      setSubDetailsDialog(false);
      loadSubscriptions();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao remover cliente', variant: 'destructive' });
    } finally {
      setCustomerActionLoading(false);
    }
  };
  const handleRestoreCustomer = async () => {
    if (!selectedSub) return;
    if (!confirm(`Restaurar o cliente ${selectedSub.customerName} no Asaas?`)) return;
    setCustomerActionLoading(true);
    try {
      await adminPost('restore-customer', { asaasCustomerId: selectedSub.customer });
      toast({ title: 'Cliente restaurado', description: 'Cliente reativado no Asaas.' });
      loadSubscriptions();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao restaurar cliente', variant: 'destructive' });
    } finally {
      setCustomerActionLoading(false);
    }
  };



  const loadSubPayments = async (id: string) => {
    setLoadingSubPayments(true);
    try {
      const res = await adminFetch('list-subscription-payments', { id });
      setSelectedSubPayments(res.data || []);
    } catch (err) {
      console.error('Error loading sub payments:', err);
    } finally {
      setLoadingSubPayments(false);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'RECEIVED_IN_CASH':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[9px] h-4">Pago</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500/20 text-[9px] h-4">Pendente</Badge>;
      case 'OVERDUE':
        return <Badge variant="outline" className="text-red-600 border-red-500/20 text-[9px] h-4">Atrasado</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20 text-[9px] h-4">Cancelada</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="text-purple-600 border-purple-500/20 text-[9px] h-4">Estornada</Badge>;
      default:
        return <Badge variant="outline" className="text-[9px] h-4">{status}</Badge>;
    }
  };

  const loadPlans = async () => {


    const { data } = await supabase.from('plans').select('*').order('sort_order');
    if (data) setPlans(data as any);
  };

  const loadCoupons = async () => {
    const { data } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (data) setCoupons(data as any);
  };

  const loadSubscriptions = async (paramsOverride: Record<string, string> = {}) => {
    setLoadingData(true);
    try {
      const params: Record<string, string> = { 
        limit: String(limit),
        offset: String(subsOffset),
        ...paramsOverride 
      };
      
      if (subsFilter && !params.status) params.status = subsFilter;
      if (subsBillingFilter && !params.billingType) params.billingType = subsBillingFilter;
      if (subsCustomerSearch && !params.customer) params.customer = subsCustomerSearch;
      if (subsExtRefSearch && !params.externalReference) params.externalReference = subsExtRefSearch;

      const result = await adminFetch('list-subscriptions', params);
      setSubscriptions(result.data || []);
      setSubsTotal(result.totalCount || 0);
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao carregar assinaturas', variant: 'destructive' });
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadSubscriptions();
    }
  }, [isAdmin, subsOffset]);

  const handleSavePlan = async () => {
    try {
      const features = planForm.features.filter(f => f.text.trim());
      const planData = {
        slug: planForm.slug.toLowerCase().trim(),
        name: planForm.name.trim(),
        price: parseFloat(planForm.price),
        price_recurring: parseFloat(planForm.price_recurring) || parseFloat(planForm.price),
        description: planForm.description.trim(),
        popular: planForm.popular,
        gradient: planForm.gradient,
        icon: planForm.icon,
        sort_order: parseInt(planForm.sort_order) || 0,
        features: JSON.stringify(features),
        active: true,
      };

      if (editingPlan) {
        const { error } = await supabase.from('plans').update(planData).eq('id', editingPlan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('plans').insert(planData);
        if (error) throw error;
      }

      toast({ title: 'Sucesso', description: 'Plano salvo!' });
      setPlanDialog(false);
      setEditingPlan(null);
      loadPlans();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from('plans').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else loadPlans();
  };

  const handleTogglePlan = async (id: string, active: boolean) => {
    await supabase.from('plans').update({ active }).eq('id', id);
    loadPlans();
  };

  const handleSaveCoupon = async () => {
    try {
      const couponData: any = {
        code: couponForm.code.toUpperCase().trim(),
        discount_percent: parseFloat(couponForm.discount_percent),
        active: true,
      };
      if (couponForm.max_uses) couponData.max_uses = parseInt(couponForm.max_uses);
      if (couponForm.valid_until) couponData.valid_until = couponForm.valid_until;

      const { error } = await supabase.from('coupons').insert(couponData);
      if (error) throw error;

      toast({ title: 'Sucesso', description: 'Cupom criado!' });
      setCouponDialog(false);
      setCouponForm({ code: '', discount_percent: '', max_uses: '', valid_until: '' });
      loadCoupons();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleToggleCoupon = async (id: string, active: boolean) => {
    await supabase.from('coupons').update({ active }).eq('id', id);
    loadCoupons();
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Tem certeza?')) return;
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else loadCoupons();
  };

  const openEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      slug: plan.slug,
      name: plan.name,
      price: String(plan.price),
      price_recurring: String(plan.price_recurring || plan.price),
      description: plan.description || '',
      popular: plan.popular,
      gradient: plan.gradient,
      icon: plan.icon,
      sort_order: String(plan.sort_order),
      features: plan.features.length > 0 ? plan.features : [{ text: '', included: true }],
    });
    setPlanDialog(true);
  };

  const openNewPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      slug: '', name: '', price: '', price_recurring: '', description: '', popular: false,
      gradient: 'from-blue-500 to-cyan-500', icon: 'Zap', sort_order: '0',
      features: [{ text: '', included: true }],
    });
    setPlanDialog(true);
  };

  const [channelDialog, setChannelDialog] = useState(false);
  const [editingChannel, setEditingChannel] = useState<any>(null);
  const [channelForm, setChannelForm] = useState<any>({
    slug: '', label: '', unit_price: '', included: 0, 
    emoji: '', icon_url: '', sort_order: 0, active: true
  });

  const openNewChannel = () => {
    setEditingChannel(null);
    setChannelForm({
      slug: '', label: '', unit_price: '', included: 0, 
      emoji: '', icon_url: '', sort_order: 0, active: true
    });
    setChannelDialog(true);
  };

  const openEditChannel = (channel: any) => {
    setEditingChannel(channel);
    setChannelForm({
      slug: channel.slug,
      label: channel.label,
      unit_price: channel.unit_price.toString(),
      included: channel.included || 0,
      emoji: channel.emoji || '',
      icon_url: channel.icon_url || '',
      sort_order: channel.sort_order || 0,
      active: channel.active
    });
    setChannelDialog(true);
  };

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const channelData = {
      ...channelForm,
      unit_price: parseFloat(channelForm.unit_price),
      included: parseInt(channelForm.included),
      sort_order: parseInt(channelForm.sort_order)
    };

    let error;
    if (editingChannel) {
      const { error: err } = await supabase.from('channels').update(channelData).eq('id', editingChannel.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('channels').insert(channelData);
      error = err;
    }

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: editingChannel ? 'Canal atualizado!' : 'Canal criado!' });
      setChannelDialog(false);
      loadChannels();
    }
  };

  const handleChannelIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { data, error } = await supabase.storage.from('marketing').upload(`icons/${Date.now()}-${file.name}`, file);
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' });
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('marketing').getPublicUrl(data.path);
    setChannelForm(prev => ({ ...prev, icon_url: publicUrl }));
    toast({ title: 'Sucesso', description: 'Ícone enviado!' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'INACTIVE': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'EXPIRED': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bivvoLogo} alt="Bivvo" className="h-6" />
            <Badge variant="outline" className="text-accent border-accent/30">Admin</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
            <TabsTrigger value="plans" className="gap-2"><Package className="h-4 w-4" /> Planos</TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2"><Ticket className="h-4 w-4" /> Cupons</TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2"><Users className="h-4 w-4" /> Gestão de Assinaturas</TabsTrigger>
            <TabsTrigger value="affiliates" className="gap-2"><Handshake className="h-4 w-4" /> Afiliados</TabsTrigger>
            <TabsTrigger value="expenses" className="gap-2"><Receipt className="h-4 w-4" /> Despesas</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2"><Share2 className="h-4 w-4" /> Marketing</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2"><CheckCircle2 className="h-4 w-4" /> Tarefas</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2"><FileText className="h-4 w-4" /> Modelos de Template</TabsTrigger>

          </TabsList>


          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <AdminFinanceDashboard adminFetch={adminFetch} />
          </TabsContent>

          {/* EXPENSES TAB */}
          <TabsContent value="expenses">
            <AdminExpenses adminFetch={adminFetch} adminPost={adminPost} />
          </TabsContent>

          {/* MARKETING TAB */}
          <TabsContent value="marketing">
            <AdminMarketingMaterials />
          </TabsContent>

          {/* TASKS TAB */}
          <TabsContent value="tasks">
            <AdminTasks />
          </TabsContent>

          {/* OFFICIAL TEMPLATES TAB */}
          <TabsContent value="templates">
            <AdminOfficialTemplates />
          </TabsContent>



          {/* PLANS TAB */}
          <TabsContent value="plans">
            <div className="space-y-8">
              <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Planos</h2>
              <Dialog open={planDialog} onOpenChange={setPlanDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNewPlan}><Plus className="h-4 w-4 mr-2" /> Novo Plano</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input value={planForm.slug} onChange={e => setPlanForm(p => ({ ...p, slug: e.target.value }))} placeholder="standard" />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input value={planForm.name} onChange={e => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder="Standard" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Promo (1º Mês)</Label>
                        <Input type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label>Preço Recorrência (2º Mês+)</Label>
                        <Input type="number" step="0.01" value={planForm.price_recurring} onChange={e => setPlanForm(p => ({ ...p, price_recurring: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input type="number" value={planForm.sort_order} onChange={e => setPlanForm(p => ({ ...p, sort_order: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Input value={planForm.description} onChange={e => setPlanForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Gradiente</Label>
                        <Input value={planForm.gradient} onChange={e => setPlanForm(p => ({ ...p, gradient: e.target.value }))} placeholder="from-blue-500 to-cyan-500" />
                      </div>
                      <div className="space-y-2">
                        <Label>Ícone</Label>
                        <Input value={planForm.icon} onChange={e => setPlanForm(p => ({ ...p, icon: e.target.value }))} placeholder="Zap, Shield, Crown" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={planForm.popular} onCheckedChange={v => setPlanForm(p => ({ ...p, popular: v }))} />
                      <Label>Mais popular</Label>
                    </div>
                    <div className="space-y-2">
                      <Label>Features</Label>
                      {planForm.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input
                            value={f.text}
                            onChange={e => {
                              const features = [...planForm.features];
                              features[i] = { ...features[i], text: e.target.value };
                              setPlanForm(p => ({ ...p, features }));
                            }}
                            placeholder="Nome da feature"
                            className="flex-1"
                          />
                          <Switch
                            checked={f.included}
                            onCheckedChange={v => {
                              const features = [...planForm.features];
                              features[i] = { ...features[i], included: v };
                              setPlanForm(p => ({ ...p, features }));
                            }}
                          />
                          <Button variant="ghost" size="sm" onClick={() => {
                            const features = planForm.features.filter((_, idx) => idx !== i);
                            setPlanForm(p => ({ ...p, features }));
                          }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <Button variant="outline" size="sm" onClick={() => setPlanForm(p => ({ ...p, features: [...p.features, { text: '', included: true }] }))}>
                        <Plus className="h-3 w-3 mr-1" /> Feature
                      </Button>
                    </div>
                    <Button onClick={handleSavePlan} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="card-glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Popular</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell className="text-muted-foreground">{plan.slug}</TableCell>
                      <TableCell>{formatCurrency(plan.price)}</TableCell>
                      <TableCell>{plan.popular ? <Badge className="bg-accent/10 text-accent border-accent/20">Sim</Badge> : '—'}</TableCell>
                      <TableCell>
                        <Switch checked={plan.active} onCheckedChange={v => handleTogglePlan(plan.id, v)} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Canais Adicionais</h2>
              <Dialog open={channelDialog} onOpenChange={setChannelDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openNewChannel}><Plus className="h-4 w-4 mr-2" /> Novo Canal</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingChannel ? 'Editar Canal' : 'Novo Canal'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveChannel} className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input 
                          value={channelForm.slug} 
                          onChange={e => setChannelForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().trim() }))} 
                          required 
                          placeholder="waof" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Nome</Label>
                        <Input 
                          value={channelForm.label} 
                          onChange={e => setChannelForm(prev => ({ ...prev, label: e.target.value }))} 
                          required 
                          placeholder="WhatsApp API" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Preço Unitário</Label>
                        <Input 
                          value={channelForm.unit_price} 
                          onChange={e => setChannelForm(prev => ({ ...prev, unit_price: e.target.value }))} 
                          type="number" 
                          step="0.01" 
                          required 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Incluído no Plano</Label>
                        <Input 
                          value={channelForm.included} 
                          onChange={e => setChannelForm(prev => ({ ...prev, included: e.target.value }))} 
                          type="number" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Emoji (Opcional)</Label>
                        <Input 
                          value={channelForm.emoji} 
                          onChange={e => setChannelForm(prev => ({ ...prev, emoji: e.target.value }))} 
                          placeholder="📱" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ordem</Label>
                        <Input 
                          value={channelForm.sort_order} 
                          onChange={e => setChannelForm(prev => ({ ...prev, sort_order: e.target.value }))} 
                          type="number" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>URL do Ícone (PNG/SVG)</Label>
                      <Input 
                        value={channelForm.icon_url} 
                        onChange={e => setChannelForm(prev => ({ ...prev, icon_url: e.target.value }))} 
                        placeholder="https://..." 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Ou subir novo Ícone (PNG)</Label>
                      <Input type="file" accept="image/png" onChange={handleChannelIconUpload} />
                    </div>
                    <Button type="submit" className="w-full">
                      {editingChannel ? 'Salvar Alterações' : 'Criar Canal'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <div className="card-glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ícone</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {channels.map(channel => (
                    <TableRow key={channel.id}>
                      <TableCell>
                        {channel.icon_url ? (
                          <img src={channel.icon_url} alt="" className="h-6 w-6 object-contain" />
                        ) : (
                          <span className="text-lg">{channel.emoji}</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{channel.label}</TableCell>
                      <TableCell className="text-muted-foreground">{channel.slug}</TableCell>
                      <TableCell>{formatCurrency(channel.unit_price)}</TableCell>
                      <TableCell>
                        <Switch checked={channel.active} onCheckedChange={async (v) => {
                          await supabase.from('channels').update({ active: v }).eq('id', channel.id);
                          loadChannels();
                        }} />
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditChannel(channel)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={async () => {
                          if (confirm('Excluir este canal?')) {
                            await supabase.from('channels').delete().eq('id', channel.id);
                            loadChannels();
                          }
                        }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </TabsContent>

          {/* COUPONS TAB */}
          <TabsContent value="coupons">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Cupons</h2>
              <Dialog open={couponDialog} onOpenChange={setCouponDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Cupom</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo Cupom</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input value={couponForm.code} onChange={e => setCouponForm(p => ({ ...p, code: e.target.value }))} placeholder="DESCONTO10" />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto (%)</Label>
                      <Input type="number" min="1" max="100" value={couponForm.discount_percent} onChange={e => setCouponForm(p => ({ ...p, discount_percent: e.target.value }))} />
                      <p className="text-xs text-muted-foreground">
                        O desconto é aplicado apenas na <strong>primeira mensalidade</strong>. Cupons de 100% deixam o 1º mês grátis; a partir do 2º mês o valor cheio é cobrado automaticamente.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Máximo de usos (vazio = ilimitado)</Label>
                      <Input type="number" value={couponForm.max_uses} onChange={e => setCouponForm(p => ({ ...p, max_uses: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Válido até (opcional)</Label>
                      <Input type="datetime-local" value={couponForm.valid_until} onChange={e => setCouponForm(p => ({ ...p, valid_until: e.target.value }))} />
                    </div>
                    <Button onClick={handleSaveCoupon} className="w-full">Criar Cupom</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="card-glass rounded-xl p-4 mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">Campo de cupom no checkout</p>
                <p className="text-sm text-muted-foreground">
                  Quando desativado, o campo para digitar cupom fica oculto na tela de pagamento.
                </p>
              </div>
              <Switch
                checked={couponFieldEnabled}
                onCheckedChange={(v) =>
                  saveSetting(
                    { checkout_coupon_enabled: v ? 'true' : 'false' },
                    { label: 'Campo de cupom no checkout' },
                  )
                }
              />
            </div>


            <div className="card-glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons.map(coupon => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-medium">{coupon.code}</TableCell>
                      <TableCell>{coupon.discount_percent}%</TableCell>
                      <TableCell>{coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ''}</TableCell>
                      <TableCell>{coupon.valid_until ? new Date(coupon.valid_until).toLocaleDateString('pt-BR') : 'Sem limite'}</TableCell>
                      <TableCell>
                        <Switch checked={coupon.active} onCheckedChange={v => handleToggleCoupon(coupon.id, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCoupon(coupon.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {coupons.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum cupom criado</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* SUBSCRIPTIONS TAB - INTEGRATED VIEW */}
          <TabsContent value="subscriptions">
            <div className="space-y-4 mb-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-lg font-semibold">Assinaturas e Clientes ({subsTotal})</h2>
                <div className="flex flex-wrap gap-2">
                  <Input 
                    placeholder="Filtrar por nome ou email..." 
                    className="w-full md:w-64 h-8 text-xs"
                    value={subsCustomerSearch}
                    onChange={(e) => setSubsCustomerSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadSubscriptions({ offset: '0' })}
                  />
                  <select 
                    className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                    value={subsBillingFilter}
                    onChange={(e) => {
                      setSubsBillingFilter(e.target.value);
                      loadSubscriptions({ billingType: e.target.value, offset: '0' });
                    }}
                  >
                    <option value="">Todos Tipos</option>
                    <option value="PIX">PIX</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CREDIT_CARD">Cartão</option>
                  </select>
                  <Button size="sm" variant="secondary" onClick={() => loadSubscriptions({ offset: '0' })}>Filtrar</Button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2">
                {['', 'ACTIVE', 'INACTIVE', 'EXPIRED'].map(s => (
                  <Button
                    key={s}
                    variant={subsFilter === s ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => { 
                      setSubsFilter(s); 
                      loadSubscriptions({ status: s, offset: '0' }); 
                    }}
                  >
                    {s || 'Todos Status'}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-2"
                  onClick={handleRefreshAllBivvo}
                  disabled={refreshingBivvo}
                >
                  {refreshingBivvo ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                  Atualizar base
                </Button>
                <span className="text-[10px] text-muted-foreground">
                  Consulta a Bivvo para todos os clientes com Tenant preenchido, atualiza o status da conta e hidrata CPF/CNPJ de clientes legados.
                </span>

              </div>
            </div>


            <div className="card-glass rounded-xl overflow-hidden">
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano / Valor</TableHead>
                        <TableHead className="w-[110px] text-center">Pagamento</TableHead>
                        <TableHead className="w-[100px] text-center">Status Asaas</TableHead>
                        <TableHead className="w-[130px] text-center">Conta Bivvo</TableHead>
                        <TableHead className="w-[140px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map(sub => {
                        // Find matching internal customer/subscription for account creation state
                        const internalCustomer = customerData.find(c => c.email === sub.customerEmail);
                        const internalSub = internalCustomer?.subscriptions?.[0];

                        // Padrão de badges: mesma altura, mesmo tamanho de fonte, mesmo estilo outline
                        const badgeBase = "text-[10px] h-5 px-2 font-medium border";
                        const styleGreen = "bg-green-500/10 text-green-600 border-green-500/20";
                        const styleYellow = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
                        const styleRed = "bg-red-500/10 text-red-600 border-red-500/20";
                        const styleOrange = "bg-orange-500/10 text-orange-600 border-orange-500/20";
                        const styleMuted = "bg-muted/40 text-muted-foreground border-border";

                        // Pagamento (adimplência)
                        const pay = sub.paymentStatus || 'adimplente';
                        const payCls = pay === 'adimplente' ? styleGreen : styleRed;
                        const payLabel = pay === 'adimplente' ? 'Adimplente' : 'Inadimplente';

                        // Status Asaas
                        const asaasCls = sub.status === 'ACTIVE' ? styleGreen
                          : sub.status === 'INACTIVE' ? styleYellow
                          : sub.status === 'EXPIRED' ? styleRed
                          : styleMuted;
                        const asaasLabel = sub.status === 'ACTIVE' ? 'Ativa'
                          : sub.status === 'INACTIVE' ? 'Inativa'
                          : sub.status === 'EXPIRED' ? 'Expirada'
                          : sub.status;

                        // Conta Bivvo
                        const st = sub.bivvoStatus || (sub.tenantBivvo ? 'Não possui Tenant' : 'Inserir ID');
                        const bivvoCls = st === 'active' ? styleGreen
                          : st === 'inactive' ? styleOrange
                          : st === 'Inserir ID' ? styleYellow
                          : styleRed;
                        const bivvoLabel = st === 'active' ? 'Ativa' : st === 'inactive' ? 'Inativa' : st;

                        return (
                          <TableRow key={sub.id} className="cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => {
                            setSelectedSub(sub);
                            setSubDetailsDialog(true);
                          }}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium text-sm">{sub.customerName || 'Desconhecido'}</span>
                                <span className="text-[10px] text-muted-foreground">{sub.customerEmail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-semibold">{sub.description || 'Assinatura'}</span>
                                <span className="text-sm font-bold text-accent">{formatCurrency(sub.value)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="w-[110px] text-center">
                              <Badge variant="outline" className={`${badgeBase} w-fit ${payCls}`}>{payLabel}</Badge>
                            </TableCell>
                            <TableCell className="w-[100px] text-center">
                              <Badge variant="outline" className={`${badgeBase} w-fit ${asaasCls}`}>{asaasLabel}</Badge>
                            </TableCell>
                            <TableCell className="w-[130px] text-center">
                              <Badge variant="outline" className={`${badgeBase} w-fit ${bivvoCls}`}>{bivvoLabel}</Badge>
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                

                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => {
                                  setSelectedSub(sub);
                                  setSubDetailsDialog(true);
                                }}>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {subscriptions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma assinatura encontrada</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  
                  {/* ... pagination (kept same) */}
                  {subsTotal > limit && (
                    <div className="flex items-center justify-between px-4 py-4 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        Mostrando {subsOffset + 1} a {Math.min(subsOffset + subscriptions.length, subsTotal)} de {subsTotal}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={subsOffset === 0} onClick={() => setSubsOffset(prev => Math.max(0, prev - limit))}>Anterior</Button>
                        <Button variant="outline" size="sm" disabled={subsOffset + limit >= subsTotal} onClick={() => setSubsOffset(prev => prev + limit)}>Próximo</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* SUBSCRIPTION DETAILS DIALOG */}
            <Dialog open={subDetailsDialog} onOpenChange={setSubDetailsDialog}>
              <DialogContent className="max-w-3xl w-[calc(100vw-1rem)] sm:w-full h-[92vh] max-h-[92vh] p-0 gap-0 overflow-hidden flex flex-col">
                <DialogHeader className="sr-only">
                  <DialogTitle>Detalhes da Assinatura</DialogTitle>
                  <DialogDescription>Informações detalhadas do cliente, setup Bivvo e cobranças.</DialogDescription>
                </DialogHeader>
                {selectedSub && (() => {
                  const overdueList = (selectedSubPayments || []).filter((p: any) => String(p.status).toUpperCase() === 'OVERDUE' && p.dueDate);
                  const oldestOverdue = overdueList.length
                    ? overdueList.map((p: any) => new Date(p.dueDate + 'T00:00:00')).sort((a: Date, b: Date) => a.getTime() - b.getTime())[0]
                    : null;
                  const overdueDays = oldestOverdue ? Math.max(0, Math.floor((Date.now() - oldestOverdue.getTime()) / (1000 * 60 * 60 * 24))) : 0;
                  const isAdimplente = overdueList.length === 0;
                  const bivvoStatusRaw = String(selectedSub?.bivvoStatus || '');
                  const bivvoStatusLc = bivvoStatusRaw.toLowerCase();
                  const hasBivvoTenant = !!tenantInfo?.bivvo_tenant_id;
                  return (
                <>
                  {/* HEADER STICKY */}
                  <div className="border-b bg-card px-5 pt-5 pb-4 space-y-3 shrink-0">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold truncate">{selectedSub.customerName}</h2>
                        <p className="text-xs text-muted-foreground truncate">{selectedSub.customerEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase text-muted-foreground tracking-wider">Recorrente</p>
                        <p className="text-lg font-bold text-accent leading-none">{formatCurrency(selectedSub.value)}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {isAdimplente ? (
                        <Badge variant="outline" className="text-[11px] h-6 px-2 bg-green-500/10 text-green-600 border-green-500/30 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Adimplente
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] h-6 px-2 bg-red-500/10 text-red-600 border-red-500/30 gap-1">
                          <Info className="h-3 w-3" /> Inadimplente · {overdueDays}d · {overdueList.length} fatura{overdueList.length > 1 ? 's' : ''}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-[11px] h-6 px-2 ${statusColor(selectedSub.status)}`}>
                        Asaas: {selectedSub.status}
                      </Badge>
                      {hasBivvoTenant ? (
                        <Badge variant="outline" className={`text-[11px] h-6 px-2 ${bivvoStatusLc === 'active' || bivvoStatusLc === 'ativo' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-muted text-muted-foreground'}`}>
                          Bivvo: {bivvoStatusRaw || 'não consultado'} · #{tenantInfo?.bivvo_tenant_id}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[11px] h-6 px-2 bg-amber-500/10 text-amber-700 border-amber-500/30">
                          Sem tenant Bivvo
                        </Badge>
                      )}
                      {tenantInfo?.person_type && (
                        <Badge variant="outline" className="text-[11px] h-6 px-2">
                          {tenantInfo.person_type === 'JURIDICA' ? 'PJ' : 'PF'}
                        </Badge>
                      )}
                    </div>

                    <details className="group">
                      <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground select-none inline-flex items-center gap-1">
                        <span className="group-open:hidden">▸</span><span className="hidden group-open:inline">▾</span>
                        Identificadores técnicos
                      </summary>
                      <div className="mt-2 space-y-1 pl-3 border-l-2 border-muted">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono">Cliente: {selectedSub.customer}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label="Copiar ID do cliente"
                            onClick={() => { navigator.clipboard.writeText(selectedSub.customer); toast({ title: "Copiado", description: "ID do cliente copiado!" }); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground font-mono">Assinatura: {selectedSub.id}</span>
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" aria-label="Copiar ID da assinatura"
                            onClick={() => { navigator.clipboard.writeText(selectedSub.id); toast({ title: "Copiado", description: "ID da assinatura copiado!" }); }}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </details>
                  </div>
                </>
                  );
                })()}
                {selectedSub && (
                  <>
                  <div className="space-y-5 py-4 px-5 overflow-y-auto flex-1 min-h-0">


                    {/* SETUP BIVVO (Configuração Contratada + Tenant Bivvo) */}
                    {tenantLoading && (
                      <div className="border rounded-lg p-4 bg-muted/20 flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Carregando Setup Bivvo…
                      </div>
                    )}
                    {!tenantLoading && !tenantInfo && (
                      <div className="border rounded-lg p-4 bg-amber-500/5 space-y-3">
                        <div>
                          <h3 className="text-sm font-bold flex items-center gap-2">
                            <Package className="h-3 w-3" /> Setup Bivvo
                          </h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Cliente sem registro local. Informe o Tenant Bivvo para criar o vínculo.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] uppercase text-muted-foreground">Tenant Bivvo</p>
                          <div className="flex gap-2">
                            <Input
                              value={tenantBivvo}
                              onChange={(e) => setTenantBivvo(e.target.value)}
                              placeholder="ID do tenant (ex: 1)"
                              className="h-8 text-sm flex-1"
                            />
                            <Button size="sm" onClick={() => setConfirmTenantOpen(true)} disabled={savingTenant || !tenantBivvo.trim()}>
                              {savingTenant ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              <span className="ml-2">Salvar Tenant</span>
                            </Button>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            Ao salvar, um registro local será criado e vinculado a este cliente Asaas.
                          </p>
                          <AlertDialog open={confirmTenantOpen} onOpenChange={setConfirmTenantOpen}>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Tenant Bivvo</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Vincular o Tenant ID <strong className="font-mono">{tenantBivvo.trim()}</strong> a este cliente Asaas?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={savingTenant}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSaveTenant(); }} disabled={savingTenant}>
                                  {savingTenant && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                  Confirmar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    )}
                    {tenantInfo && (
                      <div className="border rounded-lg p-4 bg-primary/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold flex items-center gap-2">
                              <Package className="h-3 w-3" /> Setup Bivvo
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Configuração contratada + vínculo com o tenant na Bivvo
                            </p>
                          </div>
                          {!isEditingConfig && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={beginEditConfig} disabled={!tenantInfo?.id}>
                                <Pencil className="h-3 w-3 mr-1" /> Editar
                              </Button>
                              {tenantInfo?.bivvo_config_previous && (
                                <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={handleRollbackConfig}>
                                  <RefreshCw className="h-3 w-3 mr-1" /> Restaurar anterior
                                </Button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* TENANT BIVVO - ID + STATUS */}
                        {(() => {
                          const savedTenantId = tenantInfo?.bivvo_tenant_id ? String(tenantInfo.bivvo_tenant_id) : '';
                          const hasSavedId = !!savedTenantId;
                          const inEditMode = !hasSavedId || isEditingTenant;
                          const trimmed = tenantBivvo.trim();
                          const canSave = trimmed.length > 0 && trimmed !== savedTenantId;
                          return (
                            <div className="space-y-2">
                              <p className="text-[10px] uppercase text-muted-foreground">Tenant Bivvo</p>
                              <div className="flex gap-2">
                                <Input
                                  value={tenantBivvo}
                                  onChange={(e) => setTenantBivvo(e.target.value)}
                                  placeholder="ID do tenant (ex: 1)"
                                  className="h-8 text-sm flex-1"
                                  readOnly={!inEditMode}
                                  disabled={!inEditMode}
                                />
                                {inEditMode ? (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => setConfirmTenantOpen(true)}
                                      disabled={savingTenant || !canSave}
                                    >
                                      {savingTenant ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      <span className="ml-2">Salvar Tenant</span>
                                    </Button>
                                    {hasSavedId && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { setTenantBivvo(savedTenantId); setIsEditingTenant(false); }}
                                        disabled={savingTenant}
                                        title="Cancelar edição"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsEditingTenant(true)}
                                    title="Editar Tenant ID"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                              {selectedSub?.bivvoStatus && (
                                <div className="text-[11px] rounded px-2 py-1.5 border bg-muted/40">
                                  Status atual: <strong>{selectedSub.bivvoStatus}</strong>
                                </div>
                              )}
                              <p className="text-[10px] text-muted-foreground">
                                {inEditMode
                                  ? (hasSavedId
                                      ? 'Alterando o Tenant ID: será pedida confirmação antes de salvar.'
                                      : 'Informe o ID do tenant Bivvo. Uma confirmação será exibida antes de salvar.')
                                  : 'ID do tenant salvo. Clique no ícone de caneta para editar.'}
                              </p>

                              <AlertDialog open={confirmTenantOpen} onOpenChange={setConfirmTenantOpen}>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar Tenant Bivvo</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      {hasSavedId
                                        ? <>Alterar o Tenant ID de <strong className="font-mono">{savedTenantId}</strong> para <strong className="font-mono">{trimmed}</strong>? Isso muda o vínculo deste cliente com o tenant na Bivvo.</>
                                        : <>Vincular o Tenant ID <strong className="font-mono">{trimmed}</strong> a este cliente? Depois de salvo, o ID só poderá ser alterado clicando no ícone de edição.</>}
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel disabled={savingTenant}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSaveTenant(); }} disabled={savingTenant}>
                                      {savingTenant && <Loader2 className="h-3 w-3 animate-spin mr-2" />}
                                      Confirmar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          );
                        })()}


                        <div className="border-t pt-3 space-y-3">
                          <p className="text-[10px] uppercase text-muted-foreground">Configuração Contratada</p>

                        {/* VISUALIZAÇÃO */}
                        {!isEditingConfig && (
                          contractedConfig ? (
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground">Plano:</span> <strong className="uppercase">{contractedConfig.plan}</strong></div>
                                <div><span className="text-muted-foreground">Usuários:</span> <strong>{contractedConfig.users}</strong></div>
                                <div><span className="text-muted-foreground">Tipo:</span> <strong>{tenantInfo?.person_type === 'JURIDICA' ? 'PJ' : tenantInfo?.person_type === 'FISICA' ? 'PF' : '—'}</strong></div>
                                {tenantInfo?.company_name && <div><span className="text-muted-foreground">Empresa:</span> <strong>{tenantInfo.company_name}</strong></div>}
                                {currentRecurring != null && (
                                  <div><span className="text-muted-foreground">Recorrente calculado:</span> <strong>{fmtBRL(currentRecurring)}</strong></div>
                                )}
                                {syncedAsaasValue != null && (
                                  <div><span className="text-muted-foreground">Valor Asaas atual:</span> <strong>{fmtBRL(syncedAsaasValue)}</strong></div>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {contractedConfig.telefonia && <Badge variant="outline" className="text-[9px]">📞 Telefonia</Badge>}
                                {contractedConfig.disparo && <Badge variant="outline" className="text-[9px]">🚀 Disparo em Massa</Badge>}
                                {contractedConfig.protagonista && <Badge variant="outline" className="text-[9px]">⭐ Protagonista</Badge>}
                              </div>
                              <div className="pt-2">
                                <p className="text-[10px] uppercase text-muted-foreground mb-1">Canais Contratados</p>
                                <div className="grid grid-cols-2 gap-1">
                                  {channels.map(c => {
                                    const qty = Number((contractedConfig.channels || {})[c.id] || 0);
                                    if (!qty) return null;
                                    return (
                                      <div key={c.id} className="flex justify-between px-2 py-1 rounded bg-background/60 border text-[11px]">
                                        <span>{c.icon_url ? <img src={c.icon_url} className="w-3 h-3 inline-block mr-1" /> : c.emoji} {c.label}</span>
                                        <strong>{qty}</strong>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[11px] text-muted-foreground">Nenhuma configuração salva. Clique em "Editar" para adicionar.</p>
                          )
                        )}

                        {/* EDIÇÃO */}
                        {isEditingConfig && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Plano</Label>
                                <select
                                  className="w-full h-8 text-xs rounded-md border bg-background px-2"
                                  value={configForm.plan}
                                  onChange={(e) => setConfigForm(f => ({ ...f, plan: e.target.value }))}
                                >
                                  {(plans.length > 0 ? plans.map(p => p.slug) : ['standard','silver','pro']).map(slug => (
                                    <option key={slug} value={slug}>{slug.toUpperCase()}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase text-muted-foreground">Usuários</Label>
                                <Input type="number" min={1} className="h-8 text-xs"
                                  value={configForm.users}
                                  onChange={(e) => setConfigForm(f => ({ ...f, users: Number(e.target.value) || 0 }))}
                                />
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-3 pt-1">
                              <label className="flex items-center gap-1.5 text-[11px]">
                                <Switch checked={configForm.telefonia} onCheckedChange={(v) => setConfigForm(f => ({ ...f, telefonia: v }))} />
                                📞 Telefonia
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px]">
                                <Switch checked={configForm.disparo} onCheckedChange={(v) => setConfigForm(f => ({ ...f, disparo: v }))} />
                                🚀 Disparo em Massa
                              </label>
                              <label className="flex items-center gap-1.5 text-[11px]">
                                <Switch checked={configForm.protagonista} onCheckedChange={(v) => setConfigForm(f => ({ ...f, protagonista: v }))} />
                                ⭐ Protagonista
                              </label>
                            </div>
                            <div className="pt-1">
                              <p className="text-[10px] uppercase text-muted-foreground mb-1">Canais Contratados</p>
                              <div className="grid grid-cols-2 gap-1.5">
                                {channels.map(c => (
                                  <div key={c.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-background/60 border text-[11px]">
                                    <span className="truncate">{c.icon_url ? <img src={c.icon_url} className="w-3 h-3 inline-block mr-1" /> : c.emoji} {c.label}</span>
                                    <Input type="number" min={0} className="h-6 w-14 text-xs"
                                      value={configForm.channels[c.id] || 0}
                                      onChange={(e) => setConfigForm(f => ({ ...f, channels: { ...f.channels, [c.id]: Number(e.target.value) || 0 } }))}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            {(() => {
                              const preview = safeRecurring(configForm);
                              const synced = tenantInfo?.bivvo_config_synced_bivvo as any;
                              const downgradeUsers = synced && Number(configForm.users) < Number(synced.users || 0);
                              return (
                                <div className="rounded border bg-background/50 px-2 py-1.5 text-[11px] space-y-1">
                                  {preview != null && <div>Novo valor recorrente: <strong>{fmtBRL(preview)}</strong></div>}
                                  {downgradeUsers && <div className="text-amber-600">⚠ Downgrade de usuários detectado ({synced.users} → {configForm.users}).</div>}
                                </div>
                              );
                            })()}
                            <div className="flex gap-2">
                              <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleSaveConfig} disabled={savingConfig || !tenantInfo?.id}>
                                {savingConfig ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Check className="h-3 w-3 mr-2" />}
                                Salvar Configuração
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditingConfig(false)} disabled={savingConfig}>
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* AÇÕES DE SINCRONIZAÇÃO CONDICIONAIS */}
                        {!isEditingConfig && contractedConfig && (needsBivvoSync || needsAsaasSync) && (
                          <div className="pt-2 border-t space-y-2">
                            <p className="text-[10px] uppercase text-muted-foreground">Pendências de Sincronização</p>
                            {needsBivvoSync && (
                              <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={handleProvisionTenant} disabled={provisioningTenant || !tenantInfo?.id}>
                                {provisioningTenant ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                Sincronizar configuração no tenant
                              </Button>
                            )}
                            {needsAsaasSync && (
                              <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={handleSyncAsaas} disabled={syncingAsaas || !selectedSub?.id}>
                                {syncingAsaas ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <RefreshCw className="h-3 w-3 mr-2" />}
                                Atualizar Valor no Asaas ({syncedAsaasValue != null ? fmtBRL(syncedAsaasValue) : '—'} → {currentRecurring != null ? fmtBRL(currentRecurring) : '—'})
                              </Button>
                            )}
                          </div>
                        )}
                        </div>

                        {/* AÇÕES DO TENANT */}
                        <div className="border-t pt-3 space-y-2">
                          <p className="text-[10px] uppercase text-muted-foreground">Ações do Tenant</p>
                          {(() => {
                            const isProvisioned = !!tenantInfo?.bivvo_tenant_id && !!tenantInfo?.tenant_provisioned_at;
                            const bivvoStatusRaw = String(selectedSub?.bivvoStatus || '');
                            const bivvoStatusLc = bivvoStatusRaw.toLowerCase();
                            const isBivvoActive = bivvoStatusLc === 'active' || bivvoStatusLc === 'ativo';
                            const hasTenantId = !!tenantInfo?.bivvo_tenant_id;
                            const tenantExistsOnBivvo = isProvisioned && bivvoStatusRaw !== '' && bivvoStatusRaw !== 'Não possui Tenant';
                            const canProvisionOrUpdate = !tenantExistsOnBivvo || needsBivvoSync;
                            const canInactivate = isBivvoActive && hasTenantId;
                            const showProvisionButton = !hasTenantId;
                            const showUpdateButton = hasTenantId && canProvisionOrUpdate;
                            const provisionLabel = showProvisionButton ? 'Provisionar tenant via API Bivvo' : 'Atualizar tenant no Bivvo';
                            const provisionTitle = showProvisionButton
                              ? 'Cria o tenant na API Bivvo com base na configuração contratada.'
                              : 'Envia a configuração atual para o tenant existente no Bivvo.';
                            return (
                              <>
                                <div className="flex gap-2">
                                  {(showProvisionButton || showUpdateButton) && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 h-8 text-xs"
                                      onClick={handleProvisionTenant}
                                      disabled={provisioningTenant || !tenantInfo?.id}
                                      title={provisionTitle}
                                    >
                                      {provisioningTenant ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3 mr-2" />
                                      )}
                                      {provisionLabel}
                                    </Button>
                                  )}
                                  {canInactivate && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="flex-1 h-8 text-xs"
                                      onClick={handleInactivateTenant}
                                      disabled={provisioningTenant || !tenantInfo?.id}
                                      title={`Inativa o tenant ${tenantInfo.bivvo_tenant_id} na API Bivvo`}
                                    >
                                      {provisioningTenant ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                      ) : (
                                        <Ban className="h-3 w-3 mr-2" />
                                      )}
                                      Inativar (ID {tenantInfo.bivvo_tenant_id})
                                    </Button>
                                  )}
                                </div>
                                {!showProvisionButton && !showUpdateButton && !canInactivate ? (
                                  <p className="text-[10px] text-muted-foreground">Nenhuma ação pendente — tenant sincronizado.</p>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground">{provisionTitle}</p>
                                )}
                              </>
                            );
                          })()}
                        </div>


                        <div className="pt-2 border-t space-y-1 text-[11px]">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tenant provisionado:</span>
                            <span>{tenantInfo?.tenant_provisioned_at ? new Date(tenantInfo.tenant_provisioned_at).toLocaleString('pt-BR') : '—'}</span>
                          </div>
                          {tenantInfo?.bivvo_tenant_id && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Tenant ID (API):</span>
                              <strong className="font-mono">{tenantInfo.bivvo_tenant_id}</strong>
                            </div>
                          )}
                          {tenantInfo?.tenant_provision_error && (
                            <div className="rounded px-2 py-1 bg-destructive/10 text-destructive border border-destructive/20">
                              Erro no provisionamento: {tenantInfo.tenant_provision_error}
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                    {/* CONTACT EDIT (Asaas customer update) */}
                    <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <UserCheck className="h-3 w-3" /> Atualizar Contato do Cliente (Asaas)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Nome</Label>
                          <Input className="h-8 text-sm" value={contactForm.name}
                            onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">E-mail</Label>
                          <Input className="h-8 text-sm" value={contactForm.email}
                            onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Celular</Label>
                          <Input className="h-8 text-sm" value={contactForm.mobilePhone}
                            onChange={e => setContactForm(p => ({ ...p, mobilePhone: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">CPF/CNPJ</Label>
                          <Input className="h-8 text-sm" value={contactForm.cpfCnpj}
                            onChange={e => setContactForm(p => ({ ...p, cpfCnpj: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">CEP</Label>
                          <Input className="h-8 text-sm" value={contactForm.postalCode}
                            onChange={e => setContactForm(p => ({ ...p, postalCode: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Endereço</Label>
                          <Input className="h-8 text-sm" value={contactForm.address}
                            onChange={e => setContactForm(p => ({ ...p, address: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Número</Label>
                          <Input className="h-8 text-sm" value={contactForm.addressNumber}
                            onChange={e => setContactForm(p => ({ ...p, addressNumber: e.target.value }))} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase">Complemento</Label>
                          <Input className="h-8 text-sm" value={contactForm.complement}
                            onChange={e => setContactForm(p => ({ ...p, complement: e.target.value }))} />
                        </div>
                        <div className="space-y-1 col-span-2">
                          <Label className="text-[10px] uppercase">Bairro</Label>
                          <Input className="h-8 text-sm" value={contactForm.province}
                            onChange={e => setContactForm(p => ({ ...p, province: e.target.value }))} />
                        </div>
                      </div>
                      <Button size="sm" className="w-full" onClick={handleSaveContact} disabled={savingContact}>
                        {savingContact ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Salvar contato no Asaas
                      </Button>
                      <p className="text-[9px] text-muted-foreground text-center">
                        * Apenas campos preenchidos serão enviados. Dados são sincronizados no banco automaticamente.
                      </p>
                    </div>

                    {/* EDIT SECTION */}

                    <div className="border rounded-lg p-4 bg-muted/20 space-y-4">
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Pencil className="h-3 w-3" /> Editar Assinatura no Asaas
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase">Novo Valor da Mensalidade (R$)</Label>
                          <Input 
                            type="number" 
                            step="0.01" 
                            value={editFormData.value} 
                            onChange={e => setEditFormData(prev => ({ ...prev, value: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase">Novo Status</Label>
                          <select 
                            className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={editFormData.status}
                            onChange={e => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
                          >
                            <option value="ACTIVE">Ativa</option>
                            <option value="INACTIVE">Inativa (Suspensa)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase">Forma de Pagamento</Label>
                          <select 
                            className="w-full h-8 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                            value={editFormData.billingType}
                            onChange={e => setEditFormData(prev => ({ ...prev, billingType: e.target.value }))}
                          >
                            <option value="BOLETO">Boleto</option>
                            <option value="CREDIT_CARD">Cartão de Crédito</option>
                            <option value="PIX">PIX</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase">Próximo Vencimento</Label>
                          <Input 
                            type="date" 
                            value={editFormData.nextDueDate} 
                            onChange={e => setEditFormData(prev => ({ ...prev, nextDueDate: e.target.value }))}
                            className="h-8 text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase">Descrição</Label>
                        <Input 
                          value={editFormData.description} 
                          onChange={e => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2" 
                        onClick={handleUpdateSubscription}
                        disabled={isUpdatingSub}
                      >
                        {isUpdatingSub ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                        Salvar Alterações no Asaas
                      </Button>
                      <p className="text-[9px] text-muted-foreground text-center">
                        * Ao atualizar o valor ou pagamento, as cobranças pendentes também serão atualizadas.
                      </p>
                    </div>

                    {/* Internal Config Data (if available) */}
                    {(() => {
                      const internalCustomer = customerData.find(c => c.email === selectedSub.customerEmail);
                      const internalSub = internalCustomer?.subscriptions?.[0];
                      if (!internalSub) return null;

                      return (
                        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ecossistema Bivvo contratado</h3>
                            <Badge variant="outline" className={`text-[10px] ${internalSub.account_created ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>
                              {internalSub.account_created ? "Conta Ativa" : "Aguardando Ativação"}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase">Plano</p>
                              <p className="text-sm font-bold capitalize">{internalSub.plan_slug}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase">Usuários</p>
                              <p className="text-sm font-bold">{internalSub.users_count}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] text-muted-foreground uppercase">Protagonista</p>
                              <p className="text-sm font-bold">{internalSub.is_protagonista ? 'Sim' : 'Não'}</p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-[10px] text-muted-foreground uppercase">Canais Contratados</p>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(internalSub.channels_config || {}).map(([key, val]: [string, any]) => {
                                const channel = channels.find(c => c.slug === key);
                                if (!val || val === 0) return null;
                                return (
                                  <Badge key={key} variant="secondary" className="text-[10px] py-0.5 px-2 flex items-center gap-1">
                                    {channel?.icon_url ? (
                                      <img src={channel.icon_url} alt={channel.label} className="w-3 h-3 object-contain" />
                                    ) : (
                                      <span>{channel?.emoji || '•'}</span>
                                    )}
                                    {channel?.label || key}: {val}
                                  </Badge>
                                );
                              })}
                              {internalSub.has_telefonia && (
                                <Badge variant="secondary" className="text-[10px] py-0.5 px-2 flex items-center gap-1">
                                  <Smartphone className="h-3 w-3 text-accent" />
                                  Telefonia: Sim
                                </Badge>
                              )}
                            </div>
                          </div>

                          {!internalSub.account_created && (
                            <div className="pt-2">
                              <Button 
                                className="w-full bg-accent" 
                                onClick={() => handleCreateAccount(internalCustomer)}
                                disabled={creatingAccount === internalCustomer.id}
                              >
                                {creatingAccount === internalCustomer.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
                                Ativar Conta (Enviar Webhook)
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* SUBSCRIPTION PAYMENT HISTORY */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold border-b pb-1 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Histórico de Cobranças da Assinatura
                      </h3>
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead className="text-[10px] h-8">Vencimento</TableHead>
                              <TableHead className="text-[10px] h-8">Valor</TableHead>
                              <TableHead className="text-[10px] h-8">Status</TableHead>
                              <TableHead className="text-[10px] h-8">Link</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loadingSubPayments ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-accent" />
                                </TableCell>
                              </TableRow>
                            ) : selectedSubPayments.length > 0 ? (
                              selectedSubPayments.map((p: any) => (
                                <TableRow key={p.id}>
                                  <TableCell className="text-[10px]">
                                    <div className="flex items-center gap-1 group">
                                      <span>{new Date(p.dueDate + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                                      <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                                        onClick={() => {
                                          navigator.clipboard.writeText(p.id);
                                          toast({ title: "Copiado", description: "ID da cobrança copiado!" });
                                        }}
                                        title={`Copiar ID: ${p.id}`}
                                      >
                                        <Copy className="h-2 w-2" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-[10px] font-bold">
                                    {formatCurrency(p.value)}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    {getStatusBadge(p.status)}
                                  </TableCell>
                                  <TableCell className="py-1">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => window.open(p.invoiceUrl, '_blank')}>
                                      <ExternalLink className="h-3 w-3" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center py-4 text-[10px] text-muted-foreground">
                                  Nenhuma cobrança encontrada.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER STICKY */}
                  <div className="border-t bg-card px-5 py-3 flex justify-between items-center gap-2 flex-wrap shrink-0">
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={handleDeleteCustomer} disabled={customerActionLoading}>
                        <Trash2 className="h-3 w-3 mr-2" /> Excluir
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleRestoreCustomer} disabled={customerActionLoading}>
                        <CheckCircle2 className="h-3 w-3 mr-2" /> Restaurar
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => window.open(`https://app.asaas.com/subscription/show/${selectedSub.id}`, '_blank')}>
                        <ExternalLink className="h-3 w-3 mr-2" /> Ver no Asaas
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setSubDetailsDialog(false)}>Fechar</Button>
                    </div>
                  </div>

                  </>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>


          <TabsContent value="affiliates">
            <AdminAffiliates />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
