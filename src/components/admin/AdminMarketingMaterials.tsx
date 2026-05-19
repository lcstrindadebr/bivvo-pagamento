import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Pencil, Trash2, Link as LinkIcon, FileText, Image as ImageIcon, Video } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  preview_url?: string;
}

export function AdminMarketingMaterials() {
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'link' as Material['type'],
    url: '',
    preview_url: ''
  });

  useEffect(() => {
    loadMaterials();
  }, []);

  const loadMaterials = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketing_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao carregar materiais', description: error.message, variant: 'destructive' });
    } else {
      setMaterials(data as Material[]);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'url' | 'preview_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('marketing')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('marketing')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, [field]: publicUrl }));
      toast({ title: 'Upload concluído!' });
    } catch (err) {
      toast({ title: 'Erro no upload', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.url) {
      toast({ title: 'Campos obrigatórios', description: 'Título e URL são necessários', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMaterial) {
        const { error } = await supabase
          .from('marketing_materials')
          .update(form)
          .eq('id', editingMaterial.id);
        if (error) throw error;
        toast({ title: 'Material atualizado!' });
      } else {
        const { error } = await supabase
          .from('marketing_materials')
          .insert(form);
        if (error) throw error;
        toast({ title: 'Material criado!' });
      }
      setDialogOpen(false);
      setEditingMaterial(null);
      setForm({ title: '', description: '', type: 'link', url: '', preview_url: '' });
      loadMaterials();
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este material?')) return;

    try {
      const { error } = await supabase
        .from('marketing_materials')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Material excluído!' });
      loadMaterials();
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: err instanceof Error ? err.message : 'Erro desconhecido', variant: 'destructive' });
    }
  };

  const openEdit = (material: Material) => {
    setEditingMaterial(material);
    setForm({
      title: material.title,
      description: material.description || '',
      type: material.type,
      url: material.url,
      preview_url: material.preview_url || ''
    });
    setDialogOpen(true);
  };

  const getTypeIcon = (type: Material['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Materiais de Apoio</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => {
              setEditingMaterial(null);
              setForm({ title: '', description: '', type: 'link', url: '', preview_url: '' });
            }}>
              <Plus className="h-4 w-4 mr-2" /> Novo Material
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingMaterial ? 'Editar Material' : 'Novo Material'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Banner Stories v1" />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select 
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                    value={form.type}
                    onChange={e => setForm(f => ({ ...f, type: e.target.value as any }))}
                  >
                    <option value="link">Link Externo</option>
                    <option value="image">Imagem</option>
                    <option value="video">Vídeo</option>
                    <option value="document">Documento</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>URL do Material (ou upload)</Label>
                <div className="flex gap-2">
                  <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
                  <div className="relative">
                    <Button variant="outline" size="icon" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={e => handleFileUpload(e, 'url')}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Preview (Opcional)</Label>
                <div className="flex gap-2">
                  <Input value={form.preview_url} onChange={e => setForm(f => ({ ...f, preview_url: e.target.value }))} placeholder="https://..." />
                  <div className="relative">
                    <Button variant="outline" size="icon" disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                    </Button>
                    <input 
                      type="file" 
                      className="absolute inset-0 opacity-0 cursor-pointer" 
                      onChange={e => handleFileUpload(e, 'preview_url')}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="card-glass rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>URL</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum material cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              materials.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{m.title}</span>
                      <span className="text-xs text-muted-foreground">{m.description}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1">
                      {getTypeIcon(m.type)}
                      {m.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                    {m.url}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
