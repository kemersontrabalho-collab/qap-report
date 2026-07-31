REVOKE ALL ON FUNCTION public.review_community_knowledge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_community_knowledge(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.sync_bulletin_to_community() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.community_knowledge_tsv_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.anonymize_bulletin_text(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.anonymize_bulletin_text(text) TO authenticated;