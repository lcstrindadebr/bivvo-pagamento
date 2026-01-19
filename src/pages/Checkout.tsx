import { useState, useEffect } from 'react';
import { Check, Shield, Zap, CreditCard, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface Plan {
  id: string;
  name: string;
  price: number;
  installments?: number;
  pricePerMonth: number;
  description: string;
  badge?: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'mensal',
    name: 'Mensal',
    price: 39.90,
    pricePerMonth: 39.90,
    description: 'Cobrança mensal recorrente',
    features: ['Acesso completo', 'Suporte prioritário', 'Atualizações mensais'],
  },
  {
    id: 'semestral',
    name: 'Semestral',
    price: 179.40,
    installments: 6,
    pricePerMonth: 29.90,
    description: '6x de R$ 29,90',
    badge: 'Economia de 25%',
    features: ['Acesso completo', 'Suporte prioritário', 'Atualizações mensais', '2 meses grátis'],
  },
  {
    id: 'anual',
    name: 'Anual',
    price: 287.40,
    installments: 12,
    pricePerMonth: 23.95,
    description: '12x de R$ 23,95',
    badge: 'Melhor oferta',
    features: ['Acesso completo', 'Suporte prioritário', 'Atualizações mensais', '4 meses grátis', 'Bônus exclusivo'],
  },
];

const Checkout = () => {
  const { toast } = useToast();
  const { fetchAddress, loading: cepLoading } = useViaCep();
  const { processPayment, loading: paymentLoading, error: paymentError, status: paymentStatus, reset } = usePayment();

  const [selectedPlan, setSelectedPlan] = useState<Plan>(plans[1]);
  const [step, setStep] = useState<'plan' | 'form' | 'processing' | 'success' | 'error'>('plan');

  // Form state
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
      setStep('success');
    } else if (paymentStatus === 'rejected' && paymentError) {
      setStep('error');
    }
  }, [paymentStatus, paymentError]);

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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nome obrigatório';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.whatsapp.trim() || formData.whatsapp.replace(/\D/g, '').length < 10) {
      newErrors.whatsapp = 'WhatsApp inválido';
    }
    if (!validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
    if (!formData.billingName.trim()) newErrors.billingName = 'Nome para faturamento obrigatório';
    if (!formData.cep.trim() || formData.cep.replace(/\D/g, '').length !== 8) {
      newErrors.cep = 'CEP inválido';
    }
    if (!formData.endereco.trim()) newErrors.endereco = 'Endereço obrigatório';
    if (!formData.numero.trim()) newErrors.numero = 'Número obrigatório';
    if (!formData.bairro.trim()) newErrors.bairro = 'Bairro obrigatório';
    if (!formData.cidade.trim()) newErrors.cidade = 'Cidade obrigatória';
    if (!formData.estado.trim()) newErrors.estado = 'Estado obrigatório';
    if (!formData.cardName.trim()) newErrors.cardName = 'Nome no cartão obrigatório';
    if (!validateCardNumber(formData.cardNumber)) newErrors.cardNumber = 'Número do cartão inválido';
    if (!formData.cardExpiry.trim() || formData.cardExpiry.length !== 5) {
      newErrors.cardExpiry = 'Validade inválida';
    }
    if (!formData.cardCvv.trim() || formData.cardCvv.length < 3) {
      newErrors.cardCvv = 'CVV inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os campos destacados.',
        variant: 'destructive',
      });
      return;
    }

    setStep('processing');

    const [expiryMonth, expiryYear] = formData.cardExpiry.split('/');

    const result = await processPayment({
      plan: selectedPlan.id,
      amount: selectedPlan.price,
      installments: selectedPlan.installments,
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
    setStep('form');
  };

  // Plan Selection Step
  if (step === 'plan') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent/20 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Escolha seu plano
            </h1>
            <p className="text-lg text-white/80">
              Selecione a opção ideal para você
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`relative cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedPlan.id === plan.id
                    ? 'ring-2 ring-accent shadow-xl shadow-accent/20'
                    : 'hover:shadow-lg'
                }`}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                      {plan.badge}
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-primary">
                      {formatCurrency(plan.pricePerMonth)}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-accent flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button
              size="lg"
              className="bg-accent hover:bg-accent/90 text-white px-12 py-6 text-lg"
              onClick={() => setStep('form')}
            >
              Continuar com {selectedPlan.name}
            </Button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-white/70">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Pagamento seguro</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-sm">Ativação imediata</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Processing Step
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-8">
          <Loader2 className="h-16 w-16 animate-spin text-accent mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Processando pagamento</h2>
          <p className="text-muted-foreground">
            {paymentStatus === 'polling'
              ? 'Verificando status do pagamento...'
              : 'Aguarde enquanto processamos sua transação...'}
          </p>
        </Card>
      </div>
    );
  }

  // Success Step
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-8">
          <CheckCircle2 className="h-20 w-20 text-accent mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Pagamento aprovado!</h2>
          <p className="text-muted-foreground mb-6">
            Sua assinatura foi ativada com sucesso. Você receberá um email de confirmação.
          </p>
          <Button className="bg-accent hover:bg-accent/90" onClick={() => window.location.href = '/'}>
            Acessar plataforma
          </Button>
        </Card>
      </div>
    );
  }

  // Error Step
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent/20 flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center p-8">
          <XCircle className="h-20 w-20 text-destructive mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Pagamento não aprovado</h2>
          <p className="text-muted-foreground mb-6">
            {paymentError || 'Ocorreu um erro ao processar seu pagamento. Por favor, tente novamente.'}
          </p>
          <Button className="bg-accent hover:bg-accent/90" onClick={handleRetry}>
            Tentar novamente
          </Button>
        </Card>
      </div>
    );
  }

  // Form Step
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary to-accent/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => setStep('plan')}
          className="text-white/80 hover:text-white mb-6 flex items-center gap-2"
        >
          ← Voltar aos planos
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg">Resumo do pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Plano {selectedPlan.name}</span>
                  <span className="font-semibold">{formatCurrency(selectedPlan.price)}</span>
                </div>
                {selectedPlan.installments && (
                  <p className="text-sm text-muted-foreground">
                    {selectedPlan.installments}x de {formatCurrency(selectedPlan.price / selectedPlan.installments)}
                  </p>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-accent">{formatCurrency(selectedPlan.price)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2">
                  <Shield className="h-4 w-4" />
                  <span>Pagamento 100% seguro</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Dados de pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Dados pessoais */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Dados pessoais
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        className={errors.name ? 'border-destructive' : ''}
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
                      />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="whatsapp">WhatsApp</Label>
                      <Input
                        id="whatsapp"
                        value={formData.whatsapp}
                        onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                        placeholder="(00) 00000-0000"
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

                {/* Endereço de cobrança */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Endereço de cobrança
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="billingName">Nome para faturamento</Label>
                    <Input
                      id="billingName"
                      value={formData.billingName}
                      onChange={(e) => handleInputChange('billingName', e.target.value)}
                      className={errors.billingName ? 'border-destructive' : ''}
                    />
                    {errors.billingName && <p className="text-xs text-destructive">{errors.billingName}</p>}
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
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
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input
                        id="endereco"
                        value={formData.endereco}
                        onChange={(e) => handleInputChange('endereco', e.target.value)}
                        className={errors.endereco ? 'border-destructive' : ''}
                      />
                      {errors.endereco && <p className="text-xs text-destructive">{errors.endereco}</p>}
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input
                        id="numero"
                        value={formData.numero}
                        onChange={(e) => handleInputChange('numero', e.target.value)}
                        className={errors.numero ? 'border-destructive' : ''}
                      />
                      {errors.numero && <p className="text-xs text-destructive">{errors.numero}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input
                        id="complemento"
                        value={formData.complemento}
                        onChange={(e) => handleInputChange('complemento', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input
                        id="bairro"
                        value={formData.bairro}
                        onChange={(e) => handleInputChange('bairro', e.target.value)}
                        className={errors.bairro ? 'border-destructive' : ''}
                      />
                      {errors.bairro && <p className="text-xs text-destructive">{errors.bairro}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        maxLength={2}
                        className={errors.estado ? 'border-destructive' : ''}
                      />
                      {errors.estado && <p className="text-xs text-destructive">{errors.estado}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => handleInputChange('cidade', e.target.value)}
                      className={errors.cidade ? 'border-destructive' : ''}
                    />
                    {errors.cidade && <p className="text-xs text-destructive">{errors.cidade}</p>}
                  </div>
                </div>

                {/* Dados do cartão */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                    Dados do cartão
                  </h3>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Nome no cartão</Label>
                    <Input
                      id="cardName"
                      value={formData.cardName}
                      onChange={(e) => handleInputChange('cardName', e.target.value.toUpperCase())}
                      className={errors.cardName ? 'border-destructive' : ''}
                    />
                    {errors.cardName && <p className="text-xs text-destructive">{errors.cardName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Número do cartão</Label>
                    <Input
                      id="cardNumber"
                      value={formData.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      placeholder="0000 0000 0000 0000"
                      className={errors.cardNumber ? 'border-destructive' : ''}
                    />
                    {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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

                <Button
                  className="w-full bg-accent hover:bg-accent/90 py-6 text-lg"
                  onClick={handleSubmit}
                  disabled={paymentLoading}
                >
                  {paymentLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Finalizar pagamento - ${formatCurrency(selectedPlan.price)}`
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
