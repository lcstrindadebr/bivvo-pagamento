import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export function AdminTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
  };

  useEffect(() => {
    loadTasks();
  }, []);

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    const { error } = await supabase.from('tasks').insert({ title: newTitle });
    if (error) {
      toast({ title: 'Erro', description: 'Falha ao adicionar tarefa', variant: 'destructive' });
    } else {
      setNewTitle('');
      loadTasks();
      toast({ title: 'Sucesso', description: 'Tarefa adicionada!' });
    }
    setLoading(false);
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
    if (!error) loadTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) {
      loadTasks();
      toast({ title: 'Removida', description: 'Tarefa removida com sucesso.' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Nova tarefa..." 
          value={newTitle} 
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
        />
        <Button onClick={addTask} disabled={loading}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Tarefa</TableHead>
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
                  <Button variant="ghost" size="icon" onClick={() => deleteTask(task.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tasks.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                  Nenhuma tarefa pendente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
