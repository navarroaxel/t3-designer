# T3 Designer

A browser-based 3D reconstruction of a T3 apartment in Quimper, generated from
structured scene data. This milestone includes room floors, the stepped exterior,
internal walls, door openings, and an estimated balcony slab.

**This is a reconstruction of an already estimated plan, not a measured survey.**
The screenshot reports areas but no linear dimensions. Window locations and
balcony access are explicitly unspecified; none are invented in the scene.

## Run locally

Use Node.js 24+ and pnpm 12.7.0 (pinned in `package.json`).
The repository pin selects pnpm independently of the global installation. When
upgrading it, update the pin and run the checks below with the new version.

```sh
pnpm install
pnpm dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @t3-designer/web preview
```

Tests use Node's built-in test runner. The production output is `apps/web/dist`.
There is no separate formatter configured. TypeScript stays on 6.0.x for
compatibility with the installed ESLint integration; React stays on 19.3.x within
React Three Fiber's supported range.

## Navigate

Drag to orbit, scroll/pinch to zoom, and right-drag to pan. **Top View** aligns
north with the top of the drawing; **3D View** restores the default perspective.
The cutaway control shortens displayed walls for inspection; disabling it shows
their full assumed 2.50 m height. The underlying apartment data is not changed.

## Architecture

- `packages/scene-schema`: canonical Zod schemas and inferred TypeScript types.
  Validates metric coordinates, walls, rooms, openings, references, and opening
  bounds/overlap. `SCENE_SCHEMA_VERSION` remains `1` for this first real model.
- `apps/web/src/data/t3.ts`: the apartment's source of truth. Separates reported
  areas from estimated dimensions, records assumptions and unknowns, and validates
  the generated plain object with `ApartmentSchema`.
- `packages/geometry`: renderer-independent wall transforms, polygon area and
  centroid calculations, bounds, and wall segmentation around openings.
- `apps/web/src/components`: React Three Fiber geometry generated from the data.
  Door/window apertures use solid wall segments, avoiding boolean geometry.
- `docs/reference/t3-plan.png`: the supplied source image, preserved for review.
- `docs/apartment-geometry.md`: extraction, reconstruction, and uncertainty notes.

**1 world unit = 1 meter.** Points are `[X, Z]`; X runs right/east, Y is vertical,
and Z runs down/south in the drawing. North is `-Z`. The origin is the northwest
corner of the overall bounding rectangle, outside the stepped apartment footprint.

The private workspace packages export TypeScript source through `workspace:*`
dependencies. Turborepo caches checks and production output, runs dependency checks
first, and requires typechecking before builds. Furniture, editing tools,
textures, backend services, and Blender integration are outside this milestone.

## Continue from this checkpoint

See [the checkpoint notes](docs/checkpoint.md) for the working baseline, known
limitations, validation commands, and the next apartment-base refinements.
