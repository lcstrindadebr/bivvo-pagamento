
-- Colunas de tracking em users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_config_previous jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo jsonb,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_bivvo_at timestamptz,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_value numeric,
  ADD COLUMN IF NOT EXISTS bivvo_config_synced_asaas_at timestamptz;

-- Tabela de log de mudanças
CREATE TABLE IF NOT EXISTS public.bivvo_config_change_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  changed_by uuid,
  changed_by_email text,
  changed_by_name text,
  action text NOT NULL CHECK (action IN ('edit','sync_bivvo','sync_asaas','rollback')),
  config_before jsonb,
  config_after jsonb,
  asaas_value_before numeric,
  asaas_value_after numeric,
  bivvo_relevant_changed boolean NOT NULL DEFAULT false,
  asaas_value_changed boolean NOT NULL DEFAULT false,
  changed_fields text[],
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bivvo_config_change_logs_user_id
  ON public.bivvo_config_change_logs(user_id, created_at DESC);

GRANT SELECT ON public.bivvo_config_change_logs TO authenticated;
GRANT ALL ON public.bivvo_config_change_logs TO service_role;

ALTER TABLE public.bivvo_config_change_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view config change logs"
  ON public.bivvo_config_change_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
