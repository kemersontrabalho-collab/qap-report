ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live';

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id ON public.subscriptions(paddle_subscription_id);

CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.status IN ('trial', 'active', 'trialing', 'past_due', 'canceled')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = _user_id AND ur.role = 'fundador'
  );
$function$;