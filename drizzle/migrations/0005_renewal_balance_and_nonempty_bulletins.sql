CREATE OR REPLACE FUNCTION public.approve_pix_payment_request(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _row public.pix_payment_requests%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
  _start timestamptz := now();
  _end timestamptz;
BEGIN
  IF auth.role() <> 'service_role' AND (auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'fundador')) THEN
    RAISE EXCEPTION 'Ação não permitida.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO _row FROM public.pix_payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF _row.status <> 'aguardando_aprovacao' THEN RAISE EXCEPTION 'Esta solicitação já foi processada.'; END IF;
  IF _row.plan <> 'mensal' THEN RAISE EXCEPTION 'Plano inválido.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(_row.user_id::text, 0));
  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _row.user_id FOR UPDATE;
  IF _sub.plan = 'vitalicio' AND _sub.status IN ('active', 'canceled') AND _sub.current_period_end > _start THEN
    UPDATE public.pix_payment_requests SET status = 'aprovado', decided_at = _start, decided_by = auth.uid() WHERE id = _request_id;
    RETURN jsonb_build_object('ok', true, 'user_id', _row.user_id, 'plan', _row.plan, 'lifetime_preserved', true);
  END IF;
  _end := CASE WHEN _sub.plan IN ('mensal', 'premium') AND _sub.status IN ('active', 'canceled') THEN GREATEST(_start, COALESCE(_sub.current_period_end, _start)) ELSE _start END + interval '30 days';
  INSERT INTO public.subscriptions(user_id, status, plan, current_period_start, current_period_end, payment_method, trial_ends_at)
  VALUES (_row.user_id, 'active', 'mensal', _start, _end, 'pix', NULL)
  ON CONFLICT (user_id) DO UPDATE SET status = 'active', plan = 'mensal', current_period_start = _start, current_period_end = _end, payment_method = 'pix', trial_ends_at = NULL, canceled_at = NULL;
  UPDATE public.pix_payment_requests SET status = 'aprovado', decided_at = _start, decided_by = auth.uid() WHERE id = _request_id;
  RETURN jsonb_build_object('ok', true, 'user_id', _row.user_id, 'plan', _row.plan);
END;
$$;
CREATE OR REPLACE FUNCTION public.require_bulletin_narrative()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _text text;
BEGIN
  IF NEW.status <> 'done' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'done' AND NEW.content IS NOT DISTINCT FROM OLD.content THEN RETURN NEW; END IF;
  END IF;
  _text := regexp_replace(COALESCE(NEW.content, ''), '[#*_]', '', 'g');
  _text := regexp_replace(_text, '(?i)(PERGUNTAS[[:space:]]+COMPLEMENTARES|PERGUNTAS[[:space:]]+PENDENTES|DADOS[[:space:]]+FALTANTES)[[:space:]]*:?[\s\S]*$', '', 'g');
  _text := regexp_replace(_text, '\{[^{}]*\}', '', 'g');
  _text := regexp_replace(_text, '(?in)^[[:blank:]]*(t[ií]tulo( do boletim)?[[:blank:]]*:.*|hist[óo]rico([[:blank:]]*/[[:blank:]]*vers[ãa]o policial)?[[:blank:]]*:?|garantias legais[[:blank:]]*:?|tipifica[çc][ãa]o legal[[:blank:]]*:?)$', '', 'g');
  IF _text !~ '[[:alpha:]]' THEN RAISE EXCEPTION 'Escreva ou gere o histórico antes de concluir.' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER require_bulletin_narrative_before_write BEFORE INSERT OR UPDATE OF status, content ON public.bulletins FOR EACH ROW EXECUTE FUNCTION public.require_bulletin_narrative();