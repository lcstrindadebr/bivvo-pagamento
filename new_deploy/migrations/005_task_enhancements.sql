-- ==========================================================
-- BIVVO MIGRATION 005 - Task Enhancements
-- Adds: completed_at log, subtasks (jsonb), waiting_third_party flag
-- Idempotent: safe to run multiple times.
-- ==========================================================

-- 1. New columns on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS waiting_third_party boolean NOT NULL DEFAULT false;

-- 2. Auto-populate completed_at when status transitions to/from 'done'
CREATE OR REPLACE FUNCTION public.tasks_set_completed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done' OR NEW.completed_at IS NULL) THEN
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tasks_set_completed_at ON public.tasks;
CREATE TRIGGER trg_tasks_set_completed_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.tasks_set_completed_at();
