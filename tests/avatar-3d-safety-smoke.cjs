"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "../avatar-3d/index.html"), "utf8");
const loader = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarLoader.js"), "utf8");
const glam = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSGlamMaterialFactory.js"), "utf8");
assert.match(glam, /Array\.isArray\(o\.material\).*?map\(retintOne\)/s, "PBR factory must retint each material in imported material arrays");
assert.match(glam, /var mats = Array\.isArray\(o\.material\) \? o\.material : \[o\.material\]/, "PBR factory must track every material when retiring old materials");
const assetSchema = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/3d-asset-manifest.schema.json"), "utf8"));
const assetManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../avatar-3d/assets/manifest.json"), "utf8"));
assert.equal(assetSchema.$defs.asset.required.includes("provenance"), true, "asset schema must require provenance");
assert.equal(assetManifest.schemaVersion, "1.0.0", "asset manifest must declare its schema version");
assert.equal(assetManifest.assets.length, 0, "unverified external models must not be added as placeholder assets");

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
assert.match(loader, /function validateAssetDescriptor\(asset\)/, "catalog asset descriptors must be schema-validated");
assert.match(loader, /function validateAssetManifest\(manifest\)/, "the versioned asset manifest must be validated");
assert.match(loader, /asset id must be a stable lowercase identifier/, "asset IDs must be stable and normalized");
assert.match(loader, /function loadCatalogAsset\(asset, onDone, onFail\)/, "validated catalog assets must have a managed loading path");
assert.match(loader, /function validateModel\(root, limits\)/, "loaded model geometry and transforms must be validated");
assert.match(loader, /if \(!root\)\{ if \(onFail\) onFail\("Invalid 3D model: empty GLTF scene"\)/, "empty GLTF scenes must fail closed");
assert.match(loader, /unitScale = asset\.unit === "cm"/, "catalog model units must be normalized on import");
assert.match(loader, /function validateAssetUrl\(url\)/, "GLTF asset URLs must be validated before loading");
assert.match(loader, /javascript|data|blob|file/, "executable and local-only URL schemes must be rejected");
assert.match(loader, /pending = pending\.filter/, "completed GLTF requests must be removed from pending lifecycle tracking");
assert.match(loader, /handle\.cancelled \|\| !alive/, "cancelled or torn-down requests must not attach loaded assets");
console.log("PASS: 3D prototype age gate fails closed; unverified body proportions are clamped; loader entitlement defaults to deny.");
/* Exercise the actual loader module with a controllable GLTFLoader mock. */
const vm = require("node:vm");
const sandboxWindow = {};
vm.runInNewContext(loader, { window: sandboxWindow });
let calls = [];
let completeLoad;
class MockGLTFLoader {
  load(url, onLoad) { calls.push(url); completeLoad = onLoad; }
}
const disposed = { geometry: 0, material: 0, texture: 0 };
function makeScene() {
  const mesh = {
    isMesh: true,
    geometry: { attributes: { position: { count: 3 }, normal: { count: 3 }, uv: { count: 3 } }, index: { count: 3 }, boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } }, dispose() { disposed.geometry++; } },
    material: { map: { dispose() { disposed.texture++; } }, dispose() { disposed.material++; } }
  };
  return { scale: { x: 1, y: 1, z: 1, setScalar(value) { this.x = this.y = this.z = value; } }, traverse(fn) { fn(mesh); } };
}
function makeEngine() {
  return sandboxWindow.MCSAvatarLoader.create({ GLTFLoader: MockGLTFLoader }, {
    renderer: { domElement: { clientWidth: 10, clientHeight: 10 }, setSize() {} },
    scene: {}, camera: { updateProjectionMatrix() {} }
  });
}
const runtimeEngine = makeEngine();
for (const badUrl of ["javascript:alert(1)", "data:model/gltf-binary;base64,AA==", "blob:https://example.com/id", "file:///tmp/model.glb", "//evil.example/model.glb"]) {
  let failure = "";
  runtimeEngine.loadGLTF(badUrl, () => assert.fail("unsafe URL must not load"), (message) => { failure = message; });
  assert.match(failure, /Invalid asset URL/, "unsafe URL must be rejected before network loading");
}
assert.equal(calls.length, 0, "unsafe URLs must never reach GLTFLoader");
for (const goodUrl of ["models/avatar.glb", "https://cdn.example.com/avatar.glb"]) {
  runtimeEngine.loadGLTF(goodUrl, () => {}, () => assert.fail("valid URL should be accepted"));
  assert.equal(calls.at(-1), goodUrl, "relative and HTTPS asset URLs should reach GLTFLoader");
}
const loadedScene = makeScene();
let loaded = false;
runtimeEngine.loadGLTF("models/valid.glb", (root) => { loaded = root === loadedScene; });
completeLoad({ scene: loadedScene });
assert.equal(loaded, true, "successful GLTF callback should deliver its scene");

const cancelledEngine = makeEngine();
const cancelledScene = makeScene();
cancelledEngine.loadGLTF("models/cancelled.glb", () => assert.fail("cancelled load must not attach"), () => {});
const cancelledCallback = completeLoad;
cancelledEngine.cancelPending();
cancelledCallback({ scene: cancelledScene });
assert.ok(disposed.geometry > 0 && disposed.material > 0 && disposed.texture > 0,
  "late results after cancellation must dispose owned GPU resources");

const teardownEngine = makeEngine();
const lateScene = makeScene();
teardownEngine.loadGLTF("models/late.glb", () => assert.fail("teardown load must not attach"), () => {});
const lateCallback = completeLoad;
teardownEngine.teardown();
lateCallback({ scene: lateScene });
assert.equal(teardownEngine.isAlive(), false, "teardown must mark engine inactive");
console.log("PASS: GLTF runtime mock rejects unsafe URLs, accepts relative/HTTPS URLs, delivers successful loads, and disposes late cancelled/torn-down results.");
async function runCatalogAssetTests() {
  const catalogEngine = makeEngine();
  const invalid = catalogEngine.validateAssetDescriptor({
    id: "", slot: "unknown", url: "javascript:alert(1)", format: "fbx"
  });
  assert.ok(invalid.length >= 4, "catalog schema must reject missing IDs, unknown slots, unsafe URLs, and unsupported formats");
  assert.ok(invalid.includes("missing asset provenance"), "catalog imports must require owner/license/source/use provenance");

  assert.equal(catalogEngine.validateAssetManifest(assetManifest).length, 0, "empty verified manifest should pass validation");
  const duplicateAsset = {
    id: "hat-demo", slot: "hat", url: "models/hat.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  };
  const duplicateReport = catalogEngine.validateAssetManifest({
    schemaVersion: "1.0.0", assets: [duplicateAsset, duplicateAsset]
  });
  assert.ok(duplicateReport.some((error) => error.includes("duplicate asset id")),
    "manifest validator must reject duplicate stable asset IDs");

  const richAsset = {
    id: "hat-rich", slot: "hat", url: "models/hat-rich.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" },
    bounds: { min: [0, 0, 0], max: [1, 2, 1] },
    pivot: [0, 0, 0], pivotConvention: "custom",
    materialRoles: ["fabric"], textures: { baseColor: "textures/hat-base.png" },
    lods: [{ url: "models/hat-low.glb", format: "glb", maxTriangles: 1200, maxVertices: 800 }]
  };
  assert.equal(catalogEngine.validateAssetDescriptor(richAsset).length, 0,
    "valid bounds, pivot, material, texture, and LOD metadata should pass");
  const badMetadata = catalogEngine.validateAssetDescriptor({
    ...richAsset, bounds: { min: [2, 0, 0], max: [1, 1, 1] },
    materialRoles: ["unknown-role"], textures: { normal: "javascript:alert(1)" },
    pivotConvention: "custom", pivot: null
  });
  assert.ok(badMetadata.length >= 4, "invalid bounds, material roles, texture URLs, and custom pivots must be rejected");

  const validModelReport = catalogEngine.validateModel(makeScene());
  assert.equal(validModelReport.valid, true, "valid geometry, normals, UVs, and bounds should pass model validation");
  const invalidModelReport = catalogEngine.validateModel({
    traverse(fn) { fn({ isMesh: true, geometry: { attributes: { position: { count: 2 } } } }); }
  });
  assert.equal(invalidModelReport.valid, false, "models with invalid position geometry must fail validation");
  const overBudgetReport = catalogEngine.validateModel(makeScene(), { maxVertices: 2 });
  assert.equal(overBudgetReport.valid, false, "models exceeding configured vertex budgets must fail validation");

  const catalogScene = makeScene();
  let catalogLoaded = false;
  let catalogError = "";
  catalogEngine.loadCatalogAsset({
    id: "hat-demo", slot: "hat", url: "models/hat.glb",
    format: "glb", is_adult: false, unit: "cm", scale: 2,
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  }, (root, gltf, descriptor) => {
    catalogLoaded = root === catalogScene && descriptor.id === "hat-demo";
  }, (message) => { catalogError = message; });
  await Promise.resolve();
  assert.equal(calls.at(-1), "models/hat.glb", "valid catalog descriptors should load their GLB");
  const scaleState = { value: null };
  catalogScene.scale = { setScalar(value) { scaleState.value = value; } };
  completeLoad({ scene: catalogScene });
  assert.equal(catalogLoaded, true, "catalog load should return the loaded scene and validated descriptor");
  assert.equal(scaleState.value, 0.02, "catalog import should normalize centimeters to meters and apply scale");

  let malformedError = "";
  catalogEngine.loadCatalogAsset({
    id: "broken-model", slot: "hat", url: "models/broken.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  }, () => assert.fail("malformed model must not be attached"), (message) => { malformedError = message; });
  await Promise.resolve();
  completeLoad({ scene: null });
  assert.match(malformedError, /Invalid 3D model/, "empty/malformed GLTF scenes must fail safely without crashing disposal");

  const adultCallsBefore = calls.length;
  let adultDenied = "";
  catalogEngine.loadCatalogAsset({
    id: "adult-item", slot: "accessory", url: "models/adult.glb",
    format: "glb", is_adult: true,
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  }, () => assert.fail("adult asset must remain locked without trusted entitlement"),
  (message) => { adultDenied = message; });
  await Promise.resolve();
  await Promise.resolve();
  assert.match(adultDenied, /Asset access denied/, "adult catalog assets must fail closed without entitlement");
  assert.equal(calls.length, adultCallsBefore, "denied adult assets must never start a network load");
  console.log("PASS: catalog descriptor validation, GLB loading, unit normalization, and default-deny adult gating.");
const materialWindow = {};
vm.runInNewContext(glam, { window: materialWindow });
let materialId = 0, disposedMaterials = 0;
function MockColor(hex) {
  this.hex = String(hex).replace("#", "");
  this.getHexString = () => this.hex;
}
class MockMaterial {
  constructor(params) {
    this.color = params.color;
    this.userData = {};
    this.uuid = "mock-material-" + (++materialId);
    this.dispose = () => { disposedMaterials++; };
  }
}
const materialFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial,
  Color: MockColor, DoubleSide: 2
});
class MockTexture {
  constructor(url) { this.url = url; this.dispose = () => { disposedTextures++; }; }
}
let disposedTextures = 0;
class MockTextureLoader {
  load(url, onLoad) { onLoad(new MockTexture(url)); }
}
const textureFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial,
  Color: MockColor, TextureLoader: MockTextureLoader,
  sRGBEncoding: 3001, LinearEncoding: 3000, DoubleSide: 2
});
let loadedMaps = null;
textureFactory.loadTextureMaps({
  baseColor: "textures/base-color.png", normal: "textures/normal.png",
  roughness: "textures/roughness.png", metalness: "textures/metalness.png",
  ao: "textures/ao.png", emissive: "textures/emissive.png"
}, (maps) => { loadedMaps = maps; }, (message) => assert.fail(message));
assert.ok(loadedMaps, "all supported PBR texture maps should load");
assert.equal(loadedMaps.baseColor.encoding, 3001, "base-color texture must use sRGB encoding");
assert.equal(loadedMaps.emissive.encoding, 3001, "emissive texture must use sRGB encoding");
assert.equal(loadedMaps.normal.encoding, 3000, "normal texture must use linear encoding");
const mappedMaterial = {};
textureFactory.applyTextureMaps(mappedMaterial, loadedMaps);
assert.equal(mappedMaterial.map, loadedMaps.baseColor);
assert.equal(mappedMaterial.normalMap, loadedMaps.normal);
assert.equal(mappedMaterial.roughnessMap, loadedMaps.roughness);
assert.equal(mappedMaterial.metalnessMap, loadedMaps.metalness);
assert.equal(mappedMaterial.aoMap, loadedMaps.ao);
assert.equal(mappedMaterial.emissiveMap, loadedMaps.emissive);
let textureError = "";
textureFactory.loadTextureMaps({ baseColor: "javascript:alert(1)" }, null, (message) => { textureError = message; });
assert.match(textureError, /Invalid PBR texture map reference/, "unsafe texture URLs must be rejected");

materialFactory.setPBR(false);
const oldFabric = materialFactory.fabric("#ffffff");
oldFabric.map = loadedMaps.baseColor;
const oldGold = materialFactory.gold();
const multiMaterialRoot = {
  traverse(fn) { fn({ isMesh: true, material: [oldFabric, oldGold] }); }
};
assert.equal(materialFactory.retintEquipped([multiMaterialRoot]), 2,
  "PBR mode switching must retint every role-tagged material in a multi-material mesh");
assert.ok(Array.isArray(multiMaterialRoot.material), "multi-material assignments must remain arrays");
assert.notEqual(multiMaterialRoot.material[0], oldFabric, "old material references must be replaced");
assert.equal(multiMaterialRoot.material[0].map, loadedMaps.baseColor, "mode switches must preserve texture-map references");
assert.equal(materialFactory.retireOldMaterials([multiMaterialRoot]), 2,
  "only the two replaced materials should be retired");
assert.equal(disposedMaterials, 2, "replaced materials should be disposed after reassignment");
textureFactory.dispose();
assert.equal(disposedTextures, 6, "factory teardown must dispose all owned texture maps");
console.log("PASS: multi-material PBR retint preserves arrays and disposes replaced materials safely.");

}
runCatalogAssetTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


