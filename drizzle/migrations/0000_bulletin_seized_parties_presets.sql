ALTER TABLE public.bulletins
  ADD COLUMN IF NOT EXISTS seized_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS involved_parties jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE public.bulletin_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  bulletin_type text NOT NULL,
  category text,
  crew_composition text,
  vehicle_prefix text,
  support_crew text,
  keywords text,
  context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulletin_presets TO authenticated;
GRANT ALL ON public.bulletin_presets TO service_role;
ALTER TABLE public.bulletin_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own presets" ON public.bulletin_presets
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX bulletin_presets_user_idx ON public.bulletin_presets(user_id, updated_at DESC);
CREATE TRIGGER bulletin_presets_updated_at BEFORE UPDATE ON public.bulletin_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.anonymize_bulletin_text(_txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
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
      '(?i)(matr[ií]cula|id\s*funcional|rg\s*militar)\s*:?\s*[A-Za-z0-9\.\-]+', '\1: [ID]', 'g'),
      '(?i)\m(v[ií]tima|autor(a)?|condutor(a)?|testemunha|suspeito(a)?|indiciado(a)?|requerente|declarante|propriet[aá]rio(a)?|nome(\s+completo)?|s[ro]\.?|sra\.?)\s*:\s*[A-ZÀ-Ý][\wÀ-ÿ'']*(\s+(d[aeio]s?\s+)?[A-ZÀ-Ý][\wÀ-ÿ'']*)*',
      '\1: [NOME]', 'g'),
      '\m\d{14,17}\M', '[IMEI]', 'g'),
      '(?i)(imei|n[uú]mero\s+de\s+s[eé]rie|numera[cç][aã]o|s[eé]rie)\s*(n[ºo°.]*)?\s*:?\s*[A-Za-z0-9\-]{4,}', '\1 [SERIE]', 'g')
  END
$function$;