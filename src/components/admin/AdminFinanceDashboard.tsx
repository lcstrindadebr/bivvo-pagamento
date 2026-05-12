import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, Users, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/validators';

interface FinanceStats {
  totalPayments: number;
  paidCount: number;
  totalValue: number;
  paidValue: number;
  activeSubscriptions: number;
  payments: any[];
}

interface AdminFinanceDashboardProps {
  adminFetch: (action: string, params?: Record<string, string>) => Promise<any>;
}

export function AdminFinanceDashboard({ adminFetch }: AdminFinanceDashboardProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('30days');

  const loadStats = async (selectedPeriod: string) => {
    setLoading(true);
    try {
      const now = new Date();
      let start = new Date();
      
      if (selectedPeriod === 'today') {
        start.setHours(0, 0, 0, 0);
      } else if (selectedPeriod === '7days') {
        start.setDate(now.getDate() - 7);
      } else if (selectedPeriod === '30days') {
        start.setDate(now.getDate() - 30);
      }

      const params = {
        'dateCreated[ge]': start.toISOString().split('T')[0],
        'dateCreated[le]': now.toISOString().split('T')[0]
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
    loadStats(period);
  }, [period]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Pago</Badge>;
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-500/20">Pendente</Badge>;
      case 'OVERDUE':
        return <Badge variant="outline" className="text-red-600 border-red-500/20">Atrasado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold">Dashboard Financeiro</h2>
        <div className="flex gap-2">
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
            Últimos 7 dias
          </Button>
          <Button 
            variant={period === '30days' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setPeriod('30days')}
          >
            Últimos 30 dias
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-accent" /> Assinaturas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" /> Total Cobranças
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
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
              <div className="text-2xl font-bold text-green-500">{formatCurrency(stats?.paidValue || 0)}</div>
            )}
          </CardContent>
        </Card>

        <Card className="card-glass border-none shadow-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-500" /> Valor Pendente
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
          <CardTitle>Últimas Cobranças</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
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
                      {new Date(p.dateCreated).toLocaleDateString('pt-BR')}
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
