-- =============================================================================
-- BIVVO CHECKOUT - MIGRAÇÃO INICIAL DO BANCO DE DADOS
-- =============================================================================
-- Este arquivo contém a estrutura completa do banco de dados para exportação
-- para um Supabase externo ou PostgreSQL compatível.
-- 
-- Executar na ordem: 001_initial_schema.sql -> 002_security_policies.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABELA: users
-- Armazena informações dos clientes/usuários
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dados pessoais
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT,
    cpf TEXT,
    
    -- Dados de cobrança
    billing_name TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,
    
    -- Integração Asaas
    asaas_customer_id TEXT,
    
    -- Status da assinatura
    plano_ativo TEXT,
    status TEXT DEFAULT 'pending',
    data_expiracao TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON public.users(cpf);
CREATE INDEX IF NOT EXISTS idx_users_asaas_customer_id ON public.users(asaas_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Constraint de email único
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- -----------------------------------------------------------------------------
-- TABELA: payments
-- Armazena histórico de pagamentos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relação com usuário
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    -- Dados do pagamento
    plan TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Integração Asaas
    asaas_payment_id TEXT,
    asaas_subscription_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment_id ON public.payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_subscription_id ON public.payments(asaas_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- -----------------------------------------------------------------------------
-- FUNÇÃO: update_updated_at_column
-- Atualiza automaticamente o campo updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- TRIGGER: Atualizar updated_at na tabela users
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- -----------------------------------------------------------------------------
-- COMENTÁRIOS NAS TABELAS (Documentação)
-- -----------------------------------------------------------------------------
COMMENT ON TABLE public.users IS 'Tabela de usuários/clientes do sistema de checkout';
COMMENT ON TABLE public.payments IS 'Histórico de pagamentos processados via Asaas';

COMMENT ON COLUMN public.users.asaas_customer_id IS 'ID do cliente no gateway Asaas';
COMMENT ON COLUMN public.users.plano_ativo IS 'Plano atualmente ativo: standard, silver, pro';
COMMENT ON COLUMN public.users.status IS 'Status: pending, active, overdue, inactive';
COMMENT ON COLUMN public.users.data_expiracao IS 'Data de expiração do plano atual';

COMMENT ON COLUMN public.payments.asaas_payment_id IS 'ID do pagamento no Asaas';
COMMENT ON COLUMN public.payments.asaas_subscription_id IS 'ID da assinatura no Asaas (PIX/Boleto)';
COMMENT ON COLUMN public.payments.status IS 'Status: pending, paid, overdue, cancelled, refunded, chargeback';
