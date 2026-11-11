# Main Character Social — Fashion Studio

A Polyvore-inspired fashion composition studio, implemented as a separate experience that uses the existing Main Character Social 3D Avatar Creator route for live fitting.

## Included in this milestone
- Searchable, categorized wardrobe catalog.
- Drag-and-drop / tap-to-add moodboard composition.
- Move, resize, recolor, duplicate, and remove individual pieces.
- Look naming, styling notes, autosaved draft, and local collections.
- SVG moodboard export.
- Embedded shared 3D avatar creator.
- Same-origin bridge that maps supported moodboard pieces to existing avatar wardrobe slots and applies them through the existing avatar player's wardrobe runtime.

## Current limits — intentionally explicit
- The catalog is a curated starter set of UI pieces, not a verified production merchandise catalog.
- Items map to the nearest existing procedural avatar wardrobe item. Several moodboard-only concepts (makeup, compact, some jewelry/accessory distinctions) do not yet have dedicated 3D meshes and are reported as unmapped.
- Existing avatar geometry is still the current procedural prototype. This studio does not claim photoreal garment simulation, cloth physics, pattern drafting, or production-grade original garment meshes.
- Saving a fashion collection currently uses browser-local storage. The avatar's own Save Look flow remains responsible for saving its character state. Account-level fashion collection persistence and social publishing require a subsequent authenticated app integration.
- The existing shared avatar prototype remains subject to its draft PR release gates and real-device QA.

## Route
`/fashion-studio/index.html`

## Verification
Run `node tests/fashion-studio-smoke.cjs`.
