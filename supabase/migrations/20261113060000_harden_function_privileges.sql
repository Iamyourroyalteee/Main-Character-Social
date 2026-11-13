-- Harden exposed SECURITY DEFINER functions and pin function search paths.
-- This migration intentionally does not add policies to internal tables:
-- mcs_collections, mcs_processed_requests, and mcs_state remain default-deny
-- until their intended API access patterns are explicitly specified.

BEGIN;

-- This helper is used by owner-scoped RLS policies. Authenticated clients need
-- it; anonymous clients do not. Keep service_role for trusted server workflows.
ALTER FUNCTION public.mcs_current_pid()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.mcs_current_pid() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcs_current_pid() FROM anon;
GRANT EXECUTE ON FUNCTION public.mcs_current_pid() TO authenticated, service_role;

-- This is an auth.users trigger function, not a client-callable RPC. Trigger
-- invocation does not require granting EXECUTE to API roles.
ALTER FUNCTION public.mcs_handle_new_user()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.mcs_handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcs_handle_new_user() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcs_handle_new_user() TO service_role;

-- Trigger helpers are not intended as direct PostgREST RPC endpoints.
ALTER FUNCTION public.mcs_touch_updated_at()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.mcs_touch_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcs_touch_updated_at() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcs_touch_updated_at() TO service_role;

ALTER FUNCTION public.mcs_lock_profile_tier()
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.mcs_lock_profile_tier() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mcs_lock_profile_tier() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcs_lock_profile_tier() TO service_role;

COMMIT;
