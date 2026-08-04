-- 1. Criação da tabela de segredos de administrador (caso não exista por migrações anteriores)
CREATE TABLE IF NOT EXISTS public.admin_secrets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. Habilitação de RLS e Políticas Restritivas
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;

-- Remove qualquer política existente para garantir um estado limpo
DROP POLICY IF EXISTS "Admins manage secrets" ON public.admin_secrets;

-- Política: Somente admins podem ver ou gerenciar segredos
CREATE POLICY "Admins manage secrets" 
ON public.admin_secrets 
FOR ALL 
TO authenticated 
USING (public.is_admin());

-- 3. Grants de Acesso à API (Data API)
-- Bloqueamos anon e restringimos authenticated ao admin via RLS
REVOKE ALL ON public.admin_secrets FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_secrets TO authenticated;
GRANT ALL ON public.admin_secrets TO service_role;

-- 4. Função de Log de Auditoria Avançada (Security Definer)
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para logar alterações em segredos
DROP TRIGGER IF EXISTS audit_admin_secrets ON public.admin_secrets;
CREATE TRIGGER audit_admin_secrets
AFTER INSERT OR UPDATE OR DELETE ON public.admin_secrets
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
