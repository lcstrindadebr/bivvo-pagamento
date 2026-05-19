import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  plan: string;
  amount: number;
  installments?: number;
  bivvoConfig?: any;
  affiliateSlug?: string;
  trackingId?: string;
  customerData: {
    name: string;
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
  cardData: {
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
          const { data: result, error: pollError } = await supabase.functions.invoke('check-payment-status', {
            body: { asaasId, type },
          });

          if (pollError) throw pollError;

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
      const { data: result, error: fnError } = await supabase.functions.invoke('process-payment', {
        body: data,
      });

      if (fnError) throw new Error(fnError.message);
      if (!result.success) throw new Error(result.error || 'Erro desconhecido no processamento');

      // Se aprovado imediatamente
      if (result.status === 'approved') {
        setStatus('approved');
        return result;
      }

      // Iniciar polling para verificar status caso não seja imediato (comum no Asaas)
      setStatus('polling');
      const finalResult = await pollPaymentStatus(result.asaasId, data.plan === 'mensal' ? 'subscription' : 'payment');
      
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