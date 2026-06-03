-- Tabela de tarefas
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Permissões para tarefas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

-- RLS para tarefas
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage tasks" 
ON public.tasks
FOR ALL
USING (true);

-- Atualizar preço do módulo de disparo se houver uma tabela de extras/configuração
-- No projeto, o valor é fixo no código, mas se houver uma tabela de planos, podemos atualizar referências.
-- Como não identifiquei uma tabela específica de 'extras', o ajuste via código no `bivvo-calc.ts` é o principal.

-- Garantir que a tabela de templates tenha acesso correto (reforço)
GRANT ALL ON public.official_templates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.official_templates TO authenticated;