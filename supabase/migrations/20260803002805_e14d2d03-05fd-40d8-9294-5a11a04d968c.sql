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
  IF NEW.status <> 'done' OR NEW.deleted_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  _content := public.anonymize_bulletin_text(NEW.content);
  IF _content IS NULL OR length(btrim(_content)) < 200 THEN
    RETURN NEW;
  END IF;

  _hash := encode(extensions.digest(lower(regexp_replace(_content, '\s+', ' ', 'g')), 'sha256'), 'hex');

  INSERT INTO public.community_knowledge (
    bulletin_type, category, title, keywords, context, content, content_hash
  ) VALUES (
    NEW.bulletin_type,
    NEW.category,
    public.anonymize_bulletin_text(NEW.title),
    public.anonymize_bulletin_text(NEW.keywords),
    public.anonymize_bulletin_text(NEW.context),
    _content,
    _hash
  )
  ON CONFLICT (content_hash) DO NOTHING;

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
  FOR _r IN
    SELECT * FROM public.bulletins
    WHERE status = 'done' AND deleted_at IS NULL
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
      _r.bulletin_type,
      _r.category,
      public.anonymize_bulletin_text(_r.title),
      public.anonymize_bulletin_text(_r.keywords),
      public.anonymize_bulletin_text(_r.context),
      _content,
      _hash
    )
    ON CONFLICT (content_hash) DO NOTHING;

    IF FOUND THEN _inserted := _inserted + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('scanned', _scanned, 'inserted', _inserted);
END;
$function$;