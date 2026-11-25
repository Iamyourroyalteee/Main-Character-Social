# Supabase room entitlement gate

The deployed `mcs-room-entitlement` Edge Function is a fail-closed authorization primitive for Avatar Rooms. It requires a valid Supabase Auth JWT (`verify_jwt = true`) and then reloads the user from Auth before reading age assurance.

## Trusted claim contract

A trusted age-assurance provider integration must write this object to the user's **server-managed Auth `app_metadata`** only after successful verification:

```json
{
  "mcs_age_assurance": {
    "version": 1,
    "verified": true,
    "provider": "provider-identifier",
    "age_band": "teen",
    "verified_at": "2026-11-25T12:00:00.000Z",
    "expires_at": "2027-11-25T12:00:00.000Z"
  }
}
```

The provider must derive `age_band` from its completed verification result and apply an expiry policy that handles birthdays and re-verification. Never populate this claim from a browser form, `user_metadata`, a profile DOB field, or a client-supplied request body.

## Room mapping

- Teen: `teenHangout`, `teenStudio`, `teenRunway`, `teenGames`, `teenMusic`
- Adult: `main`, `lounge`, `island`

Unknown rooms, missing/expired claims, invalid claims, and cross-band requests are denied.

## Integration boundary

This function is deployed but is **not yet wired into the room-switch UI or any multiplayer/storage APIs**. The current procedural rooms are client-rendered scenes, so this endpoint alone does not make those static scenes access-controlled. Before enabling protected interactions or shared room services, call this endpoint before room entry and enforce the same entitlement at every server-side data/action boundary.

No age-assurance provider is currently configured. Until one is integrated and writes the server-managed claim, authenticated users are denied by this endpoint. Do not add a development bypass to production.
