
-- Prevent users from self-granting premium by writing to subscriptions/payments directly.
DROP POLICY IF EXISTS "Users manage their own subscription" ON public.subscriptions;
CREATE POLICY "Users read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create payments" ON public.payments;
DROP POLICY IF EXISTS "Service can update payments" ON public.payments;
-- SELECT policies (own + founder) remain; writes are restricted to service_role / SECURITY DEFINER flows.
