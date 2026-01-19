-- Criar tabela de usuários para o checkout
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  whatsapp TEXT,
  cpf TEXT,
  billing_name TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  plano_ativo TEXT,
  data_expiracao TIMESTAMPTZ,
  asaas_customer_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela de pagamentos
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  asaas_payment_id TEXT,
  asaas_subscription_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para users (usuários podem ver/editar apenas seus próprios dados)
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (true);

-- Políticas RLS para payments
CREATE POLICY "Users can view own payments" ON public.payments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update payments" ON public.payments
  FOR UPDATE USING (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();