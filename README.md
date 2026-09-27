# T3 Designer

T3 Designer is an interactive 3D workspace for exploring a home and imagining how
to make it your own. Move between floor plans and interior views to inspect
rooms, furniture, fixtures and finishes, then zoom out to understand how the
apartment fits into its building and the surrounding neighbourhood.

Explore how natural light reaches each room, how nearby buildings cast shadows,
and how both change throughout the day and across seasons. With property
documentation alongside the model and a Blender workflow for detailed renders,
T3 Designer brings space, light and context together to inform interior design
decisions.

## Run

Node.js 24+ and pnpm 12.7.0 (repository pin):

```sh
pnpm install
pnpm dev
```

Open the Vite URL, normally [localhost:5173](http://localhost:5173). Orbit by dragging, zoom with the
wheel, pan with right-drag. Select an environment to focus the camera. Use Planta
or Perspectiva, Corte, Equipamiento and Rótulos to inspect layers. The asset tab
lists nominal dimensions, source evidence and downloadable GLBs.

For the complete code/data check, also install Python 3.10+:

```sh
pnpm check
```

This runs lint, TypeScript checks, Node and Python tests, read-only snapshot
verification, and the production web build. It does not start Blender or require
MCP. Individual commands remain available: `pnpm lint`, `pnpm typecheck`,
`pnpm test`, `pnpm scene:verify` and `pnpm build`.

## Building and sunlight

Choose **Edificio y sol** in the header to switch to the exterior view. Set the
calendar date and **Hora en Quimper**, drag the time slider, or play the day's
movement. The seasonal presets compare spring, summer, autumn and winter. Time
always uses **Europe/Paris**, including daylight-saving transitions, independently
of your computer's timezone. Direct sunlight switches off at night.

Orbit and zoom as in the apartment, use **Planta** for a north-oriented overhead
view, and toggle neighbours, the solar path or labels. The panel reports solar
altitude, azimuth, sunrise, sunset and solar noon. **Nuestro T3** marks the unit;
**Corte de piso** and **Ver interior** expose its actual room geometry. The
apartment is provisionally placed on the third floor above ground, near the
northwest end of the courtyard facade, following the supplied mark and window
photo. The living room faces southwest and bedrooms northeast under this
explicitly estimated registration; it has not been surveyed.

In **Departamento → Sol**, focus the living room or either bedroom, change the
date/time or play the day to inspect sunlight through the window openings. The
selected moment is retained when switching views. **Mostrar edificio** adds a
floor section around the apartment; hiding it preserves neighbouring shadows.
The view cut hides wall tops and the ceiling without removing their physical
shadows. Window glazing lets direct light through; frames, balcony guards and
opaque door panels still cast shadows. See [placement assumptions](docs/apartment-placement.md).

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

See [architecture and extension boundaries](docs/architecture.md) for the complete
flow from domain data to the web and Blender adapters.

- `apps/web/src/data/t3.ts`: canonical architectural data in meters, validated by
  `packages/scene-schema`. Floor polygons, walls and apertures remain editable data.
- `apps/web/src/data/current-state.ts`: canonical asset catalog and placements,
  with source references and explicitly estimated dimensions.
- `apps/web/src/data/building-site.ts`: public geographic extract in true-north
  metre coordinates, with source IDs, heights, cadastral parcel and roads.
- `apps/web/src/data/apartment-placement.ts`: estimated rigid registration and
  through-building aperture, shared by the interior and exterior scenes.
- `apps/web/src/lib/solar.ts`: shared NOAA/Meeus sun geometry and Europe/Paris
  civil-time conversion, including clock-change gaps and repeated hours.
- `packages/geometry`: renderer-independent wall segmentation, bounds and polygons.
- `packages/scene-schema/src/project.ts`: versioned project snapshot contract.
- `scripts/export_scene.ts` and `scripts/lib/project-snapshot.ts`: deterministic,
  validated exports containing the apartment, segmented wall solids, placement,
  assets, geographic context and astronomical sun.
- `assets/scenes/t3-project.json`: tracked combined project snapshot consumed by
  the Blender renderer; regenerate it from the TypeScript inputs.
- `apps/web/src/components`: workspace explorers, procedural architecture and
  instantiated GLB objects. `App` owns the shared solar state and apartment view
  state; both scenes render on demand.
- `apps/web/src/materials`: deterministic parquet/tile color and relief maps,
  scaled in meters. No private source photos are embedded in web textures.
- `scripts/blender/create_current_assets.py`: original reusable asset authoring.
- `scripts/blender/assemble_project.py`: combined apartment/building solar scene
  derived from the project snapshot. Blender output is not the source of truth.
- `scripts/blender/assemble_apartment.py` and `assemble_building.py`: retained
  adapters for the historical standalone reference scenes.

**1 unit = 1 meter.** Web plan points are `[X,Z]`, with Y up. The building frame
uses X true east and Z true south; the apartment uses the estimated site rotation
in `apartment-placement.ts`. Blender uses `(x,-z,y)` for the same point. Asset fronts face
+Z in the web, origins are floor centered and scale is applied. The app imports
individual GLBs, not one opaque apartment mesh.

## Headless Blender pipeline

The combined render needs an installed Blender executable, Node.js/pnpm and
Python 3.10+ for validation. It runs in a separate background process; Blender's
GUI, the MCP add-on and `uv` are not required. The runner uses `BLENDER_BIN` when
set, otherwise the standard macOS application path or `blender` on `PATH`.

```sh
pnpm scene:snapshot    # Refresh all four tracked JSON snapshots
pnpm scene:verify      # Check them without writing
pnpm blender:validate  # Audit tracked .blend / .glb assets; no save or render
pnpm blender:scene     # Build the combined .blend from the saved project JSON
pnpm blender:render    # Build it and render a PNG with Cycles CPU
```

`scene:snapshot` defaults to **2026-09-26 at 15:00, Europe/Paris**. It exports
`docs/t3-apartment.json`, `docs/current-fixtures.json`, `docs/building-site.json`
and `assets/scenes/t3-project.json`. It does not read the browser's current date
or time. A separate seasonal render can use its own snapshot:

```sh
pnpm scene:snapshot --date 2026-12-21 --time 15:00 --output artifacts/scenes/winter.json
pnpm blender:render --input artifacts/scenes/winter.json --output artifacts/blender/winter.blend --render artifacts/renders/winter.png --resolution 640 --samples 12
```

With `--output`, only that combined JSON is written. `--check` verifies the same
selected outputs without changing them; use the same date/time arguments.
Repeated autumn clock times require `--occurrence earlier` or `--occurrence later`
(the default is `reject`); nonexistent spring clock times are rejected.

Generated outputs are ignored under `artifacts/`: the default scene is
`artifacts/blender/t3-project.blend`, its validation report is
`artifacts/blender/t3-project.validation.json`, and the PNG is
`artifacts/renders/t3-project.png`. The asset audit writes
`artifacts/reports/assets.json`. The new builder refuses `.blend` output inside
`assets/blender`, preserving the four historical source/reference files.

A combined **Cycles CPU render at 960 px and 32 samples** has been verified. The
scene embeds the source JSON and builder source, records its source hash and
selected UTC instant, and checks solar direction, fixture count and the physical
context. Camera cuts leave complete walls, ceiling and neighbours casting
shadows. Materials, facade decoration, roof forms and renderer lighting remain
approximations; these checks do not establish visual parity or measured solar
accuracy.

See [Blender commands, outputs and optional MCP setup](docs/blender.md) for all
flags, preserved references and the older asset-authoring commands.

## Evidence and precision

The third **Documentación** view opens the local property dossier alongside the
3D workspaces. It presents source-backed public records, reported apartment
areas, visual observations and unresolved differences. The source extract, plan
image and visual evidence index are served with the application; reading them
does not query external APIs. The individual apartment's original diagnostics,
legal lot and energy consumption remain pending.

This proof of concept deliberately keeps existing property data and public-source
extracts in the repository. See the [editorial scope](docs/property-dossier.md)
and [research inventory](docs/property-dossier-research.md). Database, S3 storage,
document uploads and multiuser access are deferred; the [hybrid architecture](docs/property-dossier-architecture.md)
describes a possible later stage, not services required by this version.

See [visual evidence](docs/reference-evidence.md), [geometry notes](docs/apartment-geometry.md)
and [checkpoint](docs/checkpoint.md). The reported room areas sum to 49.18 m²;
conceptual polygons preserve them, but walls overlay their boundaries. This is not
a measured net-area survey. Window and appliance presence are observed; their
metric dimensions and global placements remain provisional. The bathroom's exact
shower/partition arrangement especially needs a measured plan. Wear is selectively
represented; mirror and glass are lightweight PBR approximations, not ray-traced
room reflections. The basement is not reconstructed.

Original source media remain in Downloads; contact-sheet derivatives under
`assets/reference` are locally gitignored. Nothing was uploaded or published.

## License and attribution

The project's original code, documentation, authored 3D geometry and generated
textures are available under the [MIT License](LICENSE).
Copyright (c) 2026 Pablo Coronel.

Forks, modifications and extensions are welcome, including commercial use. MIT
requires preserving the copyright and license notices in copies or substantial
portions of the project. If you build on this work, please credit **T3 Designer
by Pablo Coronel (pablitxn)** and link to the original repository. This credit/link
request is appreciated, not an additional license condition.

Third-party dependencies, public datasets and externally supplied reference
material retain their respective licenses and rights; the MIT license does not
relicense them. Preserve source attribution and retrieval dates for the geographic
extracts; see [data sources and attribution](docs/building-research.md#licencias-y-atribución)
and [reference provenance](docs/reference-evidence.md).
