ALTER TABLE public.users ADD COLUMN asaas_subscription_id TEXT;
CREATE INDEX idx_users_asaas_sub ON public.users(asaas_subscription_id);
