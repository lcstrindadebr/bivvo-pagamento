import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Copy, Download, Image as ImageIcon, Video, FileText, X } from 'lucide-react';

type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone?: string;
}
interface Template {
  id: string;
  name: string;
  body_text: string;
  media_type: 'none' | 'image' | 'video' | 'document';
  media_url?: string;
  buttons: TemplateButton[];
  created_at: string;
}

const emptyForm = {
  name: '',
  body_text: '',
  media_type: 'none' as Template['media_type'],
  media_url: '',
  buttons: [] as TemplateButton[],
};

export function AdminOfficialTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('official_templates').select('*').order('created_at', { ascending: false });
    if (error) toast({ title: 'Erro ao carregar', description: error.message, variant: 'destructive' });
    else setTemplates((data || []) as any);
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `templates/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('marketing').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('marketing').getPublicUrl(path);
      setForm(f => ({ ...f, media_url: publicUrl }));
      toast({ title: 'Upload concluído' });
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.name || !form.body_text) {
      toast({ title: 'Preencha nome e corpo', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        body_text: form.body_text,
        media_type: form.media_type,
        media_url: form.media_type === 'none' ? null : form.media_url,
        buttons: form.buttons as any,
      };
      if (editing) {
        const { error } = await supabase.from('official_templates').update(payload).eq('id', editing.id);
        if (error) throw error;
        toast({ title: 'Template atualizado' });
      } else {
        const { error } = await supabase.from('official_templates').insert(payload);
        if (error) throw error;
        toast({ title: 'Template criado' });
      }
      setOpen(false); setEditing(null); setForm(emptyForm);
      load();
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' });
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Excluir este template?')) return;
    const { error } = await supabase.from('official_templates').delete().eq('id', id);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Excluído' }); load(); }
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      body_text: t.body_text,
      media_type: t.media_type || 'none',
      media_url: t.media_url || '',
      buttons: Array.isArray(t.buttons) ? t.buttons : [],
    });
    setOpen(true);
  }

  function copyText(t: string) {
    navigator.clipboard.writeText(t);
    toast({ title: 'Texto copiado' });
  }

  async function downloadMedia(url: string, name: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name + '-' + url.split('/').pop();
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, '_blank');
    }
  }

  function addButton() {
    setForm(f => ({ ...f, buttons: [...f.buttons, { type: 'QUICK_REPLY', text: '' }] }));
  }
  function updateButton(i: number, patch: Partial<TemplateButton>) {
    setForm(f => ({ ...f, buttons: f.buttons.map((b, idx) => idx === i ? { ...b, ...patch } : b) }));
  }
  function removeButton(i: number) {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, idx) => idx !== i) }));
  }

  const mediaIcon = (type: string) => type === 'image' ? <ImageIcon className="h-3.5 w-3.5" />
    : type === 'video' ? <Video className="h-3.5 w-3.5" />
    : type === 'document' ? <FileText className="h-3.5 w-3.5" /> : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Modelos de Template</h2>
          <p className="text-xs text-muted-foreground">Modelos para API Oficial — copie textos e baixe mídias</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Template' : 'Novo Template'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nome do template</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: boas_vindas_v1" />
              </div>
              <div className="space-y-2">
                <Label>Corpo (texto)</Label>
                <Textarea
                  value={form.body_text}
                  onChange={e => setForm(f => ({ ...f, body_text: e.target.value }))}
                  placeholder="Olá {{1}}, seu pedido foi confirmado!"
                  rows={5}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo de mídia</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={form.media_type}
                    onChange={e => setForm(f => ({ ...f, media_type: e.target.value as any }))}
                  >
                    <option value="none">Nenhuma</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                    <option value="document">Documento</option>
                  </select>
                </div>
                {form.media_type !== 'none' && (
                  <div className="space-y-2">
                    <Label>Upload</Label>
                    <Input type="file" disabled={uploading} onChange={handleUpload}
                      accept={form.media_type === 'image' ? 'image/*' : form.media_type === 'video' ? 'video/*' : '*'} />
                  </div>
                )}
              </div>
              {form.media_type !== 'none' && (
                <div className="space-y-2">
                  <Label>URL da mídia</Label>
                  <Input value={form.media_url} onChange={e => setForm(f => ({ ...f, media_url: e.target.value }))} placeholder="https://..." />
                  {form.media_url && form.media_type === 'image' && (
                    <img src={form.media_url} alt="preview" className="max-h-40 rounded-md border" />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Botões</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addButton}>
                    <Plus className="h-3 w-3 mr-1" /> Adicionar botão
                  </Button>
                </div>
                {form.buttons.map((b, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 border rounded-md">
                    <select
                      className="h-9 px-2 rounded-md border border-input bg-background text-xs"
                      value={b.type}
                      onChange={e => updateButton(i, { type: e.target.value as ButtonType })}
                    >
                      <option value="QUICK_REPLY">Resposta Rápida</option>
                      <option value="URL">URL</option>
                      <option value="PHONE_NUMBER">Telefone</option>
                    </select>
                    <Input className="flex-1" value={b.text} onChange={e => updateButton(i, { text: e.target.value })} placeholder="Texto do botão" />
                    {b.type === 'URL' && (
                      <Input className="flex-1" value={b.url || ''} onChange={e => updateButton(i, { url: e.target.value })} placeholder="https://..." />
                    )}
                    {b.type === 'PHONE_NUMBER' && (
                      <Input className="flex-1" value={b.phone || ''} onChange={e => updateButton(i, { phone: e.target.value })} placeholder="+5511..." />
                    )}
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeButton(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Corpo</TableHead>
              <TableHead>Mídia</TableHead>
              <TableHead>Botões</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
            ) : templates.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum template cadastrado.</TableCell></TableRow>
            ) : templates.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="max-w-[300px]">
                  <div className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{t.body_text}</div>
                </TableCell>
                <TableCell>
                  {t.media_type && t.media_type !== 'none' ? (
                    <Badge variant="outline" className="gap-1">{mediaIcon(t.media_type)} {t.media_type}</Badge>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  <span className="text-xs">{Array.isArray(t.buttons) ? t.buttons.length : 0}</span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" title="Copiar texto" onClick={() => copyText(t.body_text)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    {t.media_url && (
                      <Button variant="ghost" size="icon" title="Baixar mídia" onClick={() => downloadMedia(t.media_url!, t.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
