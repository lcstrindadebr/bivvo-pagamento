import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle2, Share2, Download, Image as ImageIcon, FileText, Video, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppUrl } from '@/hooks/useSiteSettings';

export function CardMarketingLink({ slug }: { slug: string }) {
  const { toast } = useToast();
  const baseUrl = useAppUrl();
  const [copied, setCopied] = useState(false);
  const affLink = `${baseUrl}?aff=${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(affLink);
    setCopied(true);
    toast({ title: "Link copiado!", description: "Agora é só compartilhar." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Share2 className="h-5 w-5 text-accent" /> Seu Link de Afiliado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use este link para rastrear suas vendas e cliques.
        </p>
        <div className="flex gap-2">
          <Input value={affLink} readOnly className="bg-muted/50" />
          <Button onClick={handleCopy} variant={copied ? "outline" : "default"}>
            {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface Material {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video' | 'document' | 'link';
  url: string;
  preview_url?: string;
}

export function CardMarketingTools() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMaterials = async () => {
      const { data } = await supabase
        .from('marketing_materials')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setMaterials(data as Material[]);
      setLoading(false);
    };
    loadMaterials();
  }, []);

  const getIcon = (type: Material['type']) => {
    switch (type) {
      case 'image': return <ImageIcon className="h-4 w-4 text-accent" />;
      case 'video': return <Video className="h-4 w-4 text-accent" />;
      case 'document': return <FileText className="h-4 w-4 text-accent" />;
      default: return <LinkIcon className="h-4 w-4 text-accent" />;
    }
  };

  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-accent" /> Material de Apoio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Nenhum material disponível no momento.
          </div>
        ) : (
          materials.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-3">
                {getIcon(m.type)}
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{m.title}</span>
                  {m.description && <span className="text-[10px] text-muted-foreground line-clamp-1">{m.description}</span>}
                </div>
              </div>
              <Button size="sm" variant="ghost" asChild>
                <a href={m.url} target="_blank" rel="noopener noreferrer">
                  {m.type === 'link' ? <LinkIcon className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                </a>
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
