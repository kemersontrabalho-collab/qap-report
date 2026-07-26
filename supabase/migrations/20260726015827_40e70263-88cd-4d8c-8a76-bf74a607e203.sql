
CREATE TABLE public.bulletin_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

GRANT SELECT ON public.bulletin_templates TO authenticated;
GRANT ALL ON public.bulletin_templates TO service_role;
ALTER TABLE public.bulletin_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read templates"
  ON public.bulletin_templates FOR SELECT
  TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.bulletin_templates_tsv_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category,'')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.keywords,'')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.context,'')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.occurrence_address,'')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.content,'')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bulletin_templates_tsv
BEFORE INSERT OR UPDATE ON public.bulletin_templates
FOR EACH ROW EXECUTE FUNCTION public.bulletin_templates_tsv_update();

CREATE INDEX bulletin_templates_tsv_idx ON public.bulletin_templates USING GIN (search_tsv);

CREATE OR REPLACE FUNCTION public.match_bulletin_templates(_query text, _bulletin_type text DEFAULT NULL, _limit integer DEFAULT 3)
RETURNS TABLE(id uuid, bulletin_type text, category text, title text, occurrence_address text, content text, rank real)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT bt.id, bt.bulletin_type, bt.category, bt.title,
         bt.occurrence_address, bt.content,
         ts_rank(bt.search_tsv, plainto_tsquery('portuguese', _query)) AS rank
  FROM public.bulletin_templates bt
  WHERE (_bulletin_type IS NULL OR bt.bulletin_type = _bulletin_type)
    AND bt.search_tsv @@ plainto_tsquery('portuguese', _query)
  ORDER BY rank DESC, bt.updated_at DESC
  LIMIT greatest(1, least(_limit, 10));
$$;
