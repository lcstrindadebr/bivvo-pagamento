import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async (session: any) => {
      if (!session) {
        setIsAdmin(false);
        setLoading(false);
        navigate('/admin/login');
        return;
      }
      // Valida sessão de verdade no servidor
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        await supabase.auth.signOut();
        setIsAdmin(false);
        setLoading(false);
        navigate('/admin/login');
        return;
      }
      const { data: role } = await supabase
        .from('user_roles').select('role')
        .eq('user_id', user.id).eq('role', 'admin').maybeSingle();
      if (!role) {
        await supabase.auth.signOut();
        setIsAdmin(false);
        navigate('/admin/login');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setIsAdmin(false);
        navigate('/admin/login');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => checkAdmin(session));

    return () => subscription.unsubscribe();
  }, [navigate]);

  const callAdmin = useCallback(async (
    action: string,
    opts: { params?: Record<string, string>; method?: 'GET' | 'POST'; body?: unknown } = {}
  ) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      throw new Error('Não autenticado');
    }
    const queryParams = new URLSearchParams({ action, ...(opts.params || {}) });
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?${queryParams.toString()}`;
    const response = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        'Content-Type': 'application/json',
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    if (response.status === 401 || response.status === 403) {
      await supabase.auth.signOut();
      navigate('/admin/login');
      throw new Error('Sessão expirada. Faça login novamente.');
    }
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Erro na requisição');
    }
    return response.json();
  }, [navigate]);

  const adminFetch = useCallback((action: string, params?: Record<string, string>) =>
    callAdmin(action, { params }), [callAdmin]);

  const adminPost = useCallback((action: string, body: unknown) =>
    callAdmin(action, { method: 'POST', body }), [callAdmin]);

  return { isAdmin, loading, adminFetch, adminPost };
}
