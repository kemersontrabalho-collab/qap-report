CREATE POLICY "Service role manages error logs"
ON public.error_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);