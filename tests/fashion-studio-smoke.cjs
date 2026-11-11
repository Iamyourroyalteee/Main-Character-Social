"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "../fashion-studio/index.html"), "utf8");
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
assert.match(html, /function renderCollections\(/, "saved looks must be browsable");
assert.match(html, /function exportSvg\(/, "moodboard must export");
assert.match(html, /api\.player\.applyOutfit\(api\.outfit\)/, "moodboard must apply supported pieces through the shared 3D avatar engine");
assert.match(html, /meta\.slot!==slot/, "moodboard mappings must match the avatar catalog slot");
assert.match(html, /nearestSupportedTint\(p\.color,meta\.tints\)/, "moodboard colors must use supported persistent avatar tints");
assert.match(html, /\/avatar-3d\/index\.html\?mode=builder/, "3D fitting room must use the shared avatar builder route");
assert.match(html, /localStorage\.setItem\("mcs-fashion-collections"/, "collections must persist locally");
console.log("PASS: Fashion Studio markup, inline JavaScript syntax, moodboard, collections, export, and shared 3D avatar integration checks.");
