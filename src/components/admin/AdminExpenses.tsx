import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Calendar, Tag, DollarSign, Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: 'fixed' | 'variable';
  is_automatic: boolean;
  payment_method?: 'one_time' | 'recurring' | 'installments';
  installments_total?: number;
  installment_number?: number;
  recurring_interval?: 'monthly' | 'weekly' | 'yearly';
  parent_id?: string;
  created_at: string;
}

interface AdminExpensesProps {
  adminFetch: (action: string, params?: Record<string, string>) => Promise<any>;
  adminPost: (action: string, body: any) => Promise<any>;
}

const CATEGORIES = [
  'Infraestrutura & Cloud',
  'Marketing & Vendas',
  'Operacional',
  'Pessoal & RH',
  'Impostos & Taxas',
  'Comissões (Afiliados)',
  'Softwares & Ferramentas',
  'Outros'
];

export default function AdminExpenses({ adminFetch, adminPost }: AdminExpensesProps) {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [form, setForm] = useState({
    description: '',
    amount: '',
    category: 'Outros',
    date: new Date().toISOString().split('T')[0],
    type: 'fixed' as 'fixed' | 'variable',
    payment_method: 'one_time' as 'one_time' | 'recurring' | 'installments',
    installments_total: '2',
    recurring_interval: 'monthly' as 'monthly' | 'weekly' | 'yearly'
  });

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await adminFetch('list-expenses');
      setExpenses(res.data || []);
    } catch (err) {
      console.error('Failed to load expenses:', err);
      toast({ title: 'Erro', description: 'Falha ao carregar despesas', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSave = async () => {
    if (!form.description || !form.amount) {
      toast({ title: 'Erro', description: 'Preencha todos os campos obrigatórios', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      await adminPost('create-expense', {
        ...form,
        amount: parseFloat(form.amount),
        installments_total: form.payment_method === 'installments' ? parseInt(form.installments_total) : null,
        recurring_interval: form.payment_method === 'recurring' ? form.recurring_interval : null
      });
      toast({ title: 'Sucesso', description: 'Despesa cadastrada com sucesso!' });
      setDialogOpen(false);
      setForm({
        description: '',
        amount: '',
        category: 'Outros',
        date: new Date().toISOString().split('T')[0],
        type: 'fixed',
        payment_method: 'one_time',
        installments_total: '2',
        recurring_interval: 'monthly'
      });
      loadExpenses();
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao salvar despesa', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta despesa?')) return;

    try {
      await adminPost('delete-expense', { id });
      toast({ title: 'Sucesso', description: 'Despesa excluída!' });
      loadExpenses();
    } catch (err) {
      toast({ title: 'Erro', description: 'Falha ao excluir despesa', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" /> Gestão de Despesas
          </h2>
          <p className="text-sm text-muted-foreground">Controle seus custos fixos e variáveis</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Lançar Nova Despesa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input 
                  placeholder="Ex: Pagamento Servidor AWS" 
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="0,00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date"
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select 
                    value={form.category} 
                    onValueChange={v => setForm(f => ({ ...f, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={form.type} 
                    onValueChange={(v: any) => setForm(f => ({ ...f, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixa</SelectItem>
                      <SelectItem value="variable">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Lançar Despesa
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-500" /> Total Despesas (Mês)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(expenses.reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" /> Despesas Fixas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(expenses.filter(e => e.type === 'fixed').reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </div>
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="h-4 w-4 text-amber-500" /> Despesas Variáveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(expenses.filter(e => e.type === 'variable').reduce((acc, curr) => acc + Number(curr.amount), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="card-glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                </TableCell>
              </TableRow>
            ) : expenses.length > 0 ? (
              expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">
                    {new Date(e.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{e.description}</span>
                      {e.is_automatic && (
                        <Badge variant="outline" className="w-fit text-[9px] h-3 px-1 mt-0.5 bg-accent/5 text-accent border-accent/20">
                          Automático
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {e.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs ${e.type === 'fixed' ? 'text-blue-500' : 'text-amber-500'}`}>
                      {e.type === 'fixed' ? 'Fixa' : 'Variável'}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-red-500">
                    {formatCurrency(e.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!e.is_automatic && (
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(e.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhuma despesa encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
