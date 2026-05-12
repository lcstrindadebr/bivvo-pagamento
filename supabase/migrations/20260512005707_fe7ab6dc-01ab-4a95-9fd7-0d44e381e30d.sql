-- Inserir usuário na tabela auth.users se não existir
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@bivvo.com.br') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      'admin@bivvo.com.br',
      extensions.crypt('AdminBivvo2026!', extensions.gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Administrador"}',
      now(),
      now(),
      '',
      '',
      '',
      false
    );

    -- Inserir a role de admin para o novo usuário
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new_user_id, 'admin');
  END IF;
END $$;