"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../src/index.html"), "utf8");
const avatarRoot = path.join(__dirname, "../src/avatar-3d");
const requiredAvatarFiles = [
  "index.html",
  "MCSAvatarAnimationRuntime.js",
  "MCSAvatarLoader.js",
  "MCSCameraSetup.js",
  "MCSGlamMaterialFactory.js",
  "MCSStudioLighting.js",
  "assets/manifest.json"
];
for (const file of requiredAvatarFiles) {
  assert.ok(fs.existsSync(path.join(avatarRoot, file)), "deployed app root must contain avatar runtime file: " + file);
}
const embeddedAvatarHtml = fs.readFileSync(path.join(avatarRoot, "index.html"), "utf8");
for (const script of ["MCSAvatarAnimationRuntime.js", "MCSAvatarLoader.js", "MCSCameraSetup.js", "MCSGlamMaterialFactory.js", "MCSStudioLighting.js"]) {
  assert.ok(embeddedAvatarHtml.includes(script), "embedded avatar runtime must load " + script);
}
const marker = '<script id="mcs-avatar-account-bridge">';
const start = html.indexOf(marker);
assert.notEqual(start, -1, "main app must include the avatar account bridge");
assert.match(html, /data-mcs-avatar-mode="builder"/, "main app must expose a dedicated Avatar Builder entry");
assert.match(html, /data-mcs-avatar-mode="rooms"/, "main app must expose a separate Avatar Rooms entry");
assert.match(html, /next\.searchParams\.set\("mode", mode\)/, "mode navigation must switch the embedded experience without changing its shared frame identity");
const bodyStart = start + marker.length;
const end = html.indexOf("</script>", bodyStart);
assert.notEqual(end, -1, "avatar account bridge script must be closed");
const bridge = html.slice(bodyStart, end);

function makeHarness(options = {}) {
  const origin = "https://mcs.example";
  const sent = [];
  const writes = [];
  const listeners = {};
  const profile = Object.assign({
    id: "pid_123",
    username: "creator",
    email: "private@example.test",
    birthdate: "2000-01-01",
    phone: "555-0100",
    age_band: "adult",
    avatar3d: { v: 1, body: { hips: 0.5 }, face: {}, slots: {} }
  }, options.profile || {});
  const frameWindow = {
    postMessage(message, targetOrigin) { sent.push({ message, targetOrigin }); }
  };
  const frame = { contentWindow: frameWindow };
  const auth = {
    mode: options.mode || "auth",
    session: options.session === undefined ? { user: { id: "auth-user" } } : options.session,
    myPid: options.myPid === undefined ? profile.id : options.myPid,
    client: {
      from(table) {
        writes.push({ table });
        return {
          update(values) {
            writes[writes.length - 1].values = values;
            return {
              eq(column, value) {
                writes[writes.length - 1].where = { column, value };
                return {
                  select() {
                    return {
                      maybeSingle: async () => options.result || { data: { id: profile.id } }
                    };
                  }
                };
              }
            };
          }
        };
      }
    }
  };
  let saveCount = 0;
  const window = {
    location: { origin },
    MCS4: auth,
    addEventListener(type, callback) { listeners[type] = callback; }
  };
  const document = {
    getElementById(id) { return id === "mcs-avatar-3d-frame" ? frame : null; },
    addEventListener() {}
  };
  vm.runInNewContext(bridge, {
    window, document, meP: () => profile,
    save: () => { saveCount++; },
    JSON, Object, String, Date, Error
  });
  return {
    origin, sent, writes, profile, listeners,
    get saveCount() { return saveCount; },
    send(data, eventOrigin = origin, source = frameWindow) {
      return listeners.message({ data, origin: eventOrigin, source });
    }
  };
}

(async function run() {
  const account = makeHarness();
  await account.send({ type: "MCS_AVATAR_READY" });
  const loaded = account.sent.at(-1).message;
  assert.equal(loaded.type, "MCS_AVATAR_LOAD");
  assert.equal(loaded.hasAccount, true);
  assert.equal(loaded.ageBand, "teen", "restore must keep the prototype fail-closed");
  assert.deepEqual(JSON.parse(JSON.stringify(loaded.character)), account.profile.avatar3d);

  const beforeCrossOrigin = account.sent.length;
  await account.send({ type: "MCS_AVATAR_READY" }, "https://attacker.example");
  assert.equal(account.sent.length, beforeCrossOrigin, "cross-origin messages must be ignored");

  const character = { body: { hips: 0.6 }, face: { eyes: "almond" }, slots: { hair: null } };
  await account.send({ type: "MCS_AVATAR_SAVE", character });
  assert.equal(account.writes[0].table, "mcs_profiles");
  assert.deepEqual(account.writes[0].where, { column: "id", value: "pid_123" });
  assert.deepEqual(
    JSON.parse(JSON.stringify(account.writes[0].values.payload.avatar3d)),
    { v: 1, ...character }
  );
  assert.equal("email" in account.writes[0].values.payload, false);
  assert.equal("birthdate" in account.writes[0].values.payload, false);
  assert.equal("phone" in account.writes[0].values.payload, false);
  assert.equal(account.sent.at(-1).message.ok, true);
  assert.equal(account.sent.at(-1).message.scope, "account");

  const failed = makeHarness({ result: { error: { message: "RLS denied" } } });
  const originalAvatar = failed.profile.avatar3d;
  await failed.send({ type: "MCS_AVATAR_SAVE", character });
  assert.equal(failed.profile.avatar3d, originalAvatar, "failed writes must roll back the profile");
  assert.equal(failed.sent.at(-1).message.ok, false);

  const guest = makeHarness({ mode: "local", session: null });
  await guest.send({ type: "MCS_AVATAR_SAVE", character });
  assert.equal(guest.writes.length, 0, "guest saves must never write account rows");
  assert.equal(guest.saveCount, 1);
  assert.equal(guest.sent.at(-1).message.scope, "device");

  const invalid = makeHarness();
  await invalid.send({ type: "MCS_AVATAR_SAVE", character: { body: {}, face: {} } });
  assert.equal(invalid.writes.length, 0);
  assert.equal(invalid.sent.at(-1).message.ok, false);

  const oversized = makeHarness();
  await oversized.send({
    type: "MCS_AVATAR_SAVE",
    character: { body: { data: "x".repeat(150001) }, face: {}, slots: {} }
  });
  assert.equal(oversized.writes.length, 0);
  assert.equal(oversized.sent.at(-1).message.ok, false);

  console.log("PASS: avatar account bridge load/save, RLS failure rollback, PII scrubbing, and origin checks.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
