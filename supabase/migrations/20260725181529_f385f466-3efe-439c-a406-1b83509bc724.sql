-- Remover execução pública/anônima das funções de trigger
REVOKE EXECUTE ON FUNCTION public.create_trial_subscription() FROM public;

-- has_role é usada internamente pelas políticas RLS; não precisa ser executada diretamente
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM authenticated;

-- Confirmar grants apenas para service_role
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_trial_subscription() TO service_role;
