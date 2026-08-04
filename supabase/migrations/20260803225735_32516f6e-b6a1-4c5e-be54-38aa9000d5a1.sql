-- Revogar execução pública de funções críticas SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_admin_action() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_on_affiliate_commission_created() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_on_affiliate_commission_deleted() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_affiliate_fields() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) FROM PUBLIC;

-- Garantir acesso apenas a roles autenticadas e serviço
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_admin_action() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_on_affiliate_commission_created() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_on_affiliate_commission_deleted() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_affiliate_fields() TO authenticated, service_role;

-- track_affiliate_click precisa de acesso anônimo pois é usado no checkout sem login
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text, text, text, text, text) TO anon, authenticated, service_role;
