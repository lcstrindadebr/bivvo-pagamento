-- Fix security: Remove overly permissive RLS policies
-- Since this is a guest checkout system, edge functions use service_role_key
-- We should revoke direct access from anon and authenticated roles

-- Drop existing overly permissive policies on users table
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;

-- Drop existing overly permissive policies on payments table
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments" ON public.payments;

-- Revoke all direct access from anon role (anonymous users)
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.payments FROM anon;

-- Revoke all direct access from authenticated role (logged in users)
-- Edge functions use service_role which bypasses RLS
REVOKE ALL ON public.users FROM authenticated;
REVOKE ALL ON public.payments FROM authenticated;

-- Note: Edge functions using SUPABASE_SERVICE_ROLE_KEY will still have full access
-- This is the correct pattern for guest checkout systems