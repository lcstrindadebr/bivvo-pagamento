-- Função para criar despesa automática de comissão
CREATE OR REPLACE FUNCTION public.fn_on_affiliate_commission_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.expenses (
        description,
        amount,
        category,
        date,
        type,
        is_automatic,
        metadata
    ) VALUES (
        'Comissão Afiliado - ' || NEW.id,
        NEW.commission_amount,
        'Comissões (Afiliados)',
        NEW.created_at,
        'variable',
        true,
        jsonb_build_object('commission_id', NEW.id, 'affiliate_id', NEW.affiliate_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para novas comissões
DROP TRIGGER IF EXISTS tr_on_affiliate_commission_created ON public.affiliate_commissions;
CREATE TRIGGER tr_on_affiliate_commission_created
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_affiliate_commission_created();

-- Se a comissão for cancelada, devemos remover a despesa ou marcar como estornada?
-- Por simplicidade, vamos apenas deletar se a comissão for deletada (raro)
CREATE OR REPLACE FUNCTION public.fn_on_affiliate_commission_deleted()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.expenses 
    WHERE metadata->>'commission_id' = OLD.id::text;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_on_affiliate_commission_deleted ON public.affiliate_commissions;
CREATE TRIGGER tr_on_affiliate_commission_deleted
AFTER DELETE ON public.affiliate_commissions
FOR EACH ROW
EXECUTE FUNCTION public.fn_on_affiliate_commission_deleted();

-- Sincronizar comissões existentes que ainda não estão em expenses
INSERT INTO public.expenses (description, amount, category, date, type, is_automatic, metadata)
SELECT 
    'Comissão Afiliado - ' || id,
    commission_amount,
    'Comissões (Afiliados)',
    created_at,
    'variable',
    true,
    jsonb_build_object('commission_id', id, 'affiliate_id', affiliate_id)
FROM public.affiliate_commissions ac
WHERE NOT EXISTS (
    SELECT 1 FROM public.expenses e 
    WHERE e.metadata->>'commission_id' = ac.id::text
);
