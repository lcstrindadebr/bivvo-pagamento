import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Save, Loader2 } from 'lucide-react';
import { useSaveSetting } from '@/hooks/useSaveSetting';

interface Props {
  settings: Record<string, string>;
  loading: boolean;
}

export function NotificationsTab({ settings, loading }: Props) {
  const { save, saving } = useSaveSetting();
  const [form, setForm] = useState({
    email_from: '', email_bcc: '', webhook_url: '', notify_task_delegation: 'false',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        email_from: settings.email_from || '',
        email_bcc: settings.email_bcc || '',
        webhook_url: settings.webhook_url || '',
        notify_task_delegation: settings.notify_task_delegation || 'false',
      });
      setDirty(false);
    }
  }, [settings, loading]);

  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSave = async () => {
    const ok = await save(form, { previous: settings, label: 'Notificações' });
    if (ok) setDirty(false);
  };

  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-5 w-5 text-accent" /> Notificações
          {dirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">não salvo</span>}
        </CardTitle>
        <CardDescription>E-mails transacionais e webhooks internos.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email_from">E-mail remetente (from)</Label>
            <Input id="email_from" type="email" value={form.email_from}
              onChange={(e) => update({ email_from: e.target.value })} placeholder="no-reply@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email_bcc">Cópia (BCC) de vendas / cancelamentos</Label>
            <Input id="email_bcc" value={form.email_bcc}
              onChange={(e) => update({ email_bcc: e.target.value })} placeholder="financeiro@empresa.com, cs@empresa.com" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="webhook_url">Webhook para eventos internos (opcional)</Label>
            <Input id="webhook_url" value={form.webhook_url}
              onChange={(e) => update({ webhook_url: e.target.value })} placeholder="https://exemplo.com/webhook" className="font-mono text-sm" />
          </div>
          <div className="flex items-center justify-between md:col-span-2 rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Notificar ao delegar tarefa</p>
              <p className="text-xs text-muted-foreground">Envia e-mail ao responsável quando uma tarefa é atribuída.</p>
            </div>
            <Switch
              checked={form.notify_task_delegation === 'true'}
              onCheckedChange={(v) => update({ notify_task_delegation: v ? 'true' : 'false' })}
            />
          </div>
        </div>
        <div className="pt-4 border-t flex justify-end">
          <Button onClick={onSave} disabled={saving || !dirty} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
