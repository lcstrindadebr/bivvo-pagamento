import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle2, Share2, Download, Image as ImageIcon, FileText, Video, Link as LinkIcon, Loader2, ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAppUrl } from '@/hooks/useSiteSettings';
import { Badge } from '@/components/ui/badge';

export function CardMarketingLink({ slug }: { slug: string }) {
  const { toast } = useToast();
  const baseUrl = useAppUrl();
  const [copied, setCopied] = useState(false);
  const affLink = `${baseUrl}?aff=${slug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(affLink);
    setCopied(true);
    toast({ title: "Link copiado!", description: "Link de afiliado pronto para uso." });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="card-glass border border-border/40 shadow-2xl shadow-accent/5 overflow-hidden rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <Share2 className="h-4 w-4" />
          </div>
          Seu Link Global
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-xl bg-accent/5 border border-accent/10 space-y-2">
          <p className="text-[10px] text-accent font-black uppercase tracking-widest">Acesso Direto</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Link principal para prospecção. Rastreia cookies por 30 dias automaticamente.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative flex-1 group">
            <Input 
              value={affLink} 
              readOnly 
              className="bg-background/50 border-border/40 h-12 pr-10 font-mono text-xs focus-visible:ring-accent/20 transition-all" 
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
               <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <Button 
            onClick={handleCopy} 
            variant={copied ? "outline" : "default"}
            className={`h-12 w-12 rounded-xl transition-all ${copied ? 'border-accent text-accent' : 'bg-accent hover:bg-accent/90'}`}
          >
            {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
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
      case 'image': return <ImageIcon className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <Card className="card-glass border border-border/40 shadow-2xl shadow-accent/5 overflow-hidden rounded-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center">
            <ImageIcon className="h-4 w-4" />
          </div>
          Materiais de Apoio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-accent/50" />
          </div>
        ) : materials.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground font-medium">Nenhum material disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {materials.map(m => (
              <div key={m.id} className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/30 hover:bg-background/50 hover:border-accent/30 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center text-muted-foreground group-hover:text-accent group-hover:border-accent/20 transition-colors">
                    {getIcon(m.type)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase tracking-wider">{m.title}</span>
                    {m.description && (
                      <span className="text-[10px] text-muted-foreground font-medium line-clamp-1 mt-0.5">
                        {m.description}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest hidden sm:flex">
                    {m.type}
                  </Badge>
                  <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-accent/10 hover:text-accent" asChild>
                    <a href={m.url} target="_blank" rel="noopener noreferrer">
                      {m.type === 'link' ? <ArrowUpRight className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}