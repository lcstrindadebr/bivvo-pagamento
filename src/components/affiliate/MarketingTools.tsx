import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle2, Share2, Download, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function CardMarketingLink({ slug }: { slug: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const affLink = `${window.location.origin}?aff=${slug}`;

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

export function CardMarketingTools() {
  return (
    <Card className="card-glass border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-accent" /> Material de Apoio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
          <div className="text-sm font-medium">Logotipos e Identidade</div>
          <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
          <div className="text-sm font-medium">Banners para Instagram (1080x1080)</div>
          <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
          <div className="text-sm font-medium">Vídeos de Demonstração</div>
          <Button size="sm" variant="ghost"><Download className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
