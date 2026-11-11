"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../avatar-3d/index.html"), "utf8");
const loader = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarLoader.js"), "utf8");

const gate = html.match(/function isAdultProfile\(\)\s*\{([\s\S]*?)\}/);
assert.ok(gate, "3D prototype must define its adult-access gate");
assert.match(gate[1], /return\s+false\s*;/, "3D prototype must fail closed until a trusted server entitlement is wired");

assert.match(html, /profile:\s*\{\s*ageBand:\s*"unknown"\s*\}/, "unverified profile must default to unknown age");
const clamp = html.match(/function clampBodyForBand\(body, ageBand\)\s*\{([\s\S]*?)\n\}/);
assert.ok(clamp, "conservative body-shape clamp must exist");
assert.match(clamp[1], /isAdultProfile\(\)/, "unverified/teen profiles must use conservative body-shape limits");

assert.match(loader, /opts\.getEntitlement\s*\|\|\s*function\(\)\s*\{\s*return Promise\.resolve\(\{\s*adult:false/, "GLTF loader entitlement hook must default to deny");
assert.ok((html.match(/isAdultProfile\(\)/g) || []).length >= 5, "adult gate must be consulted across the prototype");

assert.match(html, /examples\/js\/loaders\/GLTFLoader\.js/, "prototype must load the Three.js r128 GLTFLoader dependency");
assert.match(html, /GLTFLoader:\s*THREE\.GLTFLoader\s*\|\|\s*null/, "avatar engine must receive the loaded GLTFLoader constructor");
assert.match(loader, /opts\.GLTFLoader\s*\|\|\s*null/, "loader must retain a graceful fallback when GLTFLoader is unavailable");
assert.match(loader, /function validateAssetUrl\\(url\\)/, "GLTF asset URLs must be validated before loading");
assert.match(loader, /javascript\\|data\\|blob\\|file/, "executable and local-only URL schemes must be rejected");
assert.match(loader, /pending = pending\\.filter/, "completed GLTF requests must be removed from pending lifecycle tracking");
assert.match(loader, /handle\\.cancelled \\|\\| !alive/, "cancelled or torn-down requests must not attach loaded assets");
console.log("PASS: 3D prototype age gate fails closed; unverified body proportions are clamped; loader entitlement defaults to deny.");
