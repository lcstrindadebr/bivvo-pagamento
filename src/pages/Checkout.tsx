import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Shield, Lock, CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useViaCep } from '@/hooks/useViaCep';
import { usePayment } from '@/hooks/usePayment';
import {
  validateCPF,
  validateCardNumber,
  maskCPF,
  maskCardNumber,
  maskCEP,
  maskExpiry,
  maskPhone,
  formatCurrency,
} from '@/lib/validators';

type Step = 'personal' | 'address' | 'payment' | 'processing' | 'success' | 'error';

interface Plan {
  id: string;
  name: string;
  price: number;
  description: string;
}

const PLANS: Record<string, Plan> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    price: 147.90,
    description: 'Plano Standard',
  },
  silver: {
    id: 'silver',
    name: 'Silver',
    price: 287.90,
    description: 'Plano Silver',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 429.90,
    description: 'Plano Pro',
  },
};

const STEPS: { id: Step; label: string }[] = [
  { id: 'personal', label: 'Dados' },
  { id: 'address', label: 'Endereço' },
  { id: 'payment', label: 'Pagamento' },
];

const Checkout = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchAddress, loading: cepLoading } = useViaCep();
  const { processPayment, loading: paymentLoading, error: paymentError, status: paymentStatus, reset } = usePayment();

  const plan = planId ? PLANS[planId] : null;

  const [currentStep, setCurrentStep] = useState<Step>('personal');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    cpf: '',
    billingName: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (paymentStatus === 'approved') {
      setCurrentStep('success');
    } else if (paymentStatus === 'rejected' && paymentError) {
      setCurrentStep('error');
    }
  }, [paymentStatus, paymentError]);

  // Redirect if invalid plan
  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Plano não encontrado</h2>
            <p className="text-muted-foreground text-sm">
              O plano selecionado não existe
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full">
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    let maskedValue = value;

    switch (field) {
      case 'cpf':
        maskedValue = maskCPF(value);
        break;
      case 'whatsapp':
        maskedValue = maskPhone(value);
        break;
      case 'cep':
        maskedValue = maskCEP(value);
        if (maskedValue.replace(/\D/g, '').length === 8) {
          handleCepSearch(maskedValue);
        }
        break;
      case 'cardNumber':
        maskedValue = maskCardNumber(value);
        break;
      case 'cardExpiry':
        maskedValue = maskExpiry(value);
        break;
      case 'cardCvv':
        maskedValue = value.replace(/\D/g, '').slice(0, 4);
        break;
    }

    setFormData((prev) => ({ ...prev, [field]: maskedValue }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCepSearch = async (cep: string) => {
    const address = await fetchAddress(cep);
    if (address) {
      setFormData((prev) => ({
        ...prev,
        endereco: address.logradouro,
        bairro: address.bairro,
        cidade: address.localidade,
        estado: address.uf,
      }));
    }
  };

  const validateStep = (step: Step): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'personal') {
      if (!formData.name.trim()) newErrors.name = 'Nome obrigatório';
      if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
      if (!formData.whatsapp.trim() || formData.whatsapp.replace(/\D/g, '').length < 10) {
        newErrors.whatsapp = 'WhatsApp inválido';
      }
      if (!validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
    }

    if (step === 'address') {
      if (!formData.billingName.trim()) newErrors.billingName = 'Nome obrigatório';
      if (!formData.cep.trim() || formData.cep.replace(/\D/g, '').length !== 8) {
        newErrors.cep = 'CEP inválido';
      }
      if (!formData.endereco.trim()) newErrors.endereco = 'Endereço obrigatório';
      if (!formData.numero.trim()) newErrors.numero = 'Número obrigatório';
      if (!formData.bairro.trim()) newErrors.bairro = 'Bairro obrigatório';
      if (!formData.cidade.trim()) newErrors.cidade = 'Cidade obrigatória';
      if (!formData.estado.trim()) newErrors.estado = 'Estado obrigatório';
    }

    if (step === 'payment') {
      if (!formData.cardName.trim()) newErrors.cardName = 'Nome obrigatório';
      if (!validateCardNumber(formData.cardNumber)) newErrors.cardNumber = 'Cartão inválido';
      if (!formData.cardExpiry.trim() || formData.cardExpiry.length !== 5) {
        newErrors.cardExpiry = 'Data inválida';
      }
      if (!formData.cardCvv.trim() || formData.cardCvv.length < 3) {
        newErrors.cardCvv = 'CVV inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToNextStep = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: 'Campos inválidos',
        description: 'Verifique os campos destacados',
        variant: 'destructive',
      });
      return;
    }

    const stepOrder: Step[] = ['personal', 'address', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const goToPreviousStep = () => {
    const stepOrder: Step[] = ['personal', 'address', 'payment'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep('payment')) {
      return;
    }

    setCurrentStep('processing');

    const [expiryMonth, expiryYear] = formData.cardExpiry.split('/');

    const result = await processPayment({
      plan: plan.id,
      amount: plan.price,
      customerData: {
        name: formData.name,
        email: formData.email,
        cpf: formData.cpf,
        whatsapp: formData.whatsapp,
        billingName: formData.billingName,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
      },
      cardData: {
        holderName: formData.cardName,
        number: formData.cardNumber,
        expiryMonth,
        expiryYear,
        ccv: formData.cardCvv,
      },
    });

    if (!result.success && result.error) {
      toast({
        title: 'Erro no pagamento',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRetry = () => {
    reset();
    setCurrentStep('payment');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Processing Step
  if (currentStep === 'processing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Processando pagamento</h2>
            <p className="text-muted-foreground text-sm">
              {paymentStatus === 'polling'
                ? 'Verificando status...'
                : 'Aguarde um momento...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Success Step
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Pagamento aprovado!</h2>
            <p className="text-muted-foreground text-sm">
              Sua assinatura do plano {plan.name} foi ativada
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full">
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  // Error Step
  if (currentStep === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Pagamento não aprovado</h2>
            <p className="text-muted-foreground text-sm">
              {paymentError || 'Tente novamente com outro cartão'}
            </p>
          </div>
          <Button onClick={handleRetry} className="w-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {currentStepIndex > 0 ? (
            <button 
              onClick={goToPreviousStep} 
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            <span className="text-xs">Pagamento seguro</span>
          </div>
        </div>
      </header>

      {/* Plan Info Bar */}
      <div className="bg-primary text-primary-foreground py-3">
        <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
          <div>
            <p className="text-sm opacity-80">Plano {plan.name}</p>
          </div>
          <p className="text-lg font-bold">{formatCurrency(plan.price)}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  index < currentStepIndex
                    ? 'bg-accent text-accent-foreground'
                    : index === currentStepIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 sm:w-24 h-0.5 mx-1 transition-colors ${
                    index < currentStepIndex ? 'bg-accent' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`text-xs ${
                index === currentStepIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 pb-32">
        {/* Step 1: Personal Data */}
        {currentStep === 'personal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Seus dados</h1>
              <p className="text-muted-foreground text-sm">
                Informe seus dados pessoais
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={errors.name ? 'border-destructive' : ''}
                  placeholder="João da Silva"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-destructive' : ''}
                  placeholder="joao@email.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={errors.whatsapp ? 'border-destructive' : ''}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  className={errors.cpf ? 'border-destructive' : ''}
                />
                {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Address */}
        {currentStep === 'address' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Endereço de cobrança</h1>
              <p className="text-muted-foreground text-sm">
                Informe o endereço para faturamento
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billingName">Nome para faturamento</Label>
                <Input
                  id="billingName"
                  value={formData.billingName}
                  onChange={(e) => handleInputChange('billingName', e.target.value)}
                  className={errors.billingName ? 'border-destructive' : ''}
                  placeholder="Nome na fatura"
                />
                {errors.billingName && <p className="text-xs text-destructive">{errors.billingName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    placeholder="00000-000"
                    className={errors.cep ? 'border-destructive' : ''}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {errors.cep && <p className="text-xs text-destructive">{errors.cep}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  className={errors.endereco ? 'border-destructive' : ''}
                  placeholder="Rua, Avenida..."
                />
                {errors.endereco && <p className="text-xs text-destructive">{errors.endereco}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => handleInputChange('numero', e.target.value)}
                    className={errors.numero ? 'border-destructive' : ''}
                    placeholder="123"
                  />
                  {errors.numero && <p className="text-xs text-destructive">{errors.numero}</p>}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => handleInputChange('complemento', e.target.value)}
                    placeholder="Apto, Sala..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  className={errors.bairro ? 'border-destructive' : ''}
                  placeholder="Bairro"
                />
                {errors.bairro && <p className="text-xs text-destructive">{errors.bairro}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    className={errors.cidade ? 'border-destructive' : ''}
                    placeholder="Cidade"
                  />
                  {errors.cidade && <p className="text-xs text-destructive">{errors.cidade}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado">UF</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    maxLength={2}
                    className={errors.estado ? 'border-destructive' : ''}
                    placeholder="SP"
                  />
                  {errors.estado && <p className="text-xs text-destructive">{errors.estado}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === 'payment' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold">Dados do cartão</h1>
              <p className="text-muted-foreground text-sm">
                Informe os dados do seu cartão de crédito
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-muted-foreground text-sm">Plano {plan.name}</span>
                </div>
                <span className="text-2xl font-bold text-accent">{formatCurrency(plan.price)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cardName">Nome no cartão</Label>
                <Input
                  id="cardName"
                  value={formData.cardName}
                  onChange={(e) => handleInputChange('cardName', e.target.value.toUpperCase())}
                  className={errors.cardName ? 'border-destructive' : ''}
                  placeholder="NOME COMO NO CARTÃO"
                />
                {errors.cardName && <p className="text-xs text-destructive">{errors.cardName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardNumber">Número do cartão</Label>
                <div className="relative">
                  <Input
                    id="cardNumber"
                    value={formData.cardNumber}
                    onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    className={`pr-10 ${errors.cardNumber ? 'border-destructive' : ''}`}
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                </div>
                {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cardExpiry">Validade</Label>
                  <Input
                    id="cardExpiry"
                    value={formData.cardExpiry}
                    onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                    placeholder="MM/AA"
                    className={errors.cardExpiry ? 'border-destructive' : ''}
                  />
                  {errors.cardExpiry && <p className="text-xs text-destructive">{errors.cardExpiry}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    value={formData.cardCvv}
                    onChange={(e) => handleInputChange('cardCvv', e.target.value)}
                    placeholder="000"
                    className={errors.cardCvv ? 'border-destructive' : ''}
                  />
                  {errors.cardCvv && <p className="text-xs text-destructive">{errors.cardCvv}</p>}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-muted-foreground pt-2">
              <Shield className="h-4 w-4" />
              <span className="text-xs">Seus dados estão protegidos</span>
            </div>
          </div>
        )}
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {currentStep === 'payment' ? (
            <Button
              onClick={handleSubmit}
              disabled={paymentLoading}
              className="w-full h-14 text-base font-semibold"
            >
              {paymentLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Pagar {formatCurrency(plan.price)}
                  <Lock className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goToNextStep} className="w-full h-14 text-base font-semibold">
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Checkout;
