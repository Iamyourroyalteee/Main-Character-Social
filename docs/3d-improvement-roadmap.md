# Main Character Social — 3D Improvement Roadmap

This is the execution checklist for the cross-project 3D quality cycle. Work is incremental; preserve the existing product identity, user-created assets, saved data, and the separation between Avatar Builder and Avatar Rooms.

## P0 — Asset pipeline foundation
- [x] Wire Three.js r128 GLTFLoader into the shared avatar engine.
- [x] Add schema-validated GLB/GLTF catalog-asset loading with stable IDs, supported slots/formats, safe URLs, age gating, and explicit units.
- [x] Add safe cancellation guards, error handling, disposal, and graceful procedural fallback across GLTF and per-material texture requests, including engine teardown and explicit imported-root release.
- [x] Validate GLTF URLs: permit project-relative/HTTPS paths; reject executable, data, blob, file, and protocol-relative schemes.
- [x] Remove completed requests from pending tracking and prevent cancelled/torn-down loads from attaching assets.
- [x] Validate imported mesh positions, finite transforms/scales, optional geometry bounds, and configurable mesh/vertex/triangle budgets; report missing normals, UVs, and materials.
- [ ] Enforce asset pivot conventions and required normal/UV/material policies.
- [x] Add and execute automated source/runtime-mocked coverage for GLTF dependency wiring, successful/missing/invalid loads, URL scheme rejection, catalog schema validation, PBR map loading, material binding, cancellation, and disposal/teardown.
- [x] Add runtime-mocked tests for unsafe URL rejection, valid URL acceptance, successful callback delivery, disposal after cancellation/teardown, catalog schema validation, GLB loading, unit normalization, and default-deny adult gating.
- [x] Add a real glTF 2.0 fixture and browser smoke harness that imports it through GLTFLoader and the catalog pipeline.
- [ ] Add binary GLB fixtures plus browser-level malformed-file and real GPU-resource disposal tests. (A real glTF 2.0 fixture and mocked malformed/empty-scene disposal coverage are in place.)

## P1 — Character quality
- [ ] Replace or augment procedural base characters with original/licensed rigged GLB assets.
- [ ] Validate skeleton hierarchy, skin weights, deformation, and animation clips.
- [ ] Add facial morph targets and expression controls.
- [ ] Improve skin, eyes, teeth, brows, and hair geometry/materials.
- [ ] Validate diverse body proportions, skin tones, hairstyles, and saved looks.
- [ ] Connect the production Avatar Animation Lab to the shared 3D avatar rig, skeleton, animation clips, and saved character data; current production implementation is CSS/SVG stage animation rather than skeletal 3D animation.
- [ ] Improve clothing fit, layered garments, shoes, accessories, and body-zone culling.

## P1 — PBR and rendering
- [x] Add PBR texture-map loading/application helpers for base color, normal, roughness, metalness, AO, and emissive channels, including safe URL checks, cancellation, decode-failure cleanup, and owned-texture disposal.
- [x] Bind manifest texture references by GLTF material name, assign semantic material roles, and preserve texture maps through PBR/toon mode changes.
- [x] Apply sRGB encoding to base-color/emissive maps and linear encoding to normal/roughness/metalness/AO maps.
- [ ] Validate GLTF embedded texture preservation and GPU texture compression handling.
- [x] Preserve multi-material GLTF mesh assignments and existing texture maps during PBR/toon mode switching; retire replaced materials only after reassignment.
- [x] Add semantic PBR material builders for skin, lips, hair, fabric, denim, metal, gold, chrome, glass, wood, stone, emissive, plastic, leather, rubber, and water.
- [ ] Apply consistent PBR roles to all furniture, props, rooms, architecture, and set pieces.
- [ ] Improve environment lighting, shadows, reflections, and camera framing.
- [ ] Retain an accessible low-cost/toon fallback for weaker devices.

## P2 — Full asset catalog and environments
- [ ] Inventory all characters, NPCs, pets, creatures, wearables, props, furniture, decor, products, and room assets.
- [ ] Validate geometry, topology, normals, UVs, scale, pivots, transparency, and material consistency.
- [ ] Audit Atrium, Island World, After Dark Lounge, and all other available scenes.
- [ ] Add previews, catalog metadata, supported-format checks, and import/export validation.
- [ ] Preserve ownership/licensing provenance; do not overwrite user-created or uncertain assets.

## P2 — Creator and social integration
- [ ] Keep Avatar Builder and Avatar Rooms as separate experiences.
- [ ] Share one avatar engine and canonical character/outfit data model.
- [ ] Connect wardrobe, Set Builder, room editor, and social experiences through stable asset IDs.
- [ ] Add persistent saved characters and looks using existing approved data boundaries.
- [ ] Keep age-gated access fail-closed until trusted server-side entitlement is available.

## P1 — Performance, accessibility, and release
- [ ] Profile draw calls, triangles, texture memory, loading time, and frame rate.
- [ ] Validate touch controls and responsive layouts on iPad, phones, and desktop.
- [ ] Add asset budgets, lazy loading, LODs, instancing, and disposal checks where justified.
- [x] Add a GitHub Actions workflow to run the avatar 3D safety/loader smoke test on relevant PR and branch changes.
- [ ] Run automated tests, lint/static checks, production build, and preview smoke tests.
- [ ] Deploy only after all applicable release gates pass; verify the deployment after release.

## Additional requirements added during execution
- [x] Require per-asset owner, license, source, and permitted-use provenance before any catalog asset can load.
- [x] Define a versioned canonical asset manifest and JSON schema for stable IDs, versions, slots/categories, formats, bounds, units, pivots, material roles, texture references, LODs, and previews. The manifest remains empty until verified assets are available.
- [x] Load the manifest in the running prototype, validate the full manifest before exposing catalog entries, and surface actionable validation errors.
- [ ] Add secure asset-origin policy, MIME/extension validation, file-size limits, decompression/triangle/texture budgets, and timeout/retry policy.
- [ ] Add offline/loading/error states, progress reporting, retry controls, and reduced-motion/accessibility behavior.
- [ ] Add visual regression captures for representative avatars, wardrobe combinations, props, and each environment under fixed cameras/lighting.
- [ ] Add cross-device GPU/memory profiling and context-loss/recovery checks for iPad, mobile, and desktop.
- [ ] Add asset dependency/license scanning and duplicate/orphan asset detection to CI.
- [ ] Add compatibility/version migration tests for existing saved looks and older catalog records.

## Run log
- 2026-11-10: Initial baseline established. Confirmed GLTFLoader was not loaded or injected despite loader support. Implementation started on `fix/pbr-default-full-avatar-materials`.

- 2026-11-10: Continued execution. Added GLTF URL allowlisting and request lifecycle guards; added source-level regression assertions. Added runtime-mocked GLTF loader tests and a dedicated GitHub Actions workflow; actual binary GLB fixtures and browser/device validation remain open. Added asset provenance, manifest, resource budgets, accessibility/loading, visual regression, device profiling, CI scanning, and backwards-compatibility requirements. Commits: `471e79d`, `17ea8c3`.

- 2026-11-10: Added runtime-mocked loader tests and CI workflow. Corrected regression assertion patterns before relying on the workflow. Waiting for the new GitHub Actions run to confirm execution.

- 2026-11-10: Added a schema-validated catalog asset loading API, unit normalization (m/cm/mm), and default-deny adult asset gating. Added mocked runtime coverage for these paths. Real asset fixtures and full model bounds/UV/material validation remain open.

- 2026-11-10: Added imported model geometry/transform validation, configurable mesh/vertex/triangle budgets, and warnings for missing normals/UVs/materials. Pivot conventions and strict material/UV policies remain open.

- 2026-11-10: Hardened disposal for empty/malformed GLTF scenes and added a regression test. Browser-side binary fixture validation remains a release gate.

- 2026-11-10: Added versioned manifest/schema, stable-ID and duplicate-ID checks, mandatory per-asset provenance, bounds/pivot/material/texture/LOD metadata validation, and test coverage. No third-party model was added without verifiable ownership/licensing.

- 2026-11-10: Fixed multi-material PBR retint/disposal for imported meshes and added a runtime-mocked regression test. Texture map loading and per-material texture binding remain open.

- 2026-11-10: Added PBR texture map loading/application helpers with safe URL validation, sRGB/linear encoding, cancellation/failure cleanup, and factory-owned texture disposal. Added runtime-mocked tests for all six map channels, color-space assignment, unsafe URL rejection, and partial-load cleanup. Binding manifest maps to individual imported GLTF material names remains open.

- 2026-11-10: Wired the shared PBR material factory into the avatar loader and added named per-material texture bindings from manifest descriptors. Runtime-mocked coverage verifies texture maps attach to the intended GLTF material and role metadata is preserved.

- 2026-11-10: Extended catalog request lifecycle tracking through material texture binding; engine teardown now cancels pending texture requests and disposes uncommitted models. Added a runtime-mocked teardown regression test.

- 2026-11-10: Expanded the semantic PBR factory with material builders for glass, wood, stone, plastic, leather, rubber, water, emissive, and generic metal; added role mapping tests. Environment-wide role assignment remains open.

- 2026-11-10: Latest branch work is committed to PR #10 (`d1e2136`). The newest available Vercel preview is still on earlier commit `80508c1`; a manual preview redeploy was blocked by Vercel's daily API deployment quota (402, retry after 24 hours). Production remains unchanged. GitHub Actions workflow is configured, but no PR-triggered run is visible through the available status endpoint; automated test execution is not yet claimed.

- 2026-11-10: Added a minimal original glTF 2.0 PBR fixture and a browser smoke page that exercises the real Three.js r128 GLTFLoader, schema validation, model validation, and catalog loading. Automated source checks verify the fixture and harness wiring; actual browser execution awaits the next available Vercel preview deployment.

- 2026-11-10: Added a deploy-root glTF fixture at `avatar-3d/assets/test-fixtures/minimal-pbr.gltf` and a browser smoke harness at `avatar-3d/asset-pipeline-smoke.html`. The harness exercises the actual r128 GLTFLoader and catalog pipeline. Latest branch changes remain ahead of the latest Vercel preview because the Vercel deployment API hit its daily deployment quota; browser execution is still pending. No production deployment was made.

- 2026-11-10: Executed the committed smoke-test source and runtime-mocked paths in an isolated JavaScript harness; all assertions passed, including missing asset errors, schema/provenance, unit normalization, named material texture bindings, PBR map channels/color spaces, multi-material retint, cancellation, and teardown disposal. This is not yet a native GitHub Actions run or a real browser/WebGL/iPad run.

- 2026-11-10: Integrated runtime manifest loading into the prototype. Catalog entries remain empty until the complete manifest passes validation; HTTP/JSON/schema failures are surfaced as actionable catalog errors, and in-flight manifest requests are cancellable on engine teardown. Added runtime tests for valid, invalid, and missing manifests. Browser/iPad execution remains a release gate.

- 2026-11-10: The avatar prototype preview deployment was refreshed and is READY on commit `d81fff69` (manifest-loader integration). Verified the preview serves `/index.html`, `/asset-pipeline-smoke.html`, and `/assets/manifest.json` with HTTP 200; the manifest returns schema version 1.0.0 and an intentionally empty asset list. This verifies deployment and static route availability only; the browser smoke harness has not been executed in a real browser/WebGL session, and iPad GPU behavior remains unverified. Subsequent test-source commits `d1d61ac` and `6ce4561` are newer than this preview and are not included in it.

- 2026-11-10: Cross-surface audit of the latest production app commit `eabf89c` found a new Avatar Animation Lab with pose presets, silhouette, CSS motion paths, squash/stretch, timing, focus tracking, and saved motion presets. The deployed page implements the stage as an SVG element animated with CSS; it does not load Three.js/GLTFLoader and has no SkinnedMesh, Skeleton, AnimationMixer, or morph-target implementation. Treat this as a useful 2D animation-authoring surface, not completion of the 3D rigging/animation milestone. The PR #10 avatar prototype still has three separate room groups (Main Room, Island World, After Dark Lounge) and a PBR toggle, but the environment source still instantiates MeshBasicMaterial, MeshLambertMaterial, MeshPhongMaterial, and MeshToonMaterial alongside the avatar material factory. Environment-wide PBR remains open.
- 2026-11-10: Release-state recheck: PR #10 head is `09dc4225`, still draft/open/unmerged. The latest avatar-prototype preview is READY on `d81fff69`, behind the PR head; the latest app preview is READY on `a16230bc`. The latest production app deployment is READY on main commit `eabf89c`, while the corresponding avatar-prototype production deployment is CANCELED. PR-head commit statuses still report Vercel deployment rate-limit failures and no PR-triggered GitHub Actions run is returned. No merge or production change was made in this audit.

- 2026-11-10: Added `MCSAvatarAnimationRuntime.js` and exposed it through `window.MCS.createAnimationController`. The runtime detects SkinnedMesh skeletons and morph targets; supports named GLTF animation clips, crossfades, bounded playback speed, seek, pause/resume, stop, facial morph controls, and idempotent disposal. Added mocked runtime regression tests and wired the browser smoke page to instantiate/update/dispose the controller. The smoke fixture itself intentionally has zero skeletons and zero clips, so this verifies the runtime integration surface—not a production rig or actual animated character. Production Animation Lab UI/preset integration and a verified rigged avatar remain outstanding.


## Execution sequence — parallel workstreams

The Avatar Engine is the shared dependency, not a reason to block independent creator work. Keep Avatar Builder, Fashion Studio, and Avatar Rooms as separate product surfaces.

### Workstream A — shared avatar foundation (critical path)
- [ ] Freeze and document a versioned character/outfit payload contract with stable catalog IDs, body parameters, appearance, equipped items, and schema migration rules.
- [ ] Verify one canonical restore/save path across embedded Avatar Builder, standalone Avatar Builder, Fashion Studio fitting room, and Avatar Rooms.
- [ ] Verify signed-in persistence uses the existing authenticated profile boundary; keep local-only mode explicitly device-local.
- [ ] Verify teen-safe defaults and server-authoritative adult entitlement on every restore and asset request.
- [ ] Complete a real rigged GLB validation pass: skeleton hierarchy, skin weights, facial morphs, animation clips, deformation, and cleanup.
- [ ] Complete browser/WebGL and iPad touch/performance QA before declaring the engine release-ready.

### Workstream B — Avatar Builder (parallel after shared payload contract)
- [ ] Finish the dedicated character-selection and customization experience.
- [ ] Validate body/face/hair/skin/wardrobe customization and saved-look round trips.
- [ ] Verify responsive, touch-friendly category browsing, selected states, and filters.

### Workstream C — Fashion Studio (parallel; does not wait for full avatar polish)
- [x] Establish the separate moodboard/editor surface and shared-engine fitting-room embed.
- [ ] Expand the wardrobe catalog only with verified original/licensed assets and stable catalog IDs.
- [ ] Connect board-to-avatar mapping to the canonical outfit payload contract.
- [ ] Add account-backed collections, creator sharing/remixing, and publishing only after auth/data boundaries are reviewed.
- [ ] Validate the complete fitting workflow on desktop and iPad.

### Workstream D — Avatar Rooms (after shared payload contract; parallel environment work)
- [ ] Keep Rooms as a distinct experience consuming the same saved character payload.
- [ ] Audit room/environment assets and assign consistent PBR materials, lighting, and performance budgets.
- [ ] Verify avatar entry, outfit changes, room interactions, and teen-safe room access.

### Integration and release gates
- [ ] No surface may fork its own incompatible character or outfit format.
- [ ] No placeholder or unlicensed production assets.
- [ ] No merge/promotion until automated checks, preview deployment, browser/WebGL checks, and iPad QA pass.
- [ ] Do not change production settings, billing, or access controls as a workaround for preview/build restrictions.

### 2026-11-11 execution update
- Avatar Engine PBR/material/GLTF safety foundations and a mocked animation runtime are present in the PBR branch. The versioned asset manifest intentionally contains no unverified production assets.
- The avatar prototype and main app each have READY Vercel previews on commit `cd3fe30acdbe1c53ecf3e369e2b458eb735db874`; this confirms deployment readiness, not visual/WebGL or iPad QA.
- The PBR branch has a Vercel deployment for a later commit than the current PR #10 head metadata. Reconcile the branch/PR head and check statuses before treating PR #10 as release-ready.
- Fashion Studio PR #12 remains a separate draft stacked on the PBR branch; no deployment exists for its exact head commit.
- Next critical implementation task: formalize and test the canonical character/outfit payload contract and round-trip it across the embedded builder and other surfaces. Continue independent Fashion Studio and room-environment work in parallel.
