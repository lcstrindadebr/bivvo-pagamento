-- SQL para criar ou atualizar o usuário administrador em um Supabase Externo
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  user_id UUID;
  user_email TEXT := 'admin@bivvo.com.br';
  user_password TEXT := '@Skol6678';
BEGIN
  -- Verifica se o usuário já existe na tabela de autenticação
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    -- Criar novo usuário com metadados de admin
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
      email_change,
      email_change_token_new,
      recovery_token,
      is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}',
      '{"full_name": "Administrador Bivvo", "role": "admin"}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      false
    ) RETURNING id INTO user_id;
    
    RAISE NOTICE 'Usuário criado com ID: %', user_id;
  ELSE
    -- Atualizar usuário existente para garantir que seja admin
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(user_password, gen_salt('bf')),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"], "role": "admin"}',
      raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}',
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = user_id;
    
    RAISE NOTICE 'Usuário atualizado como admin. ID: %', user_id;
  END IF;

  -- 3. Inserir ou atualizar na tabela public.profiles (Obrigatório para o sistema reconhecer como admin)
  -- Se a tabela não existir, o script apenas ignora
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (id, role, full_name, updated_at)
    VALUES (user_id, 'admin', 'Administrador Bivvo', now())
    ON CONFLICT (id) DO UPDATE SET 
      role = 'admin', 
      updated_at = now();
    
    RAISE NOTICE 'Perfil atualizado na tabela public.profiles';
  END IF;

END $$;

