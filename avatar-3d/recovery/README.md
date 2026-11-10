# Original 3D Avatar Prototype — Recovery Archive

This directory preserves the exact HTML source served by the original MCS 3D Avatar Creator prototype. It is archived for provenance and future comparison; it is not the current production application entry point.

## Provenance

- Vercel project: `mcs-avatar-3d-prototype`
- Original production deployment: `dpl_C92pzdAHRNK9JBa5tARpnNsru8px`
- Deployment created: `2026-11-08T18:18:46.203Z`
- Deployment source type: Vercel `drop` (no Git source metadata)
- Deployed file path: `src/.vercel/output/static/index.html`
- Vercel file UID: `bf98df22564ed195172d918f96f6d866e1349084`
- Recovery verification: HTTP 200 from the deployment URL on 2026-11-10
- Archived file: `original-prototype-2026-11-08.html`
- Retrieved HTML character count: 129643
- Credential-pattern scan: no matches for common Stripe, Supabase service-role/secret, AWS access-key or webhook-secret formats

## What the recovered prototype contains

- Three.js r128 loaded from a CDN and a real `WebGLRenderer` canvas.
- A procedural full-body avatar and procedural clothing/accessory catalog.
- A hierarchical `THREE.Group` transform structure used as named body/joint nodes.
- Three named emotes: wave, dance, pose.
- The original source has 66 unique `def({id: ...})` item identifiers. A historical QA artifact reports 66 equipable catalog pieces; reconcile the extra definition before treating 66 as the canonical source count.

## Important limitations — do not call this a finished 3D Avatar Studio

The original prototype is a useful, authentic starting point, but it is not a rigged production character:

- It does not contain `GLTFLoader`, `SkinnedMesh`, `Skeleton`, or `AnimationMixer` integration.
- It contains procedural geometry in one HTML file, not original Blender `.blend`, glTF/GLB, texture-map, or rigged animation assets.
- Its body/joint motion is group-transform based, not skeletal skin deformation.
- It uses Three.js r128, not a current pinned ES-module build.
- Its age-band demo state defaults to adult and is client-controlled; it is not an authoritative age gate and must not be used to grant 18+ access.

The separate `avatar-3d/index.html` and `MCS*.js` modules in this branch are the enhanced prototype work, not a byte-for-byte copy of this archived source. The PBR path is a material upgrade only; it does not create high-detail anatomy, strand hair, detailed skin maps, or a rig.

## Next 3D milestone

Use this archive as the functional and catalog reference while building an original, properly licensed, rigged GLB character. Keep MCS-owned geometry, textures, clothing, and animation assets; do not copy proprietary IMVU or Meez content.
