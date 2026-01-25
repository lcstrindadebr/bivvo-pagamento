-- =============================================================================
-- BIVVO CHECKOUT - POLÍTICAS DE SEGURANÇA (RLS)
-- =============================================================================
-- Este arquivo configura Row Level Security para proteger os dados.
-- IMPORTANTE: Este projeto utiliza Edge Functions com service_role para
-- todas as operações, então as políticas aqui são uma camada extra de segurança.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Habilitar RLS nas tabelas
-- -----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- OPÇÃO 1: Acesso total bloqueado para roles públicos
-- Recomendado quando todas as operações são feitas via Edge Functions
-- -----------------------------------------------------------------------------

-- Revogar acesso direto às tabelas
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.payments FROM anon, authenticated;

-- Garantir que apenas service_role pode acessar
GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.payments TO service_role;

-- -----------------------------------------------------------------------------
-- OPÇÃO 2: Políticas granulares (descomente se precisar de acesso direto)
-- Use esta opção se implementar autenticação de usuários no frontend
-- -----------------------------------------------------------------------------

/*
-- Política: Usuários podem ver seus próprios dados
CREATE POLICY "users_select_own" ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Política: Usuários podem atualizar seus próprios dados
CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = id::text);

-- Política: Usuários podem ver seus próprios pagamentos
CREATE POLICY "payments_select_own" ON public.payments
    FOR SELECT
    TO authenticated
    USING (user_id IN (
        SELECT id FROM public.users WHERE id::text = auth.uid()::text
    ));
*/

-- -----------------------------------------------------------------------------
-- SEGURANÇA ADICIONAL
-- -----------------------------------------------------------------------------

-- Prevenir exclusão acidental de dados
-- (Descomente se quiser ativar)
/*
CREATE POLICY "prevent_delete_users" ON public.users
    FOR DELETE
    TO authenticated
    USING (false);

CREATE POLICY "prevent_delete_payments" ON public.payments
    FOR DELETE
    TO authenticated
    USING (false);
*/
