
-- Trigger-only SECURITY DEFINER functions: revoke all execute from public roles
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_founder_if_match() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_trial_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_bulletin_to_knowledge() FROM PUBLIC, anon, authenticated;

-- has_role is used by RLS policies; policies execute as the querying role,
-- so authenticated must retain EXECUTE. Revoke from anon/public.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- redeem_coupon is called by signed-in users only.
REVOKE ALL ON FUNCTION public.redeem_coupon(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text) TO authenticated;
