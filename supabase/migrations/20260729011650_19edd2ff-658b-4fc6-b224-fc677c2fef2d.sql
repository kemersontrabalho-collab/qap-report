
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  category text NOT NULL CHECK (category IN ('frontend','server_function','security','performance')),
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warning','error','critical')),
  message text NOT NULL,
  stack text,
  route text,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  ip_hash text,
  resolved boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_error_logs_created ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_cat_created ON public.error_logs (category, created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON public.error_logs (severity, created_at DESC) WHERE resolved = false;

GRANT ALL ON public.error_logs TO service_role;

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- No public policies: acesso apenas via service_role no painel admin.
