import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Loader2, Copy, DollarSign, Upload, Eye, Link } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/validators';
import { supabase } from '@/integrations/supabase/client';

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
  stats?: {
    totalSold: number;
    salesCount: number;
    commGenerated: number;
    commPaid: number;
    commPending: number;
  };
}

export default function AdminAffiliates() {
  const { adminFetch, adminPost } = useAdmin();
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
    const url = `${window.location.origin}/?aff=${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: 'Link copiado', description: url });
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
                <TableHead>Vendas</TableHead><TableHead>Total</TableHead><TableHead>Comissão gerada</TableHead>
                <TableHead>Pendente</TableHead><TableHead>Pago</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {affiliates.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium"><div>{a.name}</div><div className="text-xs text-muted-foreground">{a.email}</div></TableCell>
                  <TableCell><button className="font-mono text-xs hover:text-accent flex items-center gap-1" onClick={() => copyLink(a.slug)}>{a.slug}<Copy className="h-3 w-3" /></button></TableCell>
                  <TableCell>{a.commission_percent}%{a.commission_recurring && <Badge variant="outline" className="ml-1 text-xs">recorrente</Badge>}</TableCell>
                  <TableCell>{a.stats?.salesCount ?? 0}</TableCell>
                  <TableCell>{formatCurrency(a.stats?.totalSold ?? 0)}</TableCell>
                  <TableCell>{formatCurrency(a.stats?.commGenerated ?? 0)}</TableCell>
                  <TableCell className="text-amber-600">{formatCurrency(a.stats?.commPending ?? 0)}</TableCell>
                  <TableCell className="text-green-600">{formatCurrency(a.stats?.commPaid ?? 0)}</TableCell>
                  <TableCell><Switch checked={a.status === 'active'} onCheckedChange={() => toggleStatus(a)} /></TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => openEdit(a)}>Editar</Button></TableCell>
                </TableRow>
              ))}
              {affiliates.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Nenhum afiliado</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="sales">
        <div className="card-glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Plano</TableHead><TableHead>1º mês</TableHead><TableHead>Recorrente</TableHead><TableHead>%</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {sales.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{new Date(s.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{s.affiliates?.name}</TableCell>
                  <TableCell>{s.plan_label}</TableCell>
                  <TableCell>{formatCurrency(Number(s.amount_first))}</TableCell>
                  <TableCell>{formatCurrency(Number(s.amount_recurring))}</TableCell>
                  <TableCell>{s.commission_percent}%</TableCell>
                  <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                </TableRow>
              ))}
              {sales.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sem vendas</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="commissions">
        <div className="card-glass rounded-xl overflow-hidden">
          <Table>
            <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Afiliado</TableHead><TableHead>Tipo</TableHead><TableHead>Venda</TableHead><TableHead>%</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
            <TableBody>
              {commissions.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.created_at).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>{c.affiliates?.name}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.kind}</Badge></TableCell>
                  <TableCell>{formatCurrency(Number(c.sale_amount))}</TableCell>
                  <TableCell>{c.commission_percent}%</TableCell>
                  <TableCell className="font-medium">{formatCurrency(Number(c.commission_amount))}</TableCell>
                  <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {c.status !== 'paid' && c.status !== 'cancelled' && (
                      <Button size="sm" variant="ghost" onClick={() => markPaid(c.id)}><DollarSign className="h-3 w-3 mr-1" />Pagar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {commissions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Sem comissões</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </TabsContent>
    </Tabs>
  );
}
