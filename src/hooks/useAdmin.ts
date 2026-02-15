import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        setLoading(false);
        navigate('/admin/login');
        return;
      }

      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (!role) {
        await supabase.auth.signOut();
        setIsAdmin(false);
        navigate('/admin/login');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    };

    checkAdmin();
  }, [navigate]);

  const adminFetch = useCallback(async (action: string, params?: Record<string, string>) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Não autenticado');

    const queryParams = new URLSearchParams({ action, ...params });
    const { data, error } = await supabase.functions.invoke('admin-api', {
      body: null,
      headers: {},
    });

    // Use direct fetch for GET with query params
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api?${queryParams.toString()}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro na requisição');
    }

    return response.json();
  }, []);

  return { isAdmin, loading, adminFetch };
}
