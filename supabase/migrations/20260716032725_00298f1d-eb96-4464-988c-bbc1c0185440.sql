ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tenant_bivvo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_asaas_customer_id_key
  ON public.users (asaas_customer_id)
  WHERE asaas_customer_id IS NOT NULL;
