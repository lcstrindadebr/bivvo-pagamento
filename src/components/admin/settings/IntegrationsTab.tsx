import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plug, Save, Loader2, Copy, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useSaveSetting } from '@/hooks/useSaveSetting';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';

interface Props {
  settings: Record<string, string>;
  loading: boolean;
}

export function IntegrationsTab({ settings, loading }: Props) {
  const { save, saving } = useSaveSetting();
  const { adminFetch, adminPost } = useAdmin();
  const { toast } = useToast();
  const [form, setForm] = useState({ ga_id: '', meta_pixel_id: '' });
  const [dirty, setDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  // Bivvo token (guardado em admin_secrets, admin-only via RLS)
  const [bivvoToken, setBivvoToken] = useState('');
  const [bivvoDirty, setBivvoDirty] = useState(false);
  const [bivvoLoading, setBivvoLoading] = useState(true);
  const [bivvoSaving, setBivvoSaving] = useState(false);
  const [showBivvo, setShowBivvo] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        ga_id: settings.ga_id || '',
        meta_pixel_id: settings.meta_pixel_id || '',
      });
      setDirty(false);
    }
  }, [settings, loading]);

  useEffect(() => {
    (async () => {
      setBivvoLoading(true);
      try {
        const data = await adminFetch('get-bivvo-token');
        setBivvoToken((data as any)?.value || '');
      } catch (err) {
        console.error('load bivvo token', err);
      } finally {
        setBivvoDirty(false);
        setBivvoLoading(false);
      }
    })();
  }, []);

  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSave = async () => {
    const ok = await save(form, { previous: settings, label: 'Integrações' });
    if (ok) setDirty(false);
  };

  const saveBivvo = async () => {
    setBivvoSaving(true);
    try {
      await adminPost('save-bivvo-token', { value: bivvoToken.trim() });
      toast({ title: 'Salvo', description: 'Token da API Bivvo atualizado.' });
      setBivvoDirty(false);
    } catch (err) {
      toast({ title: 'Erro', description: err instanceof Error ? err.message : 'Falha ao salvar', variant: 'destructive' });
    } finally {
      setBivvoSaving(false);
    }
  };


  const webhookUrl = `${(settings.site_url || window.location.origin).replace(/\/$/, '')}/functions/v1/asaas-webhook`;
  const copy = async () => {
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copiado', description: 'URL do webhook copiada.' });
  };

  return (
    <div className="space-y-6">
      <Card className="card-glass border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> Asaas
          </CardTitle>
          <CardDescription>
            A chave do Asaas é um segredo e é gerenciada pelo Lovable Cloud — não pode ser editada aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Check className="h-3 w-3 mr-1" /> Chave configurada
            </Badge>
          </div>
          <div className="space-y-1.5">
            <Label>URL do webhook (configure no painel Asaas)</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copy}>
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-glass border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" /> Integração Bivvo
            {bivvoDirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">não salvo</span>}
          </CardTitle>
          <CardDescription>
            Token da API Bivvo usado para provisionar contas e sincronizar tenants. Armazenado com acesso restrito a administradores.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            {bivvoLoading ? (
              <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Carregando</Badge>
            ) : bivvoToken ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                <Check className="h-3 w-3 mr-1" /> Token configurado
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Nenhum token cadastrado
              </Badge>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bivvo_token">Token da API Bivvo</Label>
            <div className="flex gap-2">
              <Input
                id="bivvo_token"
                type={showBivvo ? 'text' : 'password'}
                value={bivvoToken}
                onChange={(e) => { setBivvoToken(e.target.value); setBivvoDirty(true); }}
                placeholder="Cole aqui o token da API Bivvo"
                className="font-mono text-xs"
                disabled={bivvoLoading}
              />
              <Button variant="outline" size="icon" onClick={() => setShowBivvo(v => !v)} title={showBivvo ? 'Ocultar' : 'Mostrar'}>
                {showBivvo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <Button onClick={saveBivvo} disabled={bivvoSaving || !bivvoDirty} className="gap-2">
              {bivvoSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar token
            </Button>
          </div>
        </CardContent>
      </Card>




      <Card className="card-glass border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plug className="h-5 w-5 text-accent" /> Analytics
            {dirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">não salvo</span>}
          </CardTitle>
          <CardDescription>IDs públicos injetados no site.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ga_id">Google Analytics (GA4)</Label>
              <Input id="ga_id" value={form.ga_id} onChange={(e) => update({ ga_id: e.target.value })}
                placeholder="G-XXXXXXXXXX" className="font-mono text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meta_pixel_id">Meta Pixel</Label>
              <Input id="meta_pixel_id" value={form.meta_pixel_id}
                onChange={(e) => update({ meta_pixel_id: e.target.value })} placeholder="1234567890" className="font-mono text-sm" />
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
    </div>
  );
}
