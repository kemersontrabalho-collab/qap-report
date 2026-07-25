-- Funções de consulta pública: não precisam de SECURITY DEFINER
ALTER FUNCTION public.is_premium_user(UUID) SECURITY INVOKER;
ALTER FUNCTION public.is_coupon_valid(TEXT) SECURITY INVOKER;

-- Revogar execução direta de funções de trigger/helpers que não devem ser chamadas por usuários
REVOKE EXECUTE ON FUNCTION public.create_trial_subscription() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_founder_if_match() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_bulletin_to_knowledge() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bulletin_knowledge_tsv_update() FROM anon, authenticated;

-- Garantir que service_role ainda possa executar
GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_founder_if_match() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_bulletin_to_knowledge() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;
GRANT EXECUTE ON FUNCTION public.bulletin_knowledge_tsv_update() TO service_role;
GRANT EXECUTE ON FUNCTION public.is_premium_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_coupon_valid(TEXT) TO service_role;
