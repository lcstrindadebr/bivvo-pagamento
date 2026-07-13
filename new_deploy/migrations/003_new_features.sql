-- =====================================================================
-- 003_new_features.sql
-- Schema para novas funcionalidades:
--   1. Tabela `tasks` (Tarefas no painel admin)
--   2. Tabela `official_templates` (Modelos de Template para API Oficial)
--   3. Coluna opcional para desconto do módulo de disparo em afiliados
-- IDEMPOTENTE — pode ser executado várias vezes sem quebrar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) TASKS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo',     -- todo | in_progress | done
  priority    TEXT NOT NULL DEFAULT 'medium',   -- low | medium | high
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage tasks" ON public.tasks;
CREATE POLICY "Admins can manage tasks"
  ON public.tasks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON public.tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2) OFFICIAL TEMPLATES (modelos para API oficial)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.official_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  body_text   TEXT NOT NULL,
  media_type  TEXT DEFAULT 'none',              -- none | image | video | document
  media_url   TEXT,
  buttons     JSONB DEFAULT '[]'::jsonb,        -- [{type, text, url?, phone?}]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_templates TO authenticated;
GRANT ALL ON public.official_templates TO service_role;

ALTER TABLE public.official_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage templates" ON public.official_templates;
CREATE POLICY "Admins can manage templates"
  ON public.official_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_official_templates_updated_at ON public.official_templates;
CREATE TRIGGER trg_official_templates_updated_at
  BEFORE UPDATE ON public.official_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 3) STORAGE BUCKET para mídias de marketing / templates
-- ---------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing', 'marketing', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Leitura pública dos arquivos no bucket marketing
DROP POLICY IF EXISTS "Marketing public read" ON storage.objects;
CREATE POLICY "Marketing public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'marketing');

-- Apenas admins podem subir/alterar/remover arquivos
DROP POLICY IF EXISTS "Marketing admin write" ON storage.objects;
CREATE POLICY "Marketing admin write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'marketing' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketing admin update" ON storage.objects;
CREATE POLICY "Marketing admin update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'marketing' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Marketing admin delete" ON storage.objects;
CREATE POLICY "Marketing admin delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'marketing' AND public.has_role(auth.uid(), 'admin'));

-- =====================================================================
-- FIM
-- Aplicação esperada:
--   psql "$DATABASE_URL" -f new_deploy/migrations/003_new_features.sql
-- =====================================================================
