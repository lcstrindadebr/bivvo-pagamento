import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan prices - server-side source of truth
const PLAN_PRICES: Record<string, number> = {
  standard: 147.90,
  silver: 287.90,
  pro: 429.90,
};

const VALID_PLANS = ['standard', 'silver', 'pro'];

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

// Comprehensive input validation
function validatePaymentRequest(data: any): { valid: boolean; error?: string } {
  // Plan validation
  if (!data.plan || !VALID_PLANS.includes(data.plan)) {
    return { valid: false, error: 'Invalid plan' };
  }
  
  // Amount validation - must match plan price
  const expectedPrice = PLAN_PRICES[data.plan];
  if (typeof data.amount !== 'number' || Math.abs(data.amount - expectedPrice) > 0.01) {
    return { valid: false, error: 'Invalid amount for plan' };
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

// Helper function to create customer in Asaas
async function createAsaasCustomer(
  customerData: any,
  cleanCpf: string,
  cleanWhatsapp: string,
  cleanCep: string,
  userId: string,
  apiKey: string,
  baseUrl: string
): Promise<string> {
  console.log('Creating customer in Asaas...');
  const customerResponse = await fetch(`${baseUrl}/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': apiKey,
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
      notificationDisabled: true,
    }),
  });

  const customerResult = await customerResponse.json();
  console.log('Asaas customer response:', JSON.stringify(customerResult));

  if (customerResult.errors) {
    throw new Error(`Asaas error: ${customerResult.errors[0]?.description || 'Unknown error'}`);
  }

  return customerResult.id;
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
    
    // Use server-side price (ignore client-provided amount for security)
    const amount = PLAN_PRICES[plan];

    console.log('Processing payment for plan:', plan, 'amount:', amount);

    // Sanitize data
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanWhatsapp = customerData.whatsapp.replace(/\D/g, '');
    const cleanCardNumber = cardData.number.replace(/\s/g, '');
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
      // Update user data
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
      // Create new user
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
      asaasCustomerId = await createAsaasCustomer(
        customerData, cleanCpf, cleanWhatsapp, cleanCep, userId,
        ASAAS_API_KEY, ASAAS_BASE_URL
      );
      // Save asaas_customer_id to user
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);
    }

    // 3. Process payment
    const externalReference = `${userId}_${plan}_${Date.now()}`;
    const creditCard = {
      holderName: cardData.holderName.trim(),
      number: cleanCardNumber,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear,
      ccv: cardData.ccv,
    };

    const creditCardHolderInfo = {
      name: customerData.billingName.trim(),
      email: customerData.email.toLowerCase().trim(),
      cpfCnpj: cleanCpf,
      phone: cleanWhatsapp,
      postalCode: cleanCep,
      addressNumber: customerData.numero.trim(),
      address: customerData.endereco.trim(),
      province: customerData.bairro.trim(),
      city: customerData.cidade.trim(),
      complement: customerData.complemento?.trim() || '',
    };

    const paymentType: 'subscription' | 'payment' = 'payment';

    // Single payment for all plans
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    console.log('Creating payment...');
    
    const createPayment = async (customerId: string) => {
      const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY!,
        },
        body: JSON.stringify({
          customer: customerId,
          billingType: 'CREDIT_CARD',
          value: amount,
          description: `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          dueDate: dueDate.toISOString().split('T')[0],
          externalReference,
          creditCard,
          creditCardHolderInfo,
        }),
      });

      return paymentResponse.json();
    };

    let paymentResult = await createPayment(asaasCustomerId!);
    console.log('Payment response:', JSON.stringify(paymentResult));

    // Handle case where customer was deleted in Asaas but still exists in our DB
    if (paymentResult.errors) {
      const errorDesc = paymentResult.errors[0]?.description || '';
      const isRemovedCustomer = errorDesc.includes('cliente removido') || 
                                 errorDesc.includes('customer removed') ||
                                 errorDesc.includes('invalid_object');
      
      if (isRemovedCustomer) {
        console.log('Customer was removed from Asaas, creating new customer...');
        
        // Create new customer in Asaas
        asaasCustomerId = await createAsaasCustomer(
          customerData, cleanCpf, cleanWhatsapp, cleanCep, userId,
          ASAAS_API_KEY, ASAAS_BASE_URL
        );
        await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);

        // Retry payment with new customer
        paymentResult = await createPayment(asaasCustomerId);
        console.log('Retry payment response:', JSON.stringify(paymentResult));
      }

      if (paymentResult.errors) {
        throw new Error(`Payment error: ${paymentResult.errors[0]?.description || 'Unknown error'}`);
      }
    }

    // 4. Save payment to database
    const paymentData = {
      user_id: userId,
      plan,
      amount,
      status: paymentResult.status === 'CONFIRMED' ? 'approved' : 'pending',
      asaas_payment_id: paymentResult.id,
      asaas_subscription_id: null,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('id')
      .single();

    if (paymentError) {
      console.error('Database save failed after successful payment', {
        error: paymentError,
        asaasPaymentId: paymentResult.id,
        timestamp: new Date().toISOString(),
      });

      // Attempt rollback in Asaas
      await refundAsaasPayment(
        paymentResult.id,
        null,
        paymentType,
        ASAAS_API_KEY,
        ASAAS_BASE_URL
      );

      throw new Error('Falha ao processar pagamento. Nenhuma cobrança foi efetivada.');
    }

    // 5. Update user status if approved
    if (paymentData.status === 'approved') {
      const expirationDate = new Date();
      // All plans give 1 year access
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expirationDate.toISOString(),
      }).eq('id', userId);
    }

    console.log('Payment processed successfully');

    return new Response(JSON.stringify({
      success: true,
      paymentId: payment.id,
      status: paymentData.status,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Payment error:', error);
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
