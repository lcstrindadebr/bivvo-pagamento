-- SQL para criar ou atualizar o usuário administrador em um Supabase Externo
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@bivvo.com.br';
  v_password TEXT := '@Skol6678';
BEGIN
  -- 1. Verificar se o usuário já existe na tabela de autenticação
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Criar novo usuário na auth.users
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
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"], "role": "admin"}',
      '{"full_name": "Administrador Bivvo"}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      false
    ) RETURNING id INTO v_user_id;
    
    RAISE NOTICE 'Usuário auth criado com ID: %', v_user_id;
  ELSE
    -- Atualizar usuário existente
    UPDATE auth.users 
    SET 
      encrypted_password = crypt(v_password, gen_salt('bf')),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"], "role": "admin"}',
      updated_at = now(),
      email_confirmed_at = COALESCE(email_confirmed_at, now())
    WHERE id = v_user_id;
    
    RAISE NOTICE 'Usuário auth atualizado. ID: %', v_user_id;
  END IF;

  -- 2. Garantir que a Role de Admin esteja na tabela user_roles (IMPORTANTE)
  -- Deletamos roles conflitantes para evitar erros de duplicidade e garantir 'admin'
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin');
  
  RAISE NOTICE 'Role admin atribuída na tabela public.user_roles';

  -- 3. Garantir que o perfil exista na tabela public.users
  INSERT INTO public.users (id, name, email, status, updated_at)
  VALUES (v_user_id, 'Administrador Bivvo', v_email, 'ativo', now())
  ON CONFLICT (email) DO UPDATE SET 
    id = v_user_id,
    name = 'Administrador Bivvo',
    status = 'ativo',
    updated_at = now();

  RAISE NOTICE 'Perfil atualizado na tabela public.users';

END $$;


