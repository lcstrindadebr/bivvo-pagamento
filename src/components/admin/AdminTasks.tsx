import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus, Trash2, CheckCircle2, Circle, LayoutGrid, List, User as UserIcon,
  Search, Calendar, Pencil, Clock, ListChecks, Hourglass,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  subtasks: Subtask[] | null;
  waiting_third_party: boolean;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
}

const COLUMNS = [
  { key: 'todo', label: 'A Fazer' },
  { key: 'in_progress', label: 'Em Andamento' },
  { key: 'done', label: 'Concluído' },
];

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_LABEL: Record<string, string> = { high: 'Alta', medium: 'Média', low: 'Baixa' };
const PRIORITY_VARIANT: Record<string, string> = {
  high: 'bg-destructive/15 text-destructive border-destructive/30',
  medium: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400',
  low: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
};

const emptyForm = {
  id: '' as string | undefined,
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  assigned_to: 'unassigned',
  due_date: '',
  waiting_third_party: false,
  subtasks: [] as Subtask[],
};

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;

  // ISO format YYYY-MM-DD
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const result = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (result.getUTCDate() !== +iso[3] || result.getUTCMonth() !== +iso[2] - 1) return null;
    return result;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    let yearNum = parseInt(y);
    if (yearNum < 100) yearNum += 2000;
    const dayNum = parseInt(d);
    const monthNum = parseInt(m);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    const result = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (result.getUTCDate() !== dayNum || result.getUTCMonth() !== monthNum - 1) return null;
    return result;
  }

  return null;
}

function formatDate(iso: string | null) {
  const d = parseDate(iso);
  if (!d) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' });
}

function formatDateTime(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(task: Task) {
  if (!task.due_date || task.status === 'done') return false;
  const due = parseDate(task.due_date);
  if (!due) return false;
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return due.getTime() < today.getTime();
}

function newSubtaskId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeSubtasks(raw: any): Subtask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === 'object' && typeof s.title === 'string')
    .map((s) => ({ id: String(s.id ?? newSubtaskId()), title: String(s.title), done: !!s.done }));
}

export function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) {
      setTasks(
        (data as any[]).map((t) => ({
          ...t,
          subtasks: normalizeSubtasks(t.subtasks),
          waiting_third_party: !!t.waiting_third_party,
        })) as Task[],
      );
    }
  };

  const loadUsers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length === 0) return;
    const { data } = await supabase.from('users').select('id, name, email').in('id', ids);
    if (data) setUsers(data as AdminUser[]);
  };

  useEffect(() => {
    loadTasks();
    loadUsers();
  }, []);

  const userName = (id: string | null) => {
    if (!id) return null;
    const u = users.find((x) => x.id === id);
    return u?.name || u?.email || 'Usuário';
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !(t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))) return false;
      if (filterAssignee !== 'all') {
        if (filterAssignee === 'unassigned' ? t.assigned_to !== null : t.assigned_to !== filterAssignee) return false;
      }
      if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
      return true;
    });
  }, [tasks, search, filterAssignee, filterPriority]);

  const sortedForColumn = (status: string) => {
    return filtered
      .filter((t) => t.status === status)
      .sort((a, b) => {
        const pa = PRIORITY_ORDER[a.priority] ?? 3;
        const pb = PRIORITY_ORDER[b.priority] ?? 3;
        if (pa !== pb) return pa - pb;
        const da = a.due_date ? (parseDate(a.due_date)?.getTime() ?? Infinity) : Infinity;
        const db = b.due_date ? (parseDate(b.due_date)?.getTime() ?? Infinity) : Infinity;
        return da - db;
      });
  };

  const openCreate = () => {
    setForm({ ...emptyForm, id: undefined, subtasks: [] });
    setNewSubtaskTitle('');
    setDialogOpen(true);
  };
  const openEdit = (t: Task) => {
    setForm({
      id: t.id,
      title: t.title,
      description: t.description || '',
      priority: t.priority || 'medium',
      status: t.status || 'todo',
      assigned_to: t.assigned_to || 'unassigned',
      due_date: t.due_date ? t.due_date.slice(0, 10) : '',
      waiting_third_party: !!t.waiting_third_party,
      subtasks: normalizeSubtasks(t.subtasks),
    });
    setNewSubtaskTitle('');
    setDialogOpen(true);
  };

  const addSubtaskInForm = () => {
    const title = newSubtaskTitle.trim();
    if (!title) return;
    setForm({ ...form, subtasks: [...form.subtasks, { id: newSubtaskId(), title, done: false }] });
    setNewSubtaskTitle('');
  };

  const toggleSubtaskInForm = (id: string) => {
    setForm({
      ...form,
      subtasks: form.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  };

  const removeSubtaskInForm = (id: string) => {
    setForm({ ...form, subtasks: form.subtasks.filter((s) => s.id !== id) });
  };

  const saveTask = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      status: form.status,
      assigned_to: form.assigned_to === 'unassigned' ? null : form.assigned_to,
      due_date: form.due_date ? new Date(Date.UTC(parseInt(form.due_date.slice(0, 4)), parseInt(form.due_date.slice(5, 7)) - 1, parseInt(form.due_date.slice(8, 10)))).toISOString() : null,
      waiting_third_party: form.waiting_third_party,
      subtasks: form.subtasks,
    };
    const { error } = form.id
      ? await supabase.from('tasks').update(payload).eq('id', form.id)
      : await supabase.from('tasks').insert(payload);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setDialogOpen(false);
      loadTasks();
      toast({ title: form.id ? 'Atualizada' : 'Criada', description: 'Tarefa salva com sucesso.' });
    }
    setSaving(false);
  };

  const updateTask = async (id: string, patch: Partial<Task> | Record<string, any>) => {
    const { error } = await supabase.from('tasks').update(patch as any).eq('id', id);
    if (!error) loadTasks();
  };

  const toggleDone = (t: Task) => updateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' });

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('tasks').delete().eq('id', deleteId);
    setDeleteId(null);
    if (!error) {
      loadTasks();
      toast({ title: 'Removida', description: 'Tarefa removida.' });
    }
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { status });
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-full lg:w-48"><SelectValue placeholder="Responsável" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos responsáveis</SelectItem>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full lg:w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
          </Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nova tarefa
        </Button>
      </div>

      {/* Kanban */}
      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = sortedForColumn(col.key);
            const total = tasks.filter((t) => t.status === col.key).length;
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.key)}
                className="bg-muted/30 rounded-lg p-3 min-h-[300px] border border-border/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <Badge variant="secondary">{colTasks.length}/{total}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => {
                    const overdue = isOverdue(task);
                    const subs = task.subtasks || [];
                    const subsDone = subs.filter((s) => s.done).length;
                    return (
                      <Card
                        key={task.id}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                        onClick={() => openEdit(task)}
                        className={cn(
                          'p-3 cursor-pointer hover:shadow-md transition-shadow group',
                          task.waiting_third_party && 'border-amber-500/50 bg-amber-500/5',
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                            className="mt-0.5 shrink-0"
                            aria-label="Concluir"
                          >
                            {task.status === 'done'
                              ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              : <Circle className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                          </button>
                          <p className={cn('text-sm font-medium flex-1', task.status === 'done' && 'line-through opacity-60')}>
                            {task.title}
                          </p>
                          <Button
                            variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 ml-6">{task.description}</p>
                        )}
                        <div className="mt-2 ml-6 flex flex-wrap items-center gap-1.5">
                          {task.waiting_third_party && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40">
                              <Hourglass className="h-2.5 w-2.5" /> Aguardando terceiro
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 border', PRIORITY_VARIANT[task.priority])}>
                            {PRIORITY_LABEL[task.priority] || task.priority}
                          </Badge>
                          {task.due_date && (
                            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-5 gap-1', overdue && 'border-destructive/40 text-destructive')}>
                              <Calendar className="h-2.5 w-2.5" /> {formatDate(task.due_date)}
                            </Badge>
                          )}
                          {subs.length > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                              <ListChecks className="h-2.5 w-2.5" /> {subsDone}/{subs.length}
                            </Badge>
                          )}
                          {task.assigned_to && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                              <UserIcon className="h-2.5 w-2.5" /> {userName(task.assigned_to)}
                            </Badge>
                          )}
                          {task.status === 'done' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                              <Clock className="h-2.5 w-2.5" /> Concluída
                            </Badge>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">Arraste tarefas aqui</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[100px]">Prioridade</TableHead>
                <TableHead className="w-[110px]">Vencimento</TableHead>
                <TableHead className="w-[140px]">Concluída em</TableHead>
                <TableHead className="w-[200px]">Responsável</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((task) => (
                <TableRow key={task.id} className={task.status === 'done' ? 'opacity-60' : ''}>
                  <TableCell>
                    <button onClick={() => toggleDone(task)}>
                      {task.status === 'done'
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  </TableCell>
                  <TableCell className={cn(task.status === 'done' && 'line-through')}>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(task)} className="text-left hover:underline">
                        {task.title}
                      </button>
                      {task.waiting_third_party && (
                        <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40">
                          <Hourglass className="h-2.5 w-2.5" /> Aguardando
                        </Badge>
                      )}
                      {(task.subtasks?.length ?? 0) > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ListChecks className="h-2.5 w-2.5" /> {task.subtasks!.filter((s) => s.done).length}/{task.subtasks!.length}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-md">{task.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('text-[10px]', PRIORITY_VARIANT[task.priority])}>
                      {PRIORITY_LABEL[task.priority] || task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className={cn('text-xs', isOverdue(task) && 'text-destructive font-medium')}>
                    {formatDate(task.due_date) || '—'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {task.completed_at ? formatDateTime(task.completed_at) : '—'}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assigned_to || 'unassigned'}
                      onValueChange={(v) => updateTask(task.id, { assigned_to: v === 'unassigned' ? null : v } as any)}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Delegar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sem responsável</SelectItem>
                        {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={task.status} onValueChange={(v) => updateTask(task.id, { status: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(task)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(task.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma tarefa encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="t-title">Título</Label>
              <Input
                id="t-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveTask(); }}
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="t-desc">Descrição</Label>
              <Textarea
                id="t-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLUMNS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="t-due">Vencimento</Label>
                <Input
                  id="t-due" type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Responsável</Label>
                <Select value={form.assigned_to} onValueChange={(v) => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem responsável</SelectItem>
                    {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-md border p-3 bg-amber-500/5">
              <Checkbox
                id="t-waiting"
                checked={form.waiting_third_party}
                onCheckedChange={(v) => setForm({ ...form, waiting_third_party: !!v })}
              />
              <Label htmlFor="t-waiting" className="cursor-pointer flex items-center gap-1.5">
                <Hourglass className="h-3.5 w-3.5 text-amber-600" />
                Aguardando ação de terceiro
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ListChecks className="h-4 w-4" /> Subtarefas
                {form.subtasks.length > 0 && (
                  <span className="text-xs text-muted-foreground font-normal">
                    ({form.subtasks.filter((s) => s.done).length}/{form.subtasks.length})
                  </span>
                )}
              </Label>
              <div className="space-y-1.5">
                {form.subtasks.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-md border p-2">
                    <Checkbox checked={s.done} onCheckedChange={() => toggleSubtaskInForm(s.id)} />
                    <span className={cn('flex-1 text-sm', s.done && 'line-through text-muted-foreground')}>
                      {s.title}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeSubtaskInForm(s.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nova subtarefa..."
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtaskInForm(); } }}
                />
                <Button type="button" variant="outline" onClick={addSubtaskInForm} disabled={!newSubtaskTitle.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveTask} disabled={saving || !form.title.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
