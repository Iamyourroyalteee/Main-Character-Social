"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../fashion-studio/index.html"), "utf8");
const deployedFashionPath = path.join(__dirname, "../src/fashion-studio/index.html");
assert.ok(fs.existsSync(deployedFashionPath), "Fashion Studio must be mirrored into the Vercel src deployment root");
assert.equal(fs.readFileSync(deployedFashionPath, "utf8"), html, "deployed Fashion Studio route must match the tested source");
const avatarRoot = path.join(__dirname, "../src/avatar-3d");
for (const file of ["index.html", "MCSAvatarLoader.js", "MCSGlamMaterialFactory.js", "MCSCameraSetup.js", "MCSStudioLighting.js", "MCSAvatarAnimationRuntime.js", "assets/manifest.json", "asset-pipeline-smoke.html", "assets/test-fixtures/minimal-pbr.gltf"]) {
  assert.ok(fs.existsSync(path.join(avatarRoot, file)), "main-app deployment must include avatar route asset: " + file);
}
const deployedAvatarHtml = fs.readFileSync(path.join(avatarRoot, "index.html"), "utf8");
assert.match(deployedAvatarHtml, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/, "deployed avatar route must preserve zoom and safe-area behavior");
assert.doesNotMatch(deployedAvatarHtml, /user-scalable=no|maximum-scale=1/, "avatar route must not disable user zoom");
for (const marker of [
  'id="board"', 'id="catalog"', 'id="inspector"', 'id="save"', 'id="export"',
  'id="avatarFrame"', 'id="applyToModel"', 'id="collectionGrid"',
  'data-view="board"', 'data-view="model"', 'data-view="collections"',
  'mcs-fashion-collections',
]) {
  assert.ok(html.includes(marker), "Fashion Studio is missing " + marker);
}
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
assert.ok(scripts.length >= 1, "Fashion Studio must contain its interaction runtime");
scripts.forEach((source, index) => new vm.Script(source, { filename: "fashion-studio-inline-" + index }));
assert.match(html, /function addPiece\(/, "catalog pieces must be addable");
assert.match(html, /function renderBoard\(/, "moodboard must render placed pieces");
assert.match(html, /el\.type="button"/, "placed moodboard pieces must be keyboard-focusable buttons");
assert.match(html, /aria-pressed/, "placed moodboard pieces must expose selected state to assistive technology");
assert.match(html, /addEventListener\("keydown"/, "moodboard pieces must support keyboard interaction");
assert.match(html, /ArrowLeft.*ArrowRight.*ArrowUp.*ArrowDown/s, "moodboard pieces must support keyboard repositioning");
assert.match(html, /Backspace/, "moodboard pieces must support keyboard removal");
assert.match(html, /button\{cursor:pointer;color:inherit;min-width:44px;min-height:44px\}/, "studio buttons must meet 44px touch target minimums");
assert.match(html, /\.placed:focus-visible/, "keyboard focus must remain visibly indicated");
assert.match(html, /function renderCollections\(/, "saved looks must be browsable");
assert.match(html, /function exportSvg\(/, "moodboard must export");
assert.match(html, /api\.player\.applyOutfit\(api\.outfit\)/, "moodboard must apply supported pieces through the shared 3D avatar engine");
assert.match(html, /meta\.slot!==slot/, "moodboard mappings must match the avatar catalog slot");
assert.match(html, /nearestSupportedTint\(p\.color,meta\.tints\)/, "moodboard colors must use supported persistent avatar tints");
assert.match(html, /\/avatar-3d\/index\.html\?mode=builder/, "3D fitting room must use the shared avatar builder route");
assert.match(html, /localStorage\.setItem\("mcs-fashion-collections"/, "collections must persist locally");
console.log("PASS: Fashion Studio markup, inline JavaScript syntax, moodboard, collections, export, and shared 3D avatar integration checks.");
