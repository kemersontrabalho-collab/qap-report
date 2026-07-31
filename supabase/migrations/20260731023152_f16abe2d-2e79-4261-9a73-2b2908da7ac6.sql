DROP POLICY IF EXISTS "Users can read public app settings" ON public.app_settings;

CREATE POLICY "Users can read non sensitive app settings"
ON public.app_settings
FOR SELECT
TO authenticated
USING (key <> 'pix_holder_cpf');

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
      '\1: [NOME]', 'g')
  END
$function$;