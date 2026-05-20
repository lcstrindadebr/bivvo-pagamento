-- Update existing admin user if email exists, or could be used as a reference to fix password
UPDATE auth.users 
SET 
  encrypted_password = crypt('@Skol6678', gen_salt('bf')),
  raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email = 'admin@bivvo.com.br';

-- Ensure the user has the 'admin' role in your public tables if applicable
-- This depends on your specific schema, commonly a 'profiles' or 'users' table in public
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        UPDATE public.profiles 
        SET role = 'admin'
        WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin@bivvo.com.br');
    END IF;
END $$;