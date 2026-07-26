
-- 1. Extend coupons for lifetime grants and notes
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS grants_lifetime boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS note text;

-- Allow duration_months to be a placeholder when granting lifetime (still positive)
-- existing check requires > 0, we keep that; UI will send 1 for lifetime codes.

-- 2. Redeem function: SECURITY DEFINER so it can write regardless of RLS,
-- but strictly scoped to the calling auth.uid().
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _coupon public.coupons%ROWTYPE;
  _sub_id uuid;
  _new_end timestamptz;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado.' USING ERRCODE = '28000';
  END IF;

  SELECT * INTO _coupon
  FROM public.coupons
  WHERE lower(code) = lower(btrim(_code))
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
$$;

REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
