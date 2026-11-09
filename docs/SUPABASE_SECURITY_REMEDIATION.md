# Supabase security remediation plan

Status: preparation only. No production schema, grants, RLS policies, functions, or Auth settings have been changed.

## Environment

- Production project: `rvisqlrbjgugqdoodpac`
- Production project status: `ACTIVE_HEALTHY`
- Supabase hosted development branches are unavailable on the current plan (branching requires Pro or above).
- This work is being staged in GitHub on `security/remediation-workflow`; production remains untouched.

## Confirmed audit findings

The Supabase Security Advisor reported:

- RLS enabled with no policies on `mcs_collections`, `mcs_processed_requests`, and `mcs_state`.
- Mutable function search paths on `mcs_touch_updated_at` and `mcs_lock_profile_tier`.
- `SECURITY DEFINER` functions `mcs_current_pid` and `mcs_handle_new_user` executable by `anon` and `authenticated`.
- Leaked-password protection disabled.

Additional catalog review found:

- Client roles have broad table grants on several financial/private tables. Grants must be assessed together with RLS; grants alone do not prove row access.
- `mcs_user_private` has a client UPDATE path despite containing private/account fields such as email, date of birth, and payment-provider identifiers.
- Conversation membership updates and endpoint-based relationship UPDATE policies need immutable-identity/state-transition review.
- Message policies should be reviewed for explicit conversation participant membership checks.

## Safe remediation sequence

1. Capture a schema-only baseline from production into a local Supabase project. Do not copy production user data.
2. Reproduce the schema and current policies/functions locally.
3. Write narrowly scoped migrations for grants, RLS policies, function privileges/search paths, and Auth hardening.
4. Add regression tests for both allowed and denied access, including cross-user and cross-conversation attempts.
5. Run migrations and tests against the local database in CI.
6. Review the SQL and test output in a pull request.
7. Apply to production only after an explicit production-change approval and a verified backup/rollback plan.

## Required setup for remote schema capture

A maintainer must add these GitHub Actions repository secrets through GitHub Settings:

- `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token with access to the project.
- `SUPABASE_DB_PASSWORD`: the database password for the production project.

Secrets must never be committed to the repository, embedded in workflow YAML, or pasted into an issue/PR. If these secrets are not configured, CI must skip remote schema capture and continue with any independent checks.

## Guardrails

- Never run a migration against production from pull-request CI.
- Never expose production data in CI artifacts or logs.
- Never merge or deploy a security migration solely because it parses; validate application behavior and both positive/negative RLS cases.
- Keep the existing application entry point `src/index.html` intact.
