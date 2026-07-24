
ALTER TABLE public.bulletins
  ADD COLUMN IF NOT EXISTS crew_composition text,
  ADD COLUMN IF NOT EXISTS vehicle_prefix text,
  ADD COLUMN IF NOT EXISTS occurrence_at timestamptz,
  ADD COLUMN IF NOT EXISTS crew_address text,
  ADD COLUMN IF NOT EXISTS crew_lat double precision,
  ADD COLUMN IF NOT EXISTS crew_lng double precision,
  ADD COLUMN IF NOT EXISTS occurrence_address text,
  ADD COLUMN IF NOT EXISTS occurrence_lat double precision,
  ADD COLUMN IF NOT EXISTS occurrence_lng double precision;
