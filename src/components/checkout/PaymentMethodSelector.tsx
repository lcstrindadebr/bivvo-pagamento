import { CreditCard, QrCode, Barcode } from 'lucide-react';

export type PaymentMethod = 'CREDIT_CARD' | 'PIX' | 'BOLETO';

interface PaymentMethodSelectorProps {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const methods = [
  {
    id: 'CREDIT_CARD' as PaymentMethod,
    label: 'Cartão de Crédito',
    icon: CreditCard,
    description: 'Aprovação imediata',
  },
  {
    id: 'PIX' as PaymentMethod,
    label: 'PIX',
    icon: QrCode,
    description: 'Aprovação em segundos',
  },
  {
    id: 'BOLETO' as PaymentMethod,
    label: 'Boleto',
    icon: Barcode,
    description: 'Até 3 dias úteis',
  },
];

const PaymentMethodSelector = ({ selected, onChange }: PaymentMethodSelectorProps) => {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Forma de pagamento</p>
      <div className="grid grid-cols-3 gap-3">
        {methods.map((method) => {
          const IconComponent = method.icon;
          const isSelected = selected === method.id;
          
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onChange(method.id)}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-accent bg-accent/10 shadow-lg shadow-accent/10'
                  : 'border-border/50 bg-background/50 hover:border-accent/50 hover:bg-accent/5'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                isSelected ? 'bg-accent/20 text-accent' : 'bg-muted/50 text-muted-foreground'
              }`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${isSelected ? 'text-accent' : 'text-foreground'}`}>
                  {method.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {method.description}
                </p>
              </div>
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
