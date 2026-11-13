# Social safety phase 1

## Verified current state
- The complete live application source is already committed at `src/index.html`; the large-file reader returns an empty content field, but its blob SHA matches the complete HTML fetched from the READY production deployment.
- The app has feed, Stories, follows, friend requests, DMs, block and report controls.
- Block lists and reports are device-local in the current production build; they are not represented in the Supabase schema.
- The conversation UPDATE policy allows a participant to change the `members` JSON, creating a path to add an arbitrary account to a conversation.
- Generic client sync runs upserts and deletes concurrently, which can race when a friend request is accepted and removed.
- Current public profile payloads contain private fields: 6/7 profiles include email, birthdate, phone and legal name; 7/7 include parent codes and guardian IDs. Authenticated SELECT on `mcs_profiles` is currently unrestricted.

## Phase 1 changes prepared
- Move sensitive profile fields to owner-only `mcs_profile_private`, backfill them, and scrub them from public payloads.
- Derive coarse age bands server-side from owner-only DOB.
- Add persistent block and report tables.
- Enforce same Teen/Adult age group, accepted-friend status, message privacy settings, under-16 DM prohibition, and block checks at the database layer.
- Remove client conversation-membership updates.
- Restrict friendship creation to the recipient of a pending request; freeze relationship endpoints and restrict follow/request updates to recipients.
- Update client sync ordering so block writes occur first and all upserts finish before deletes.
- Persist blocks/reports and gate opening DMs through the server permission function.
- Remove client-side automatic moderation actions from user report submission.

## Remaining phases
- Server-backed notifications and Stories.
- Moderator role claims and secure moderation queue UI (reports are currently readable by their reporter; staff review is service-role-only).
- Server-enforced post/profile audience visibility.
- Secure guardian-link workflows and guardian notifications.
- Server-authoritative Teen World / Adult World room membership and multiplayer presence.

## Test and release boundary
- Static schema assertions are in `supabase/tests/20261113_social_safety_phase1.sql`.
- A Supabase development branch could not be created: this connected project reports database branching is supported only on the Pro plan. The quoted branch compute was $0.01344/hour, matching the previously approved rate, but the plan restriction prevented creation.
- No migration was applied to production. Do not deploy this app revision until the migration is applied and behaviorally tested in an isolated Supabase database.
