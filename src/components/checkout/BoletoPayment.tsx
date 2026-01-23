import { useState } from 'react';
import { Copy, CheckCircle2, ExternalLink, Barcode, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface BoletoPaymentProps {
  boletoUrl?: string;
  barCode?: string;
  dueDate?: string;
  loading?: boolean;
}

const BoletoPayment = ({ boletoUrl, barCode, dueDate, loading }: BoletoPaymentProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!barCode) return;
    
    try {
      await navigator.clipboard.writeText(barCode);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'Cole o código de barras no seu app de pagamentos',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Tente copiar manualmente',
        variant: 'destructive',
      });
    }
  };

  const handleOpenBoleto = () => {
    if (boletoUrl) {
      window.open(boletoUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
        <p className="text-muted-foreground">Gerando boleto...</p>
      </div>
    );
  }

  if (!boletoUrl && !barCode) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
          <Barcode className="h-8 w-8 text-accent" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Pagamento via Boleto</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar Boleto" para criar seu boleto de pagamento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Due date notice */}
      {dueDate && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <FileText className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-blue-600">
            Vencimento: {new Date(dueDate).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      <div className="card-glass rounded-2xl p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-success/10 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-success" />
        </div>

        <div className="space-y-2">
          <p className="font-semibold">Boleto gerado com sucesso!</p>
          <p className="text-sm text-muted-foreground">
            Efetue o pagamento em até 3 dias úteis
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleOpenBoleto}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-accent to-primary hover:opacity-90"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Visualizar Boleto
          </Button>

          {barCode && (
            <Button
              onClick={handleCopy}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 text-success" />
                  Código copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar código de barras
                </>
              )}
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          O boleto também foi enviado para seu email
        </p>
      </div>
    </div>
  );
};

export default BoletoPayment;
