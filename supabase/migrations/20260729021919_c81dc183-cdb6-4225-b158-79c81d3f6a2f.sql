
-- Recreate user-facing RPCs to accept explicit _user_id (called by trusted server)
CREATE OR REPLACE FUNCTION public.redeem_coupon(_user_id uuid, _code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := _user_id;
  _coupon public.coupons%ROWTYPE;
  _sub_id uuid;
  _new_end timestamptz;
  _clean text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Usuário inválido.' USING ERRCODE = '28000';
  END IF;

  _clean := upper(regexp_replace(coalesce(_code, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(_clean) < 4 THEN
    RAISE EXCEPTION 'Código inválido.';
  END IF;

  SELECT * INTO _coupon FROM public.coupons WHERE upper(code) = _clean FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Código inválido.'; END IF;
  IF NOT _coupon.active THEN RAISE EXCEPTION 'Este código foi desativado.'; END IF;
  IF _coupon.expires_at IS NOT NULL AND _coupon.expires_at <= now() THEN
    RAISE EXCEPTION 'Este código expirou.';
  END IF;
  IF _coupon.used_count >= _coupon.max_uses THEN
    RAISE EXCEPTION 'Este código já atingiu o limite de usos.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.coupon_redemptions WHERE coupon_id = _coupon.id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Você já resgatou este código.';
  END IF;

  IF _coupon.grants_lifetime THEN
    INSERT INTO public.subscriptions (user_id, status, plan, current_period_start, current_period_end)
    VALUES (_uid, 'active', 'vitalicio', now(), '2099-12-31 23:59:59+00'::timestamptz)
    ON CONFLICT (user_id) DO UPDATE
      SET status='active', plan='vitalicio',
          current_period_start=now(),
          current_period_end='2099-12-31 23:59:59+00'::timestamptz,
          canceled_at=NULL
    RETURNING id INTO _sub_id;
  ELSE
    SELECT id, GREATEST(current_period_end, now()) + make_interval(months => _coupon.duration_months)
      INTO _sub_id, _new_end
    FROM public.subscriptions WHERE user_id = _uid FOR UPDATE;

    IF _sub_id IS NULL THEN
      INSERT INTO public.subscriptions (user_id, status, plan, current_period_start, current_period_end)
      VALUES (_uid, 'active', 'premium', now(), now() + make_interval(months => _coupon.duration_months))
      RETURNING id INTO _sub_id;
    ELSE
      UPDATE public.subscriptions
        SET status='active',
            plan = CASE WHEN plan='vitalicio' THEN plan ELSE 'premium' END,
            current_period_end=_new_end,
            canceled_at=NULL
        WHERE id = _sub_id;
    END IF;
  END IF;

  INSERT INTO public.coupon_redemptions (coupon_id, user_id, subscription_id)
  VALUES (_coupon.id, _uid, _sub_id);

  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = _coupon.id;

  RETURN jsonb_build_object('ok', true, 'grants_lifetime', _coupon.grants_lifetime,
                            'duration_months', _coupon.duration_months);
END;
$function$;

-- Drop the old single-arg version (auth.uid() based)
DROP FUNCTION IF EXISTS public.redeem_coupon(text);

CREATE OR REPLACE FUNCTION public.create_pix_payment_request(_user_id uuid, _plan text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := _user_id;
  _email TEXT;
  _amount NUMERIC(10, 2);
  _existing_id UUID;
  _new_id UUID;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Usuário inválido.' USING ERRCODE = '28000'; END IF;
  IF _plan NOT IN ('mensal', 'anual') THEN RAISE EXCEPTION 'Plano inválido.'; END IF;
  _amount := CASE WHEN _plan = 'mensal' THEN 10.00 ELSE 90.00 END;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT id INTO _existing_id FROM public.pix_payment_requests
  WHERE user_id = _uid AND status = 'aguardando_aprovacao' LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already_pending', true, 'request_id', _existing_id);
  END IF;

  INSERT INTO public.pix_payment_requests (user_id, plan, amount_brl, user_email)
  VALUES (_uid, _plan, _amount, _email)
  RETURNING id INTO _new_id;

  RETURN jsonb_build_object('ok', true, 'already_pending', false, 'request_id', _new_id);
END;
$function$;

DROP FUNCTION IF EXISTS public.create_pix_payment_request(text);

CREATE OR REPLACE FUNCTION public.cancel_pix_payment_request(_user_id uuid, _request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.pix_payment_requests%ROWTYPE;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Usuário inválido.' USING ERRCODE = '28000'; END IF;
  SELECT * INTO _row FROM public.pix_payment_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada.'; END IF;
  IF _row.user_id <> _user_id THEN RAISE EXCEPTION 'Ação não permitida.'; END IF;
  IF _row.status <> 'aguardando_aprovacao' THEN
    RAISE EXCEPTION 'Só é possível cancelar solicitações pendentes.';
  END IF;
  UPDATE public.pix_payment_requests SET status='cancelado', decided_at=now() WHERE id=_request_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

DROP FUNCTION IF EXISTS public.cancel_pix_payment_request(uuid);

-- Revoke EXECUTE from public/anon/authenticated on all sensitive SECURITY DEFINER RPCs
REVOKE ALL ON FUNCTION public.redeem_coupon(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_pix_payment_request(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_pix_payment_request(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_pix_payment_request(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_pix_payment_request(uuid, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_pix_payment_request(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_pix_payment_request(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_pix_payment_request(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.reject_pix_payment_request(uuid, text) TO service_role;
