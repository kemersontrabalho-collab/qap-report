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

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_bulletin_to_community falhou: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_bulletin_to_knowledge()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bulletin_knowledge WHERE source_bulletin_id = OLD.id;
    RETURN OLD;
  END IF;

  BEGIN
    IF NEW.status = 'done' AND NEW.deleted_at IS NULL THEN
      INSERT INTO public.bulletin_knowledge AS bk (
        source_bulletin_id, owner_id, bulletin_type, category, title,
        occurrence_address, keywords, context, content
      ) VALUES (
        NEW.id, NEW.user_id, NEW.bulletin_type, NEW.category, NEW.title,
        NEW.occurrence_address, NEW.keywords, NEW.context, NEW.content
      )
      ON CONFLICT (source_bulletin_id) DO UPDATE SET
        bulletin_type = EXCLUDED.bulletin_type,
        category = EXCLUDED.category,
        title = EXCLUDED.title,
        occurrence_address = EXCLUDED.occurrence_address,
        keywords = EXCLUDED.keywords,
        context = EXCLUDED.context,
        content = EXCLUDED.content;
    ELSE
      DELETE FROM public.bulletin_knowledge WHERE source_bulletin_id = NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'sync_bulletin_to_knowledge falhou: %', SQLERRM;
  END;

  RETURN NEW;
END;
$function$;