
-- =========================================================
-- 1. TABELA pix_payment_requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.pix_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL CHECK (plan IN ('mensal', 'anual')),
  amount_brl NUMERIC(10, 2) NOT NULL CHECK (amount_brl > 0),
  status TEXT NOT NULL DEFAULT 'aguardando_aprovacao'
    CHECK (status IN ('aguardando_aprovacao', 'aprovado', 'rejeitado', 'cancelado')),
  user_email TEXT,
  user_note TEXT,
  admin_note TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Um usuário só pode ter UMA solicitação pendente por vez (anti-spam)
CREATE UNIQUE INDEX IF NOT EXISTS pix_payment_requests_one_pending_per_user
  ON public.pix_payment_requests (user_id)
  WHERE status = 'aguardando_aprovacao';

CREATE INDEX IF NOT EXISTS pix_payment_requests_status_created_idx
  ON public.pix_payment_requests (status, created_at DESC);

GRANT SELECT, INSERT ON public.pix_payment_requests TO authenticated;
GRANT ALL ON public.pix_payment_requests TO service_role;

ALTER TABLE public.pix_payment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pix requests"
  ON public.pix_payment_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own pix requests"
  ON public.pix_payment_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Fundador reads all pix requests"
  ON public.pix_payment_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'fundador'::app_role));

-- Trigger updated_at
CREATE TRIGGER pix_payment_requests_set_updated
  BEFORE UPDATE ON public.pix_payment_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2. RPCs (SECURITY DEFINER) — fluxo de Pix
-- =========================================================

-- Criar solicitação de Pix (atômico, previne duplicidade)
CREATE OR REPLACE FUNCTION public.create_pix_payment_request(_plan TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _amount NUMERIC(10, 2);
  _existing_id UUID;
  _new_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.' USING ERRCODE = '28000';
  END IF;

  IF _plan NOT IN ('mensal', 'anual') THEN
    RAISE EXCEPTION 'Plano inválido.';
  END IF;

  _amount := CASE WHEN _plan = 'mensal' THEN 10.00 ELSE 90.00 END;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  -- Já existe pendente? Retorna a existente ao invés de duplicar.
  SELECT id INTO _existing_id
  FROM public.pix_payment_requests
  WHERE user_id = _uid AND status = 'aguardando_aprovacao'
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_pending', true,
      'request_id', _existing_id
    );
  END IF;

  INSERT INTO public.pix_payment_requests (user_id, plan, amount_brl, user_email)
  VALUES (_uid, _plan, _amount, _email)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_pending', false,
    'request_id', _new_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_pix_payment_request(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_pix_payment_request(TEXT) TO authenticated;

-- Cancelar a própria solicitação pendente
CREATE OR REPLACE FUNCTION public.cancel_pix_payment_request(_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.pix_payment_requests%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _row FROM public.pix_payment_requests
  WHERE id = _request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;
  IF _row.user_id <> _uid THEN
    RAISE EXCEPTION 'Ação não permitida.';
  END IF;
  IF _row.status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Só é possível cancelar solicitações pendentes.';
  END IF;

  UPDATE public.pix_payment_requests
    SET status = 'cancelado', decided_at = now()
    WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pix_payment_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_pix_payment_request(UUID) TO authenticated;

-- Aprovar solicitação (fundador/admin) — ativa assinatura com validade correta
CREATE OR REPLACE FUNCTION public.approve_pix_payment_request(_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.pix_payment_requests%ROWTYPE;
  _days INT;
  _new_end TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'fundador'::app_role) THEN
    RAISE EXCEPTION 'Ação não permitida.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.pix_payment_requests
  WHERE id = _request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;
  IF _row.status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada.';
  END IF;

  _days := CASE WHEN _row.plan = 'mensal' THEN 30 ELSE 365 END;
  _new_end := now() + make_interval(days => _days);

  INSERT INTO public.subscriptions (
    user_id, status, plan, current_period_start, current_period_end, payment_method
  )
  VALUES (_row.user_id, 'active', _row.plan, now(), _new_end, 'pix')
  ON CONFLICT (user_id) DO UPDATE SET
    status = 'active',
    plan = _row.plan,
    current_period_start = now(),
    current_period_end = GREATEST(public.subscriptions.current_period_end, _new_end),
    payment_method = 'pix',
    canceled_at = NULL;

  UPDATE public.pix_payment_requests
    SET status = 'aprovado',
        decided_at = now(),
        decided_by = _uid
    WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true, 'user_id', _row.user_id, 'plan', _row.plan);
END;
$$;

REVOKE ALL ON FUNCTION public.approve_pix_payment_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pix_payment_request(UUID) TO authenticated, service_role;

-- Rejeitar solicitação (fundador/admin)
CREATE OR REPLACE FUNCTION public.reject_pix_payment_request(_request_id UUID, _reason TEXT DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.pix_payment_requests%ROWTYPE;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'fundador'::app_role) THEN
    RAISE EXCEPTION 'Ação não permitida.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO _row FROM public.pix_payment_requests
  WHERE id = _request_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitação não encontrada.';
  END IF;
  IF _row.status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Esta solicitação já foi processada.';
  END IF;

  UPDATE public.pix_payment_requests
    SET status = 'rejeitado',
        decided_at = now(),
        decided_by = _uid,
        admin_note = _reason
    WHERE id = _request_id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.reject_pix_payment_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_pix_payment_request(UUID, TEXT) TO authenticated, service_role;

-- =========================================================
-- 3. Cupons — sanitização automática + índice case-insensitive
-- =========================================================

-- Normaliza códigos existentes para MAIÚSCULAS antes do índice único
UPDATE public.coupons SET code = upper(regexp_replace(code, '[^A-Za-z0-9]', '', 'g'));

-- Índice único case-insensitive (garante que não haja dois cupons "abc" e "ABC")
DROP INDEX IF EXISTS coupons_code_ci_key;
CREATE UNIQUE INDEX coupons_code_ci_key ON public.coupons (upper(code));

-- Trigger que força formato válido e MAIÚSCULAS na hora do insert/update
CREATE OR REPLACE FUNCTION public.coupons_normalize_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.code := upper(regexp_replace(coalesce(NEW.code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(NEW.code) < 4 THEN
    RAISE EXCEPTION 'Código de cupom inválido: use apenas letras e números (mínimo 4 caracteres).';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS coupons_normalize_code_tr ON public.coupons;
CREATE TRIGGER coupons_normalize_code_tr
  BEFORE INSERT OR UPDATE OF code ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.coupons_normalize_code();

-- Endurece redeem_coupon: sanitiza no servidor e rejeita formato inválido cedo
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _sub_id uuid;
  _new_end timestamptz;
  _clean text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.' USING ERRCODE = '28000';
  END IF;

  _clean := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(_clean) < 4 THEN
    RAISE EXCEPTION 'Código inválido.';
  END IF;

  SELECT * INTO _coupon
  FROM public.coupons
  WHERE upper(code) = _clean
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Código inválido.';
  END IF;
  IF NOT _coupon.active THEN
    RAISE EXCEPTION 'Este código foi desativado.';
  END IF;
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at <= now() THEN
    RAISE EXCEPTION 'Este código expirou.';
  END IF;
  IF _coupon.used_count >= _coupon.max_uses THEN
    RAISE EXCEPTION 'Este código já atingiu o limite de usos.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.coupon_redemptions
    WHERE coupon_id = _coupon.id AND user_id = _uid
  ) THEN
    RAISE EXCEPTION 'Você já resgatou este código.';
  END IF;

  IF _coupon.grants_lifetime THEN
    INSERT INTO public.subscriptions (user_id, status, plan, current_period_start, current_period_end)
    VALUES (_uid, 'active', 'vitalicio', now(), '2099-12-31 23:59:59+00'::timestamptz)
    ON CONFLICT (user_id) DO UPDATE
      SET status = 'active',
          plan = 'vitalicio',
          current_period_start = now(),
          current_period_end = '2099-12-31 23:59:59+00'::timestamptz,
          canceled_at = NULL
    RETURNING id INTO _sub_id;
  ELSE
    SELECT id, GREATEST(current_period_end, now()) + make_interval(months => _coupon.duration_months)
      INTO _sub_id, _new_end
    FROM public.subscriptions WHERE user_id = _uid
    FOR UPDATE;

    IF _sub_id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, status, plan, current_period_start, current_period_end)
      VALUES (_uid, 'active', 'premium', now(), now() + make_interval(months => _coupon.duration_months))
      RETURNING id INTO _sub_id;
    ELSE
      UPDATE public.subscriptions
        SET status = 'active',
            plan = CASE WHEN plan = 'vitalicio' THEN plan ELSE 'premium' END,
            current_period_end = _new_end,
            canceled_at = NULL
        WHERE id = _sub_id;
    END IF;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, subscription_id)
  VALUES (_coupon.id, _uid, _sub_id);

  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon.id;

  RETURN jsonb_build_object(
    'ok', true,
    'grants_lifetime', _coupon.grants_lifetime,
    'duration_months', _coupon.duration_months
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.redeem_coupon(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT) TO authenticated;
