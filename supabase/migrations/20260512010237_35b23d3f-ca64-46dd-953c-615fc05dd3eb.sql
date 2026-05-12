-- Ensure the admin user exists and has the correct password
-- This uses the auth.uid() generation logic to set the password hash for 'AdminBivvo2026!'
-- The hash below is for 'AdminBivvo2026!' using bcrypt (standard for Supabase)
UPDATE auth.users 
SET encrypted_password = crypt('AdminBivvo2026!', gen_salt('bf'))
WHERE email = 'admin@bivvo.com.br';

-- Ensure the role is assigned correctly
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'admin@bivvo.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
