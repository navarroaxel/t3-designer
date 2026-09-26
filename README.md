# T3 Designer

A local, interactive reconstruction of the current T3 apartment in Quimper, based
on the proportional plan, 11 photos and 4 walkthrough videos. Includes eight room
zones, architectural openings, current finishes and 18 reusable Blender assets
placed as 21 fixture instances. All linear dimensions remain estimates.

## Run

Node.js 24+ and pnpm 12.7.0 (repository pin):

```sh
pnpm install
pnpm dev
```

Open the Vite URL, normally http://localhost:5173. Orbit by dragging, zoom with the
wheel, pan with right-drag. Select an environment to focus the camera. Use Planta
or Perspectiva, Corte, Equipamiento and Rótulos to inspect layers. The asset tab
lists nominal dimensions, source evidence and downloadable GLBs.

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Hybrid architecture

- `apps/web/src/data/t3.ts`: canonical architectural data in meters, validated by
  `packages/scene-schema`. Floor polygons, walls and apertures remain editable data.
- `apps/web/src/data/current-state.ts`: canonical asset catalog and placements,
  with source references and explicitly estimated dimensions.
- `packages/geometry`: renderer-independent wall segmentation, bounds and polygons.
- `apps/web/src/components`: procedural architecture plus instantiated GLB objects.
- `apps/web/src/materials`: deterministic parquet/tile color and relief maps,
  scaled in meters. No private source photos are embedded in web textures.
- `scripts/blender/create_current_assets.py`: original reusable asset authoring.
- `scripts/blender/assemble_apartment.py`: derived Blender apartment scene from
  exported domain data, for inspection/rendering; it is not the source of truth.

**1 unit = 1 meter.** Plan points are `[X,Z]`; X east, Y up, Z south. Blender uses
`(x,-z,y)` for the same point. Asset fronts face +Z in the web, origins are floor
centered and scale is applied. The app imports individual GLBs, not one opaque
apartment mesh.

## Blender outputs

```sh
pnpm blender:check      # Verify the already configured live MCP connection
pnpm blender:assets     # Rebuild the 18 GLBs and editable asset library
pnpm scene:snapshot     # Refresh both JSON exports from TypeScript
pnpm blender:apartment  # Refresh data and rebuild the derived Blender scene
```

The two Blender generation commands use the installed macOS Blender executable.
See [connection details](docs/blender.md). Generation writes its own named output
files; save authored variants separately before regenerating.

- `assets/blender/asset-library.blend`: editable asset library.
- `apps/web/public/models/current/`: individual GLBs + manifest.
- `assets/blender/t3-current-state.blend`: derived assembled scene.
- `assets/blender/current-assets.png` and `t3-current-state.png`: previews.

## Evidence and precision

See [visual evidence](docs/reference-evidence.md), [geometry notes](docs/apartment-geometry.md)
and [checkpoint](docs/checkpoint.md). The reported room areas sum to49.18m²;
conceptual polygons preserve them, but walls overlay their boundaries. This is not
a measured net-area survey. Window and appliance presence are observed; their
metric dimensions and global placements remain provisional. The bathroom's exact
shower/partition arrangement especially needs a measured plan. Wear is selectively
represented; mirror and glass are lightweight PBR approximations, not ray-traced
room reflections. The basement is not reconstructed.

Original source media remain in Downloads; contact-sheet derivatives under
`assets/reference` are locally gitignored. Nothing was uploaded or published.
