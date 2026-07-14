import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Save, Loader2, Upload, Trash2 } from 'lucide-react';
import { useSaveSetting } from '@/hooks/useSaveSetting';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  settings: Record<string, string>;
  loading: boolean;
}

function AssetUpload({
  label, value, onChange, folder, accept = 'image/*',
}: { label: string; value: string; onChange: (url: string) => void; folder: string; accept?: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${folder}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('marketing').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from('marketing').getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err) {
      toast({ title: 'Erro no upload', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        {value && (
          <div className="h-12 w-12 rounded border bg-muted/30 flex items-center justify-center overflow-hidden">
            <img src={value} alt={label} className="max-h-12 max-w-12 object-contain" />
          </div>
        )}
        <div className="flex-1">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL da imagem" className="text-xs" />
        </div>
        <label>
          <input type="file" accept={accept} className="hidden"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <Button asChild variant="outline" size="sm" disabled={busy}>
            <span className="cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            </span>
          </Button>
        </label>
        {value && (
          <Button variant="ghost" size="icon" onClick={() => onChange('')}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function BrandingTab({ settings, loading }: Props) {
  const { save, saving } = useSaveSetting();
  const [form, setForm] = useState({
    brand_logo_url: '', brand_logo_dark_url: '', favicon_url: '',
    brand_color_primary: '#3B82F6', brand_color_accent: '#0F172A',
    brand_theme_default: 'system',
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!loading) {
      setForm({
        brand_logo_url: settings.brand_logo_url || '',
        brand_logo_dark_url: settings.brand_logo_dark_url || '',
        favicon_url: settings.favicon_url || '',
        brand_color_primary: settings.brand_color_primary || '#3B82F6',
        brand_color_accent: settings.brand_color_accent || '#0F172A',
        brand_theme_default: settings.brand_theme_default || 'system',
      });
      setDirty(false);
    }
  }, [settings, loading]);

  const update = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };

  const onSave = async () => {
    const ok = await save(form, { previous: settings, label: 'Marca' });
    if (ok) setDirty(false);
  };

  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Palette className="h-5 w-5 text-accent" /> Marca / Aparência
          {dirty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600">não salvo</span>}
        </CardTitle>
        <CardDescription>Logos, favicon e cores da marca.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AssetUpload label="Logo (tema claro)" value={form.brand_logo_url}
            onChange={(v) => update({ brand_logo_url: v })} folder="brand" />
          <AssetUpload label="Logo (tema escuro)" value={form.brand_logo_dark_url}
            onChange={(v) => update({ brand_logo_dark_url: v })} folder="brand" />
          <AssetUpload label="Favicon" value={form.favicon_url}
            onChange={(v) => update({ favicon_url: v })} folder="brand" accept="image/x-icon,image/png,image/svg+xml" />
          <div className="space-y-1.5">
            <Label>Tema padrão</Label>
            <Select value={form.brand_theme_default} onValueChange={(v) => update({ brand_theme_default: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">Sistema</SelectItem>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Cor primária</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.brand_color_primary}
                onChange={(e) => update({ brand_color_primary: e.target.value })} className="w-14 h-10 p-1" />
              <Input value={form.brand_color_primary}
                onChange={(e) => update({ brand_color_primary: e.target.value })} className="font-mono text-sm" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2">
              <Input type="color" value={form.brand_color_accent}
                onChange={(e) => update({ brand_color_accent: e.target.value })} className="w-14 h-10 p-1" />
              <Input value={form.brand_color_accent}
                onChange={(e) => update({ brand_color_accent: e.target.value })} className="font-mono text-sm" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-muted/20">
          <p className="text-xs font-semibold mb-2 text-muted-foreground">Prévia</p>
          <div className="flex items-center gap-3">
            {form.brand_logo_url && <img src={form.brand_logo_url} alt="logo" className="h-8" />}
            <div className="h-8 w-8 rounded-full" style={{ background: form.brand_color_primary }} />
            <div className="h-8 w-8 rounded-full" style={{ background: form.brand_color_accent }} />
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
