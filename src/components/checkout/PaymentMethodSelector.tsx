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
    <div className="space-y-4">
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
              className={`relative flex flex-col items-center justify-center gap-3 p-[1.25rem] rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'border-primary bg-[hsl(var(--selected-bg))]'
                  : 'border-border/30 bg-white hover:border-primary/50'
              }`}
              style={{ borderWidth: isSelected ? '2px' : '0.5px' }}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                isSelected ? 'bg-[hsl(var(--selected-badge))] text-primary' : 'bg-muted/50 text-muted-foreground'
              }`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className={`text-[11px] font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                  {method.label}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1 font-normal uppercase tracking-wider">
                  {method.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PaymentMethodSelector;
