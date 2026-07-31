-- 1. Tabela do pool coletivo anônimo
CREATE TABLE public.community_knowledge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bulletin_type text NOT NULL,
  category text,
  title text NOT NULL,
  keywords text,
  context text,
  content text NOT NULL,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  approved_at timestamptz,
  approved_by uuid,
  search_tsv tsvector,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT community_knowledge_status_chk CHECK (status IN ('pendente','aprovado','rejeitado')),
  CONSTRAINT community_knowledge_hash_uq UNIQUE (content_hash)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_knowledge TO authenticated;
GRANT ALL ON public.community_knowledge TO service_role;

ALTER TABLE public.community_knowledge ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage community knowledge"
  ON public.community_knowledge
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'fundador'::app_role));

CREATE INDEX community_knowledge_tsv_idx ON public.community_knowledge USING gin (search_tsv);
CREATE INDEX community_knowledge_status_idx ON public.community_knowledge (status, updated_at DESC);

-- 2. Anonimização
CREATE OR REPLACE FUNCTION public.anonymize_bulletin_text(_txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN _txt IS NULL THEN NULL ELSE
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
    regexp_replace(
      _txt,
      '\d{3}\.?\d{3}\.?\d{3}-?\d{2}', '[CPF]', 'g'),
      '\d{2}\.?\d{3}\.?\d{3}/?\d{4}-?\d{2}', '[CNPJ]', 'g'),
      '\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}', '[TELEFONE]', 'g'),
      '\m[A-Za-z]{3}[-\s]?\d[A-Za-z0-9]\d{2}\M', '[PLACA]', 'g'),
      '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '[EMAIL]', 'g'),
      '\m\d{1,2}/\d{1,2}/\d{2,4}\M', '[DATA]', 'g'),
      '\m\d{1,2}\.\d{3}\.\d{3}-?[0-9Xx]?\M', '[RG]', 'g'),
      '(?i)(prefixo\s*(da\s*)?(viatura)?\s*:?\s*)[A-Za-z0-9\-]+', '\1[PREFIXO]', 'g'),
      '(?i)(matr[ií]cula|id\s*funcional|rg\s*militar)\s*:?\s*[A-Za-z0-9\.\-]+', '\1: [ID]', 'g')
  END
$$;

-- 3. tsvector
CREATE OR REPLACE FUNCTION public.community_knowledge_tsv_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.search_tsv :=
    setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.keywords, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.context, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.content, '')), 'D');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER community_knowledge_tsv
  BEFORE INSERT OR UPDATE ON public.community_knowledge
  FOR EACH ROW EXECUTE FUNCTION public.community_knowledge_tsv_update();

-- 4. Alimentação a partir de boletins concluídos (anônima, permanente)
CREATE OR REPLACE FUNCTION public.sync_bulletin_to_community()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  _hash := encode(digest(lower(regexp_replace(_content, '\s+', ' ', 'g')), 'sha256'), 'hex');

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
$$;

CREATE TRIGGER bulletins_sync_community_ins
  AFTER INSERT ON public.bulletins
  FOR EACH ROW EXECUTE FUNCTION public.sync_bulletin_to_community();

CREATE TRIGGER bulletins_sync_community_upd
  AFTER UPDATE ON public.bulletins
  FOR EACH ROW EXECUTE FUNCTION public.sync_bulletin_to_community();

-- 5. Busca (somente aprovados)
CREATE OR REPLACE FUNCTION public.match_community_knowledge(_query text, _bulletin_type text DEFAULT NULL::text, _limit integer DEFAULT 3)
RETURNS TABLE(id uuid, bulletin_type text, category text, title text, occurrence_address text, content text, rank real)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ck.id, ck.bulletin_type, ck.category, ck.title,
         NULL::text AS occurrence_address, ck.content,
         ts_rank(ck.search_tsv, plainto_tsquery('portuguese', _query)) AS rank
  FROM public.community_knowledge ck
  WHERE auth.uid() IS NOT NULL
    AND ck.status = 'aprovado'
    AND (_bulletin_type IS NULL OR ck.bulletin_type = _bulletin_type)
    AND ck.search_tsv @@ plainto_tsquery('portuguese', _query)
  ORDER BY rank DESC, ck.updated_at DESC
  LIMIT greatest(1, least(_limit, 10));
$$;

REVOKE EXECUTE ON FUNCTION public.match_community_knowledge(text, text, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.match_community_knowledge(text, text, integer) TO authenticated;

-- 6. Curadoria (fundador)
CREATE OR REPLACE FUNCTION public.review_community_knowledge(_id uuid, _decision text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'fundador'::app_role) THEN
    RAISE EXCEPTION 'Ação não permitida.' USING ERRCODE = '42501';
  END IF;
  IF _decision NOT IN ('aprovado','rejeitado') THEN
    RAISE EXCEPTION 'Decisão inválida.';
  END IF;

  UPDATE public.community_knowledge
    SET status = _decision,
        approved_at = CASE WHEN _decision = 'aprovado' THEN now() ELSE NULL END,
        approved_by = CASE WHEN _decision = 'aprovado' THEN _uid ELSE NULL END
    WHERE id = _id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro não encontrado.';
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', _decision);
END;
$$;