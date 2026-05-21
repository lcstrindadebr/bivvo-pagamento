import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Copy, DollarSign, Upload, Eye, Link, Trash2 } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/validators';
import { supabase } from '@/integrations/supabase/client';
import { useAppUrl } from '@/hooks/useSiteSettings';

interface Affiliate {
  id: string;
  name: string;
  email: string;
  whatsapp: string | null;
  document: string | null;
  status: string;
  commission_percent: number;
  commission_recurring: boolean;
  slug: string;
  created_at: string;
  pix_key: string | null;
  pix_key_type: string | null;
  stats?: {
    totalSold: number;
    salesCount: number;
    commGenerated: number;
    commPaid: number;
    commPending: number;
    activeSubscriptions: number;
  };
}

export default function AdminAffiliates() {
  const { adminFetch, adminPost } = useAdmin();
  const baseUrl = useAppUrl();
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Affiliate | null>(null);
  const [form, setForm] = useState({
    name: '', email: '', password: '', whatsapp: '', document: '',
    commission_percent: '20', commission_recurring: true, slug: '',
  });
  const [payingComm, setPayingComm] = useState<any | null>(null);
  const [payoutProofFile, setPayoutProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, s, c] = await Promise.all([
        adminFetch('list-affiliates'),
        adminFetch('list-affiliate-sales'),
        adminFetch('list-affiliate-commissions'),
      ]);
      setAffiliates(a.data || []);
      setSales(s.data || []);
      setCommissions(c.data || []);
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', whatsapp: '', document: '', commission_percent: '20', commission_recurring: true, slug: '' });
    setDialog(true);
  };

  const openEdit = (a: Affiliate) => {
    setEditing(a);
    setForm({
      name: a.name, email: a.email, password: '', whatsapp: a.whatsapp || '',
      document: a.document || '', commission_percent: String(a.commission_percent),
      commission_recurring: a.commission_recurring, slug: a.slug,
    });
    setDialog(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await adminPost('update-affiliate', {
          id: editing.id,
          name: form.name, whatsapp: form.whatsapp, document: form.document,
          commission_percent: Number(form.commission_percent),
          commission_recurring: form.commission_recurring,
          slug: form.slug,
        });
      } else {
        if (!form.password || form.password.length < 6) throw new Error('Senha mínima de 6 caracteres');
        await adminPost('create-affiliate', {
          name: form.name, email: form.email, password: form.password,
          whatsapp: form.whatsapp, document: form.document,
          commission_percent: Number(form.commission_percent),
          commission_recurring: form.commission_recurring,
          slug: form.slug || undefined,
        });
      }
      toast({ title: 'Sucesso', description: 'Afiliado salvo' });
      setDialog(false);
      load();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
    }
  };

  const toggleStatus = async (a: Affiliate) => {
    await adminPost('update-affiliate', { id: a.id, status: a.status === 'active' ? 'inactive' : 'active' });
    load();
  };

  const handleMarkPaid = async () => {
    if (!payingComm) return;
    setIsUploadingProof(true);
    try {
      let proofUrl = null;
      if (payoutProofFile) {
        const fileExt = payoutProofFile.name.split('.').pop();
        const fileName = `${payingComm.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('payout-proofs')
          .upload(fileName, payoutProofFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('payout-proofs')
          .getPublicUrl(fileName);
        
        proofUrl = publicUrl;
      }

      await adminPost('mark-commission-paid', { 
        id: payingComm.id,
        payment_proof_url: proofUrl
      });

      toast({ title: 'Pagamento registrado com sucesso' });
      setPayingComm(null);
      setPayoutProofFile(null);
      load();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao registrar pagamento', variant: 'destructive' });
    } finally {
      setIsUploadingProof(false);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${baseUrl}/?aff=${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado', description: url });
  };

  const handleDeleteAffiliate = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este afiliado? Todas as suas vendas e comissões serão removidas.')) return;
    try {
      await adminPost('delete-affiliate', { id });
      toast({ title: 'Sucesso', description: 'Afiliado excluído' });
      load();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleDeleteSale = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda? As comissões vinculadas também serão removidas.')) return;
    try {
      await adminPost('delete-affiliate-sale', { id });
      toast({ title: 'Sucesso', description: 'Venda excluída' });
      load();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao excluir', variant: 'destructive' });
    }
  };

  const handleDeleteCommission = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta comissão?')) return;
    try {
      await adminPost('delete-affiliate-commission', { id });
      toast({ title: 'Sucesso', description: 'Comissão excluída' });
      load();
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro ao excluir', variant: 'destructive' });
    }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <Tabs defaultValue="list">
      <TabsList className="mb-4">
        <TabsTrigger value="list">Afiliados</TabsTrigger>
        <TabsTrigger value="sales">Vendas</TabsTrigger>
        <TabsTrigger value="commissions">Comissões</TabsTrigger>
      </TabsList>

      <TabsContent value="list">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Afiliados</h2>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Novo Afiliado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing ? 'Editar' : 'Novo'} Afiliado</DialogTitle></DialogHeader>
              <div className="space-y-3 pt-2">
                <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div><Label>Email</Label><Input type="email" disabled={!!editing} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
                {!editing && <div><Label>Senha inicial</Label><Input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></div>}
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} /></div>
                  <div><Label>Documento (CPF/CNPJ)</Label><Input value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Comissão (%)</Label><Input type="number" min="0" max="100" value={form.commission_percent} onChange={e => setForm(f => ({ ...f, commission_percent: e.target.value }))} /></div>
                  <div><Label>Slug do link</Label><Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto" /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={form.commission_recurring} onCheckedChange={v => setForm(f => ({ ...f, commission_recurring: v }))} /><Label>Comissão recorrente (em todas as cobranças)</Label></div>
                <Button onClick={handleSave} className="w-full">Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="card-glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Comissão</TableHead>
                <TableHead>Assinaturas</TableHead><TableHead>Vendas</TableHead><TableHead>Total</TableHead><TableHead>Comissão gerada</TableHead>
                <TableHead>Pendente</TableHead><TableHead>Pago</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliates.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium"><div>{a.name}</div><div className="text-xs text-muted-foreground">{a.email}</div></TableCell>
                  <TableCell><button className="font-mono text-xs hover:text-accent flex items-center gap-1" onClick={() => copyLink(a.slug)}>{a.slug}<Copy className="h-3 w-3" /></button></TableCell>
                  <TableCell>{a.commission_percent}%{a.commission_recurring && <Badge variant="outline" className="ml-1 text-xs">recorrente</Badge>}</TableCell>
                  <TableCell>{a.stats?.activeSubscriptions ?? 0}</TableCell>
                  <TableCell>{a.stats?.salesCount ?? 0}</TableCell>
                  <TableCell>{formatCurrency(a.stats?.totalSold ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(a.stats?.commGenerated ?? 0)}</TableCell>
                  <TableCell className="text-amber-600">{formatCurrency(a.stats?.commPending ?? 0)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(a.stats?.commPaid ?? 0)}</TableCell>
                  <TableCell><Switch checked={a.status === 'active'} onCheckedChange={() => toggleStatus(a)} /></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Editar</Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteAffiliate(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {affiliates.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum afiliado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="sales">
        <div className="card-glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Plano</TableHead><TableHead>1º mês</TableHead><TableHead>Recorrente</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{s.affiliates?.name}</TableCell>
                  <TableCell>{s.plan_label}</TableCell>
                  <TableCell>{formatCurrency(Number(s.amount_first))}</TableCell>
                  <TableCell>{formatCurrency(Number(s.amount_recurring))}</TableCell>
                  <TableCell>{s.commission_percent}%</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <Badge variant="outline" className={s.status === 'cancelled' ? 'text-destructive border-destructive' : ''}>
                        {s.status}
                      </Badge>
                      {s.status === 'cancelled' && s.cancellation_reason && (
                        <span className="text-[10px] text-destructive mt-1 max-w-[150px] truncate" title={s.cancellation_reason}>
                          Motivo: {s.cancellation_reason}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteSale(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem vendas</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="commissions">
        <div className="card-glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Tipo</TableHead><TableHead>Chave PIX</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
            <TableBody>
              {commissions.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{c.affiliates?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.kind}</Badge></TableCell>
                  <TableCell>
                    {c.affiliates?.pix_key ? (
                      <div className="text-xs">
                        <Badge variant="outline" className="mr-1">{c.affiliates.pix_key_type}</Badge>
                        <span className="font-mono">{c.affiliates.pix_key}</span>
                      </div>
                    ) : <span className="text-muted-foreground text-xs">Não cadastrada</span>}
                  </TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(c.commission_amount))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={c.status === 'paid' ? 'text-green-600 border-green-600' : c.status === 'cancelled' ? 'text-destructive border-destructive' : ''}>
                      {c.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {c.status !== 'paid' && c.status !== 'cancelled' ? (
                        (() => {
                          const createdAt = new Date(c.created_at);
                          const now = new Date();
                          const diffDays = Math.ceil((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
                          const isLocked = diffDays <= 7;
                          
                          return (
                            <div className="flex flex-col items-end gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setPayingComm(c)}
                                disabled={isLocked}
                                title={isLocked ? `Disponível em ${7 - diffDays + 1} dias` : ""}
                              >
                                <DollarSign className="h-3 w-3 mr-1" />Pagar
                              </Button>
                              {isLocked && (
                                <span className="text-[9px] text-amber-600 font-medium">
                                  Retido ({diffDays}/7d)
                                </span>
                              )}
                            </div>
                          );
                        })()
                      ) : c.payment_proof_url ? (
                        <Button size="sm" variant="ghost" asChild>
                          <a href={c.payment_proof_url} target="_blank" rel="noopener noreferrer">
                            <Eye className="h-3 w-3 mr-1" /> Comprovante
                          </a>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCommission(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {commissions.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem comissões</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <Dialog open={!!payingComm} onOpenChange={v => !v && setPayingComm(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-semibold">Dados para Pagamento:</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Afiliado:</span>
                <span className="font-medium">{payingComm?.affiliates?.name}</span>
                <span className="text-muted-foreground">Tipo PIX:</span>
                <span className="font-medium">{payingComm?.affiliates?.pix_key_type}</span>
                <span className="text-muted-foreground">Chave PIX:</span>
                <span className="font-medium font-mono">{payingComm?.affiliates?.pix_key}</span>
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-accent">{formatCurrency(payingComm?.commission_amount || 0)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Anexar Comprovante (opcional)</Label>
              <div className="flex items-center gap-2">
                <Input 
                  type="file" 
                  accept="image/*,application/pdf"
                  onChange={e => setPayoutProofFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayingComm(null)}>Cancelar</Button>
            <Button onClick={handleMarkPaid} disabled={isUploadingProof}>
              {isUploadingProof ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
              Confirmar Pagamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
