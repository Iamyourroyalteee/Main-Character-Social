"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../avatar-3d/index.html"), "utf8");
assert.match(html, /name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/, "avatar viewport must preserve safe areas and user zoom");
assert.doesNotMatch(html, /user-scalable=no|maximum-scale=1/, "avatar UI must not disable user zoom");
const embeddedAvatarHtml = fs.readFileSync(path.join(__dirname, "../src/avatar-3d/index.html"), "utf8");
assert.equal(embeddedAvatarHtml, html, "standalone and embedded avatar pages must stay byte-for-byte synchronized");
assert.ok(html.includes('<script src="MCSAvatarCatalogAnimationBridge.js"></script>'), "avatar page must load the catalog animation bridge");
assert.ok(html.includes("window.__mcsCatalogAnimationBridge.update(dt)"), "the main render loop must advance imported catalog animation mixers");
assert.ok(html.includes("previewCatalogAsset:"), "the avatar integration must expose a catalog preview loader");
assert.ok(html.includes("@media (prefers-reduced-motion: reduce)"), "avatar CSS must respect reduced-motion preferences");
assert.ok(html.includes('window.matchMedia("(prefers-reduced-motion: reduce)")'), "avatar runtime must detect reduced-motion preferences");
assert.ok(html.includes("function playUserEmote(name, fadeDuration)"), "user-triggered emotes must remain explicitly available");
assert.ok(html.includes("player.update(reduceMotion && performance.now() >= userMotionUntil ? 0 : dt)"), "ambient avatar motion must pause outside user-requested emotes");
assert.ok(html.includes("friend.update(reduceMotion ? 0 : dt)"), "remote demo avatar motion must pause for reduced-motion users");
assert.ok(html.includes('if (currentRoom === "island" && !reduceMotion)'), "island water and fire motion must pause for reduced-motion users");
assert.ok(html.includes("if (!reduceMotion) Object.values(ROOM_LIFE)"), "room particle systems must pause for reduced-motion users");
assert.ok(html.includes("playUserEmote(b.dataset.emote, 0.25)"), "manual emote controls must remain functional");
assert.match(html, /@media \(pointer: coarse\)[\s\S]*?min-width:44px;min-height:44px/, "coarse-pointer controls must meet the 44px minimum target");

const appHtml = fs.readFileSync(path.join(__dirname, "../src/index.html"), "utf8");
assert.match(appHtml, /id="mcs-avatar-3d-frame"/, "the main app Avatar tab must embed the 3D builder");
assert.match(appHtml, /src="\/avatar-3d\/index\.html\?mode=builder&embedded=1"/, "the embedded builder must use the same-origin app asset path");
assert.match(appHtml, /mcs-avatar-account-bridge/, "the main app must install the account bridge");
assert.match(appHtml, /MCS_AVATAR_SAVE/, "the main app must accept character save events from the embedded builder");
assert.match(appHtml, /auth\.client\.from\("mcs_profiles"\)/, "signed-in character saves must use the existing profile row");
assert.match(appHtml, /event\.origin !== window\.location\.origin/, "the account bridge must reject cross-origin messages");
const loader = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarLoader.js"), "utf8");
assert.match(html, /MCS_AVATAR_READY/, "the embedded builder must announce readiness to the parent app");
assert.match(html, /MCS_AVATAR_LOAD/, "the embedded builder must restore account-saved characters");
assert.match(html, /item\.is_adult/, "restored catalog items must retain adult-item gating");
const glam = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSGlamMaterialFactory.js"), "utf8");
const embeddedAvatarRoot = path.join(__dirname, "../src/avatar-3d");
for (const file of [
  "index.html",
  "MCSAvatarLoader.js",
  "MCSGlamMaterialFactory.js",
  "MCSAvatarAnimationRuntime.js",
  "MCSAvatarCatalogAnimationBridge.js",
  "MCSCameraSetup.js",
  "MCSStudioLighting.js",
  "assets/manifest.json",
]) {
  const prototypeCopy = fs.readFileSync(path.join(__dirname, "../avatar-3d", file), "utf8");
  const appCopy = fs.readFileSync(path.join(embeddedAvatarRoot, file), "utf8");
  assert.equal(appCopy, prototypeCopy, "standalone and embedded avatar runtime must stay synchronized: " + file);
}

assert.match(glam, /Array\.isArray\(o\.material\).*?map\(function\(mat\)\{ return retintOne\(mat, o\); \}\)/s, "PBR factory must retint each material in imported material arrays");
assert.match(html, /glam\.setPBR\(true, scene, gradientMap\);\s*glam\.retintEquipped\(\[player\.root, friend\.root\]\)/, "PBR must convert remaining legacy avatar toon materials before the first frame");
assert.match(glam, /var mats = Array\.isArray\(o\.material\) \? o\.material : \[o\.material\]/, "PBR factory must track every material when retiring old materials");
assert.match(glam, /shader\.uniforms\.uSSS\s*=\s*\{ value: new THREE\.Color\(sssColor \|\| 0xb4554d\) \}/, "PBR SSS approximation must bind its uSSS uniform");
assert.match(glam, /var mainMarker = "void main\(\) \{";[\s\S]*?shader\.fragmentShader = shader\.fragmentShader\.slice\(0, mainIndex\)\s*\+\s*"uniform vec3 uSSS;/, "PBR SSS uniform must be declared before main() to prevent the historical undeclared-uniform shader failure");
assert.match(glam, /var emissiveMarker = "#include <emissivemap_fragment>";[\s\S]*?if \(shader\.fragmentShader\.indexOf\(emissiveMarker\) < 0\) throw new Error/, "PBR SSS injection must fail explicitly if the pinned shader chunk changes");
assert.doesNotMatch(glam, /uSSS\.rgb/, "PBR SSS must use the vec3 uniform directly, not an invalid .rgb field");
assert.match(glam, /NOT true SSS/, "skin subsurface appearance must remain accurately labeled as an approximation");
const assetSchema = JSON.parse(fs.readFileSync(path.join(__dirname, "../docs/3d-asset-manifest.schema.json"), "utf8"));
const assetManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../avatar-3d/assets/manifest.json"), "utf8"));
const gltfFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/minimal-pbr.gltf"), "utf8"));
const skinnedGltfFixture = JSON.parse(fs.readFileSync(path.join(__dirname, "../avatar-3d/assets/test-fixtures/minimal-skinned.gltf"), "utf8"));
const browserSmoke = fs.readFileSync(path.join(__dirname, "../avatar-3d/asset-pipeline-smoke.html"), "utf8");
const avatarAnimationRuntime = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarAnimationRuntime.js"), "utf8");
assert.equal(assetSchema.$defs.asset.required.includes("provenance"), true, "asset schema must require provenance");
assert.ok(assetSchema.$defs.asset.properties.materials, "asset schema must define per-material PBR texture bindings");
assert.equal(assetManifest.schemaVersion, "1.0.0", "asset manifest must declare its schema version");
assert.equal(assetManifest.assets.length, 0, "unverified external models must not be added as placeholder assets");
assert.equal(gltfFixture.asset.version, "2.0", "browser fixture must be a valid glTF 2.0 asset");
assert.equal(gltfFixture.meshes.length, 1, "browser fixture must include a real mesh");
assert.equal(skinnedGltfFixture.asset.version, "2.0", "skinned browser fixture must be glTF 2.0");
assert.equal(skinnedGltfFixture.skins.length, 1, "skinned fixture must contain one skin");
assert.equal(skinnedGltfFixture.skins[0].joints.length, 2, "skinned fixture must contain two test joints");
const skinnedAttributes = skinnedGltfFixture.meshes[0].primitives[0].attributes;
assert.ok(Object.prototype.hasOwnProperty.call(skinnedAttributes, "JOINTS_0"), "skinned fixture must contain joint indices");
assert.ok(Object.prototype.hasOwnProperty.call(skinnedAttributes, "WEIGHTS_0"), "skinned fixture must contain skin weights");
assert.equal(skinnedGltfFixture.animations[0].name, "MCS_Test_Idle", "skinned fixture must include a named animation clip");
assert.ok(browserSmoke.includes("engine.loadCatalogAsset"), "browser smoke page must exercise the catalog loader");
assert.ok(browserSmoke.includes("assets/test-fixtures/minimal-pbr.gltf"), "browser smoke page must load the PBR repository fixture");
assert.ok(browserSmoke.includes("assets/test-fixtures/minimal-skinned.gltf"), "browser smoke page must load the rigged repository fixture");
assert.ok(browserSmoke.includes("skinnedMeshCount") && browserSmoke.includes("MCS_Test_Idle"), "browser smoke page must validate and play a real skinned fixture");
assert.ok(html.includes("MCSAvatarAnimationRuntime.js"), "prototype must load the shared skeletal animation runtime");
assert.ok(html.includes("createAnimationController"), "prototype must expose an animation controller factory");
assert.ok(browserSmoke.includes("MCSAvatarAnimationRuntime.create"), "browser smoke page must instantiate the animation runtime");
assert.match(avatarAnimationRuntime, /AnimationMixer/, "animation runtime must use Three.js AnimationMixer");
const animationPlayStart = avatarAnimationRuntime.indexOf("function play(");
const animationUpdateStart = avatarAnimationRuntime.indexOf("function update(", animationPlayStart);
const animationPlaySource = avatarAnimationRuntime.slice(animationPlayStart, animationUpdateStart);
const resetBeforeFade = animationPlaySource.indexOf("next.reset()");
const fadeScheduling = animationPlaySource.indexOf("current.crossFadeTo(next");
assert.ok(resetBeforeFade >= 0 && fadeScheduling > resetBeforeFade,
  "incoming animation action must reset before crossFadeTo schedules its fade-in");

const gate = html.match(/function isAdultProfile\(\)\s*\{([\s\S]*?)\}/);
assert.ok(gate, "3D prototype must define its adult-access gate");
assert.match(gate[1], /return\s+false\s*;/, "3D prototype must fail closed until a trusted server entitlement is wired");

assert.match(html, /profile:\s*\{\s*ageBand:\s*"unknown"\s*\}/, "unverified profile must default to unknown age");
const clamp = html.match(/function clampBodyForBand\(body, ageBand\)\s*\{([\s\S]*?)\n\}/);
assert.ok(clamp, "conservative body-shape clamp must exist");
assert.match(clamp[1], /isAdultProfile\(\)/, "unverified/teen profiles must use conservative body-shape limits");
assert.match(html, /function sanitizeBodyForBuilder\(body\)/, "saved and imported body values must be sanitized");
assert.match(html, /function sanitizeFaceForBuilder\(face\)/, "saved and imported face values must be sanitized");
assert.match(html, /room\.band && room\.band !== roomBand\(\)\) roomId = roomBand\(\) === "teen" \? "teenHangout" : "main"/, "room fallback must remain inside the caller's age-band experience");
assert.match(html, /profile:\s*\{\s*ageBand:\s*"unknown"/, "standalone outfit data must default to unknown age");
assert.doesNotMatch(html, /base\.profile\.ageBand\s*=\s*d\.profile/, "an outfit string must never self-assert adult entitlement");

/* Exercise the real body/face sanitizers and fail-closed clamps. */
const bodySanitizerMatch = html.match(/function sanitizeBodyForBuilder\(body\)\s*\{[\s\S]*?\n\}/);
assert.ok(bodySanitizerMatch, "body sanitizer source must be extractable");
const bodySanitizer = vm.runInNewContext("(" + bodySanitizerMatch[0] + ")", {
  SHAPES_FEM:[{id:"slim-f"},{id:"natural-f"}],
  SHAPES_MASC:[{id:"natural-m"}],
  SKIN_TONES:["#a","#b","#c","#d","#e"]
});
const sanitizedBody = bodySanitizer({
  presentation:"masc", shape:"invalid-shape", bust:9, chest:-2, hips:1.8,
  glutes:"bad", waist:-4, skin:"url(javascript:alert(1))", height:9
});
assert.equal(sanitizedBody.presentation,"masc");
assert.equal(sanitizedBody.shape,"natural-m");
assert.equal(sanitizedBody.bust,1);
assert.equal(sanitizedBody.chest,0);
assert.equal(sanitizedBody.hips,1);
assert.equal(sanitizedBody.glutes,0.5);
assert.equal(sanitizedBody.waist,0);
assert.equal(sanitizedBody.skin,"#e");
assert.equal(sanitizedBody.height,1.07);
assert.equal(bodySanitizer({height:null}).height,1,"null height must restore to the neutral default");

const bodyClampMatch = html.match(/function clampBodyForBand\(body, ageBand\)\s*\{[\s\S]*?\n\}/);
const bodyClamp = vm.runInNewContext("(" + bodyClampMatch[0] + ")", {isAdultProfile:()=>false});
const restrictedBody = {hips:0.9,glutes:0.1,waist:0.5};
bodyClamp(restrictedBody,"unknown");
assert.deepEqual(restrictedBody,{hips:0.75,glutes:0.25,waist:0.5});
bodyClamp(restrictedBody,"unknown");
assert.deepEqual(restrictedBody,{hips:0.75,glutes:0.25,waist:0.5},"body restrictions must be idempotent across repeated restores");

const faceSanitizerMatch = html.match(/function sanitizeFaceForBuilder\(face\)\s*\{[\s\S]*?\n\}/);
const faceSanitizer = vm.runInNewContext("(" + faceSanitizerMatch[0] + ")", {LIP_COLORS:["#lip"]});
const sanitizedFace = faceSanitizer({eyeSize:8,noseWidth:-1,cheekbone:"bad",lipColor:"invalid"});
assert.equal(sanitizedFace.eyeSize,1);
assert.equal(sanitizedFace.noseWidth,0);
assert.equal(sanitizedFace.cheekbone,0.5);
assert.equal(sanitizedFace.lipColor,"#lip");

const faceClampMatch = html.match(/function clampFaceForBand\(f, band\)\s*\{[\s\S]*?\n\}/);
assert.ok(faceClampMatch,"face clamp must exist");
const faceClamp = vm.runInNewContext("(" + faceClampMatch[0] + ")", {
  FACE_LIMITS:{eyeSize:[0,1],noseWidth:[0,1]},
  isAdultProfile:()=>false,
  outfit:{profile:{ageBand:"unknown"}}
});
const restrictedFace = {eyeSize:0.9,noseWidth:0.1};
faceClamp(restrictedFace,"unknown");
assert.deepEqual(restrictedFace,{eyeSize:0.75,noseWidth:0.25});
faceClamp(restrictedFace,"unknown");
assert.deepEqual(restrictedFace,{eyeSize:0.75,noseWidth:0.25},"face restrictions must be idempotent across repeated restores");

assert.match(loader, /opts\.getEntitlement\s*\|\|\s*function\(\)\s*\{\s*return Promise\.resolve\(\{\s*adult:false/, "GLTF loader entitlement hook must default to deny");
assert.ok((html.match(/isAdultProfile\(\)/g) || []).length >= 5, "adult gate must be consulted across the prototype");
assert.match(html, /AVATAR_CHARACTER_STORAGE_KEY\s*=\s*"mcs_avatar_character_v1"/, "avatar look should have a stable local persistence key");
assert.match(html, /function restoreCharacterLocally\(\)/, "saved character should be restored when either avatar experience loads");
assert.match(html, /function persistCharacterLocally\(\)/, "avatar edits should persist without relying on the export string");
assert.match(html, /function catalogArt\(slot, color, itemId\)/, "catalog cards should render category-specific visual artwork");
assert.match(html, /catalog-search/, "wardrobe categories should expose item search");
assert.match(html, /b\.setAttribute\("aria-pressed"/, "selectable wardrobe cards should expose selected state to assistive technology");

assert.match(html, /examples\/js\/loaders\/GLTFLoader\.js/, "prototype must load the Three.js r128 GLTFLoader dependency");
assert.match(html, /GLTFLoader:\s*THREE\.GLTFLoader\s*\|\|\s*null/, "avatar engine must receive the loaded GLTFLoader constructor");
assert.match(loader, /opts\.GLTFLoader\s*\|\|\s*null/, "loader must retain a graceful fallback when GLTFLoader is unavailable");
assert.match(loader, /function validateAssetDescriptor\(asset\)/, "catalog asset descriptors must be schema-validated");
assert.match(loader, /function validateAssetManifest\(manifest\)/, "the versioned asset manifest must be validated");
assert.match(loader, /asset id must be a stable lowercase identifier/, "asset IDs must be stable and normalized");
assert.match(loader, /function loadCatalogAsset\(asset, onDone, onFail\)/, "validated catalog assets must have a managed loading path");
assert.match(loader, /function applyMaterialBindings\(root, bindings, request, onDone, onFail\)/, "catalog imports must bind texture maps to named GLTF materials");
assert.match(loader, /function cancelAssetRequests\(\)/, "engine teardown must cancel pending catalog and texture requests");
assert.match(loader, /function releaseAsset\(root\)/, "completed catalog roots must have an explicit disposal path");
assert.match(loader, /function validateModel\(root, limits\)/, "loaded model geometry and transforms must be validated");
assert.match(loader, /if \(!root\)\{ fail\("Invalid 3D model: empty GLTF scene"\)/, "empty GLTF scenes must fail closed");
assert.match(loader, /unitScale = asset\.unit === "cm"/, "catalog model units must be normalized on import");
assert.match(loader, /function validateAssetUrl\(url\)/, "GLTF asset URLs must be validated before loading");
assert.match(loader, /javascript|data|blob|file/, "executable and local-only URL schemes must be rejected");
assert.match(loader, /pending = pending\.filter/, "completed GLTF requests must be removed from pending lifecycle tracking");
assert.match(loader, /handle\.cancelled \|\| !alive/, "cancelled or torn-down requests must not attach loaded assets");
console.log("PASS: 3D prototype age gate fails closed; unverified body proportions are clamped; loader entitlement defaults to deny.");
/* Exercise the actual loader module with a controllable GLTFLoader mock. */

const sandboxWindow = {};
vm.runInNewContext(loader, { window: sandboxWindow });
let calls = [];
let completeLoad, failLoad;
class MockGLTFLoader {
  load(url, onLoad, onProgress, onError) { calls.push(url); completeLoad = onLoad; failLoad = onError; }
}
const disposed = { geometry: 0, material: 0, texture: 0 };
function makeScene() {
  const mesh = {
    isMesh: true,
    geometry: {
      attributes: {
        position: numericAttribute([[0,0,0],[1,0,0],[0,1,0]],3),
        normal: numericAttribute([[0,0,1],[0,0,1],[0,0,1]],3),
        uv: numericAttribute([[0,0],[1,0],[0,1]],2)
      },
      index: numericAttribute([[0],[1],[2]],1),
      boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      dispose() { disposed.geometry++; }
    },
    material: { map: { dispose() { disposed.texture++; } }, dispose() { disposed.material++; } }
  };
  return { scale: { x: 1, y: 1, z: 1, setScalar(value) { this.x = this.y = this.z = value; } }, traverse(fn) { fn(mesh); } };
}
function makeEngine(materialFactory) {
  return sandboxWindow.MCSAvatarLoader.create({ GLTFLoader: MockGLTFLoader }, {
    renderer: { domElement: { clientWidth: 10, clientHeight: 10 }, setSize() {} },
    scene: {}, camera: { updateProjectionMatrix() {} }, GLTFLoader: MockGLTFLoader, materialFactory
  });
}
const runtimeEngine = makeEngine();

function numericAttribute(rows,itemSize){
  const array=[];
  rows.forEach(row=>row.forEach(value=>array.push(value)));
  const attribute={count:rows.length,itemSize,array};
  ["getX","getY","getZ","getW"].forEach((name,component)=>{
    attribute[name]=index=>array[index*itemSize+component];
  });
  return attribute;
}
function skinAttribute(rows){return numericAttribute(rows,4);}
function identityInverseBind(){
  return {elements:[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]};
}
function makeSkinnedScene(){
  const rootBones=[{},{}];
  const mesh={
    isMesh:true, isSkinnedMesh:true, material:{},
    geometry:{attributes:{
      position:numericAttribute([[0,0,0],[1,0,0],[0,1,0]],3),
      normal:numericAttribute([[0,0,1],[0,0,1],[0,0,1]],3),
      uv:numericAttribute([[0,0],[1,0],[0,1]],2),
      skinIndex:skinAttribute([[0,1,0,0],[0,1,0,0],[0,1,0,0]]),
      skinWeight:skinAttribute([[0.5,0.5,0,0],[0.75,0.25,0,0],[1,0,0,0]])
    },index:numericAttribute([[0],[1],[2]],1)},
    skeleton:{bones:rootBones.slice(),boneInverses:[identityInverseBind(),identityInverseBind()]}
  };
  return {mesh,rootBones,traverse(fn){fn(mesh);this.rootBones.forEach(fn);}};
}
const validSkinReport=runtimeEngine.validateModel(makeSkinnedScene());
assert.equal(validSkinReport.valid,true,"valid skinned meshes must pass structural skin validation");
assert.equal(validSkinReport.skinnedMeshCount,1,"model validation must report skinned mesh count");
const badPositionData=makeSkinnedScene();
badPositionData.mesh.geometry.attributes.position.array[0]=NaN;
assert.ok(runtimeEngine.validateModel(badPositionData).errors.includes("mesh position attribute contains non-finite data"),
  "non-finite vertex positions must fail validation");
const badNormalCount=makeSkinnedScene();
badNormalCount.mesh.geometry.attributes.normal.count=2;
assert.ok(runtimeEngine.validateModel(badNormalCount).errors.includes("mesh normal attribute count mismatch"),
  "normal attributes must match the position vertex count");
const badUvData=makeSkinnedScene();
badUvData.mesh.geometry.attributes.uv.array[2]=Infinity;
assert.ok(runtimeEngine.validateModel(badUvData).errors.includes("mesh uv attribute contains non-finite data"),
  "non-finite UV coordinates must fail validation");
const badIndex=makeSkinnedScene();
badIndex.mesh.geometry.index.array[2]=3;
assert.ok(runtimeEngine.validateModel(badIndex).errors.includes("mesh index contains an out-of-range vertex reference"),
  "indices outside the vertex buffer must fail validation");
const badIndexCount=makeSkinnedScene();
badIndexCount.mesh.geometry.index.count=2;
assert.ok(runtimeEngine.validateModel(badIndexCount).errors.includes("mesh index count is invalid for triangles"),
  "triangle index counts must be divisible by three");
const emptyIndex=makeSkinnedScene();
emptyIndex.mesh.geometry.index.count=0;
const emptyIndexReport=runtimeEngine.validateModel(emptyIndex);
assert.ok(emptyIndexReport.errors.includes("mesh index count is invalid for triangles"),
  "indexed meshes with no triangle indices must fail validation");
assert.equal(emptyIndexReport.triangleCount,0,
  "empty index buffers must not fall back to the non-indexed vertex count");
const detachedBone=makeSkinnedScene();
detachedBone.mesh.skeleton.bones[1]={};
assert.ok(runtimeEngine.validateModel(detachedBone).errors.includes("skinned mesh skeleton contains bones outside the imported model root"),
  "skeleton bones outside the imported model root must fail validation");
const badInverseBindLength=makeSkinnedScene();
badInverseBindLength.mesh.skeleton.boneInverses[0]={elements:[1,0,0]};
assert.ok(runtimeEngine.validateModel(badInverseBindLength).errors.includes("skinned mesh has invalid inverse-bind matrix data"),
  "inverse-bind matrices with the wrong element count must fail validation");
const nonFiniteInverseBind=makeSkinnedScene();
nonFiniteInverseBind.mesh.skeleton.boneInverses[1].elements[7]=NaN;
assert.ok(runtimeEngine.validateModel(nonFiniteInverseBind).errors.includes("skinned mesh has invalid inverse-bind matrix data"),
  "inverse-bind matrices with non-finite elements must fail validation");
const missingSkeleton=makeSkinnedScene(); missingSkeleton.mesh.skeleton=null;
assert.ok(runtimeEngine.validateModel(missingSkeleton).errors.includes("skinned mesh is missing a valid skeleton"),
  "skinned meshes without a usable skeleton must fail validation");
const badBoneIndex=makeSkinnedScene();
badBoneIndex.mesh.geometry.attributes.skinIndex=skinAttribute([[2,0,0,0],[0,1,0,0],[0,1,0,0]]);
assert.ok(runtimeEngine.validateModel(badBoneIndex).errors.includes("skinned mesh has an invalid bone index"),
  "skin indices outside the skeleton must fail validation");
const badWeightSum=makeSkinnedScene();
badWeightSum.mesh.geometry.attributes.skinWeight=skinAttribute([[0.2,0.2,0,0],[0.75,0.25,0,0],[1,0,0,0]]);
assert.ok(runtimeEngine.validateModel(badWeightSum).errors.includes("skinned mesh skin weights are not normalized"),
  "per-vertex skin weights must sum to one within tolerance");
const unboundSkin=makeSkinnedScene(); unboundSkin.mesh.isSkinnedMesh=false;
assert.ok(runtimeEngine.validateModel(unboundSkin).errors.includes("mesh has skin attributes but is not a SkinnedMesh"),
  "skin attributes must not be silently ignored on ordinary meshes");

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
let missingAssetError = "";
runtimeEngine.loadGLTF("models/missing.glb", () => assert.fail("missing GLTF must not load"),
  (message) => { missingAssetError = message; });
failLoad(new Error("404 asset not found"));
assert.match(missingAssetError, /404 asset not found/, "missing asset errors must reach the caller");


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

  /* The running prototype must expose catalog entries only after whole-manifest validation. */
  let manifestDelivered = null;
  let manifestFailure = "";
  sandboxWindow.fetch = async () => ({ ok:true, status:200, json:async () => assetManifest });
  const manifestRequest = catalogEngine.loadAssetManifest("assets/manifest.json",
    (manifest) => { manifestDelivered = manifest; },
    (message) => { manifestFailure = message; });
  assert.ok(manifestRequest && typeof manifestRequest.cancel === "function", "manifest request must be cancellable");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(Array.from(manifestDelivered.assets), [], "valid empty manifest should publish an empty catalog");
  assert.equal(manifestFailure, "", "valid manifest should not report an error");

  let rejectedManifest = false;
  sandboxWindow.fetch = async () => ({ ok:true, status:200, json:async () => ({
    schemaVersion:"1.0.0", assets:[{ id:"bad", slot:"hat", url:"javascript:alert(1)", format:"glb" }]
  }) });
  catalogEngine.loadAssetManifest("assets/manifest.json", () => {
    assert.fail("invalid manifest must never publish catalog entries");
  }, (message) => { rejectedManifest = /Asset manifest rejected/.test(message); });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(rejectedManifest, true, "invalid full manifest must return actionable validation errors");

  let httpFailure = "";
  sandboxWindow.fetch = async () => ({ ok:false, status:404 });
  catalogEngine.loadAssetManifest("assets/manifest.json", () => assert.fail("404 manifest must not publish"),
    (message) => { httpFailure = message; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(httpFailure, /404/, "manifest HTTP failures must be surfaced");

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
  const disposedBeforeRelease = disposed.geometry;
  catalogEngine.releaseAsset(catalogScene);
  assert.ok(disposed.geometry > disposedBeforeRelease, "released catalog roots must dispose their owned geometry");
  assert.equal(scaleState.value, 0.02, "catalog import should normalize centimeters to meters and apply scale");

  let malformedError = "";
  catalogEngine.loadCatalogAsset({
    id: "broken-model", slot: "hat", url: "models/broken.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  }, () => assert.fail("malformed model must not be attached"), (message) => { malformedError = message; });
  await Promise.resolve();
  completeLoad({ scene: null });
  assert.match(malformedError, /Invalid 3D model/, "empty/malformed GLTF scenes must fail safely without crashing disposal");

  const boundMaterial = { name: "BodySurface", userData: {} };
  const boundTexture = { url: "textures/body.png" };
  const bindingFactory = {
    loadTextureMaps(refs, onDone) { onDone({ baseColor: boundTexture }); return { cancel() {} }; },
    applyTextureMaps(material, maps) { material.map = maps.baseColor; material.needsUpdate = true; }
  };
  const bindingEngine = makeEngine(bindingFactory);
  const boundRoot = {
    scale: { setScalar(value) { this.value = value; } },
    traverse(fn) {
      fn({
        isMesh: true, material: boundMaterial,
        geometry: {
          attributes: {
            position: numericAttribute([[0,0,0],[1,0,0],[0,1,0]],3),
            normal: numericAttribute([[0,0,1],[0,0,1],[0,0,1]],3),
            uv: numericAttribute([[0,0],[1,0],[0,1]],2)
          },
          index: numericAttribute([[0],[1],[2]],1),
          boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
          dispose() { disposed.geometry++; }
        }
      });
    }
  };
  let bindingComplete = false;
  bindingEngine.loadCatalogAsset({
    id: "body-surface", slot: "outfit", url: "models/body.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" },
    materials: [{ name: "BodySurface", role: "fabric", textures: { baseColor: "textures/body.png" } }]
  }, () => { bindingComplete = true; }, (message) => assert.fail(message));
  await Promise.resolve();
  completeLoad({ scene: boundRoot });
  assert.equal(bindingComplete, true, "catalog import should complete after per-material textures are bound");
  assert.equal(boundMaterial.map, boundTexture, "manifest texture maps should attach to the named GLTF material");
  assert.equal(boundMaterial.userData.__role, "fabric", "manifest material role should be assigned for later PBR mode changes");
  const disposedBeforeBindingTeardown = disposed.geometry;
  bindingEngine.teardown();
  assert.ok(disposed.geometry > disposedBeforeBindingTeardown, "engine teardown must dispose completed imported roots");

  let deferredMaterialCallback = null, deferredCancelCalled = false;
  const deferredFactory = {
    loadTextureMaps(refs, onDone) {
      deferredMaterialCallback = onDone;
      return { cancel() { deferredCancelCalled = true; } };
    },
    applyTextureMaps() {}
  };
  const teardownEngine = makeEngine(deferredFactory);
  const teardownMaterial = { name: "DeferredSurface", userData: {} };
  const teardownRoot = {
    scale: { setScalar(value) { this.value = value; } },
    traverse(fn) {
      fn({
        isMesh: true, material: teardownMaterial,
        geometry: {
          attributes: {
            position: numericAttribute([[0,0,0],[1,0,0],[0,1,0]],3),
            normal: numericAttribute([[0,0,1],[0,0,1],[0,0,1]],3),
            uv: numericAttribute([[0,0],[1,0],[0,1]],2)
          },
          index: numericAttribute([[0],[1],[2]],1),
          boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
          dispose() { disposed.geometry++; }
        }
      });
    }
  };
  let attachedAfterTeardown = false;
  teardownEngine.loadCatalogAsset({
    id: "deferred-surface", slot: "outfit", url: "models/deferred.glb", format: "glb",
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" },
    materials: [{ name: "DeferredSurface", role: "fabric", textures: { baseColor: "textures/deferred.png" } }]
  }, () => { attachedAfterTeardown = true; }, (message) => assert.fail(message));
  await Promise.resolve();
  completeLoad({ scene: teardownRoot });
  assert.equal(typeof deferredMaterialCallback, "function", "per-material texture binding should remain in flight for cancellation test");
  const disposedBeforeTeardown = disposed.geometry;
  teardownEngine.teardown();
  assert.equal(deferredCancelCalled, true, "engine teardown must cancel outstanding material texture loads");
  deferredMaterialCallback({ baseColor: {} });
  assert.equal(attachedAfterTeardown, false, "cancelled asset must never attach after teardown");
  assert.ok(disposed.geometry > disposedBeforeTeardown, "engine teardown must dispose an uncommitted loaded model");

  const adultCallsBefore = calls.length;
  let adultDenied = "";
  catalogEngine.loadCatalogAsset({
    id: "adult-item", slot: "accessory", url: "models/adult.glb",
    format: "glb", is_adult: true,
    provenance: { owner: "MCS", license: "Original", source: "internal", permittedUse: "commercial" }
  }, () => assert.fail("adult asset must remain locked without trusted entitlement"),
  (message) => { adultDenied = message; });
  for (let i = 0; i < 6; i++) await Promise.resolve();
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
class MockTexture {
  constructor(url) { this.url = url; this.dispose = () => { disposedTextures++; }; }
}
let disposedTextures = 0;
class MockTextureLoader {
  load(url, onLoad) { onLoad(new MockTexture(url)); }
}
const materialFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial,
  Color: MockColor, TextureLoader: MockTextureLoader,
  sRGBEncoding: 3001, LinearEncoding: 3000, DoubleSide: 2
});
let loadedMaps = null;
const textureRequest = materialFactory.loadTextureMaps({
  baseColor: "textures/base-color.png", normal: "textures/normal.png",
  roughness: "textures/roughness.png", metalness: "textures/metalness.png",
  ao: "textures/ao.png", emissive: "textures/emissive.png"
}, (maps) => { loadedMaps = maps; }, (message) => assert.fail(message));
assert.ok(loadedMaps, "all supported PBR texture maps should load");
assert.equal(loadedMaps.baseColor.encoding, 3001, "base-color texture must use sRGB encoding");
assert.equal(loadedMaps.emissive.encoding, 3001, "emissive texture must use sRGB encoding");
assert.equal(loadedMaps.normal.encoding, 3000, "normal texture must use linear encoding");
const mappedMaterial = {};
materialFactory.applyTextureMaps(mappedMaterial, loadedMaps);
assert.equal(mappedMaterial.map, loadedMaps.baseColor);
assert.equal(mappedMaterial.normalMap, loadedMaps.normal);
assert.equal(mappedMaterial.roughnessMap, loadedMaps.roughness);
assert.equal(mappedMaterial.metalnessMap, loadedMaps.metalness);
assert.equal(mappedMaterial.aoMap, loadedMaps.ao);
assert.equal(mappedMaterial.emissiveMap, loadedMaps.emissive);
textureRequest.cancel();
assert.equal(disposedTextures, 0, "cancelling a completed texture request must not dispose maps already in use");
let textureError = "";
materialFactory.loadTextureMaps({ baseColor: "javascript:alert(1)" }, null, (message) => { textureError = message; });
assert.match(textureError, /Invalid PBR texture map reference/, "unsafe texture URLs must be rejected");
class FailingTextureLoader {
  load(url, onLoad, progress, onError) {
    if (url.includes("bad")) onError(new Error("texture decode failed"));
    else onLoad(new MockTexture(url));
  }
}
const failingFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial,
  Color: MockColor, TextureLoader: FailingTextureLoader,
  sRGBEncoding: 3001, LinearEncoding: 3000
});
let textureLoadFailure = "";
failingFactory.loadTextureMaps({
  baseColor: "textures/good.png", normal: "textures/bad.png"
}, () => assert.fail("failed texture set must not be reported as complete"),
(message) => { textureLoadFailure = message; });
assert.match(textureLoadFailure, /texture decode failed/, "texture decode failures must be surfaced");
assert.equal(disposedTextures, 1, "partially loaded texture sets must dispose their successful textures on failure");
failingFactory.dispose();
let lateTextureLoad = null;
class DeferredTextureLoader {
  load(url, onLoad) { lateTextureLoad = onLoad; }
}
const pendingFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial,
  Color: MockColor, TextureLoader: DeferredTextureLoader,
  sRGBEncoding: 3001, LinearEncoding: 3000
});
pendingFactory.loadTextureMaps({ baseColor: "textures/pending.png" }, () => {
  assert.fail("factory teardown must cancel pending texture requests");
}, () => {});
const disposedBeforeLateLoad = disposedTextures;
pendingFactory.dispose();
lateTextureLoad(new MockTexture("textures/pending.png"));
assert.equal(disposedTextures, disposedBeforeLateLoad + 1,
  "late texture results after factory teardown must be disposed immediately");



const roleFactory = materialWindow.MCSGlamMaterialFactory.create({
  MeshPhysicalMaterial: MockMaterial, MeshToonMaterial: MockMaterial, Color: MockColor, DoubleSide: 2
});
roleFactory.setPBR(false);
["skin","lips","hair","fabric","denim","metal","gold","chrome","glass","wood","stone","emissive","plastic","leather","rubber","water"].forEach((role) => {
  const material = roleFactory.forRole(role, "#aabbcc");
  assert.equal(material.userData.__role, role, "semantic material role should resolve: " + role);
});
roleFactory.dispose();
materialFactory.setPBR(false);
const oldFabric = materialFactory.fabric("#ffffff");
oldFabric.map = loadedMaps.baseColor;
const oldGold = materialFactory.gold();
const multiMaterialMesh = { isMesh: true, material: [oldFabric, oldGold] };
const multiMaterialRoot = { traverse(fn) { fn(multiMaterialMesh); } };
assert.equal(materialFactory.retintEquipped([multiMaterialRoot]), 2,
  "PBR mode switching must retint every role-tagged material in a multi-material mesh");
assert.ok(Array.isArray(multiMaterialMesh.material), "multi-material assignments must remain arrays");
assert.notEqual(multiMaterialMesh.material[0], oldFabric, "old material references must be replaced");
assert.equal(multiMaterialMesh.material[0].map, loadedMaps.baseColor, "mode switches must preserve texture-map references");
const disposedBeforeRetire = disposedMaterials;
assert.equal(materialFactory.retireOldMaterials([multiMaterialRoot]), 2,
  "only the two replaced materials should be retired");
assert.equal(disposedMaterials, disposedBeforeRetire + 2, "replaced materials should be disposed after reassignment");
const texturesBeforeFactoryDispose = disposedTextures;
materialFactory.dispose();
assert.equal(disposedTextures, texturesBeforeFactoryDispose + 6, "factory teardown must dispose all six owned texture maps");

// Skeletal animation runtime: clips, crossfades, morph targets, playback controls, and teardown.
const animationRuntimeSource = fs.readFileSync(path.join(__dirname, "../avatar-3d/MCSAvatarAnimationRuntime.js"), "utf8");
const animationWindow = {};
vm.runInNewContext(animationRuntimeSource, { window: animationWindow });
let mixerUpdates = 0, mixerStops = 0, mixerUncached = 0, actionPlays = 0, crossFades = 0;
function MockAction(){
  this.enabled = false;
  this.reset = () => this;
  this.setEffectiveWeight = () => this;
  this.setEffectiveTimeScale = () => this;
  this.play = () => { actionPlays++; return this; };
  this.stop = () => this;
  this.crossFadeTo = () => { crossFades++; return this; };
  this.fadeOut = () => this;
}
class MockAnimationMixer {
  constructor(root){ this.root = root; this.timeScale = 1; }
  clipAction(){ return new MockAction(); }
  update(delta){ mixerUpdates += delta; }
  setTime(time){ this.time = time; }
  stopAllAction(){ mixerStops++; }
  uncacheRoot(){ mixerUncached++; }
}
const animationThree = { AnimationMixer:MockAnimationMixer };
const morphInfluences = [0,0];
const riggedRoot = {
  traverse(fn){
    fn({ isSkinnedMesh:true, skeleton:{} });
    fn({ morphTargetDictionary:{ smile:0, blink:1 }, morphTargetInfluences:morphInfluences });
  }
};
const animation = animationWindow.MCSAvatarAnimationRuntime.create(animationThree, riggedRoot, {
  clips:[{name:"Idle",duration:2},{name:"Walk",duration:1},{name:"Walk",duration:1},{name:"",duration:1}]
});
assert.equal(animation.hasSkeleton, true, "runtime must detect skinned meshes");
assert.equal(animation.skeletonCount, 1, "runtime must count skeletons");
assert.equal(animation.clipCount, 2, "runtime must register unique named clips only");
assert.equal(animation.play("Idle"), true, "known clip must play");
assert.equal(animation.play("Walk", 0.25), true, "second clip must play");
assert.equal(crossFades, 1, "clip changes should crossfade");
animation.update(0.05);
assert.equal(mixerUpdates, 0.05, "runtime should advance mixer by frame delta");
animation.pause();
assert.equal(animation.setSpeed(1.5), true, "runtime should accept bounded playback speed");
animation.resume();
assert.equal(animation.seek(0.75), true, "runtime should seek mixer time");
assert.equal(animation.setMorphTarget("smile", 0.8), true, "runtime should set known facial morph target");
assert.equal(morphInfluences[0], 0.8, "morph target influence should update");
assert.equal(animation.setMorphTarget("unknown", 1), false, "unknown morph target should be rejected");
assert.equal(animation.play("missing"), false, "unknown animation clip should be rejected");
animation.stop();
animation.dispose();
animation.dispose();
assert.equal(animation.isDisposed, true, "animation runtime should dispose idempotently");
assert.equal(mixerUncached, 1, "animation runtime should uncache its model root");
assert.throws(() => animation.play("Idle"), /disposed/, "disposed animation runtime must reject playback");
console.log("PASS: skeletal animation runtime supports clips, crossfades, facial morphs, playback controls, and cleanup.");

assert.ok(html.includes('id="mcs-open-fashion-studio" href="/fashion-studio/index.html" target="_top" aria-label="Open the separate Fashion Studio experience" hidden'), "Avatar Builder should expose a separate Fashion Studio link");
assert.ok(html.includes(".mode-nav a[hidden]{display:none!important}"), "Fashion Studio link must remain hidden until the route is available");
assert.ok(html.includes('fetch("/fashion-studio/index.html", {method:"GET", cache:"no-store"})'), "Fashion Studio link should probe the same-origin route before showing");
console.log("PASS: multi-material PBR retint preserves arrays and disposes replaced materials safely.");

}
runCatalogAssetTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


