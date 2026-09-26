# Apartment geometry checkpoint — 2026-09-26

This checkpoint includes the monorepo scaffold and the first data-driven 3D
apartment reconstruction. The next milestone is to refine this apartment base.

## Working baseline

- Eight room zones preserving the screenshot's reported 49.18 m² total.
- Stepped perimeter, 17 wall segments, seven door openings, and a balcony slab.
- Six doors follow schematic symbols; WC access is inferred and shown in amber.
- OrbitControls, north-up Top View, resettable 3D View, room labels, and a cutaway
  toggle. Full-height walls use the current 2.50 m assumption.
- Zod validation, pure geometry utilities, and 16 tests covering model integrity,
  room coverage, wall transforms, openings, and JSON serialization.

## Resume here

1. Read [the reconstruction notes](apartment-geometry.md) and compare them with
   [the supplied plan](reference/t3-plan.png).
2. Edit apartment values in `apps/web/src/data/t3.ts`. This is the canonical data;
   `docs/t3-apartment.json` is a generated review snapshot, not a second input.
3. Keep domain validation in `packages/scene-schema`, reusable math in
   `packages/geometry`, and rendering in `apps/web/src/components`.
4. Run `pnpm dev` and compare Top View and 3D View while refining the base. Toggle
   full-height walls to check door apertures and wall junctions.
5. Before the next checkpoint, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
   `pnpm build`. Refresh the JSON snapshot if apartment data changes:

   ```sh
   node --input-type=module <<'NODE'
   import { writeFileSync } from 'node:fs'
   import { t3Apartment } from './apps/web/src/data/t3.ts'
   writeFileSync('docs/t3-apartment.json', JSON.stringify(t3Apartment, null, 2) + '\n')
   NODE
   ```

Run these commands from the repository root with Node.js 24+ and the pinned pnpm.

## Constraints to preserve

- **1 world unit = 1 meter.** Plan points are `[X, Z]`: X right/east, Y up,
  Z down/south. North is `-Z`.
- The screenshot supplies room areas, not measured lengths. All reconstructed
  dimensions, wall heights/thicknesses, and opening dimensions remain estimated.
- Room polygons are conceptual area zones; wall thickness overlays them. Do not
  describe the visible clear floor area as a measured Carrez model.
- `windows: []` means unknown. Balcony access is also unknown. The basement has
  only a reported area and is not reconstructed.
- Keep furniture, editing tools, Blender integration, and infrastructure outside
  this base-refinement milestone unless explicitly requested.

## Suggested next refinements

- Replace provisional dimensions and openings when surveyed measurements or a
  more detailed plan become available; preserve uncertainty for everything else.
- Refine wall junctions, door frames/swings, and the distinction between room
  boundaries and clear interior dimensions.
- Improve inspection clarity where useful: small-room labels, camera framing,
  and cutaway presentation. Preserve the readable north-up comparison with the plan.

## Known technical notes

- The production build passes with Vite's bundle-size advisory: the current
  JavaScript bundle is about 1.27 MB minified / 351 kB gzip. No size-warning
  suppression or premature bundling configuration was added.
- The installed React Three Fiber/Three.js combination emits an upstream
  `THREE.Clock` deprecation warning. There were no application errors after the
  final clean reload and navigation checks.
- Labels belong to the main React DOM tree and are projected from the camera;
  reintroducing Drei `Html` with these versions caused nested-root lifecycle
  errors under StrictMode. StrictMode remains enabled.
- One explicit perspective camera is shared with OrbitControls. Keep repeated
  view resets working after orbiting, zooming, or panning.
