-- SQL para criar ou atualizar o usuário administrador em um Supabase Externo
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar a extensão pgcrypto se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Inserir ou atualizar o usuário na tabela auth.users
-- Nota: O Supabase externo gerencia a tabela auth.users. 
-- Se o usuário já existir, este script atualizará a senha e os metadados.

DO $$
DECLARE
  user_id UUID;
  user_email TEXT := 'admin@bivvo.com.br';
  user_password TEXT := '@Skol6678';
BEGIN
  -- Verifica se o usuário já existe
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    -- Criar novo usuário
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
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      user_email,
      crypt(user_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}',
      '{"full_name": "Administrador Bivvo"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    ) RETURNING id INTO user_id;
    
    RAISE NOTICE 'Usuário criado com ID: %', user_id;
  ELSE
    -- Atualizar senha e metadados do usuário existente
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(user_password, gen_salt('bf')),
      raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}',
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = user_id;
    
    RAISE NOTICE 'Usuário atualizado com ID: %', user_id;
  END IF;

  -- 3. Garantir que o perfil exista na tabela pública (se houver uma tabela profiles ou users)
  -- Ajuste o nome da tabela conforme sua estrutura (ex: profiles, users_public, etc)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.profiles (id, role, updated_at)
    VALUES (user_id, 'admin', now())
    ON CONFLICT (id) DO UPDATE SET role = 'admin', updated_at = now();
  END IF;

END $$;
