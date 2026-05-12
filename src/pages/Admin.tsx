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
import { Loader2, Plus, LogOut, Package, Ticket, Users, Pencil, Trash2, Handshake, LayoutDashboard, UserCheck, ExternalLink, Info } from 'lucide-react';

import AdminAffiliates from '@/components/admin/AdminAffiliates';
import { AdminFinanceDashboard } from '@/components/admin/AdminFinanceDashboard';
import bivvoLogo from '@/assets/bivvo-logo.png';
import { formatCurrency } from '@/lib/validators';

interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
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
  externalReference?: string;
}

const Admin = () => {
  const { isAdmin, loading: authLoading, adminFetch, adminPost } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsTotal, setSubsTotal] = useState(0);
  const [loadingData, setLoadingData] = useState(false);

  // Plan form
  const [planDialog, setPlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState({
    slug: '', name: '', price: '', description: '', popular: false, gradient: 'from-blue-500 to-cyan-500', icon: 'Zap', sort_order: '0',
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
  const [isUpdatingSub, setIsUpdatingSub] = useState(false);
  const [editFormData, setEditFormData] = useState({
    value: '',
    status: '',
    billingType: '',
    nextDueDate: '',
    description: ''
  });



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
      loadSubscriptions();
      loadCustomers();
    }
  }, [isAdmin]);

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
      setEditFormData({
        value: String(selectedSub.value),
        status: selectedSub.status,
        billingType: selectedSub.billingType,
        nextDueDate: selectedSub.nextDueDate || '',
        description: selectedSub.description || ''
      });
    }
  }, [selectedSub]);

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
      slug: '', name: '', price: '', description: '', popular: false,
      gradient: 'from-blue-500 to-cyan-500', icon: 'Zap', sort_order: '0',
      features: [{ text: '', included: true }],
    });
    setPlanDialog(true);
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
          </TabsList>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard">
            <AdminFinanceDashboard adminFetch={adminFetch} />
          </TabsContent>

          {/* PLANS TAB */}
          <TabsContent value="plans">
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
                        <Label>Preço (R$)</Label>
                        <Input type="number" step="0.01" value={planForm.price} onChange={e => setPlanForm(p => ({ ...p, price: e.target.value }))} />
                      </div>
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
            </div>

            <div className="card-glass rounded-xl overflow-hidden">
              {loadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Plano / Valor</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Status Asaas</TableHead>
                        <TableHead>Conta Bivvo</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map(sub => {
                        // Find matching internal customer/subscription for account creation state
                        const internalCustomer = customerData.find(c => c.email === sub.customerEmail);
                        const internalSub = internalCustomer?.subscriptions?.[0];

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
                            <TableCell>
                              <div className="flex flex-col">
                                <Badge variant="outline" className="text-[10px] w-fit">{sub.billingType}</Badge>
                                <span className="text-[10px] text-muted-foreground mt-1">{sub.cycle}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] h-5 ${statusColor(sub.status)}`}>{sub.status}</Badge>
                            </TableCell>
                            <TableCell>
                              {internalSub?.account_created ? (
                                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Ativa</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-[10px]">Pendente</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-2">
                                {!internalSub?.account_created && internalCustomer && (
                                  <Button 
                                    size="sm" 
                                    className="h-8 bg-accent hover:bg-accent/90 text-[10px] px-2"
                                    onClick={() => handleCreateAccount(internalCustomer)}
                                    disabled={creatingAccount === internalCustomer.id}
                                  >
                                    {creatingAccount === internalCustomer.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ativar Conta'}
                                  </Button>
                                )}
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Detalhes da Assinatura</DialogTitle>
                  <DialogDescription>Informações detalhadas do cliente e configuração contratada.</DialogDescription>
                </DialogHeader>
                {selectedSub && (
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold border-b pb-1">Dados do Cliente</h3>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{selectedSub.customerName}</p>
                          <p className="text-xs text-muted-foreground">{selectedSub.customerEmail}</p>
                          <p className="text-xs text-muted-foreground font-mono">ID Asaas: {selectedSub.customer}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h3 className="text-sm font-semibold border-b pb-1">Financeiro</h3>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Valor:</span>
                            <span className="font-bold text-accent">{formatCurrency(selectedSub.value)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Método:</span>
                            <span>{selectedSub.billingType}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Vencimento:</span>
                            <span>{selectedSub.nextDueDate ? new Date(selectedSub.nextDueDate + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</span>
                          </div>
                          <div className="flex justify-between text-xs pt-1">
                            <span className="text-muted-foreground">Status:</span>
                            <Badge variant="outline" className={`text-[9px] h-4 ${statusColor(selectedSub.status)}`}>{selectedSub.status}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Internal Config Data (if available) */}
                    {(() => {
                      const internalCustomer = customerData.find(c => c.email === selectedSub.customerEmail);
                      const internalSub = internalCustomer?.subscriptions?.[0];
                      if (!internalSub) return null;

                      return (
                        <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Configuração do Ecossistema</h3>
                            <Badge variant={internalSub.account_created ? "outline" : "secondary"} className={`text-[10px] ${internalSub.account_created ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"}`}>
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
                              {Object.entries(internalSub.channels_config || {}).map(([key, val]: [string, any]) => (
                                <Badge key={key} variant="secondary" className="text-[10px] py-0 px-2">
                                  {key}: {val}
                                </Badge>
                              ))}
                              {internalSub.has_telefonia && <Badge variant="secondary" className="text-[10px] py-0 px-2">Telefonia: Sim</Badge>}
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
                                Efetuar Ativação de Conta (Webhook)
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => setSubDetailsDialog(false)}>Fechar</Button>
                      <Button size="sm" variant="secondary" onClick={() => window.open(`https://app.asaas.com/subscription/show/${selectedSub.id}`, '_blank')}>
                        <ExternalLink className="h-3 w-3 mr-2" /> Ver no Asaas
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>


          <TabsContent value="affiliates">
            <AdminAffiliates />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
