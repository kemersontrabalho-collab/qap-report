
-- 1) Ajusta a função que cria o trial ao inserir um profile: 24h ao invés de 7 dias
CREATE OR REPLACE FUNCTION public.create_trial_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, status, plan, trial_ends_at, current_period_start, current_period_end
  ) VALUES (
    NEW.id, 'trial', 'free',
    now() + interval '24 hours',
    now(),
    now() + interval '24 hours'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

-- 2) Encurta trials existentes que ainda não foram convertidos em plano pago
UPDATE public.subscriptions
   SET current_period_end = LEAST(current_period_end, created_at + interval '24 hours'),
       trial_ends_at      = LEAST(COALESCE(trial_ends_at, created_at + interval '24 hours'),
                                  created_at + interval '24 hours')
 WHERE status = 'trial'
   AND plan   = 'free';
