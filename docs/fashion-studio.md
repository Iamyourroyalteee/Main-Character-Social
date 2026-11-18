# Main Character Social — Fashion Studio

A Polyvore-inspired fashion composition studio, implemented as a separate experience that uses the existing Main Character Social 3D Avatar Creator route for live fitting.

## Included in this milestone
- Searchable, categorized wardrobe catalog.
- Drag-and-drop / tap-to-add moodboard composition, with keyboard selection, arrow-key positioning, and Delete/Backspace removal.
- 44px minimum touch targets and visible keyboard focus indicators.
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

## Routes
- `/fashion-studio/index.html` — Fashion Studio experience
- `/avatar-3d/index.html?mode=builder` — same-origin shared 3D avatar fitting room

The Vercel application deploys from `src/`, so both experiences and their runtime assets are mirrored under `src/fashion-studio/` and `src/avatar-3d/`. The smoke test verifies the mirrors and the avatar page's zoom-safe viewport.

## Verification
Run `node tests/fashion-studio-smoke.cjs`.

## Mapping behavior and remaining product work
- The moodboard uses visual styling tokens and emoji previews; it is not yet a verified product-photo catalog or a library of production garment meshes.
- The avatar runtime currently supports one item per wardrobe slot. Only moodboard concepts with a semantically matching existing avatar asset are mapped; unsupported concepts remain explicitly unmapped rather than pretending that a necklace is a ring or earrings, or that one handbag is a clutch/backpack. If multiple placed pieces still target one slot, the latest placed item wins and the fitting-room notice reports the collision. A one-piece outfit takes priority over separate top/bottom items; applying separates clears an existing one-piece outfit, while unrelated accessories preserve it.
- Restoring local drafts and collections normalizes IDs, clamps board positions and scale to editor bounds, validates six-digit hex colors, drops unknown catalog IDs, and caps restored pieces at 100. SVG export uses a representative solid background for the selected editorial/warm/minimal/night style; it remains a static moodboard, not a rendered 3D product image.
- Account-synced fashion collections, social publishing, real product imagery, original layered garment assets, and device-level 3D performance QA remain future work.


## 2026-11-12 quality fix
- Corrected semantic mapping so unsupported jewelry and bag variants are reported instead of falsely mapping to the same accessory or handbag model.
- Hardened local saved-look restoration against duplicate/invalid IDs, out-of-range coordinates and scales, unsafe color strings, and unknown catalog items.
- Fixed SVG export so its background reflects the selected board style. Regression coverage is in `tests/fashion-studio-smoke.cjs`.
