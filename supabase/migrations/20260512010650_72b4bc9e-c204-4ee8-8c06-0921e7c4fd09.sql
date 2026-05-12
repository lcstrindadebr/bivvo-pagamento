-- Update auth.users to clear any inconsistent state causing "Scan error"
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  email_change = NULL,
  email_change_token_new = NULL,
  email_change_token_current = NULL,
  email_change_confirm_status = 0,
  updated_at = now()
WHERE email = 'admin@bivvo.com.br';

-- Re-verify the role association
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@bivvo.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
