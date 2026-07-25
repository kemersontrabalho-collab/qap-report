-- Tighten RLS on bulletin_knowledge
DROP POLICY IF EXISTS "Authenticated read knowledge" ON public.bulletin_knowledge;

CREATE POLICY "Owners read own knowledge"
  ON public.bulletin_knowledge
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Owners insert own knowledge"
  ON public.bulletin_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners update own knowledge"
  ON public.bulletin_knowledge
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners delete own knowledge"
  ON public.bulletin_knowledge
  FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Switch match function to SECURITY INVOKER and scope to caller's rows
CREATE OR REPLACE FUNCTION public.match_bulletin_knowledge(_query text, _bulletin_type text DEFAULT NULL::text, _limit integer DEFAULT 5)
 RETURNS TABLE(id uuid, bulletin_type text, category text, title text, occurrence_address text, content text, rank real)
 LANGUAGE sql
 STABLE SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
  SELECT bk.id, bk.bulletin_type, bk.category, bk.title,
         bk.occurrence_address, bk.content,
         ts_rank(bk.search_tsv, plainto_tsquery('portuguese', _query)) AS rank
  FROM public.bulletin_knowledge bk
  WHERE bk.owner_id = auth.uid()
    AND (_bulletin_type IS NULL OR bk.bulletin_type = _bulletin_type)
    AND bk.search_tsv @@ plainto_tsquery('portuguese', _query)
  ORDER BY rank DESC, bk.updated_at DESC
  LIMIT greatest(1, least(_limit, 20));
$function$;