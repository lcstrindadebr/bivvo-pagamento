import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Receipt, XCircle, MousePointerClick, Copy, AlertTriangle, PiggyBank, MessageCircle, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/validators';
import { useToast } from '@/hooks/use-toast';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';


interface OverdueCustomer {
  paymentId: string;
  asaasCustomerId: string;
  name: string;
  email: string;
  whatsapp: string;
  amount: number;
  dueDate: string | null;
  daysLate: number;
  invoiceUrl: string | null;
  billingType: string | null;
}

interface FinanceSeriesPoint {
  bucket: string;
  revenue: number;
  expenses: number;
  commissions: number;
  refunds: number;
  netProfit: number;
  cashFlow: number;
}

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
  periodCommissions: number;
  netProfit: number;
  monthlyExpenses: number;
  overdueValue: number;
  overdueCount: number;
  overdueCustomers: OverdueCustomer[];
  freeCash: number;
  bankBalance: number;
  projection: number;
  payments: any[];
  previous: null | Record<string, number>;
  deltas: null | {
    paidValue: number | null;
    paidNetValue: number | null;
    paidCount: number | null;
    totalValue: number | null;
    freeCash: number | null;
    netProfit: number | null;
    projection: number | null;
    churnRate: number;
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
  const [series, setSeries] = useState<FinanceSeriesPoint[]>([]);
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

      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];
      const params: Record<string, string> = {
        'dateCreated[ge]': startStr,
        'dateCreated[le]': endStr,
      };

      const rangeDays = Math.max(
        1,
        Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1,
      );
      const granularity = rangeDays > 60 ? 'month' : 'day';

      const [statsData, seriesData] = await Promise.all([
        adminFetch('finance-stats', params),
        adminFetch('finance-series', { start: startStr, end: endStr, granularity }).catch(() => ({ series: [] })),
      ]);
      setStats(statsData);
      setSeries(seriesData?.series || []);
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
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground"
              onClick={async () => {
                try {
                  toast({ title: 'Sincronizando…', description: 'Reconstruindo histórico financeiro.' });
                  const res = await adminFetch('finance-backfill' as any, { months: '12' } as any);
                  toast({ title: 'Histórico sincronizado', description: `${res?.days || 0} dias reconstruídos.` });
                  loadStats(period, customStart, customEnd);
                } catch (e: any) {
                  toast({ title: 'Erro no backfill', description: e?.message || 'Falha', variant: 'destructive' });
                }
              }}
            >
              Sincronizar histórico
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
              <Receipt className="h-4 w-4 text-red-500" /> Despesas (Período)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-xl font-bold text-red-500">
                  {formatCurrency((stats?.totalExpenses || 0) + (stats?.periodCommissions || 0))}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Despesas {formatCurrency(stats?.totalExpenses || 0)} + Comissões {formatCurrency(stats?.periodCommissions || 0)}
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1">
                  Mês vigente: {formatCurrency(stats?.monthlyExpenses || 0)}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" /> Churn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-bold text-red-500">{stats?.churnRate.toFixed(2)}%</div>
                  <DeltaBadge value={stats?.deltas?.churnRate} kind="pp" inverse />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Normalizado para 30 dias
                </div>
              </div>
            )}
          </CardContent>
        </Card>


        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" /> LTV
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="text-2xl font-bold text-blue-500">
                  {stats && stats.churnRate > 0 ? formatCurrency(stats.ltv) : '—'}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  ARPU {formatCurrency(stats?.arpu || 0)} / mês
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-emerald-500" /> Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <div className={`text-2xl font-bold ${((stats?.netProfit ?? 0) >= 0) ? 'text-emerald-500' : 'text-red-500'}`}>
                    {formatCurrency(stats?.netProfit || 0)}
                  </div>
                  <DeltaBadge value={stats?.deltas?.netProfit} />
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Recebido líq. − Despesas − Comissões do período
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico Fluxo de Caixa 360°: previsto + recebido + saldo bancário projetado */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="card-glass border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Fluxo de Caixa (Previsto × Recebido × Saldo)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-72 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : series.length === 0 ? (
              <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
                Sem dados no período. Rode o backfill para popular o histórico.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={series}>
                  <defs>
                    <pattern id="forecastPattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                      <rect width="6" height="6" fill="#3b82f6" fillOpacity="0.25" />
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.6" />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10 }} tickFormatter={(v) => (v || '').slice(5)} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `R$${Math.round(v)}`}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `R$${Math.round(v)}`}
                  />
                  <Tooltip
                    formatter={(v: any, name: string) => [formatCurrency(Number(v)), name]}
                    labelFormatter={(v) => `Período: ${v}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" />
                  <ReferenceLine yAxisId="right" y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  {/* Previsto: barra listrada azul clara */}
                  <Bar
                    yAxisId="left"
                    dataKey="forecastRevenue"
                    name="Previsto"
                    fill="url(#forecastPattern)"
                    radius={[4, 4, 0, 0]}
                  />
                  {/* Recebido: barra verde sólida (sobreposta) */}
                  <Bar
                    yAxisId="left"
                    dataKey="receivedRevenue"
                    name="Recebido"
                    radius={[4, 4, 0, 0]}
                  >
                    {series.map((entry: any, index: number) => (
                      <Cell
                        key={`recv-${index}`}
                        fill={entry.isFuture ? 'transparent' : '#10b981'}
                      />
                    ))}
                  </Bar>
                  {/* Saldo bancário projetado (eixo direito) */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="runningBalance"
                    name="Saldo Bancário"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
            <div className="mt-2 text-[10px] text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              <span>▓ Previsto: cobranças com vencimento no período (qualquer status)</span>
              <span>▓ Recebido: valor líquido efetivamente entrou no caixa</span>
              <span>— Saldo: projeção ancorada no saldo Asaas atual</span>
            </div>
          </CardContent>
        </Card>
      </div>


      {/* Clientes inadimplentes */}
      <Card className="card-glass border-none shadow-xl overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Clientes Inadimplentes
            {stats?.overdueCount ? (
              <Badge variant="outline" className="text-red-600 border-red-500/30 ml-1">
                {stats.overdueCount} · {formatCurrency(stats.overdueValue || 0)}
              </Badge>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Atraso</TableHead>
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
              ) : stats?.overdueCustomers && stats.overdueCustomers.length > 0 ? (
                stats.overdueCustomers.map((c) => {
                  const waDigits = (c.whatsapp || '').replace(/\D/g, '');
                  const msg = encodeURIComponent(
                    `Olá ${c.name}, identificamos uma cobrança em atraso no valor de ${formatCurrency(c.amount)} (vencimento ${c.dueDate ? new Date(c.dueDate).toLocaleDateString('pt-BR') : 'recente'}). Podemos ajudar a regularizar?${c.invoiceUrl ? ` Link: ${c.invoiceUrl}` : ''}`,
                  );
                  const waUrl = waDigits ? `https://wa.me/${waDigits.length <= 11 ? '55' + waDigits : waDigits}?text=${msg}` : '';
                  return (
                    <TableRow key={c.paymentId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-[11px]">{c.name}</span>
                          <span className="text-[9px] text-muted-foreground">{c.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{c.whatsapp || <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="font-medium text-sm text-red-500">{formatCurrency(c.amount)}</TableCell>
                      <TableCell className="text-xs">
                        {c.dueDate ? new Date(c.dueDate).toLocaleDateString('pt-BR') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-red-600 border-red-500/20 text-[10px]">
                          {c.daysLate} {c.daysLate === 1 ? 'dia' : 'dias'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => {
                              navigator.clipboard.writeText(c.invoiceUrl!);
                              toast({ title: 'Copiado', description: 'Link da fatura copiado' });
                            }}
                            title="Copiar link da fatura"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        )}
                        {c.invoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            asChild
                            title="Abrir fatura"
                          >
                            <a href={c.invoiceUrl} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                        {waUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-emerald-600"
                            asChild
                            title="Enviar WhatsApp"
                          >
                            <a href={waUrl} target="_blank" rel="noreferrer">
                              <MessageCircle className="h-3 w-3" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    Nenhum cliente inadimplente no momento. 🎉
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-accent" />
                  </TableCell>
                </TableRow>
              ) : stats?.payments && stats.payments.length > 0 ? (
                stats.payments.map((p: any) => (
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
                            toast({ title: "Copiado", description: "ID da cobrança copiado!" });
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
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
