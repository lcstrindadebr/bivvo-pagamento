import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Globe, Save, Info } from 'lucide-react';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export function AdminSettings() {
  const { toast } = useToast();
  const { data: settings, isLoading, refetch } = useSiteSettings();
  const [siteUrl, setSiteUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.site_url) {
      setSiteUrl(settings.site_url);
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate URL if not empty
      if (siteUrl && !siteUrl.startsWith('http')) {
        throw new Error('O domínio deve começar com http:// ou https://');
      }

      // Remove trailing slash
      const formattedUrl = siteUrl.replace(/\/$/, '');

      const { error } = await supabase
        .from('settings')
        .upsert({ key: 'site_url', value: formattedUrl, updated_at: new Date().toISOString() });

      if (error) throw error;

      toast({ title: "Configurações salvas!", description: "O domínio base foi atualizado com sucesso." });
      refetch();
    } catch (err) {
      toast({ 
        title: "Erro ao salvar", 
        description: err instanceof Error ? err.message : "Erro desconhecido", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="card-glass border-none shadow-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5 text-accent" /> Configurações do Site
          </CardTitle>
          <CardDescription>
            Defina o domínio principal do sistema para que os links gerados (afiliados, checkout, etc) apontem para o local correto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="site_url" className="text-sm font-bold">Domínio de Instalação</Label>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full font-medium">
                <Info className="h-3 w-3" /> Atual: {window.location.origin}
              </div>
            </div>
            <Input 
              id="site_url"
              placeholder="https://seu-dominio.com.br" 
              value={siteUrl} 
              onChange={e => setSiteUrl(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground leading-relaxed italic">
              Se deixado em branco, o sistema tentará identificar o domínio automaticamente no momento da geração do link (padrão). 
              Preencha para "forçar" um domínio específico (útil se o painel admin estiver em um subdomínio diferente do site principal).
            </p>
          </div>

          <div className="pt-4 border-t flex justify-end">
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
