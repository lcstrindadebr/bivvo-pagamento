import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentData {
  plan: string;
  amount: number;
  installments?: number;
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

  const processPayment = useCallback(async (data: PaymentData): Promise<PaymentResult> => {
    setLoading(true);
    setError(null);
    setStatus('processing');

    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('process-payment', {
        body: data,
      });

      if (fnError) throw new Error(fnError.message);
      if (!result.success) throw new Error(result.error);

      // Se aprovado imediatamente
      if (result.status === 'approved') {
        setStatus('approved');
        return result;
      }

      // Iniciar polling para verificar status
      setStatus('polling');
      const finalResult = await pollPaymentStatus(result.asaasId, data.plan === 'mensal' ? 'subscription' : 'payment');
      
      return { ...result, status: finalResult };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar pagamento';
      setError(message);
      setStatus('rejected');
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const pollPaymentStatus = useCallback(async (asaasId: string, type: string): Promise<string> => {
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 30; // 60 segundos (30 * 2s)

      const poll = async () => {
        attempts++;
        
        try {
          const { data: result } = await supabase.functions.invoke('check-payment-status', {
            body: { asaasId, type },
          });

          if (result?.status === 'APPROVED') {
            setStatus('approved');
            resolve('approved');
            return;
          }

          if (result?.status === 'REJECTED') {
            setStatus('rejected');
            setError('Pagamento recusado. Verifique os dados do cartão.');
            resolve('rejected');
            return;
          }

          if (attempts >= maxAttempts) {
            setStatus('rejected');
            setError('Tempo limite excedido. Por favor, tente novamente.');
            resolve('timeout');
            return;
          }

          pollingRef.current = setTimeout(poll, 2000);
        } catch (err) {
          if (attempts >= maxAttempts) {
            setStatus('rejected');
            setError('Erro ao verificar status do pagamento.');
            resolve('error');
          } else {
            pollingRef.current = setTimeout(poll, 2000);
          }
        }
      };

      poll();
    });
  }, []);

  const reset = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }
    setLoading(false);
    setError(null);
    setStatus('idle');
  }, []);

  return { processPayment, loading, error, status, reset };
}
