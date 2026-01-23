import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, Loader2, QrCode, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PixPaymentProps {
  qrCodeImage?: string;
  qrCodeText?: string;
  expiresAt?: string;
  loading?: boolean;
}

const PixPayment = ({ qrCodeImage, qrCodeText, expiresAt, loading }: PixPaymentProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }

      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleCopy = async () => {
    if (!qrCodeText) return;
    
    try {
      await navigator.clipboard.writeText(qrCodeText);
      setCopied(true);
      toast({
        title: 'Código copiado!',
        description: 'Cole o código PIX no seu app de pagamentos',
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

  if (loading) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
        <p className="text-muted-foreground">Gerando QR Code PIX...</p>
      </div>
    );
  }

  if (!qrCodeImage && !qrCodeText) {
    return (
      <div className="card-glass rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
          <QrCode className="h-8 w-8 text-accent" />
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Pagamento via PIX</p>
          <p className="text-sm text-muted-foreground">
            Clique em "Gerar PIX" para criar o QR Code de pagamento
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timer */}
      {timeLeft && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600">
            Expira em: {timeLeft}
          </span>
        </div>
      )}

      {/* QR Code */}
      <div className="card-glass rounded-2xl p-6 text-center space-y-4">
        <p className="font-semibold">Escaneie o QR Code</p>
        
        {qrCodeImage && (
          <div className="w-48 h-48 mx-auto bg-white rounded-xl p-3 shadow-inner">
            <img 
              src={`data:image/png;base64,${qrCodeImage}`} 
              alt="QR Code PIX" 
              className="w-full h-full"
            />
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ou copie o código PIX</p>
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
                Copiar código PIX
              </>
            )}
          </Button>
        </div>

        <div className="pt-2 space-y-1">
          <p className="text-xs text-muted-foreground">
            Abra o app do seu banco e escaneie o QR Code ou cole o código copiado
          </p>
        </div>
      </div>
    </div>
  );
};

export default PixPayment;
