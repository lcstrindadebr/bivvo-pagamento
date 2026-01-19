import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { plan, amount, installments, customerData, cardData }: PaymentRequest = await req.json();

    console.log('Processing payment for plan:', plan, 'amount:', amount);

    // Sanitizar dados
    const cleanCpf = customerData.cpf.replace(/\D/g, '');
    const cleanWhatsapp = customerData.whatsapp.replace(/\D/g, '');
    const cleanCardNumber = cardData.number.replace(/\s/g, '');
    const cleanCep = customerData.cep.replace(/\D/g, '');

    // 1. Criar ou buscar usuário no banco
    let userId: string;
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, asaas_customer_id')
      .eq('email', customerData.email)
      .maybeSingle();

    let asaasCustomerId = existingUser?.asaas_customer_id;

    if (existingUser) {
      userId = existingUser.id;
      // Atualizar dados do usuário
      await supabase.from('users').update({
        name: customerData.name,
        whatsapp: cleanWhatsapp,
        cpf: cleanCpf,
        billing_name: customerData.billingName,
        cep: cleanCep,
        endereco: customerData.endereco,
        numero: customerData.numero,
        complemento: customerData.complemento,
        bairro: customerData.bairro,
        cidade: customerData.cidade,
        estado: customerData.estado,
      }).eq('id', userId);
    } else {
      // Criar novo usuário
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          name: customerData.name,
          email: customerData.email,
          whatsapp: cleanWhatsapp,
          cpf: cleanCpf,
          billing_name: customerData.billingName,
          cep: cleanCep,
          endereco: customerData.endereco,
          numero: customerData.numero,
          complemento: customerData.complemento,
          bairro: customerData.bairro,
          cidade: customerData.cidade,
          estado: customerData.estado,
        })
        .select('id')
        .single();

      if (userError) throw new Error(`Error creating user: ${userError.message}`);
      userId = newUser.id;
    }

    // 2. Criar ou buscar customer no Asaas
    if (!asaasCustomerId) {
      console.log('Creating customer in Asaas...');
      const customerResponse = await fetch(`${ASAAS_BASE_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name: customerData.name,
          cpfCnpj: cleanCpf,
          email: customerData.email,
          mobilePhone: cleanWhatsapp,
          postalCode: cleanCep,
          address: customerData.endereco,
          addressNumber: customerData.numero,
          complement: customerData.complemento || '',
          province: customerData.bairro,
          city: customerData.cidade,
          state: customerData.estado,
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

      // Salvar asaas_customer_id no usuário
      await supabase.from('users').update({ asaas_customer_id: asaasCustomerId }).eq('id', userId);
    }

    // 3. Processar pagamento
    const externalReference = `${userId}_${plan}_${Date.now()}`;
    const creditCard = {
      holderName: cardData.holderName,
      number: cleanCardNumber,
      expiryMonth: cardData.expiryMonth,
      expiryYear: cardData.expiryYear.length === 2 ? `20${cardData.expiryYear}` : cardData.expiryYear,
      ccv: cardData.ccv,
    };

    const creditCardHolderInfo = {
      name: customerData.billingName,
      email: customerData.email,
      cpfCnpj: cleanCpf,
      phone: cleanWhatsapp,
      postalCode: cleanCep,
      addressNumber: customerData.numero,
      address: customerData.endereco,
      province: customerData.bairro,
      city: customerData.cidade,
      complement: customerData.complemento || '',
    };

    let paymentResult: any;
    let paymentType: 'subscription' | 'payment';

    if (plan === 'mensal') {
      // Criar assinatura mensal
      paymentType = 'subscription';
      console.log('Creating subscription...');
      
      const subscriptionResponse = await fetch(`${ASAAS_BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          value: amount,
          cycle: 'MONTHLY',
          description: 'Assinatura Mensal',
          externalReference,
          creditCard,
          creditCardHolderInfo,
        }),
      });

      paymentResult = await subscriptionResponse.json();
      console.log('Subscription response:', JSON.stringify(paymentResult));
    } else {
      // Criar pagamento parcelado
      paymentType = 'payment';
      const installmentCount = installments || (plan === 'semestral' ? 6 : 12);
      const installmentValue = Number((amount / installmentCount).toFixed(2));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);

      console.log('Creating installment payment...');
      
      const paymentResponse = await fetch(`${ASAAS_BASE_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: 'CREDIT_CARD',
          installmentCount,
          installmentValue,
          description: `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          dueDate: dueDate.toISOString().split('T')[0],
          externalReference,
          creditCard,
          creditCardHolderInfo,
        }),
      });

      paymentResult = await paymentResponse.json();
      console.log('Payment response:', JSON.stringify(paymentResult));
    }

    if (paymentResult.errors) {
      throw new Error(`Payment error: ${paymentResult.errors[0]?.description || 'Unknown error'}`);
    }

    // 4. Salvar pagamento no banco
    const paymentData = {
      user_id: userId,
      plan,
      amount,
      status: paymentResult.status === 'ACTIVE' || paymentResult.status === 'CONFIRMED' ? 'approved' : 'pending',
      asaas_payment_id: paymentType === 'payment' ? paymentResult.id : null,
      asaas_subscription_id: paymentType === 'subscription' ? paymentResult.id : null,
    };

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select('id')
      .single();

    if (paymentError) {
      console.error('Error saving payment:', paymentError);
      // TODO: Implementar rollback no Asaas
    }

    // 5. Atualizar status do usuário se aprovado
    if (paymentData.status === 'approved') {
      const expirationDate = new Date();
      if (plan === 'mensal') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else if (plan === 'semestral') {
        expirationDate.setMonth(expirationDate.getMonth() + 6);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      await supabase.from('users').update({
        status: 'ativo',
        plano_ativo: plan,
        data_expiracao: expirationDate.toISOString(),
      }).eq('id', userId);
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
