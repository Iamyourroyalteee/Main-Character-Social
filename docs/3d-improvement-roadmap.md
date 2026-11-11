# Main Character Social — 3D Improvement Roadmap

This is the execution checklist for the cross-project 3D quality cycle. Work is incremental; preserve the existing product identity, user-created assets, saved data, and the separation between Avatar Builder and Avatar Rooms.

## P0 — Asset pipeline foundation
- [x] Wire Three.js r128 GLTFLoader into the shared avatar engine.
- [x] Add schema-validated GLB/GLTF catalog-asset loading with stable IDs, supported slots/formats, safe URLs, age gating, and explicit units.
- [x] Add safe cancellation guards, error handling, disposal, and graceful procedural fallback across GLTF and per-material texture requests, including engine teardown.
- [x] Validate GLTF URLs: permit project-relative/HTTPS paths; reject executable, data, blob, file, and protocol-relative schemes.
- [x] Remove completed requests from pending tracking and prevent cancelled/torn-down loads from attaching assets.
- [x] Validate imported mesh positions, finite transforms/scales, optional geometry bounds, and configurable mesh/vertex/triangle budgets; report missing normals, UVs, and materials.
- [ ] Enforce asset pivot conventions and required normal/UV/material policies.
- [x] Add automated source-level coverage for GLTF dependency wiring, URL scheme rejection, pending-request cleanup, cancellation, and teardown guards.
- [x] Add runtime-mocked tests for unsafe URL rejection, valid URL acceptance, successful callback delivery, disposal after cancellation/teardown, catalog schema validation, GLB loading, unit normalization, and default-deny adult gating.
- [ ] Add real GLB fixture tests for missing assets, malformed files, and GPU resource disposal. (Mocked malformed/empty-scene rejection is covered.)

## P1 — Character quality
- [ ] Replace or augment procedural base characters with original/licensed rigged GLB assets.
- [ ] Validate skeleton hierarchy, skin weights, deformation, and animation clips.
- [ ] Add facial morph targets and expression controls.
- [ ] Improve skin, eyes, teeth, brows, and hair geometry/materials.
- [ ] Validate diverse body proportions, skin tones, hairstyles, and saved looks.
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
