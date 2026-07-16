import { Shield, Lock, RefreshCw } from 'lucide-react';

const TrustBadges = () => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex items-center gap-2.5 p-3 rounded-xl card-glass">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Shield className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <p className="text-xs font-medium">Pagamento Seguro</p>
          <p className="text-[10px] text-muted-foreground">SSL 256-bit</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-3 rounded-xl card-glass">
        <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
          <Lock className="h-4.5 w-4.5 text-accent" />
        </div>
        <div>
          <p className="text-xs font-medium">Dados Protegidos</p>
          <p className="text-[10px] text-muted-foreground">PCI-DSS</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-3 rounded-xl card-glass">
        <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
          <RefreshCw className="h-4.5 w-4.5 text-success" />
        </div>
        <div>
          <p className="text-xs font-medium">Garantia</p>
          <p className="text-[10px] text-muted-foreground">7 dias</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 p-3 rounded-xl card-glass">
        <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
          <img
            src="https://app.bivvo.com.br/bmpartner.png"
            alt="Meta Business Partner"
            className="w-7 h-7 object-contain"
          />
        </div>
        <div>
          <p className="text-xs font-medium">Parceiro Oficial</p>
          <p className="text-[10px] text-muted-foreground">Meta</p>
        </div>
      </div>
    </div>
  );
};

export default TrustBadges;
