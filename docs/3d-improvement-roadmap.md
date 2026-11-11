# Main Character Social — 3D Improvement Roadmap

This is the execution checklist for the cross-project 3D quality cycle. Work is incremental; preserve the existing product identity, user-created assets, saved data, and the separation between Avatar Builder and Avatar Rooms.

## P0 — Asset pipeline foundation
- [x] Wire Three.js r128 GLTFLoader into the shared avatar engine.
- [ ] Add schema-validated GLB/GLTF base-character and catalog-asset loading.
- [x] Add safe cancellation guards, error handling, disposal, and graceful procedural fallback.
- [x] Validate GLTF URLs: permit project-relative/HTTPS paths; reject executable, data, blob, file, and protocol-relative schemes.
- [x] Remove completed requests from pending tracking and prevent cancelled/torn-down loads from attaching assets.
- [ ] Add model validation for scale, transforms, pivots, normals, UVs, materials, and bounds.
- [x] Add automated source-level coverage for GLTF dependency wiring, URL scheme rejection, pending-request cleanup, cancellation, and teardown guards.
- [x] Add runtime-mocked tests for unsafe URL rejection, valid URL acceptance, successful callback delivery, and disposal after cancellation/teardown.
- [ ] Add real GLB fixture tests for missing assets, malformed files, and GPU resource disposal.

## P1 — Character quality
- [ ] Replace or augment procedural base characters with original/licensed rigged GLB assets.
- [ ] Validate skeleton hierarchy, skin weights, deformation, and animation clips.
- [ ] Add facial morph targets and expression controls.
- [ ] Improve skin, eyes, teeth, brows, and hair geometry/materials.
- [ ] Validate diverse body proportions, skin tones, hairstyles, and saved looks.
- [ ] Improve clothing fit, layered garments, shoes, accessories, and body-zone culling.

## P1 — PBR and rendering
- [ ] Add texture-map support for base color, normal, roughness, metalness, AO, and emissive channels.
- [ ] Validate color-space and texture compression handling.
- [ ] Extend consistent PBR material roles to furniture, props, rooms, architecture, and set pieces.
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
- [ ] Define an asset provenance register: owner/licence, source URL, attribution, permitted use, and modification rights for every imported model/texture/audio asset.
- [ ] Define a canonical asset manifest with stable IDs, semantic version, slot/category, supported formats, bounds, units, pivot convention, material roles, texture references, LODs, and preview images.
- [ ] Add secure asset-origin policy, MIME/extension validation, file-size limits, decompression/triangle/texture budgets, and timeout/retry policy.
- [ ] Add offline/loading/error states, progress reporting, retry controls, and reduced-motion/accessibility behavior.
- [ ] Add visual regression captures for representative avatars, wardrobe combinations, props, and each environment under fixed cameras/lighting.
- [ ] Add cross-device GPU/memory profiling and context-loss/recovery checks for iPad, mobile, and desktop.
- [ ] Add asset dependency/license scanning and duplicate/orphan asset detection to CI.
- [ ] Add compatibility/version migration tests for existing saved looks and older catalog records.

## Run log
- 2026-11-10: Initial baseline established. Confirmed GLTFLoader was not loaded or injected despite loader support. Implementation started on `fix/pbr-default-full-avatar-materials`.

- 2026-11-10: Continued execution. Added GLTF URL allowlisting and request lifecycle guards; added source-level regression assertions. Added runtime-mocked GLTF loader tests and a dedicated GitHub Actions workflow; actual binary GLB fixtures and browser/device validation remain open. Added asset provenance, manifest, resource budgets, accessibility/loading, visual regression, device profiling, CI scanning, and backwards-compatibility requirements. Commits: `471e79d`, `17ea8c3`.

- 2026-11-11: Added runtime-mocked loader tests and CI workflow. Corrected regression assertion patterns before relying on the workflow. Waiting for the new GitHub Actions run to confirm execution.
