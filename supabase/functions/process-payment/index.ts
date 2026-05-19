import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { quoteBivvo, type BivvoConfig } from "../_shared/bivvo-calc.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices will be fetched from DB dynamically

const VALID_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

// CPF validation algorithm
function validateCPF(cpf: string): boolean {
  if (!/^\d{11}$/.test(cpf)) return false;
  
  // Check for known invalid sequences
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // Validate check digits
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

// Luhn algorithm for card validation
function validateLuhn(cardNumber: string): boolean {
  if (!/^\d{13,19}$/.test(cardNumber)) return false;
  
  let sum = 0;
  let isEven = false;
  
  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber.charAt(i));
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

// Card expiry validation
function validateCardExpiry(month: string, year: string): boolean {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  const expYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
  const expMonth = parseInt(month);
  
  if (expYear < currentYear) return false;
  if (expYear === currentYear && expMonth < currentMonth) return false;
  
  return true;
}

// Comprehensive input validation (plan price checked later from DB)
function validatePaymentRequest(data: any): { valid: boolean; error?: string } {
  // Plan validation - just check it's a non-empty string
  if (!data.plan || typeof data.plan !== 'string') {
    return { valid: false, error: 'Invalid plan' };
  }
  
  // Customer data validation
  const cd = data.customerData;
  if (!cd) {
    return { valid: false, error: 'Missing customer data' };
  }
  
  // Name validation
  if (!cd.name || typeof cd.name !== 'string' || cd.name.trim().length < 3 || cd.name.length > 100) {
    return { valid: false, error: 'Invalid name' };
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!cd.email || !emailRegex.test(cd.email) || cd.email.length > 255) {
    return { valid: false, error: 'Invalid email' };
  }
  
  // CPF validation
  const cleanCpf = (cd.cpf || '').replace(/\D/g, '');
  if (!validateCPF(cleanCpf)) {
    return { valid: false, error: 'Invalid CPF' };
  }
  
  // WhatsApp validation
  const cleanPhone = (cd.whatsapp || '').replace(/\D/g, '');
  if (!/^\d{10,11}$/.test(cleanPhone)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  // Billing name validation
  if (!cd.billingName || cd.billingName.trim().length < 3 || cd.billingName.length > 100) {
    return { valid: false, error: 'Invalid billing name' };
  }
  
  // CEP validation
  const cleanCep = (cd.cep || '').replace(/\D/g, '');
  if (!/^\d{8}$/.test(cleanCep)) {
    return { valid: false, error: 'Invalid CEP' };
  }
  
  // Address fields validation
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
  
  // Card data validation
  const card = data.cardData;
  if (!card) {
    return { valid: false, error: 'Missing card data' };
  }
  
  // Card holder name
  if (!card.holderName || card.holderName.trim().length < 3 || card.holderName.length > 100) {
    return { valid: false, error: 'Invalid card holder name' };
  }
  
  // Card number (Luhn check)
  const cleanCardNumber = (card.number || '').replace(/\s/g, '');
  if (!validateLuhn(cleanCardNumber)) {
    return { valid: false, error: 'Invalid card number' };
  }
  
  // Expiry month
  if (!/^(0[1-9]|1[0-2])$/.test(card.expiryMonth)) {
    return { valid: false, error: 'Invalid expiry month' };
  }
  
  // Expiry year
  if (!/^\d{2,4}$/.test(card.expiryYear)) {
    return { valid: false, error: 'Invalid expiry year' };
  }
  
  // Check card not expired
  if (!validateCardExpiry(card.expiryMonth, card.expiryYear)) {
    return { valid: false, error: 'Card expired' };
  }
  
  // CVV
  if (!/^\d{3,4}$/.test(card.ccv)) {
    return { valid: false, error: 'Invalid CVV' };
  }
  
  return { valid: true };
}

// Refund payment in Asaas if database save fails
async function refundAsaasPayment(
  paymentId: string,
  subscriptionId: string | null,
  type: 'payment' | 'subscription',
  apiKey: string,
  baseUrl: string
): Promise<void> {
  try {
    if (type === 'subscription' && subscriptionId) {
      // Cancel subscription
      await fetch(`${baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers: { 'access_token': apiKey },
      });
      console.log('Subscription cancelled in Asaas:', subscriptionId);
    }
    
    // For payments, we can attempt to refund or just cancel if pending
    if (type === 'payment' && paymentId) {
      await fetch(`${baseUrl}/payments/${paymentId}`, {
        method: 'DELETE',
        headers: { 'access_token': apiKey },
      });
      console.log('Payment cancelled in Asaas:', paymentId);
    }
  } catch (error) {
    console.error('CRITICAL: Failed to rollback Asaas payment', {
      paymentId,
      subscriptionId,
      error: error instanceof Error ? error.message : 'Unknown',
      timestamp: new Date().toISOString(),
    });
  }
}

interface PaymentRequest {
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

    // Parse and validate request
    const rawData = await req.json();
    
    // Server-side validation
    const validation = validatePaymentRequest(rawData);
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
    const { plan, customerData, cardData }: PaymentRequest = rawData;
    const bivvoConfig: BivvoConfig | undefined = rawData.bivvoConfig;
    const affiliateSlug: string | undefined = rawData.affiliateSlug;
    const trackingId: string | undefined = rawData.trackingId;

    let amount: number;
    let recurringAmount: number;
    let planLabel = plan;
    let quote: ReturnType<typeof quoteBivvo> | null = null;

    if (bivvoConfig) {
      try {
        quote = quoteBivvo(bivvoConfig);
      } catch (e) {
        return new Response(JSON.stringify({ success: false, error: 'Configuração inválida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      amount = quote.total1m;
      recurringAmount = quote.totalRec;
      planLabel = quote.planLabel;
    } else {
      const { data: planData, error: planError } = await supabase
        .from('plans').select('price').eq('slug', plan).eq('active', true).maybeSingle();
      if (planError || !planData) {
        return new Response(JSON.stringify({ success: false, error: 'Plano não encontrado ou inativo.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      amount = Number(planData.price);
      recurringAmount = amount;
    }

    // Lookup affiliate (if provided)
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

    console.log('Processing credit card payment for plan:', plan, 'amount:', amount, 'affiliate:', affiliate?.id);

    // 1. Create/Update customer and subscription in our database
    const cleanCpfVal = customerData.cpf.replace(/\D/g, '');
    const cleanPhoneVal = customerData.whatsapp.replace(/\D/g, '');
    const cleanCardNumberVal = cardData.number.replace(/\s/g, '');
    const cleanCepVal = customerData.cep.replace(/\D/g, '');

    const { data: customer, error: customerUpsertError } = await supabase
      .from('customers')
      .upsert({
        name: customerData.name.trim(),
        email: customerData.email.toLowerCase().trim(),
        phone: cleanPhoneVal,
      }, { onConflict: 'email' })
      .select('id')
      .single();

    if (customerUpsertError) throw new Error(`Error saving customer: ${customerUpsertError.message}`);

    const { data: dbSubscription, error: subInsertError } = await supabase
      .from('subscriptions')
      .insert({
        customer_id: customer.id,
        plan_slug: plan,
        users_count: bivvoConfig?.users || 1,
        channels_config: bivvoConfig?.channels || {},
        is_protagonista: bivvoConfig?.protagonista || false,
        has_telefonia: bivvoConfig?.telefonia || false,
        channels_discount: bivvoConfig?.channelsDiscount || 0,
        status: 'active'
      })
      .select('id')
      .single();

    if (subInsertError) throw new Error(`Error saving subscription: ${subInsertError.message}`);


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
      // Update user data
      await supabase.from('users').update({
        name: customerData.name.trim(),
        whatsapp: cleanPhoneVal,
        cpf: cleanCpfVal,
        billing_name: customerData.billingName.trim(),
        cep: cleanCepVal,
        endereco: customerData.endereco.trim(),
        numero: customerData.numero.trim(),
        complemento: customerData.complemento?.trim() || '',
        bairro: customerData.bairro.trim(),
        cidade: customerData.cidade.trim(),
        estado: customerData.estado.toUpperCase(),
      }).eq('id', userId);
    } else {
      // Create new user
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: customerData.name.trim(),
          email: customerData.email.toLowerCase().trim(),
          whatsapp: cleanPhoneVal,
          cpf: cleanCpfVal,
          billing_name: customerData.billingName.trim(),
          cep: cleanCepVal,
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
      const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: customerData.name.trim(),
          cpfCnpj: cleanCpfVal,
          email: customerData.email.toLowerCase().trim(),
          mobilePhone: cleanPhoneVal,
          postalCode: cleanCepVal,
          address: customerData.endereco.trim(),
          addressNumber: customerData.numero.trim(),
          complement: customerData.complemento?.trim() || '',
          province: customerData.bairro.trim(),
          city: customerData.cidade.trim(),
          state: customerData.estado.toUpperCase(),
          externalReference: userId,
          notificationDisabled: true,
        }),
      });

      const customerResult = await customerResponse.json();
      console.log('Asaas customer response:', JSON.stringify(customerResult));

      if (customerResult.errors) {
        throw new Error(`Asaas error: ${customerResult.errors[0]?.description || 'Unknown error'}`);
      }

      asaasCustomerId = customerResult.id;

      // Save asaas_customer_id to user
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);
    }

    // 3. Process payment
    const externalReference = `${userId}_${plan}_${Date.now()}`;
    const creditCard = {
      holderName: cardData.holderName.trim(),
      number: cleanCardNumberVal,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear,
      ccv: cardData.ccv,
    };

    const creditCardHolderInfo = {
      name: customerData.billingName.trim(),
      email: customerData.email.toLowerCase().trim(),
      cpfCnpj: cleanCpfVal,
      phone: cleanPhoneVal,
      postalCode: cleanCepVal,
      addressNumber: customerData.numero.trim(),
      address: customerData.endereco.trim(),
      province: customerData.bairro.trim(),
      city: customerData.cidade.trim(),
      complement: customerData.complemento?.trim() || '',
    };

    let paymentResult: any;
    let paymentType: 'subscription' | 'payment' = 'subscription';

    // Credit card subscription
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 1);

    console.log('Creating credit card subscription...');
    
    const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify({
        customer: asaasCustomerId,
        billingType: 'CREDIT_CARD',
        value: recurringAmount,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: 'MONTHLY',
        description: `Plano ${planLabel}`,
        externalReference: `${userId}_${plan}_subscription`,
        creditCard,
        creditCardHolderInfo,
        discount: amount < recurringAmount ? {
          value: Math.round((recurringAmount - amount) * 100) / 100,
          type: 'FIXED',
          dueDateLimitDays: 0
        } : undefined,
      }),
    });

    paymentResult = await subscriptionResponse.json();
    console.log('Subscription response:', JSON.stringify(paymentResult));

    if (paymentResult.errors) {
      throw new Error(`Subscription error: ${paymentResult.errors[0]?.description || 'Unknown error'}`);
    }

    const subscriptionId = paymentResult.id;

    // Fetch the first payment from the subscription
    console.log('Fetching first payment from subscription...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    const paymentsResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions/${subscriptionId}/payments`, {
      headers: { 'access_token': ASAAS_API_KEY },
    });
    const paymentsResult = await paymentsResponse.json();
    
    if (!paymentsResult.data || paymentsResult.data.length === 0) {
      throw new Error('No payment found for subscription');
    }

    const firstPayment = paymentsResult.data[0];
    const asaasPaymentId = firstPayment.id;

    // 4. Save payment to database
    const paymentData = {
      user_id: userId,
      plan,
      amount,
      status: firstPayment.status === 'CONFIRMED' || firstPayment.status === 'RECEIVED' ? 'approved' : 'pending',
      asaas_payment_id: asaasPaymentId,
      asaas_subscription_id: subscriptionId,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('id')
      .single();

    if (paymentError) {
      console.error('Database save failed after successful subscription', {
        error: paymentError,
        asaasSubscriptionId: subscriptionId,
        timestamp: new Date().toISOString(),
      });

      // Attempt rollback in Asaas
      await refundAsaasPayment(
        null,
        subscriptionId,
        'subscription',
        ASAAS_API_KEY,
        ASAAS_BASE_URL
      );

      throw new Error('Falha ao processar assinatura no banco de dados.');
    }

    // 5. Update user status if approved
    if (paymentData.status === 'approved') {
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expirationDate.toISOString(),
        asaas_subscription_id: subscriptionId,
      }).eq('id', userId);

    }

    // 6. Register affiliate sale + first commission
    if (affiliate && payment) {
      const { data: sale } = await supabase.from('affiliate_sales').insert({
        tracking_id: trackingId,
        affiliate_id: affiliate.id,
        payment_id: payment.id,
        user_id: userId,
        plan_slug: plan,
        plan_label: planLabel,
        config: bivvoConfig ?? {},
        amount_first: amount,
        amount_recurring: recurringAmount,
        commission_percent: affiliate.commission_percent,
        status: paymentData.status === 'approved' ? 'paid' : 'pending',
        asaas_payment_id: asaasPaymentId,
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
          status: paymentData.status === 'approved' ? 'approved' : 'pending',
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment?.id,
      asaasId: paymentResult.id,
      status: paymentData.status,
      userId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro ao processar pagamento';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
