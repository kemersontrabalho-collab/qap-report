
-- Drop duplicate triggers on auth.users that cause "Database error saving new user"
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_founder ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed_founder ON auth.users;
-- Keep trial subscription creation only on profile insert to avoid FK race
DROP TRIGGER IF EXISTS on_auth_user_created_trial ON auth.users;

-- Harden handle_new_user against retries / duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$;
