// Persistent logger — grava logs em public.system_logs
// para acompanhar as chamadas de APIs externas (ex: Bivvo, Asaas).

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

type Level = 'info' | 'warn' | 'error' | 'debug';

let cached: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  return cached;
}

function safeCtx(ctx: unknown): unknown {
  if (ctx == null) return null;
  try {
    // Trunca strings gigantes para evitar poluir a tabela
    const s = JSON.stringify(ctx, (_k, v) => {
      if (typeof v === 'string' && v.length > 4000) return v.slice(0, 4000) + '…[truncated]';
      return v;
    });
    return JSON.parse(s);
  } catch {
    return { raw: String(ctx).slice(0, 4000) };
  }
}

export async function logEvent(
  source: string,
  level: Level,
  message: string,
  context?: unknown,
): Promise<void> {
  // Sempre loga no console também
  const line = `[${source}] ${message}`;
  if (level === 'error') console.error(line, context ?? '');
  else if (level === 'warn') console.warn(line, context ?? '');
  else console.log(line, context ?? '');

  try {
    await admin().from('system_logs').insert({
      source,
      level,
      message: message.slice(0, 2000),
      context: safeCtx(context) as any,
    });
  } catch (err) {
    console.error('[logger] Falha ao gravar system_logs:', err);
  }
}

export const log = {
  info: (source: string, message: string, context?: unknown) => logEvent(source, 'info', message, context),
  warn: (source: string, message: string, context?: unknown) => logEvent(source, 'warn', message, context),
  error: (source: string, message: string, context?: unknown) => logEvent(source, 'error', message, context),
  debug: (source: string, message: string, context?: unknown) => logEvent(source, 'debug', message, context),
};
