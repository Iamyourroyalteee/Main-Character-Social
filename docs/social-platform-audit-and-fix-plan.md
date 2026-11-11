# Main Character Social — Social Platform Audit & Execution Plan

Audit date: 2026-11-10 (US Eastern)
Scope: connected Supabase project `main-character-social` (`rvisqlrbjgugqdoodpac`), GitHub repository `Iamyourroyalteee/Main-Character-Social`, and available production-source baseline.

## Executive result

The backend has a meaningful social-data foundation (profiles, posts, likes, comments, follows, follow requests, friend requests/friendships, conversations, and messages). It is not yet a complete, safe social platform. Several authorization policies allow users to affect or read other users' social data beyond the intended relationship boundary. The application source needed to safely wire and test the social UI is not currently present in GitHub: `src/index.html` is empty on `main`, and the repository has no `package.json` or checked-in frontend entry point. The README says the production application source must be recovered and preserved, not replaced with a starter template.

No production database or authentication settings were changed during this audit.

## Verified backend inventory

Existing tables include:
- Identity/profile: `mcs_account_links`, `mcs_profiles`, `mcs_user_private`, `mcs_settings`
- Feed: `mcs_posts`, `mcs_likes`, `mcs_comments`
- Relationships: `mcs_follows`, `mcs_follow_requests`, `mcs_friend_requests`, `mcs_friendships`
- Direct messaging: `mcs_convos`, `mcs_messages`
- Other app data: `mcs_collections`, `mcs_state`, listings and marketplace tables

RLS is enabled on the inspected public tables. The database has existing social records (7 profiles, 12 posts, 34 likes, 7 comments, 18 follows, 2 friendships, 3 conversations); `mcs_messages` and follow/friend request tables currently contain zero rows. These counts are audit snapshots, not product usage metrics.

No dedicated tables were found for blocks, user reports, moderation cases/actions, notifications, stories, room membership/presence, or age-segmented room access.

## Confirmed security defects — fix before enabling social features broadly

### P0 — Direct-message authorization is not participant-scoped
- `mcs_messages_select_participant` only checks that a conversation row exists; it does not check that the current user is in `mcs_convos.members`.
- `mcs_messages_insert_sender` similarly checks sender identity and conversation existence, but not membership in that conversation.
- Result: any authenticated user may be able to read messages from, or send messages into, conversations they do not belong to, subject to the other policy predicates.
- Required fix: every message SELECT/INSERT/UPDATE/DELETE authorization must verify authenticated conversation membership and sender ownership as appropriate. Test cross-account access with two unrelated users.

### P0 — Conversation membership can be modified by a participant
- `mcs_convos_update_participant` allows an existing member to update a conversation row as long as the resulting `members` JSON still contains that member.
- Result: a participant can potentially add arbitrary users to a private conversation or otherwise rewrite its membership.
- Required fix: clients must not directly update membership. Use a narrowly scoped server-side operation that validates invitations, blocks, age-segment rules, and participant consent. Preserve immutable membership history or audit events.

### P1 — Friend and follow relationships can be forged/rewritten
- `mcs_friendships_insert_involved` accepts a row if the current user is either endpoint; it does not require an accepted request or server-validated mutual consent.
- Friend/follow request and follow relationship UPDATE policies permit either involved endpoint to update relationship columns while remaining an endpoint.
- Required fix: enforce state transitions server-side: request → recipient acceptance → canonical friendship; prevent endpoint changes; use unique canonical pair constraints and idempotent operations.

### P1 — Social content visibility ignores account privacy
- Authenticated SELECT policies for profiles, posts, comments, and likes currently use `true`.
- This may be intentional for public content, but no verified privacy-aware feed/profile visibility rule was found in these policies.
- Required fix: define public/private account behavior and follower-only visibility; apply the same rule consistently to profile details, posts, comments, likes, search, and recommendations. Keep private email/date-of-birth in owner-only `mcs_user_private`.

### P1 — Safety controls are absent from the inspected schema
- No block/report/moderation tables or policies were found.
- No verified notification system was found.
- No age-segmented room membership/presence tables or server-enforced age-access rules were found.
- Required fix: add block lists, report intake, moderation case/action audit trail, notification preferences, and room access enforcement before enabling public discovery or social-room invitations.

### P2 — Supabase advisor findings
- RLS enabled without policies: `mcs_collections`, `mcs_processed_requests`, `mcs_state` (confirm whether these are intentionally service-only; do not add broad client policies).
- Mutable search path warnings: `mcs_touch_updated_at`, `mcs_lock_profile_tier`.
- Public execution warnings for SECURITY DEFINER functions: `mcs_current_pid`, `mcs_handle_new_user`. Their definitions set `search_path TO 'public'`, but grants should still be narrowed to the intended roles; the signup handler should be trigger-only.
- Auth leaked-password protection is disabled.
- Performance advisor: `mcs_account_links_select_own` can wrap auth function call in SELECT to avoid per-row re-evaluation.
- Unused-index notices are not sufficient reason to drop indexes; reassess after representative usage.

Remediation references:
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
- https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable
- https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## Product requirements to preserve

- Instagram-inspired social feed and Stories with polished short-form media presentation.
- Profiles, friend/follow discovery, likes, comments, notifications, and private messaging.
- Explorable multiplayer 3D rooms with avatar movement, chat, waves, dances, poses, parties, fashion shows, photo shoots, and games.
- Separate, fully featured Teen World and Adult World. Teen users must have dedicated protected rooms: no mixed-age instances, adult access/contact, or cross-world invitations.
- Server-enforced age permissions, separate discovery and presence, blocking/reporting/moderation, and age-appropriate chat.
- No voice, video, or location sharing in the initial teen social experience.
- Accessible, responsive, touch-friendly navigation and reliable feed/profile/inbox/room transitions.

## Execution checklist

### Phase 0 — Recover source and establish tests
- [ ] Recover the exact current production application source into GitHub without replacing it with a starter template.
- [ ] Identify the active Vercel project and its linked repository/branch/build command.
- [ ] Add a repeatable build and smoke-test harness; establish baseline screenshots for feed, profile, friends, inbox, notifications, and rooms.
- [ ] Confirm the frontend's Supabase client and authenticated profile-ID mapping use `mcs_account_links`.

### Phase 1 — Close authorization vulnerabilities
- [ ] Add two-user RLS regression tests for cross-conversation read/write denial.
- [ ] Prevent client-side conversation membership mutation; implement validated invitation/acceptance operation.
- [ ] Prevent direct friendship forging and endpoint rewriting; enforce accepted-request transitions.
- [ ] Define and test account privacy and post visibility semantics.
- [ ] Review grants on SECURITY DEFINER functions; make signup handler trigger-only and narrow current-profile lookup grants.
- [ ] Resolve mutable search path warnings with explicit safe search paths.
- [ ] Confirm service-only tables remain inaccessible to anon/authenticated roles.
- [ ] Enable leaked-password protection only after explicit owner approval in Supabase Auth settings.

### Phase 2 — Add core safety and social capabilities
- [ ] Add block/unblock with immediate mutual visibility and messaging restrictions.
- [ ] Add user/content reporting and a moderator case/action audit trail.
- [ ] Add notification persistence, unread state, preferences, and safe delivery.
- [ ] Add profile privacy, follow requests, friend acceptance, and discoverability controls.
- [ ] Add story/media expiry and moderation rules if Stories are enabled.
- [ ] Add spam/rate controls for follows, friend requests, comments, DMs, and reports.

### Phase 3 — Teen/adult segregation and rooms
- [ ] Establish server-trusted age classification and deny-by-default unknown age state.
- [ ] Enforce separate Teen and Adult room namespaces, discovery, presence, chat, and invitation flows.
- [ ] Ensure blocks and moderation actions apply to rooms, profiles, comments, and DMs.
- [ ] Keep teen voice/video/location sharing disabled in initial release.

### Phase 4 — Reconnect and polish the UI
- [ ] Restore the source-backed feed, stories, profile, friends, inbox, notifications, and settings screens.
- [ ] Connect UI actions to real authenticated database operations; remove demo friend/conversation/post data from production paths.
- [ ] Add loading, empty, offline, error, optimistic-update rollback, and retry states.
- [ ] Validate responsive/iPad touch behavior and accessibility.
- [ ] Add end-to-end tests for signup, profile setup, follow/friend flows, feed interactions, DMs, blocks, reports, and room access.

## Execution boundaries

- No production RLS/policy/grant/auth-setting changes have been applied.
- No database tables or existing user data have been dropped, rewritten, or migrated.
- Security changes require a reviewed migration and regression tests before application.
- No passwords, tokens, API keys, or verification codes should be requested in chat.
- Do not deploy social UI until source recovery, authorization tests, build, and smoke checks pass.
