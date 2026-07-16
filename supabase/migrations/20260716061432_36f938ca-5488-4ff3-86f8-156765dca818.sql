
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS person_type TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS bivvo_config JSONB,
  ADD COLUMN IF NOT EXISTS bivvo_tenant_id TEXT,
  ADD COLUMN IF NOT EXISTS tenant_provisioned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_provision_error TEXT;

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS bivvo_config JSONB;

INSERT INTO public.settings (key, value)
VALUES ('support_whatsapp', '5511936230279')
ON CONFLICT (key) DO NOTHING;
