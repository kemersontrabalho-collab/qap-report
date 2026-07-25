
-- =========== ROLES ===========
CREATE TYPE public.app_role AS ENUM ('fundador', 'admin', 'usuario');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Grant founder role when the specific email is verified
CREATE OR REPLACE FUNCTION public.grant_founder_if_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL
     AND lower(NEW.email) = 'kemersontrabalho@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'fundador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_grant_founder
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_founder_if_match();

CREATE TRIGGER on_auth_user_confirmed_grant_founder
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public.grant_founder_if_match();

-- Backfill: if the founder is already registered and confirmed
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'fundador'::public.app_role
FROM auth.users
WHERE lower(email) = 'kemersontrabalho@gmail.com'
  AND email_confirmed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- =========== KNOWLEDGE BASE ===========
CREATE TABLE public.bulletin_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_bulletin_id uuid NOT NULL UNIQUE REFERENCES public.bulletins(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bulletin_type text NOT NULL,
  category text,
  title text NOT NULL,
  occurrence_address text,
  keywords text,
  context text,
  content text NOT NULL,
  search_tsv tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bulletin_knowledge TO authenticated;
GRANT ALL ON public.bulletin_knowledge TO service_role;

ALTER TABLE public.bulletin_knowledge ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read the knowledge base (no PII beyond bulletin fields)
CREATE POLICY "Authenticated read knowledge" ON public.bulletin_knowledge
  FOR SELECT TO authenticated
  USING (true);

CREATE INDEX bulletin_knowledge_tsv_idx
  ON public.bulletin_knowledge USING gin (search_tsv);
CREATE INDEX bulletin_knowledge_type_idx
  ON public.bulletin_knowledge (bulletin_type);

-- Maintain tsvector from the searchable text (Portuguese)
CREATE OR REPLACE FUNCTION public.bulletin_knowledge_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.keywords, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.context, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.occurrence_address, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.content, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER bulletin_knowledge_tsv_trg
BEFORE INSERT OR UPDATE ON public.bulletin_knowledge
FOR EACH ROW EXECUTE FUNCTION public.bulletin_knowledge_tsv_update();

-- Sync knowledge from bulletins when marked done (and remove on undo/delete/trash)
CREATE OR REPLACE FUNCTION public.sync_bulletin_to_knowledge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.bulletin_knowledge WHERE source_bulletin_id = OLD.id;
    RETURN OLD;
  END IF;

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
  RETURN NEW;
END;
$$;

CREATE TRIGGER bulletins_sync_knowledge_ins
AFTER INSERT ON public.bulletins
FOR EACH ROW EXECUTE FUNCTION public.sync_bulletin_to_knowledge();

CREATE TRIGGER bulletins_sync_knowledge_upd
AFTER UPDATE ON public.bulletins
FOR EACH ROW EXECUTE FUNCTION public.sync_bulletin_to_knowledge();

CREATE TRIGGER bulletins_sync_knowledge_del
AFTER DELETE ON public.bulletins
FOR EACH ROW EXECUTE FUNCTION public.sync_bulletin_to_knowledge();

-- Backfill existing done bulletins
INSERT INTO public.bulletin_knowledge (
  source_bulletin_id, owner_id, bulletin_type, category, title,
  occurrence_address, keywords, context, content
)
SELECT id, user_id, bulletin_type, category, title,
       occurrence_address, keywords, context, content
FROM public.bulletins
WHERE status = 'done' AND deleted_at IS NULL
ON CONFLICT (source_bulletin_id) DO NOTHING;

-- Similarity search function used by the app
CREATE OR REPLACE FUNCTION public.match_bulletin_knowledge(
  _query text,
  _bulletin_type text DEFAULT NULL,
  _limit int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  bulletin_type text,
  category text,
  title text,
  occurrence_address text,
  content text,
  rank real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT bk.id, bk.bulletin_type, bk.category, bk.title,
         bk.occurrence_address, bk.content,
         ts_rank(bk.search_tsv, plainto_tsquery('portuguese', _query)) AS rank
  FROM public.bulletin_knowledge bk
  WHERE (_bulletin_type IS NULL OR bk.bulletin_type = _bulletin_type)
    AND bk.search_tsv @@ plainto_tsquery('portuguese', _query)
  ORDER BY rank DESC, bk.updated_at DESC
  LIMIT greatest(1, least(_limit, 20));
$$;

GRANT EXECUTE ON FUNCTION public.match_bulletin_knowledge(text, text, int) TO authenticated;
