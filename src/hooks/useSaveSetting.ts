import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Save one or many settings key/value pairs and log the change in audit_logs.
 * Values are always stored as text; serialize JSON before passing.
 */
export function useSaveSetting() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);

  const save = async (
    values: Record<string, string | null | undefined>,
    opts: { previous?: Record<string, string | undefined>; label?: string } = {},
  ) => {
    setSaving(true);
    try {
      const rows = Object.entries(values)
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) => ({
          key,
          value: (value ?? '') as string,
          updated_at: new Date().toISOString(),
        }));

      if (rows.length === 0) return true;

      const { error } = await supabase.from('settings').upsert(rows);
      if (error) throw error;

      // Best-effort audit log
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('audit_logs').insert({
          user_id: user?.id ?? null,
          action: 'settings.update',
          table_name: 'settings',
          record_id: rows.map((r) => r.key).join(','),
          old_data: opts.previous ? (opts.previous as any) : null,
          new_data: values as any,
        });
      } catch {
        /* ignore audit errors */
      }

      await qc.invalidateQueries({ queryKey: ['site-settings'] });
      toast({
        title: 'Configurações salvas',
        description: opts.label ? `${opts.label} atualizado com sucesso.` : 'Alterações aplicadas.',
      });
      return true;
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return { save, saving };
}
