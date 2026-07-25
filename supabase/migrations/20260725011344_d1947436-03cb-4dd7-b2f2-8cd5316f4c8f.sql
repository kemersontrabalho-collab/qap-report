
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_bulletin_knowledge(text, text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_bulletin_knowledge(text, text, int) TO authenticated;
