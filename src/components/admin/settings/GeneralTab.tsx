import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Save, Loader2, Info } from 'lucide-react';
import { useSaveSetting } from '@/hooks/useSaveSetting';

interface Props {
  settings: Record<string, string>;
  loading: boolean;
}

const TIMEZONES = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza',
  'America/Bahia', 'America/Recife', 'America/Rio_Branco', 'UTC',
];

export function GeneralTab({ settings, loading }: Props) {
  const { save, saving } = useSaveSetting();
  const [form, setForm] = useState({
    site_name: '', site_url: '', support_email: '', support_whatsapp: '',
    cnpj: '', address: '', timezone: 'America/Sao_Paulo',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm((f) => ({
        ...f,
        site_name: settings.site_name || '',
        site_url: settings.site_url || '',
        support_email: settings.support_email || '',
        support_whatsapp: settings.support_whatsapp || '',
        cnpj: settings.cnpj || '',
        address: settings.address || '',
        timezone: settings.timezone || 'America/Sao_Paulo',
      }));
      setDirty(false);
    }
  }, [settings, loading]);

  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSave = async () => {
    if (form.site_url && !/^https?:\/\//.test(form.site_url)) {
      alert('Domínio deve começar com http:// ou https://');
      return;
    }
    const ok = await save(
      { ...form, site_url: form.site_url.replace(/\/$/, '') },
      { previous: settings, label: 'Dados gerais' },
    );
    if (ok) setDirty(false);
  };

  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> Geral
          {dirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">não salvo</span>}
        </CardTitle>
        <CardDescription>Identidade do site, contatos e domínio de instalação.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="site_name">Nome do site / razão social</Label>
            <Input id="site_name" value={form.site_name} onChange={(e) => update({ site_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site_url" className="flex items-center justify-between">
              Domínio de instalação
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full font-medium">
                <Info className="h-3 w-3" /> {window.location.origin}
              </span>
            </Label>
            <Input id="site_url" placeholder="https://seu-dominio.com.br" value={form.site_url}
              onChange={(e) => update({ site_url: e.target.value })} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_email">E-mail de suporte</Label>
            <Input id="support_email" type="email" value={form.support_email}
              onChange={(e) => update({ support_email: e.target.value })} placeholder="suporte@empresa.com" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support_whatsapp">WhatsApp de suporte</Label>
            <Input id="support_whatsapp" value={form.support_whatsapp}
              onChange={(e) => update({ support_whatsapp: e.target.value })} placeholder="5511999999999" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" value={form.cnpj} onChange={(e) => update({ cnpj: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" value={form.address} onChange={(e) => update({ address: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Fuso horário padrão</Label>
            <Select value={form.timezone} onValueChange={(v) => update({ timezone: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
              </SelectContent>
            </Select>
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
