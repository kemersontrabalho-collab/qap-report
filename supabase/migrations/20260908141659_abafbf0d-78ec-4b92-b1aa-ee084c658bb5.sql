CREATE OR REPLACE FUNCTION public.backfill_community_knowledge(_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _r record;
  _content text;
  _hash text;
  _scanned int := 0;
  _inserted int := 0;
BEGIN
  -- Acesso restrito por GRANT (apenas service_role). Chamadas vindas do painel
  -- administrativo usam service_role, onde auth.uid() é NULL — por isso o guard
  -- anterior baseado em auth.uid() bloqueava 100% das execuções legítimas.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'fundador'::app_role) THEN
    RAISE EXCEPTION 'Ação não permitida.' USING ERRCODE = '42501';
  END IF;

  FOR _r IN
    SELECT * FROM public.bulletins
    WHERE status = 'done' AND deleted_at IS NULL AND share_to_community = true
    ORDER BY updated_at DESC
    LIMIT greatest(1, least(_limit, 2000))
  LOOP
    _scanned := _scanned + 1;
    _content := public.anonymize_bulletin_text(_r.content);
    CONTINUE WHEN _content IS NULL OR length(btrim(_content)) < 200;
    _hash := encode(extensions.digest(lower(regexp_replace(_content, '\s+', ' ', 'g')), 'sha256'), 'hex');

    INSERT INTO public.community_knowledge (
      bulletin_type, category, title, keywords, context, content, content_hash
    ) VALUES (
      _r.bulletin_type, _r.category,
      public.anonymize_bulletin_text(_r.title),
      public.anonymize_bulletin_text(_r.keywords),
      public.anonymize_bulletin_text(_r.context),
      _content, _hash
    )
    ON CONFLICT (content_hash) DO NOTHING;

    IF FOUND THEN _inserted := _inserted + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('scanned', _scanned, 'inserted', _inserted);
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_community_knowledge(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_community_knowledge(integer) TO service_role;