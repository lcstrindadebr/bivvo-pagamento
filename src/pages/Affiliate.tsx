import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LogOut, Loader2, Calculator, ListChecks, DollarSign, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import BivvoCalculator from '@/components/affiliate/BivvoCalculator';
import { formatCurrency } from '@/lib/validators';

interface Affiliate {
  id: string; name: string; email: string; whatsapp: string | null; document: string | null;
  status: string; commission_percent: number; slug: string; commission_recurring: boolean;
  pix_key: string | null; pix_key_type: string | null;
}

export default function Affiliate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState<Affiliate | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ name: '', whatsapp: '', document: '', pix_key: '', pix_key_type: 'CPF' });

  const call = useCallback(async (action: string, opts: { method?: 'GET'|'POST'; body?: unknown } = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('sem sessão');
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/affiliate-api?action=${action}`;
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: { 'Authorization': `Bearer ${session.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Erro'); }
    return r.json();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/afiliado/login'); return; }
      try {
        const [m, s, c] = await Promise.all([call('me'), call('sales'), call('commissions')]);
        setMe(m.data);
        setProfile({
          name: m.data.name, whatsapp: m.data.whatsapp || '', document: m.data.document || '',
          pix_key: m.data.pix_key || '', pix_key_type: m.data.pix_key_type || 'CPF',
        });
        setSales(s.data || []);
        setCommissions(c.data || []);
      } catch (err) {
        toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Erro', variant: 'destructive' });
        navigate('/afiliado/login');
      } finally { setLoading(false); }
    })();
  }, []);

  const totalGen = commissions.reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + Number(c.commission_amount), 0);
  const totalPending = commissions.filter(c => ['pending','approved'].includes(c.status)).reduce((s, c) => s + Number(c.commission_amount), 0);

  const saveProfile = async () => {
    try { await call('update-profile', { method: 'POST', body: profile }); toast({ title: 'Perfil atualizado' }); }
    catch (err) { toast({ title: 'Erro', description: err instanceof Error ? err.message : '', variant: 'destructive' }); }
  };

  const logout = async () => { await supabase.auth.signOut(); navigate('/afiliado/login'); };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!me) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold">Bivvo</span>
            <Badge variant="outline">Afiliado</Badge>
            <span className="text-sm text-muted-foreground hidden sm:inline">{me.name}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sair</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div className="card-glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Comissão</div><div className="text-xl font-bold">{me.commission_percent}%</div></div>
          <div className="card-glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Total gerado</div><div className="text-xl font-bold">{formatCurrency(totalGen)}</div></div>
          <div className="card-glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Pendente</div><div className="text-xl font-bold text-amber-600">{formatCurrency(totalPending)}</div></div>
          <div className="card-glass rounded-xl p-4"><div className="text-xs text-muted-foreground">Pago</div><div className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</div></div>
        </div>

        <Tabs defaultValue="calc">
          <TabsList>
            <TabsTrigger value="calc"><Calculator className="h-4 w-4 mr-2" />Calculadora</TabsTrigger>
            <TabsTrigger value="sales"><ListChecks className="h-4 w-4 mr-2" />Vendas</TabsTrigger>
            <TabsTrigger value="comm"><DollarSign className="h-4 w-4 mr-2" />Comissões</TabsTrigger>
            <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Meus dados</TabsTrigger>
          </TabsList>

          <TabsContent value="calc" className="mt-4">
            <BivvoCalculator affiliateSlug={me.slug} />
          </TabsContent>

          <TabsContent value="sales" className="mt-4">
            <div className="card-glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Plano</TableHead><TableHead>1º mês</TableHead><TableHead>Recorrente</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {sales.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{new Date(s.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell>{s.plan_label}</TableCell>
                      <TableCell>{formatCurrency(Number(s.amount_first))}</TableCell>
                      <TableCell>{formatCurrency(Number(s.amount_recurring))}</TableCell>
                      <TableCell><Badge variant="outline">{s.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {sales.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sem vendas ainda</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="comm" className="mt-4">
            <div className="card-glass rounded-xl overflow-hidden">
              <Table>
                <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Venda</TableHead><TableHead>%</TableHead><TableHead>Comissão</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {commissions.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{new Date(c.created_at).toLocaleString('pt-BR')}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{c.kind}</Badge></TableCell>
                      <TableCell>{formatCurrency(Number(c.sale_amount))}</TableCell>
                      <TableCell>{c.commission_percent}%</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(c.commission_amount))}</TableCell>
                      <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {commissions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sem comissões</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <div className="card-glass rounded-xl p-6 max-w-xl space-y-4">
              <div><Label>Nome</Label><Input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>WhatsApp</Label><Input value={profile.whatsapp} onChange={e => setProfile(p => ({ ...p, whatsapp: e.target.value }))} /></div>
                <div><Label>Documento</Label><Input value={profile.document} onChange={e => setProfile(p => ({ ...p, document: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-3">
                <div><Label>Tipo PIX</Label>
                  <select className="w-full h-10 px-3 rounded border bg-background" value={profile.pix_key_type} onChange={e => setProfile(p => ({ ...p, pix_key_type: e.target.value }))}>
                    <option>CPF</option><option>CNPJ</option><option>EMAIL</option><option>PHONE</option><option>RANDOM</option>
                  </select>
                </div>
                <div><Label>Chave PIX</Label><Input value={profile.pix_key} onChange={e => setProfile(p => ({ ...p, pix_key: e.target.value }))} /></div>
              </div>
              <Button onClick={saveProfile}>Salvar</Button>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
