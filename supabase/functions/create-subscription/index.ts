import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { quoteBivvo, type BivvoConfig } from "../_shared/bivvo-calc.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices fetched from DB dynamically

const VALID_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// CPF validation algorithm
function validateCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

// Validate subscription request
function validateSubscriptionRequest(data: any): { valid: boolean; error?: string } {
  if (!data.plan || typeof data.plan !== 'string') {
    return { valid: false, error: 'Invalid plan' };
  }
  
  const VALID_BILLING_TYPES = ['PIX', 'BOLETO'];
  if (!data.billingType || !VALID_BILLING_TYPES.includes(data.billingType)) {
    return { valid: false, error: 'Invalid billing type' };
  }
  
  const cd = data.customerData;
  if (!cd) {
    return { valid: false, error: 'Missing customer data' };
  }
  
  if (!cd.name || typeof cd.name !== 'string' || cd.name.trim().length < 3 || cd.name.length > 100) {
    return { valid: false, error: 'Invalid name' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cd.email || !emailRegex.test(cd.email) || cd.email.length > 255) {
    return { valid: false, error: 'Invalid email' };
  }
  
  const cleanCpf = (cd.cpf || '').replace(/\D/g, '');
  if (!validateCPF(cleanCpf)) {
    return { valid: false, error: 'Invalid CPF' };
  }
  
  const cleanPhone = (cd.whatsapp || '').replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(cleanPhone)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  if (!cd.billingName || cd.billingName.trim().length < 3 || cd.billingName.length > 100) {
    return { valid: false, error: 'Invalid billing name' };
  }
  
  const cleanCep = (cd.cep || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cleanCep)) {
    return { valid: false, error: 'Invalid CEP' };
  }
  
  if (!cd.endereco || cd.endereco.length > 200) {
    return { valid: false, error: 'Invalid address' };
  }
  if (!cd.numero || cd.numero.length > 20) {
    return { valid: false, error: 'Invalid address number' };
  }
  if (cd.complemento && cd.complemento.length > 100) {
    return { valid: false, error: 'Invalid complement' };
  }
  if (!cd.bairro || cd.bairro.length > 100) {
    return { valid: false, error: 'Invalid neighborhood' };
  }
  if (!cd.cidade || cd.cidade.length > 100) {
    return { valid: false, error: 'Invalid city' };
  }
  if (!cd.estado || !VALID_STATES.includes(cd.estado.toUpperCase())) {
    return { valid: false, error: 'Invalid state' };
  }
  
  return { valid: true };
}

interface SubscriptionRequest {
  plan: string;
  billingType: 'PIX' | 'BOLETO';
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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    const ASAAS_BASE_URL = Deno.env.get('ASAAS_BASE_URL');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!ASAAS_API_KEY || !ASAAS_BASE_URL) {
      throw new Error('Missing Asaas configuration');
    }

    const rawData = await req.json();
    console.log('Received subscription request:', JSON.stringify(rawData));
    
    const validation = validateSubscriptionRequest(rawData);
    if (!validation.valid) {
      console.error('Validation failed:', validation.error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Dados inválidos. Verifique as informações e tente novamente.',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { plan, billingType, customerData }: SubscriptionRequest = rawData;
    const bivvoConfig: BivvoConfig | undefined = rawData.bivvoConfig;
    const affiliateSlug: string | undefined = rawData.affiliateSlug;

    let amount: number;
    let recurringAmount: number;
    let planLabel = plan;
    let quote: ReturnType<typeof quoteBivvo> | null = null;

    if (bivvoConfig) {
      try {
        quote = quoteBivvo(bivvoConfig);
        amount = quote.total1m;
        recurringAmount = quote.totalRec;
        planLabel = quote.planLabel;
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Configuração inválida' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      const { data: planData, error: planError } = await supabase
        .from('plans')
        .select('price')
        .eq('slug', plan)
        .eq('active', true)
        .maybeSingle();

      if (planError || !planData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Plano não encontrado ou inativo.',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      amount = Number(planData.price);
      recurringAmount = amount;
    }

    // Lookup affiliate
    let affiliate: { id: string; commission_percent: number; commission_recurring: boolean } | null = null;
    if (affiliateSlug) {
      const { data: aff } = await supabase
        .from('affiliates')
        .select('id, commission_percent, commission_recurring, status')
        .eq('slug', affiliateSlug)
        .eq('status', 'active')
        .maybeSingle();
      if (aff) affiliate = aff as any;
    }

    console.log('Processing subscription for plan:', plan, 'billingType:', billingType, 'amount:', amount, 'recurring:', recurringAmount);

    // Sanitize data
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanWhatsapp = customerData.whatsapp.replace(/\D/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');

    // 1. Create or find user in database
    let userId: string;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, asaas_customer_id')
      .eq('email', customerData.email)
      .maybeSingle();

    let asaasCustomerId = existingUser?.asaas_customer_id;

    if (existingUser) {
      userId = existingUser.id;
      await supabase.from('users').update({
        name: customerData.name.trim(),
        whatsapp: cleanWhatsapp,
        cpf: cleanCpf,
        billing_name: customerData.billingName.trim(),
        cep: cleanCep,
        endereco: customerData.endereco.trim(),
        numero: customerData.numero.trim(),
        complemento: customerData.complemento?.trim() || '',
        bairro: customerData.bairro.trim(),
        cidade: customerData.cidade.trim(),
        estado: customerData.estado.toUpperCase(),
      }).eq('id', userId);
    } else {
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: customerData.name.trim(),
          email: customerData.email.toLowerCase().trim(),
          whatsapp: cleanWhatsapp,
          cpf: cleanCpf,
          billing_name: customerData.billingName.trim(),
          cep: cleanCep,
          endereco: customerData.endereco.trim(),
          numero: customerData.numero.trim(),
          complemento: customerData.complemento?.trim() || '',
          bairro: customerData.bairro.trim(),
          cidade: customerData.cidade.trim(),
          estado: customerData.estado.toUpperCase(),
        })
        .select('id')
        .single();

      if (userError) throw new Error(`Error creating user: ${userError.message}`);
      userId = newUser.id;
    }

    // 2. Create or find customer in Asaas
    if (!asaasCustomerId) {
      console.log('Creating customer in Asaas...');
      console.log('Using Asaas URL:', ASAAS_BASE_URL);
      
      const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: customerData.name.trim(),
          cpfCnpj: cleanCpf,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanWhatsapp,
          postalCode: cleanCep,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          complement: customerData.complemento?.trim() || '',
          province: customerData.bairro.trim(),
          city: customerData.cidade.trim(),
          state: customerData.estado.toUpperCase(),
          externalReference: userId,
          notificationDisabled: false,
        }),
      });

      console.log('Customer response status:', customerResponse.status);
      
      // Check if response is JSON before parsing
      const contentType = customerResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await customerResponse.text();
        console.error('Non-JSON response from Asaas:', textResponse.substring(0, 500));
        throw new Error('Asaas API retornou resposta inválida. Verifique a configuração da API.');
      }

      const customerResult = await customerResponse.json();
      console.log('Asaas customer response:', JSON.stringify(customerResult));

      if (!customerResponse.ok || customerResult.errors) {
        const errorMsg = customerResult.errors?.[0]?.description || `HTTP ${customerResponse.status}`;
        throw new Error(`Erro Asaas: ${errorMsg}`);
      }

      asaasCustomerId = customerResult.id;
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);
    }

    // 3. Create subscription in Asaas
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + (billingType === 'BOLETO' ? 3 : 1));

    const createSubscription = async (customerId: string) => {
      console.log('Creating subscription in Asaas...');
      const subscriptionPayload = {
        customer: customerId,
        billingType: billingType,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        value: recurringAmount,
        discount: amount < recurringAmount ? {
          value: recurringAmount - amount,
          type: 'FIXED',
          dueDateLimitDays: 0
        } : undefined,
        cycle: 'MONTHLY',
        description: `Assinatura ${planLabel}`,
        externalReference: `${userId}_${plan}_subscription`,
      };

      console.log('Subscription payload:', JSON.stringify(subscriptionPayload));

      const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify(subscriptionPayload),
      });

      return subscriptionResponse.json();
    };

    let subscriptionResult = await createSubscription(asaasCustomerId!);
    console.log('Subscription response:', JSON.stringify(subscriptionResult));

    // Handle case where customer was deleted in Asaas but still exists in our DB
    if (subscriptionResult.errors) {
      const errorDesc = subscriptionResult.errors[0]?.description || '';
      const isRemovedCustomer = errorDesc.includes('cliente removido') || 
                                 errorDesc.includes('customer removed') ||
                                 errorDesc.includes('invalid_object');
      
      if (isRemovedCustomer) {
        console.log('Customer was removed from Asaas, creating new customer...');
        
        // Create new customer in Asaas
        const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': ASAAS_API_KEY,
          },
          body: JSON.stringify({
            name: customerData.name.trim(),
            cpfCnpj: cleanCpf,
            email: customerData.email.toLowerCase().trim(),
            mobilePhone: cleanWhatsapp,
            postalCode: cleanCep,
            address: customerData.endereco.trim(),
            addressNumber: customerData.numero.trim(),
            complement: customerData.complemento?.trim() || '',
            province: customerData.bairro.trim(),
            city: customerData.cidade.trim(),
            state: customerData.estado.toUpperCase(),
            externalReference: userId,
            notificationDisabled: false,
          }),
        });

        const customerResult = await customerResponse.json();
        console.log('New customer created:', JSON.stringify(customerResult));

        if (!customerResponse.ok || customerResult.errors) {
          throw new Error(`Erro ao recriar cliente: ${customerResult.errors?.[0]?.description || 'Unknown error'}`);
        }

        asaasCustomerId = customerResult.id;
        await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);

        // Retry subscription with new customer
        subscriptionResult = await createSubscription(asaasCustomerId);
        console.log('Retry subscription response:', JSON.stringify(subscriptionResult));
      }

      if (subscriptionResult.errors) {
        throw new Error(`Subscription error: ${subscriptionResult.errors[0]?.description || 'Unknown error'}`);
      }
    }

    const subscriptionId = subscriptionResult.id;

    // 4. Get the first payment created by the subscription
    console.log('Fetching first payment from subscription...');
    
    // Small delay to ensure payment is created
    await new Promise(resolve => setTimeout(resolve, 1000));

    const paymentsResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}/payments`, {
      headers: {
        'access_token': ASAAS_API_KEY,
      },
    });

    const paymentsResult = await paymentsResponse.json();
    console.log('Subscription payments:', JSON.stringify(paymentsResult));

    if (!paymentsResult.data || paymentsResult.data.length === 0) {
      throw new Error('No payment found for subscription');
    }

    const firstPayment = paymentsResult.data[0];
    const paymentId = firstPayment.id;

    // 5. Get payment details (for PIX QR Code or Boleto URL)
    let paymentDetails: any = {};

    if (billingType === 'PIX') {
      console.log('Fetching PIX QR Code...');
      const pixResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/pixQrCode`, {
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      });
      const pixResult = await pixResponse.json();
      console.log('PIX result:', JSON.stringify(pixResult));

      if (pixResult.encodedImage && pixResult.payload) {
        paymentDetails = {
          pixQrCode: pixResult.encodedImage,
          pixCopyPaste: pixResult.payload,
          expiresAt: pixResult.expirationDate,
        };
      }
    } else if (billingType === 'BOLETO') {
      console.log('Fetching Boleto details...');
      const boletoResponse = await fetch(`${ASAAS_BASE_URL}/payments/${paymentId}/identificationField`, {
        headers: {
          'access_token': ASAAS_API_KEY,
        },
      });
      const boletoResult = await boletoResponse.json();
      console.log('Boleto result:', JSON.stringify(boletoResult));

      paymentDetails = {
        boletoUrl: firstPayment.bankSlipUrl,
        barCode: boletoResult.identificationField,
        dueDate: firstPayment.dueDate,
      };
    }

    // 6. Save payment to database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: userId,
        plan,
        amount,
        status: 'pending',
        asaas_payment_id: paymentId,
        asaas_subscription_id: subscriptionId,
      })
      .select('id')
      .single();

    if (paymentError) {
      console.error('Database save failed:', paymentError);
      // Cancel subscription in Asaas
      await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'access_token': ASAAS_API_KEY },
      });
      throw new Error('Falha ao processar pagamento. Nenhuma cobrança foi efetivada.');
    }

    console.log('Subscription created successfully');

    // 7. Register affiliate sale + first commission
    if (affiliate && payment) {
      const { data: sale } = await supabase.from('affiliate_sales').insert({
        affiliate_id: affiliate.id,
        payment_id: payment.id,
        user_id: userId,
        plan_slug: plan,
        plan_label: planLabel,
        config: bivvoConfig ?? {},
        amount_first: amount,
        amount_recurring: recurringAmount,
        commission_percent: affiliate.commission_percent,
        status: 'pending',
        asaas_payment_id: paymentId,
        asaas_subscription_id: subscriptionId,
      }).select('id').single();

      if (sale) {
        const commission = Math.round(amount * affiliate.commission_percent) / 100;
        await supabase.from('affiliate_commissions').insert({
          affiliate_id: affiliate.id,
          sale_id: sale.id,
          sale_amount: amount,
          commission_percent: affiliate.commission_percent,
          commission_amount: commission,
          kind: 'first',
          status: 'pending',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      asaasPaymentId: paymentId,
      subscriptionId: subscriptionId,
      ...paymentDetails,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar assinatura',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
