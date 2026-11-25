const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const TEEN_ROOMS = new Set(["teenHangout", "teenStudio", "teenRunway", "teenGames", "teenMusic"]);
const ADULT_ROOMS = new Set(["main", "lounge", "island"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) return json({ ok: false, error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let publishableKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const keyMapRaw = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (!publishableKey && keyMapRaw) {
    try {
      const keyMap = JSON.parse(keyMapRaw);
      const envName = keyMap.default;
      if (typeof envName === "string") publishableKey = Deno.env.get(envName);
    } catch {
      return json({ ok: false, error: "server_configuration_error" }, 503);
    }
  }
  if (!supabaseUrl || !publishableKey) return json({ ok: false, error: "server_configuration_error" }, 503);

  let userResponse: Response;
  try {
    userResponse = await fetch(new URL("/auth/v1/user", supabaseUrl), {
      headers: { Authorization: authorization, apikey: publishableKey },
    });
  } catch {
    return json({ ok: false, error: "identity_service_unavailable" }, 503);
  }
  if (!userResponse.ok) return json({ ok: false, error: "unauthorized" }, 401);

  let user: Record<string, unknown>;
  try {
    user = await userResponse.json();
  } catch {
    return json({ ok: false, error: "identity_service_unavailable" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: "invalid_request" }, 400);
  }
  const roomId = body.roomId;
  if (typeof roomId !== "string" || (!TEEN_ROOMS.has(roomId) && !ADULT_ROOMS.has(roomId))) {
    return json({ ok: false, error: "unknown_room" }, 400);
  }

  // Only Auth's server-managed app_metadata is authoritative.
  // Client-editable user_metadata and profile age fields are never trusted.
  const appMetadata = (user.app_metadata && typeof user.app_metadata === "object")
    ? user.app_metadata as Record<string, unknown>
    : {};
  const assurance = (appMetadata.mcs_age_assurance && typeof appMetadata.mcs_age_assurance === "object")
    ? appMetadata.mcs_age_assurance as Record<string, unknown>
    : {};

  const verifiedAt = typeof assurance.verified_at === "string" ? Date.parse(assurance.verified_at) : NaN;
  const expiresAt = typeof assurance.expires_at === "string" ? Date.parse(assurance.expires_at) : NaN;
  const now = Date.now();
  const validAssurance =
    assurance.version === 1 &&
    assurance.verified === true &&
    typeof assurance.provider === "string" && assurance.provider.trim().length > 0 &&
    Number.isFinite(verifiedAt) && verifiedAt <= now &&
    Number.isFinite(expiresAt) && expiresAt > now &&
    (assurance.age_band === "teen" || assurance.age_band === "adult");

  if (!validAssurance) return json({ ok: false, error: "age_assurance_required" }, 403);

  const requiredBand = TEEN_ROOMS.has(roomId) ? "teen" : "adult";
  if (assurance.age_band !== requiredBand) return json({ ok: false, error: "room_age_band_mismatch" }, 403);

  return json({ ok: true, roomId, entitlement: requiredBand });
});