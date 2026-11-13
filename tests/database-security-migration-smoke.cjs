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
  assert.ok(migration.includes(`ALTER FUNCTION public.${fn}()\n  SET search_path = pg_catalog, public;`),
    fn + " must pin search_path");
  assert.ok(migration.includes(`REVOKE ALL ON FUNCTION public.${fn}() FROM PUBLIC;`),
    fn + " must revoke PUBLIC execution");
}

assert.ok(migration.includes("REVOKE EXECUTE ON FUNCTION public.mcs_current_pid() FROM anon;"));
assert.ok(migration.includes("GRANT EXECUTE ON FUNCTION public.mcs_current_pid() TO authenticated, service_role;"));
for (const fn of ["mcs_handle_new_user", "mcs_touch_updated_at", "mcs_lock_profile_tier"]) {
  assert.ok(migration.includes(`REVOKE EXECUTE ON FUNCTION public.${fn}() FROM anon, authenticated;`),
    fn + " must not be directly callable by API roles");
}
assert.ok(migration.startsWith("-- Harden") && migration.includes("BEGIN;") && migration.includes("COMMIT;"));
console.log("PASS: database function privilege migration has the required grants and search-path hardening.");
