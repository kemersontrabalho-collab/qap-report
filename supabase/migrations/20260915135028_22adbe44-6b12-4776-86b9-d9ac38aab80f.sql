CREATE INDEX IF NOT EXISTS bulletins_user_updated_at_idx
  ON public.bulletins (user_id, updated_at DESC);