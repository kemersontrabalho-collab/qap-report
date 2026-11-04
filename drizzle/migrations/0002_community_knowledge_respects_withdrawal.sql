ALTER TABLE public.community_knowledge
  ADD COLUMN IF NOT EXISTS source_bulletin_id uuid REFERENCES public.bulletins(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS community_knowledge_source_bulletin_idx ON public.community_knowledge(source_bulletin_id);

-- Backfill: vincula registros existentes ao boletim de origem pelo hash do conteúdo anonimizado
UPDATE public.community_knowledge ck
SET source_bulletin_id = b.id
FROM public.bulletins b
WHERE ck.source_bulletin_id IS NULL
  AND b.content IS NOT NULL
  AND ck.content_hash = encode(extensions.digest(lower(regexp_replace(public.anonymize_bulletin_text(b.content), '\s+', ' ', 'g')), 'sha256'), 'hex');

CREATE OR REPLACE FUNCTION public.sync_bulletin_to_community()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _content text;
  _hash text;
BEGIN
  -- Consentimento retirado, boletim excluído ou reaberto: remove a cópia coletiva.
  IF NEW.status <> 'done' OR NEW.deleted_at IS NOT NULL OR COALESCE(NEW.share_to_community, false) = false THEN
    DELETE FROM public.community_knowledge WHERE source_bulletin_id = NEW.id;
    RETURN NEW;
  END IF;

  BEGIN
    _content := public.anonymize_bulletin_text(NEW.content);
    IF _content IS NULL OR length(btrim(_content)) < 200 THEN
      RETURN NEW;
    END IF;

    _hash := encode(extensions.digest(lower(regexp_replace(_content, '\s+', ' ', 'g')), 'sha256'), 'hex');

    INSERT INTO public.community_knowledge (
      bulletin_type, category, title, keywords, context, content, content_hash, source_bulletin_id
    ) VALUES (
      NEW.bulletin_type,
      NEW.category,
      public.anonymize_bulletin_text(NEW.title),
      public.anonymize_bulletin_text(NEW.keywords),
      public.anonymize_bulletin_text(NEW.context),
      _content,
      _hash,
      NEW.id
    )
    ON CONFLICT (content_hash) DO UPDATE
      SET source_bulletin_id = COALESCE(public.community_knowledge.source_bulletin_id, EXCLUDED.source_bulletin_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_bulletin_to_community falhou: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.backfill_community_knowledge(_limit integer DEFAULT 500)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _r record;
  _content text;
  _hash text;
  _scanned int := 0;
  _inserted int := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'fundador'::app_role) THEN
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
      bulletin_type, category, title, keywords, context, content, content_hash, source_bulletin_id
    ) VALUES (
      _r.bulletin_type, _r.category,
      public.anonymize_bulletin_text(_r.title),
      public.anonymize_bulletin_text(_r.keywords),
      public.anonymize_bulletin_text(_r.context),
      _content, _hash, _r.id
    )
    ON CONFLICT (content_hash) DO NOTHING;

    IF FOUND THEN _inserted := _inserted + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('scanned', _scanned, 'inserted', _inserted);
END;
$function$;

-- A busca só devolve registros cujo boletim de origem continua compartilhado.
CREATE OR REPLACE FUNCTION public.match_community_knowledge(_query text, _bulletin_type text DEFAULT NULL::text, _limit integer DEFAULT 3)
 RETURNS TABLE(id uuid, bulletin_type text, category text, title text, occurrence_address text, content text, rank real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT ck.id, ck.bulletin_type, ck.category, ck.title,
         NULL::text AS occurrence_address, ck.content,
         ts_rank(ck.search_tsv, plainto_tsquery('portuguese', _query)) AS rank
  FROM public.community_knowledge ck
  JOIN public.bulletins b ON b.id = ck.source_bulletin_id
  WHERE ck.status = 'aprovado'
    AND b.status = 'done'
    AND b.deleted_at IS NULL
    AND b.share_to_community = true
    AND (_bulletin_type IS NULL OR ck.bulletin_type = _bulletin_type)
    AND ck.search_tsv @@ plainto_tsquery('portuguese', _query)
  ORDER BY rank DESC, ck.updated_at DESC
  LIMIT greatest(1, least(_limit, 10));
$function$;

REVOKE EXECUTE ON FUNCTION public.match_community_knowledge(text, text, integer) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.match_community_knowledge(text, text, integer) TO service_role;