import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  plan: string;
  amount: number;
  installments?: number;
  bivvoConfig?: any;
  affiliateSlug?: string;
  trackingId?: string;
  couponCode?: string;
  customerData: {
    personType?: 'FISICA' | 'JURIDICA';
    name: string;
    companyName?: string;
    email: string;
    cpf: string;
    whatsapp: string;
    billingName: string;
    cep: string;
    endereco: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  cardData?: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  asaasId?: string;
  status?: string;
  userId?: string;
  error?: string;
}

export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'polling' | 'approved' | 'rejected'>('idle');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Limpeza do polling ao desmontar o componente
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  const pollPaymentStatus = useCallback(async (asaasId: string, type: string): Promise<string> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 60 segundos total (30 * 2s)

      const poll = async () => {
        if (attempts >= maxAttempts) {
          setStatus('rejected');
          setError('Tempo limite excedido. Por favor, tente novamente ou fale com o suporte.');
          resolve('timeout');
          return;
        }

        attempts++;
        
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-payment-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // Authorization removed to avoid malformed JWT errors when using publishable key

              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ asaasId, type }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          

          if (result?.status === 'APPROVED' || result?.status === 'CONFIRMED' || result?.status === 'RECEIVED') {
            setStatus('approved');
            resolve('approved');
            return;
          }

          if (result?.status === 'REJECTED') {
            setStatus('rejected');
            setError('Pagamento recusado pela operadora do cartão.');
            resolve('rejected');
            return;
          }

          // Agendar próxima tentativa
          pollingRef.current = setTimeout(poll, 2000);
        } catch (err) {
          console.error('Polling error:', err);
          // Em caso de erro de rede, continua tentando até o limite
          pollingRef.current = setTimeout(poll, 2000);
        }
      };

      poll();
    });
  }, []);

  const processPayment = useCallback(async (data: PaymentData): Promise<PaymentResult> => {
    setLoading(true);
    setError(null);
    setStatus('processing');

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Authorization removed to avoid malformed JWT errors when using publishable key
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      
      if (!result.success) throw new Error(result.error || 'Erro desconhecido no processamento');

      // Se aprovado imediatamente (incluindo cupom 100%)
      if (result.status === 'approved' || result.freeCoupon) {
        setStatus('approved');
        return result;
      }

      // Iniciar polling para verificar status caso não seja imediato (comum no Asaas)
      setStatus('polling');
      // For Bivvo, we are always dealing with subscriptions
      const finalResult = await pollPaymentStatus(result.asaasId, 'subscription');

      
      return { ...result, status: finalResult, success: finalResult === 'approved' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      setError(message);
      setStatus('rejected');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [pollPaymentStatus]);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    setLoading(false);
    setError(null);
    setStatus('idle');
  }, []);

  return { processPayment, loading, error, status, reset };
}