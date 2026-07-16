import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface LogRow {
  id: string;
  source: string;
  level: string;
  message: string;
  context: any;
  created_at: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  warn: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  error: 'bg-red-500/15 text-red-300 border-red-500/30',
  debug: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export function LogsTab() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>('all');
  const [source, setSource] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sources, setSources] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    let q = supabase
      .from('system_logs' as any)
      .select('id, source, level, message, context, created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (level !== 'all') q = q.eq('level', level);
    if (source !== 'all') q = q.eq('source', source);
    if (search.trim()) q = q.ilike('message', `%${search.trim()}%`);
    const { data, error } = await q;
    if (error) {
      toast({ title: 'Erro ao carregar logs', description: error.message, variant: 'destructive' });
    } else {
      const rows = (data || []) as unknown as LogRow[];
      setLogs(rows);
      const uniq = Array.from(new Set(rows.map((r) => r.source))).sort();
      setSources((prev) => Array.from(new Set([...prev, ...uniq])).sort());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, source]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(fetchLogs, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, level, source, search]);

  const clearOld = async () => {
    if (!confirm('Apagar TODOS os logs com mais de 7 dias?')) return;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('system_logs' as any).delete().lt('created_at', cutoff);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Logs antigos apagados' });
      fetchLogs();
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>Logs do sistema</CardTitle>
            <CardDescription>
              Registros das integrações (Bivvo, Asaas, provisionamento). Últimos 300 eventos.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoRefresh((v) => !v)}
            >
              Auto {autoRefresh ? 'ON' : 'OFF'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={clearOld}>
              <Trash2 className="h-4 w-4 mr-1" /> Limpar &gt; 7 dias
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Nível" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Origem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas origens</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Buscar mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            className="flex-1 min-w-[200px]"
          />
          <Button variant="outline" onClick={fetchLogs}>Buscar</Button>
        </div>

        <div className="rounded-lg border border-border/50 overflow-hidden">
          {loading && logs.length === 0 ? (
            <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Nenhum log encontrado.</div>
          ) : (
            <div className="divide-y divide-border/50 max-h-[600px] overflow-y-auto">
              {logs.map((l) => {
                const isOpen = !!expanded[l.id];
                return (
                  <div key={l.id} className="text-sm">
                    <button
                      type="button"
                      className="w-full flex items-start gap-2 p-2.5 hover:bg-white/5 text-left"
                      onClick={() => setExpanded((p) => ({ ...p, [l.id]: !p[l.id] }))}
                    >
                      {isOpen ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
                      <span className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {new Date(l.created_at).toLocaleString('pt-BR')}
                      </span>
                      <Badge variant="outline" className={`${LEVEL_COLORS[l.level] || ''} font-mono text-[10px] uppercase`}>
                        {l.level}
                      </Badge>
                      <Badge variant="outline" className="font-mono text-[10px]">{l.source}</Badge>
                      <span className="flex-1 truncate">{l.message}</span>
                    </button>
                    {isOpen && l.context && (
                      <pre className="text-[11px] bg-black/40 border-t border-border/40 p-3 overflow-x-auto whitespace-pre-wrap break-all">
                        {JSON.stringify(l.context, null, 2)}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
