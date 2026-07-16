ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS bivvo_status text,
  ADD COLUMN IF NOT EXISTS bivvo_status_checked_at timestamptz;