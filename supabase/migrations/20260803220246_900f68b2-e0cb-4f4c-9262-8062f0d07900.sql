ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS tenant_provisioned_at timestamptz,
  ADD COLUMN IF NOT EXISTS tenant_provision_error text;
