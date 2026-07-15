-- ==========================================================
-- BIVVO MIGRATION 006 - Finance Metrics Support
-- Adds indexes to speed up monthly expense aggregations used by
-- the dashboard (monthlyExpenses) and by the "Total Despesas (Mês)"
-- card in the expenses screen.
-- No columns are added/removed. Fully idempotent.
-- ==========================================================

-- Faster range queries on expenses.date (mensal, período, etc.)
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (date);

-- Filtragem por categoria (ex.: Comissões (Afiliados))
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses (category);
