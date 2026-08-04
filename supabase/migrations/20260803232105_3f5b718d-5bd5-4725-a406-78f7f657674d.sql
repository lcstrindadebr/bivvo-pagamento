DROP POLICY IF EXISTS "Admins manage tasks" ON public.tasks;
CREATE POLICY "Admins manage tasks"
  ON public.tasks FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.users (id, email, name, status, bivvo_status)
SELECT id, email, 'Admin Bivvo', 'active', 'active'
FROM auth.users
WHERE email = 'admin@bivvo.com.br'
ON CONFLICT (id) DO UPDATE SET bivvo_status = 'active';

GRANT ALL ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;
