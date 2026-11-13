"use strict";
const fs = require("node:fs");
const assert = require("node:assert/strict");

const migration = fs.readFileSync(
  "supabase/migrations/20261113060000_harden_function_privileges.sql",
  "utf8"
);

for (const fn of [
  "mcs_current_pid",
  "mcs_handle_new_user",
  "mcs_touch_updated_at",
  "mcs_lock_profile_tier"
]) {
  assert.match(migration, new RegExp("ALTER FUNCTION public\\." + fn + "\\\\(\\\\)\\s+SET search_path = pg_catalog, public", "i"),
    fn + " must pin search_path");
  assert.match(migration, new RegExp("REVOKE ALL ON FUNCTION public\\." + fn + "\\\\(\\\\) FROM PUBLIC", "i"),
    fn + " must revoke PUBLIC execution");
}

assert.match(migration, /REVOKE EXECUTE ON FUNCTION public\.mcs_current_pid\(\) FROM anon/i);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.mcs_current_pid\(\) TO authenticated, service_role/i);
for (const fn of ["mcs_handle_new_user", "mcs_touch_updated_at", "mcs_lock_profile_tier"]) {
  assert.match(migration, new RegExp("REVOKE EXECUTE ON FUNCTION public\\." + fn + "\\\\(\\\\) FROM anon, authenticated", "i"),
    fn + " must not be directly callable by API roles");
}
assert.match(migration, /BEGIN;[\s\S]*COMMIT;/i);
console.log("PASS: database function privilege migration has the required grants and search-path hardening.");
