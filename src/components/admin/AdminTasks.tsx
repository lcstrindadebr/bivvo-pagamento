import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2, Circle, LayoutGrid, List, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  assigned_to: string | null;
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

export function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState<string>('unassigned');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'list' | 'kanban'>('kanban');
  const { toast } = useToast();

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data as Task[]);
  };

  const loadUsers = async () => {
    // Load admin users (delegatable)
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

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('tasks').insert({
      title: newTitle,
      assigned_to: newAssignee === 'unassigned' ? null : newAssignee,
    });
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao adicionar tarefa', variant: 'destructive' });
    } else {
      setNewTitle('');
      setNewAssignee('unassigned');
      loadTasks();
      toast({ title: 'Sucesso', description: 'Tarefa adicionada!' });
    }
    setLoading(false);
  };

  const updateTask = async (id: string, patch: Partial<Task>) => {
    const { error } = await supabase.from('tasks').update(patch).eq('id', id);
    if (!error) loadTasks();
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    await updateTask(task.id, { status: newStatus });
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      loadTasks();
      toast({ title: 'Removida', description: 'Tarefa removida com sucesso.' });
    }
  };

  const onDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) updateTask(id, { status });
  };

  const userName = (id: string | null) => {
    if (!id) return null;
    const u = users.find((x) => x.id === id);
    return u?.name || u?.email || 'Usuário';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <Input
          placeholder="Nova tarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          className="flex-1"
        />
        <Select value={newAssignee} onValueChange={setNewAssignee}>
          <SelectTrigger className="w-full md:w-56">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Sem responsável</SelectItem>
            {users.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={addTask} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
        <div className="flex gap-1 ml-auto">
          <Button variant={view === 'kanban' ? 'default' : 'outline'} size="sm" onClick={() => setView('kanban')}>
            <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
          </Button>
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4 mr-1" /> Lista
          </Button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDrop(e, col.key)}
                className="bg-muted/30 rounded-lg p-3 min-h-[300px] border border-border/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">{col.label}</h3>
                  <Badge variant="secondary">{colTasks.length}</Badge>
                </div>
                <div className="space-y-2">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', task.id)}
                      className="p-3 cursor-move hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium flex-1">{task.title}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteTask(task.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Select
                          value={task.assigned_to || 'unassigned'}
                          onValueChange={(v) => updateTask(task.id, { assigned_to: v === 'unassigned' ? null : v } as any)}
                        >
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue>
                              <span className="flex items-center gap-1">
                                <UserIcon className="h-3 w-3" />
                                {userName(task.assigned_to) || 'Delegar'}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Sem responsável</SelectItem>
                            {users.map((u) => (
                              <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </Card>
                  ))}
                  {colTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">Arraste tarefas aqui</p>
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
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead className="w-[220px]">Responsável</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className={task.status === 'done' ? 'opacity-50' : ''}>
                  <TableCell>
                    <button onClick={() => toggleStatus(task)}>
                      {task.status === 'done' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell className={task.status === 'done' ? 'line-through' : ''}>
                    {task.title}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={task.assigned_to || 'unassigned'}
                      onValueChange={(v) => updateTask(task.id, { assigned_to: v === 'unassigned' ? null : v } as any)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Delegar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Sem responsável</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {tasks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                    Nenhuma tarefa pendente.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
