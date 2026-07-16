import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Shield, Lock, CreditCard, Loader2, CheckCircle2, XCircle, Sparkles, QrCode, Barcode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useViaCep } from '@/hooks/useViaCep';
import { usePayment } from '@/hooks/usePayment';
import TrustBadges from '@/components/checkout/TrustBadges';
import CardBrands from '@/components/checkout/CardBrands';
import SecurityFooter from '@/components/checkout/SecurityFooter';
import PaymentMethodSelector, { PaymentMethod } from '@/components/checkout/PaymentMethodSelector';
import PixPayment from '@/components/checkout/PixPayment';
import BoletoPayment from '@/components/checkout/BoletoPayment';
import bivvoLogo from '@/assets/bivvo-logo.png';
import { supabase } from '@/integrations/supabase/client';
import {
  validateCPF,
  validateCNPJ,
  validateCardNumber,
  validateExpiry,
  maskCPF,
  maskCNPJ,
  maskCardNumber,
  maskCEP,
  maskExpiry,
  maskPhone,
  formatCurrency,
} from '@/lib/validators';
import { quoteBivvo, decodeBivvoConfig, loadPlansFromDB, PLANS, type BivvoConfig } from '@/lib/bivvo-calc';
import { useSiteSettings } from '@/hooks/useSiteSettings';

type Step = 'personal' | 'address' | 'payment' | 'processing' | 'success' | 'error' | 'awaiting_payment';

interface Plan {
  id: string;
  slug: string;
  name: string;
  price: number;
  description: string;
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'personal', label: 'Dados' },
  { id: 'address', label: 'Endereço' },
  { id: 'payment', label: 'Pagamento' },
];

const Checkout = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchAddress, loading: cepLoading } = useViaCep();
  const { processPayment, loading: paymentLoading, error: paymentError, status: paymentStatus, reset } = usePayment();
  const { data: siteSettings } = useSiteSettings();
  const supportWhatsapp = (siteSettings?.support_whatsapp || '5511936230279').replace(/\D/g, '');
  const goToSupport = () => {
    const msg = encodeURIComponent(`Olá! Acabei de contratar o ${plan?.name || 'plano Bivvo'} e gostaria de iniciar a configuração.`);
    window.location.href = `https://wa.me/${supportWhatsapp}?text=${msg}`;
  };

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const affiliateSlug = searchParams.get('aff');
  const cfgParam = searchParams.get('cfg');
  
  const bivvoConfig = useMemo(() => {
    if (cfgParam) return decodeBivvoConfig(cfgParam);
    
    // Default config for standard slugs
    if (planId === 'standard' || planId === 'silver' || planId === 'pro') {
      return {
        plan: planId as any,
        users: planId === 'standard' ? 3 : planId === 'silver' ? 6 : 12,
        channels: { waof: 1, wano: 1, ig: 1, fb: 1, email: 1 },
        telefonia: false,
        disparo: false,
        protagonista: false
      };
    }
    return null;
  }, [cfgParam, planId]);

  const quote = useMemo(() => (bivvoConfig ? quoteBivvo(bivvoConfig) : null), [bivvoConfig]);

  useEffect(() => {
    const fetchPlan = async () => {
      // If we have a Bivvo quote, we don't strictly need to fetch from plans table
      // but let's do it for consistency if planId is provided
      if (!planId && !quote) { setPlanLoading(false); return; }
      
      if (quote) {
        setPlan({
          id: 'bivvo-custom',
          slug: quote.planSlug,
          name: quote.planLabel,
          price: quote.total1m,
          description: quote.planLabel
        });
        setPlanLoading(false);
        return;
      }

      const { data } = await supabase
        .from('plans')
        .select('id, slug, name, price, description')
        .eq('slug', planId)
        .eq('active', true)
        .maybeSingle();
      setPlan(data as Plan | null);
      setPlanLoading(false);
    };
    fetchPlan();
  }, [planId, quote]);

  const [currentStep, setCurrentStep] = useState<Step>('personal');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CREDIT_CARD');
  const [pixData, setPixData] = useState<{ qrCodeImage?: string; qrCodeText?: string; expiresAt?: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ boletoUrl?: string; barCode?: string; dueDate?: string } | null>(null);
  const [generatingPayment, setGeneratingPayment] = useState(false);

  const [formData, setFormData] = useState({
    personType: 'JURIDICA' as 'FISICA' | 'JURIDICA',
    name: '',
    companyName: '',
    email: '',
    whatsapp: '',
    cpf: '',
    cnpj: '',
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

  // Coupon state
  const couponEnabled = (siteSettings?.checkout_coupon_enabled ?? 'true') !== 'false';
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount_percent: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const isFreeCoupon = !!appliedCoupon && appliedCoupon.discount_percent >= 100;
  const discountedPrice = appliedCoupon
    ? Math.max(0, Math.round(((plan?.price || 0) * (1 - appliedCoupon.discount_percent / 100)) * 100) / 100)
    : (plan?.price || 0);

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-coupon`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ code }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Cupom inválido');
      setAppliedCoupon(json.coupon);
      toast({ title: 'Cupom aplicado', description: `${json.coupon.discount_percent}% de desconto no primeiro mês.` });
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : 'Erro ao validar cupom');
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError(null);
  };


  useEffect(() => {
    if (paymentStatus === 'approved') {
      setCurrentStep('success');
    } else if (paymentStatus === 'rejected' && paymentError) {
      setCurrentStep('error');
    }
  }, [paymentStatus, paymentError]);

  // Loading state
  if (planLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  // Redirect if invalid plan
  if (!plan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-6 card-glass rounded-2xl p-8">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Plano não encontrado</h2>
            <p className="text-muted-foreground text-sm">
              O plano selecionado não existe
            </p>
          </div>
          <Button onClick={() => navigate('/')} className="w-full h-12">
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
      case 'cnpj':
        maskedValue = maskCNPJ(value);
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
      if (formData.personType === 'FISICA') {
        if (!validateCPF(formData.cpf)) newErrors.cpf = 'CPF inválido';
      } else {
        if (!formData.companyName.trim()) newErrors.companyName = 'Razão social obrigatória';
        if (!validateCNPJ(formData.cnpj)) newErrors.cnpj = 'CNPJ inválido';
      }
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

    if (step === 'payment' && paymentMethod === 'CREDIT_CARD') {
      if (!formData.cardName.trim()) newErrors.cardName = 'Nome obrigatório';
      if (!validateCardNumber(formData.cardNumber)) newErrors.cardNumber = 'Cartão inválido';
      if (!validateExpiry(formData.cardExpiry)) {
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

  const handleSubmitCreditCard = async () => {
    if (!validateStep('payment')) {
      return;
    }

    setCurrentStep('processing');

    const [expiryMonth, expiryYear] = formData.cardExpiry.split('/');

    const result = await processPayment({
      plan: plan.slug,
      amount: discountedPrice,
      bivvoConfig,
      affiliateSlug: affiliateSlug || undefined,
      trackingId: cfgParam || undefined,
      couponCode: appliedCoupon?.code,
      customerData: {
        personType: formData.personType,
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,
        cpf: formData.personType === 'FISICA' ? formData.cpf : formData.cnpj,
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

  const handleSubmitPixOrBoleto = async () => {
    setGeneratingPayment(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization removed to avoid malformed JWT errors when using publishable key
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          plan: plan.slug,
          billingType: paymentMethod === 'CREDIT_CARD' ? 'PIX' : paymentMethod,
          bivvoConfig,
          affiliateSlug: affiliateSlug || undefined,
          trackingId: cfgParam || undefined,
          couponCode: appliedCoupon?.code,
          customerData: {
            personType: formData.personType,
            name: formData.name,
            companyName: formData.companyName,
            email: formData.email,
            cpf: formData.personType === 'FISICA' ? formData.cpf : formData.cnpj,
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
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      
      if (!result.success) throw new Error(result.error);

      // Cupom 100%: pagamento já foi concluído no servidor
      if (result.freeCoupon || result.status === 'approved') {
        setCurrentStep('success');
        return;
      }

      if (paymentMethod === 'PIX') {
        setPixData({
          qrCodeImage: result.pixQrCode,
          qrCodeText: result.pixCopyPaste,
          expiresAt: result.expiresAt,
        });
      } else {
        setBoletoData({
          boletoUrl: result.boletoUrl,
          barCode: result.barCode,
          dueDate: result.dueDate,
        });
      }

      setCurrentStep('awaiting_payment');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao gerar pagamento';
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setGeneratingPayment(false);
    }
  };

  const handleSubmit = () => {
    // Cupom 100%: para CC precisamos capturar o cartão (cobrança futura);
    // para PIX/Boleto vamos direto pelo create-subscription (fluxo grátis).
    if (paymentMethod === 'CREDIT_CARD') {
      handleSubmitCreditCard();
    } else {
      handleSubmitPixOrBoleto();
    }
  };

  const handleRetry = () => {
    reset();
    setPixData(null);
    setBoletoData(null);
    setCurrentStep('payment');
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Processing Step
  if (currentStep === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center px-4">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative w-full max-w-sm text-center space-y-6 card-glass rounded-2xl p-8">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center glow-accent">
            <Loader2 className="h-12 w-12 animate-spin text-accent" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Processando pagamento</h2>
            <p className="text-muted-foreground text-sm">
              {paymentStatus === 'polling'
                ? 'Verificando status...'
                : 'Aguarde um momento...'}
            </p>
          </div>
          <SecurityFooter />
        </div>
      </div>
    );
  }

  // Awaiting PIX/Boleto payment
  if (currentStep === 'awaiting_payment') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex items-center justify-center px-4">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative w-full max-w-sm space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center">
              {paymentMethod === 'PIX' ? (
                <QrCode className="h-8 w-8 text-accent" />
              ) : (
                <Barcode className="h-8 w-8 text-accent" />
              )}
            </div>
            <h2 className="text-xl font-bold">
              {paymentMethod === 'PIX' ? 'Pague com PIX' : 'Pague com Boleto'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {plan.name} - {formatCurrency(plan.price)} {quote && quote.total1m !== quote.totalRec ? `(1º mês, depois ${formatCurrency(quote.totalRec)}/mês)` : '/mês'}
            </p>
          </div>

          {/* Payment Details */}
          {paymentMethod === 'PIX' ? (
            <PixPayment
              qrCodeImage={pixData?.qrCodeImage}
              qrCodeText={pixData?.qrCodeText}
              expiresAt={pixData?.expiresAt}
            />
          ) : (
            <BoletoPayment
              boletoUrl={boletoData?.boletoUrl}
              barCode={boletoData?.barCode}
              dueDate={boletoData?.dueDate}
            />
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 bg-gradient-to-r from-accent to-primary hover:opacity-90 rounded-xl"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Voltar ao início
            </Button>
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              Escolher outra forma de pagamento
            </Button>
          </div>

          <SecurityFooter />
        </div>
      </div>
    );
  }

  // Success Step
  if (currentStep === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-success/5 flex items-center justify-center px-4">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative w-full max-w-sm text-center space-y-6 card-glass rounded-2xl p-8">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-success/20 to-accent/20 flex items-center justify-center">
            <CheckCircle2 className="h-12 w-12 text-success" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Pagamento aprovado!</h2>
            <p className="text-muted-foreground text-sm">
              Sua assinatura do plano <span className="font-semibold text-accent">{plan.name}</span> foi ativada
            </p>
          </div>
          <Button onClick={goToSupport} className="w-full h-12 bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-opacity">
            <Sparkles className="mr-2 h-4 w-4" />
            Continuar
          </Button>
        </div>
      </div>
    );
  }

  // Error Step
  if (currentStep === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex items-center justify-center px-4">
        <div className="absolute inset-0 gradient-mesh opacity-50" />
        <div className="relative w-full max-w-sm text-center space-y-6 card-glass rounded-2xl p-8">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
            <XCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold">Pagamento não aprovado</h2>
            <p className="text-muted-foreground text-sm">
              {paymentError || 'Tente novamente com outro cartão'}
            </p>
          </div>
          <Button onClick={handleRetry} className="w-full h-12" variant="outline">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      {/* Mesh gradient background */}
      <div className="fixed inset-0 gradient-mesh opacity-30 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          {currentStepIndex > 0 ? (
            <button 
              onClick={goToPreviousStep} 
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Voltar
            </button>
          ) : (
            <img src={bivvoLogo} alt="Bivvo" className="h-6" />
          )}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
              <Lock className="h-3 w-3 text-success" />
            </div>
            <span className="text-xs font-medium">Pagamento seguro</span>
          </div>
        </div>
      </header>

      {/* Plan Info Bar */}
      <div className="relative bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground py-4 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLW9wYWNpdHk9IjAuMDUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative max-w-lg mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs opacity-80">Assinatura</p>
              <p className="font-semibold">{plan.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">Total</p>
            <p className="text-2xl font-bold">{formatCurrency(plan.price)}</p>
            {quote && quote.total1m !== quote.totalRec && (
              <p className="text-[10px] opacity-70">Depois {formatCurrency(quote.totalRec)}/mês</p>
            )}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                  index < currentStepIndex
                    ? 'bg-gradient-to-br from-accent to-primary text-white shadow-lg shadow-accent/30'
                    : index === currentStepIndex
                    ? 'bg-gradient-to-br from-accent to-primary text-white shadow-lg shadow-accent/30 scale-110'
                    : 'bg-muted/50 text-muted-foreground border border-border'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-5 w-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 rounded-full transition-colors duration-300 ${
                    index < currentStepIndex 
                      ? 'bg-gradient-to-r from-accent to-primary' 
                      : 'bg-muted/50'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between px-1">
          {STEPS.map((step, index) => (
            <span
              key={step.id}
              className={`text-xs transition-colors ${
                index === currentStepIndex 
                  ? 'text-accent font-semibold' 
                  : index < currentStepIndex
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="relative max-w-lg mx-auto px-4 pb-36">
        {/* Step 1: Personal Data */}
        {currentStep === 'personal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Seus dados
              </h1>
              <p className="text-muted-foreground text-sm">
                Informe seus dados pessoais
              </p>
            </div>

            <div className="card-glass rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo de cadastro</Label>
                <div className="relative grid grid-cols-2 p-1 rounded-xl bg-muted/40 border border-border/60">
                  <div
                    aria-hidden
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-gradient-to-br from-accent to-primary shadow-md shadow-accent/20 transition-transform duration-300 ease-out ${
                      formData.personType === 'JURIDICA' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, personType: 'FISICA' }))}
                    className={`relative z-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      formData.personType === 'FISICA' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, personType: 'JURIDICA' }))}
                    className={`relative z-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      formData.personType === 'JURIDICA' ? 'text-white' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pessoa Jurídica
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">Nome completo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`h-12 input-glass rounded-xl ${errors.name ? 'border-destructive' : ''}`}
                  placeholder="João da Silva"
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              {formData.personType === 'JURIDICA' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium">Nome da empresa</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className={`h-12 input-glass rounded-xl ${errors.companyName ? 'border-destructive' : ''}`}
                    placeholder="Razão social"
                  />
                  {errors.companyName && <p className="text-xs text-destructive">{errors.companyName}</p>}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`h-12 input-glass rounded-xl ${errors.email ? 'border-destructive' : ''}`}
                  placeholder="joao@email.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={`h-12 input-glass rounded-xl ${errors.whatsapp ? 'border-destructive' : ''}`}
                />
                {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
              </div>

              {formData.personType === 'FISICA' ? (
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-sm font-medium">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className={`h-12 input-glass rounded-xl ${errors.cpf ? 'border-destructive' : ''}`}
                  />
                  {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleInputChange('cnpj', e.target.value)}
                    placeholder="00.000.000/0000-00"
                    className={`h-12 input-glass rounded-xl ${errors.cnpj ? 'border-destructive' : ''}`}
                  />
                  {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
                </div>
              )}
            </div>

            <TrustBadges />
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

            <div className="card-glass rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="billingName" className="text-sm font-medium">Nome para faturamento</Label>
                <Input
                  id="billingName"
                  value={formData.billingName}
                  onChange={(e) => handleInputChange('billingName', e.target.value)}
                  className={`h-12 input-glass rounded-xl ${errors.billingName ? 'border-destructive' : ''}`}
                  placeholder="Nome na fatura"
                />
                {errors.billingName && <p className="text-xs text-destructive">{errors.billingName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cep" className="text-sm font-medium">CEP</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    placeholder="00000-000"
                    className={`h-12 input-glass rounded-xl ${errors.cep ? 'border-destructive' : ''}`}
                  />
                  {cepLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-accent" />
                  )}
                </div>
                {errors.cep && <p className="text-xs text-destructive">{errors.cep}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco" className="text-sm font-medium">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  className={`h-12 input-glass rounded-xl ${errors.endereco ? 'border-destructive' : ''}`}
                  placeholder="Rua, Avenida..."
                />
                {errors.endereco && <p className="text-xs text-destructive">{errors.endereco}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="numero" className="text-sm font-medium">Número</Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => handleInputChange('numero', e.target.value)}
                    className={`h-12 input-glass rounded-xl ${errors.numero ? 'border-destructive' : ''}`}
                    placeholder="123"
                  />
                  {errors.numero && <p className="text-xs text-destructive">{errors.numero}</p>}
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="complemento" className="text-sm font-medium">Complemento</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento}
                    onChange={(e) => handleInputChange('complemento', e.target.value)}
                    className="h-12 input-glass rounded-xl"
                    placeholder="Apto, Sala..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro" className="text-sm font-medium">Bairro</Label>
                <Input
                  id="bairro"
                  value={formData.bairro}
                  onChange={(e) => handleInputChange('bairro', e.target.value)}
                  className={`h-12 input-glass rounded-xl ${errors.bairro ? 'border-destructive' : ''}`}
                  placeholder="Bairro"
                />
                {errors.bairro && <p className="text-xs text-destructive">{errors.bairro}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="cidade" className="text-sm font-medium">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    className={`h-12 input-glass rounded-xl ${errors.cidade ? 'border-destructive' : ''}`}
                    placeholder="Cidade"
                  />
                  {errors.cidade && <p className="text-xs text-destructive">{errors.cidade}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estado" className="text-sm font-medium">UF</Label>
                  <Input
                    id="estado"
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    maxLength={2}
                    className={`h-12 input-glass rounded-xl ${errors.estado ? 'border-destructive' : ''}`}
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
              <h1 className="text-2xl font-bold">Pagamento</h1>
              <p className="text-muted-foreground text-sm">
                Escolha a forma de pagamento
              </p>
            </div>

            {/* Order Summary */}
            <div className="card-glass rounded-2xl p-4 border-accent/20">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">{plan.name}</span>
                    <p className="text-xs text-muted-foreground">
                      {quote && quote.total1m !== quote.totalRec 
                        ? `Primeiro mês promocional (Depois ${formatCurrency(quote.totalRec)}/mês)`
                        : 'Assinatura mensal'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {appliedCoupon && (
                    <span className="block text-xs text-muted-foreground line-through">
                      {formatCurrency(plan.price)}
                    </span>
                  )}
                  <span className="text-2xl font-bold text-accent">
                    {isFreeCoupon ? 'GRÁTIS' : formatCurrency(discountedPrice)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cupom */}
            {couponEnabled && (
              <div className="card-glass rounded-2xl p-4 space-y-3">
                <Label className="text-sm font-medium">Cupom de desconto</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 border border-success/30 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      <div>
                        <p className="font-mono font-semibold text-sm">{appliedCoupon.code}</p>
                        <p className="text-xs text-muted-foreground">
                          {appliedCoupon.discount_percent}% de desconto no primeiro mês
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeCoupon}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        placeholder="DIGITE SEU CUPOM"
                        className="h-12 input-glass rounded-xl uppercase"
                        disabled={couponLoading}
                      />
                      <Button
                        type="button"
                        onClick={applyCoupon}
                        disabled={couponLoading || !couponInput.trim()}
                        variant="outline"
                        className="h-12 px-4 rounded-xl"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                      </Button>
                    </div>
                    {couponError && <p className="text-xs text-destructive">{couponError}</p>}
                  </>
                )}
              </div>
            )}

            {/* Payment Method Selector */}
            <PaymentMethodSelector selected={paymentMethod} onChange={setPaymentMethod} />

            {/* Free Coupon Info (1º mês grátis, mesmo assim escolhe forma de pagamento futura) */}
            {isFreeCoupon && (
              <div className="card-glass rounded-2xl p-5 space-y-3 text-center border-success/30">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold">1º mês grátis com o cupom {appliedCoupon?.code}</p>
                  <p className="text-sm text-muted-foreground">
                    {paymentMethod === 'CREDIT_CARD'
                      ? `Nada será cobrado agora. A partir do 2º mês, ${formatCurrency(plan.price)} serão cobrados automaticamente no cartão.`
                      : `Nada será cobrado agora. A partir do 2º mês, você receberá a cobrança de ${formatCurrency(plan.price)} via ${paymentMethod === 'PIX' ? 'PIX' : 'Boleto'}.`}
                  </p>
                </div>
              </div>
            )}

            {/* Credit Card Form (sempre visível quando CC selecionado — cupom 100% ainda exige cartão para meses futuros) */}
            {paymentMethod === 'CREDIT_CARD' && (
              <>
                <CardBrands />
                <div className="card-glass rounded-2xl p-5 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardName" className="text-sm font-medium">Nome no cartão</Label>
                    <Input
                      id="cardName"
                      value={formData.cardName}
                      onChange={(e) => handleInputChange('cardName', e.target.value.toUpperCase())}
                      className={`h-12 input-glass rounded-xl ${errors.cardName ? 'border-destructive' : ''}`}
                      placeholder="NOME COMO NO CARTÃO"
                    />
                    {errors.cardName && <p className="text-xs text-destructive">{errors.cardName}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardNumber" className="text-sm font-medium">Número do cartão</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        className={`h-12 input-glass rounded-xl pr-12 ${errors.cardNumber ? 'border-destructive' : ''}`}
                      />
                      <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    </div>
                    {errors.cardNumber && <p className="text-xs text-destructive">{errors.cardNumber}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="cardExpiry" className="text-sm font-medium">Validade</Label>
                      <Input
                        id="cardExpiry"
                        value={formData.cardExpiry}
                        onChange={(e) => handleInputChange('cardExpiry', e.target.value)}
                        placeholder="MM/AA"
                        className={`h-12 input-glass rounded-xl ${errors.cardExpiry ? 'border-destructive' : ''}`}
                      />
                      {errors.cardExpiry && <p className="text-xs text-destructive">{errors.cardExpiry}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCvv" className="text-sm font-medium">CVV</Label>
                      <Input
                        id="cardCvv"
                        value={formData.cardCvv}
                        onChange={(e) => handleInputChange('cardCvv', e.target.value)}
                        placeholder="000"
                        className={`h-12 input-glass rounded-xl ${errors.cardCvv ? 'border-destructive' : ''}`}
                      />
                      {errors.cardCvv && <p className="text-xs text-destructive">{errors.cardCvv}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* PIX Info */}
            {paymentMethod === 'PIX' && !isFreeCoupon && (
              <div className="card-glass rounded-2xl p-5 space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
                  <QrCode className="h-8 w-8 text-accent" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Pagamento via PIX</p>
                  <p className="text-sm text-muted-foreground">
                    Após confirmar, você receberá um QR Code para pagamento instantâneo
                  </p>
                </div>
              </div>
            )}

            {/* Boleto Info */}
            {paymentMethod === 'BOLETO' && !isFreeCoupon && (
              <div className="card-glass rounded-2xl p-5 space-y-4 text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Barcode className="h-8 w-8 text-accent" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">Pagamento via Boleto</p>
                  <p className="text-sm text-muted-foreground">
                    O boleto será gerado com vencimento em 3 dias úteis
                  </p>
                </div>
              </div>
            )}


            <SecurityFooter />
          </div>
        )}
      </main>

      {/* Fixed Footer */}
      <footer className="fixed bottom-0 left-0 right-0 glass border-t border-white/10 p-4 safe-area-bottom">
        <div className="max-w-lg mx-auto">
          {currentStep === 'payment' && (
            <p className="text-[10px] text-center text-muted-foreground mb-3">
              Ao clicar em pagar, você concorda com nossos{" "}
              <a href="/termos-de-uso" target="_blank" className="underline hover:text-foreground">Termos de Uso</a>
              {" "}e{" "}
              <a href="/politica-de-privacidade" target="_blank" className="underline hover:text-foreground">Política de Privacidade</a>.
            </p>
          )}
          {currentStep === 'payment' ? (
            <Button
              onClick={handleSubmit}
              disabled={paymentLoading || generatingPayment}
              className="w-full h-14 text-base font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all shadow-lg shadow-accent/30 rounded-xl"
            >
              {paymentLoading || generatingPayment ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {isFreeCoupon ? 'Ativando...' : paymentMethod === 'CREDIT_CARD' ? 'Processando...' : 'Gerando...'}
                </>
              ) : (
                <>
                  {isFreeCoupon ? (
                    <><Sparkles className="mr-2 h-4 w-4" /> Ativar assinatura grátis</>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      {paymentMethod === 'CREDIT_CARD' 
                        ? `Pagar ${formatCurrency(discountedPrice)}`
                        : paymentMethod === 'PIX'
                        ? 'Gerar PIX'
                        : 'Gerar Boleto'
                      }
                    </>
                  )}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goToNextStep} className="w-full h-14 text-base font-semibold bg-gradient-to-r from-accent to-primary hover:opacity-90 transition-all shadow-lg shadow-accent/30 rounded-xl">
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
