UPDATE public.users
SET bivvo_tenant_id = tenant_bivvo
WHERE tenant_bivvo IS NOT NULL
  AND (bivvo_tenant_id IS NULL OR bivvo_tenant_id = '');

ALTER TABLE public.users DROP COLUMN IF EXISTS tenant_bivvo;