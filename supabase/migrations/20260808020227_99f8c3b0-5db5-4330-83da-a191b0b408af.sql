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
  IF _plan <> 'mensal' THEN RAISE EXCEPTION 'Plano inválido.'; END IF;
  _amount := 1.99;
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