import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Receipt, XCircle, MousePointerClick, Copy, AlertTriangle, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';

interface FinanceStats {
  totalPayments: number;
  paidCount: number;
  totalValue: number;
  paidValue: number;
  paidNetValue: number;
  activeSubscriptions: number;
  mrr: number;
  arpu: number;
  churnRate: number;
  ltv: number;
  totalClicks: number;
  conversionRate: number;
  retainedCommissions: number;
  pendingAffiliatePayout: number;
  totalExpenses: number;
  monthlyExpenses: number;
  overdueValue: number;
  overdueCount: number;
  freeCash: number;
  bankBalance: number;
  projection: number;
  payments: any[];
  overdueList: any[];
  previous: null | Record<string, number>;
  deltas: null | {
    paidValue: number | null;
    paidNetValue: number | null;
    paidCount: number | null;
    totalValue: number | null;
    freeCash: number | null;
    projection: number | null;
    churnRate: number; // pp diff
  };
  previousRange: null | { start: string; end: string };
}

function DeltaBadge({ value, kind = 'pct', inverse = false }: { value: number | null | undefined; kind?: 'pct' | 'pp'; inverse?: boolean }) {
  if (value === null || value === undefined || !isFinite(value)) return null;
  const positive = value > 0;
  const neutral = Math.abs(value) < 0.05;
  // inverse=true means "positive number is bad" (e.g. churn)
  const good = neutral ? true : inverse ? !positive : positive;
  const cls = neutral
    ? 'bg-muted text-muted-foreground'
    : good
      ? 'bg-emerald-500/15 text-emerald-600'
      : 'bg-red-500/15 text-red-600';
  const Icon = neutral ? null : positive ? TrendingUp : TrendingDown;
  const suffix = kind === 'pp' ? ' pp' : '%';
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls}`}>
      {Icon && <Icon className="h-2.5 w-2.5" />}
      {value > 0 ? '+' : ''}{value.toFixed(kind === 'pp' ? 2 : 1)}{suffix}
    </span>
  );
}



interface AdminFinanceDashboardProps {
  adminFetch: (action: string, params?: Record<string, string>) => Promise<any>;
}

export function AdminFinanceDashboard({ adminFetch }: AdminFinanceDashboardProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | '7days' | '30days' | 'month' | 'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadStats = async (selectedPeriod: string, start?: string, end?: string) => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      
      if (selectedPeriod === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (selectedPeriod === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (selectedPeriod === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (selectedPeriod === 'custom' && start && end) {
        startDate = new Date(start + 'T00:00:00');
        endDate = new Date(end + 'T23:59:59');
      }

      const params: Record<string, string> = {
        'dateCreated[ge]': startDate.toISOString().split('T')[0],
        'dateCreated[le]': endDate.toISOString().split('T')[0]
      };

      const data = await adminFetch('finance-stats', params);
      setStats(data);
    } catch (err) {
      console.error('Failed to load finance stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (period !== 'custom') {
      loadStats(period);
    }
  }, [period]);

  const handleCustomSearch = () => {
    if (customStart && customEnd) {
      loadStats('custom', customStart, customEnd);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
      case 'RECEIVED_IN_CASH':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500/20">Pendente</Badge>;
      case 'OVERDUE':
        return <Badge variant="outline" className="text-red-600 border-red-500/20">Atrasado</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/20">Cancelada</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="text-purple-600 border-purple-500/20">Estornada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xl font-bold">Dashboard Financeiro</h2>
            {stats?.previousRange && (
              <p className="text-[10px] text-muted-foreground">
                Comparado com {new Date(stats.previousRange.start).toLocaleDateString('pt-BR')} — {new Date(stats.previousRange.end).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant={period === 'today' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setPeriod('today')}
            >
              Hoje
            </Button>
            <Button 
              variant={period === '7days' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setPeriod('7days')}
            >
              7 dias
            </Button>
            <Button 
              variant={period === '30days' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setPeriod('30days')}
            >
              30 dias
            </Button>
            <Button 
              variant={period === 'month' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setPeriod('month')}
            >
              Mês Atual
            </Button>
            <Button 
              variant={period === 'custom' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setPeriod('custom')}
            >
              Personalizado
            </Button>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 p-4 rounded-lg bg-accent/5 border border-accent/10">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Início</label>
              <input 
                type="date" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Fim</label>
              <input 
                type="date" 
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
              />
            </div>
            <Button size="sm" onClick={handleCustomSearch} disabled={!customStart || !customEnd}>
              Buscar
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> MRR (Receita Mensal)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-accent">{formatCurrency(stats?.mrr || 0)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {stats?.activeSubscriptions || 0} assinaturas ativas
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Cobranças em Atraso
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-red-500">
                  {formatCurrency(stats?.overdueValue || 0)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {stats?.overdueCount || 0} cobrança(s) vencida(s) e não pagas
                </div>
              </div>
            )}
          </CardContent>

        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" /> Valor Recebido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-green-500">{formatCurrency(stats?.paidValue || 0)}</div>
                  <DeltaBadge value={stats?.deltas?.paidValue} />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Líquido: {formatCurrency(stats?.paidNetValue || 0)}
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" /> Repasse Afiliados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-xl font-bold text-amber-500">{formatCurrency(stats?.pendingAffiliatePayout || 0)}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatCurrency(stats?.retainedCommissions || 0)} retido (menos de 7 dias)
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-red-500" /> Despesas (Mês Vigente)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-xl font-bold text-red-500">{formatCurrency(stats?.monthlyExpenses || 0)}</div>
                <div className="text-[10px] text-muted-foreground">
                  Soma dos débitos do mês corrente
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" /> Saldo Bancário
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-blue-500">{formatCurrency(stats?.bankBalance || 0)}</div>
                <div className="text-[10px] text-muted-foreground">
                  Saldo atual na conta Asaas
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Projeção do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-emerald-500">{formatCurrency(stats?.projection || 0)}</div>
                  <DeltaBadge value={stats?.deltas?.projection} />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  (Saldo Bancário + Recebido líq. + Pendente Asaas − Despesas − Comissões)
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" /> Valor Pendente (Asaas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="text-2xl font-bold text-yellow-500">
                {formatCurrency((stats?.totalValue || 0) - (stats?.paidValue || 0))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="card-glass border-none shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Clientes Inadimplentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vencimento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : stats?.overdueList && stats.overdueList.length > 0 ? (
                stats.overdueList.map((p: any) => {
                  const link = p.invoiceUrl || p.bankSlipUrl || '';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        {p.dueDate ? new Date(p.dueDate).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[11px]">{p.customerName}</span>
                          <span className="text-[9px] text-muted-foreground">{p.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm text-red-500">
                        {formatCurrency(p.value)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.billingType === 'PIX' ? 'PIX' : p.billingType === 'BOLETO' ? 'Boleto' : 'Cartão'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={!link}
                            title={link ? 'Copiar link da cobrança' : 'Sem link disponível'}
                            onClick={() => {
                              if (!link) return;
                              navigator.clipboard.writeText(link);
                              toast({ title: 'Copiado', description: 'Link da cobrança copiado!' });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {link && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Abrir cobrança"
                              onClick={() => window.open(link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Nenhum cliente inadimplente. 🎉
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="card-glass border-none shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle>Últimas Cobranças de Assinaturas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Forma</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Link</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : stats?.payments && stats.payments.length > 0 ? (
                stats.payments.map((p: any) => {
                  const link = p.invoiceUrl || p.bankSlipUrl || '';
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1 group">
                          {new Date(p.dateCreated).toLocaleDateString('pt-BR')}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              navigator.clipboard.writeText(p.id);
                              toast({ title: 'Copiado', description: 'ID da cobrança copiado!' });
                            }}
                            title={`Copiar ID: ${p.id}`}
                          >
                            <Copy className="h-2 w-2" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[11px]">{p.customerName}</span>
                          <span className="text-[9px] text-muted-foreground">{p.customerEmail}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {formatCurrency(p.value)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.billingType === 'PIX' ? 'PIX' : p.billingType === 'BOLETO' ? 'Boleto' : 'Cartão'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(p.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={!link}
                            title={link ? 'Copiar link da cobrança' : 'Sem link disponível'}
                            onClick={() => {
                              if (!link) return;
                              navigator.clipboard.writeText(link);
                              toast({ title: 'Copiado', description: 'Link da cobrança copiado!' });
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {link && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Abrir cobrança"
                              onClick={() => window.open(link, '_blank')}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    Nenhuma cobrança no período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
