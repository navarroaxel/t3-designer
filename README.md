# T3 Designer

A local, interactive reconstruction of the current T3 apartment in Quimper, based
on the proportional plan, 11 photos and 4 walkthrough videos. Includes eight room
zones, architectural openings, current finishes and 18 reusable Blender assets
placed as 21 fixture instances. Apartment dimensions remain estimates. A separate
**Edificio + sol** view adds the georeferenced Colbert building, 98 neighbours and
a date/time sun-and-shadow study using public IGN, RNB and cadastral data.

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

## Building and sunlight

Choose **Edificio + sol** in the header to switch to the exterior view. Set the
calendar date and **Hora en Quimper**, drag the time slider, or play the day's
movement. The seasonal presets compare spring, summer, autumn and winter. Time
always uses **Europe/Paris**, including daylight-saving transitions, independently
of your computer's timezone. Direct sunlight switches off at night.

Orbit and zoom as in the apartment, use **Planta** for a north-oriented overhead
view, and toggle neighbours, the solar path or labels. The panel reports solar
altitude, azimuth, sunrise, sunset and solar noon. The apartment remains a separate
view: its exact location, windows and rotation within the building are not yet
identified.

The target is officially **1ter impasse Jean-Baptiste Colbert, Quimper**; RNB
connects addresses 1, 1 bis and 1 ter to the same building. This version uses a
local extract of 99 building footprints and source heights, 27 road segments and
parcel AL 0538. No external requests are needed when changing the time.

Sources and reproducible queries are in [building research](docs/building-research.md).
See [solar equations, timezone rules and limitations](docs/solar-model.md). Public
geometry supports a massing study; facade openings and roof forms are estimated.
The display ground is flat, neighbour roofs are inferred, and the selected local
context does not include the full terrain or distant horizon. It is a visual
shadow study, not a certified insolation or energy report.

## Hybrid architecture

- `apps/web/src/data/t3.ts`: canonical architectural data in meters, validated by
  `packages/scene-schema`. Floor polygons, walls and apertures remain editable data.
- `apps/web/src/data/current-state.ts`: canonical asset catalog and placements,
  with source references and explicitly estimated dimensions.
- `apps/web/src/data/building-site.ts`: public geographic extract in true-north
  metre coordinates, with source IDs, heights, cadastral parcel and roads.
- `apps/web/src/lib/solar.ts`: shared NOAA/Meeus sun geometry and Europe/Paris
  civil-time conversion, including clock-change gaps and repeated hours.
- `packages/geometry`: renderer-independent wall segmentation, bounds and polygons.
- `apps/web/src/components`: procedural architecture plus instantiated GLB objects.
- `apps/web/src/materials`: deterministic parquet/tile color and relief maps,
  scaled in meters. No private source photos are embedded in web textures.
- `scripts/blender/create_current_assets.py`: original reusable asset authoring.
- `scripts/blender/assemble_apartment.py`: derived Blender apartment scene from
  exported domain data, for inspection/rendering; it is not the source of truth.

**1 unit = 1 meter.** Web plan points are `[X,Z]`, with Y up. The building frame
uses X true east and Z true south; the apartment's rotation relative to true north
is still uncalibrated. Blender uses `(x,-z,y)` for the same point. Asset fronts face
+Z in the web, origins are floor centered and scale is applied. The app imports
individual GLBs, not one opaque apartment mesh.

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
- `assets/blender/t3-building-context.blend`: editable **T3 Building Sun** scene,
  with building, neighbours, source metadata and a sampled solar timeline.
- `assets/blender/t3-building-context.png`: rendered exterior preview.
- `docs/building-site.json`: geographic and solar snapshot for Blender.

To rebuild the exterior scene from its snapshot and render its preview:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python scripts/blender/assemble_building.py -- --render
```

The exterior generator creates a new scene and saves a copy, preserving existing
scenes and the active working-file path when run through MCP. Its solar timeline
samples 26 September 2026 every 15 minutes; frame 61 is 15:00 in Paris. The web view
supports arbitrary selected dates; the Blender snapshot needs regeneration for a
different day. See [Blender model details](docs/building-research.md#escena-blender-editable).

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
