-- Adicionar novos campos à tabela de despesas
ALTER TABLE public.expenses 
ADD COLUMN payment_method TEXT DEFAULT 'one_time' CHECK (payment_method IN ('one_time', 'recurring', 'installments')),
ADD COLUMN installments_total INTEGER,
ADD COLUMN installment_number INTEGER,
ADD COLUMN recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'weekly', 'yearly')),
ADD COLUMN parent_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE;

-- Criar índice para facilitar busca por séries
CREATE INDEX idx_expenses_parent_id ON public.expenses(parent_id);
