import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Copy, Download, Image as ImageIcon, Video, FileText, Loader2, ExternalLink } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  media_type: 'image' | 'video' | 'none';
  media_url: string;
  body_text: string;
  buttons: any[];
  created_at: string;
}

export function AdminOfficialTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    media_type: 'none' as 'image' | 'video' | 'none',
    media_url: '',
    body_text: '',
    buttons: [] as any[]
  });

  const fetchTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('official_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Erro ao carregar templates', description: error.message, variant: 'destructive' });
    } else {
      setTemplates((data || []) as any[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async () => {
    const { error } = await supabase
      .from('official_templates')
      .insert([form]);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Template criado com sucesso!' });
      setDialogOpen(false);
      setForm({ name: '', media_type: 'none', media_url: '', body_text: '', buttons: [] });
      fetchTemplates();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('official_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      fetchTemplates();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  };

  const downloadMedia = (url: string, name: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileText className="h-5 w-5 text-accent" /> Modelos de Templates API Oficial
        </h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo Modelo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Modelo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome do Template</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Boas vindas - Imagem" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Mídia</Label>
                  <select 
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.media_type}
                    onChange={e => setForm({ ...form, media_type: e.target.value as any })}
                  >
                    <option value="none">Nenhum</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>URL da Mídia</Label>
                  <Input value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Corpo (Texto)</Label>
                <Textarea 
                  value={form.body_text} 
                  onChange={e => setForm({ ...form, body_text: e.target.value })} 
                  placeholder="Olá {{1}}, bem-vindo à nossa plataforma!"
                  rows={5}
                />
              </div>
              <div className="space-y-2">
                <Label>Botões (JSON opcional)</Label>
                <Textarea 
                  value={JSON.stringify(form.buttons)} 
                  onChange={e => {
                    try { setForm({ ...form, buttons: JSON.parse(e.target.value) }); } catch(e) {}
                  }} 
                  placeholder='[{"type": "URL", "text": "Visitar Site", "url": "..."}]'
                />
              </div>
              <Button onClick={handleSave} className="w-full">Salvar Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>
        ) : (
          templates.map(t => (
            <Card key={t.id} className="overflow-hidden border-border/50 hover:border-accent/30 transition-all">
              <CardHeader className="p-4 bg-muted/50 border-b">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-bold truncate pr-4">{t.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {t.media_type !== 'none' && t.media_url && (
                  <div className="relative group rounded-lg overflow-hidden border aspect-video bg-black/5 flex items-center justify-center">
                    {t.media_type === 'image' ? (
                      <img src={t.media_url} alt={t.name} className="object-contain max-h-full" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Video className="h-8 w-8" />
                        <span className="text-[10px] uppercase font-bold">Vídeo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => downloadMedia(t.media_url, t.name)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-8 w-8" asChild>
                        <a href={t.media_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="relative">
                  <div className="bg-background border rounded-lg p-3 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {t.body_text}
                  </div>
                  <Button 
                    size="icon" variant="ghost" 
                    className="absolute top-2 right-2 h-6 w-6 bg-background/80"
                    onClick={() => copyToClipboard(t.body_text)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                {t.buttons && t.buttons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Botões</p>
                    <div className="flex flex-wrap gap-1">
                      {t.buttons.map((btn: any, i: number) => (
                        <div key={i} className="px-2 py-1 rounded border bg-muted/30 text-[10px] font-medium">
                          {btn.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
