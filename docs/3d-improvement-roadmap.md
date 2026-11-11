# Main Character Social — 3D Improvement Roadmap

This is the execution checklist for the cross-project 3D quality cycle. Work is incremental; preserve the existing product identity, user-created assets, saved data, and the separation between Avatar Builder and Avatar Rooms.

## P0 — Asset pipeline foundation
- [ ] Wire Three.js r128 GLTFLoader into the shared avatar engine.
- [ ] Add schema-validated GLB/GLTF base-character and catalog-asset loading.
- [ ] Add safe cancellation, error handling, disposal, and graceful procedural fallback.
- [ ] Add model validation for scale, transforms, pivots, normals, UVs, materials, and bounds.
- [ ] Add automated coverage for successful loads, missing assets, invalid catalog metadata, and teardown.

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
- [ ] Run automated tests, lint/static checks, production build, and preview smoke tests.
- [ ] Deploy only after all applicable release gates pass; verify the deployment after release.

## Run log
- 2026-11-10: Initial baseline established. Confirmed GLTFLoader was not loaded or injected despite loader support. Implementation started on `fix/pbr-default-full-avatar-materials`.
