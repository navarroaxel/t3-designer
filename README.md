# T3 Designer · Tapalque

**Follow the sun. See the shadows. Plan the panels.**

A 3D solar study of one house in **Buenos Aires** (Tapalque): the house,
its rooftop terrace and the neighbouring buildings, with sunlight and shadows
for any date and time of the year. The aim is to see how the surroundings shade
the roof before installing solar panels.

This is a fork of the original T3 Designer, rebuilt around a new site. The
apartment, the property dossier and the Blender pipeline of the original were
removed; they remain available in the git history.

## Quick start

Use **Node.js 24+**, **pnpm 12.7.0** (the repository pin), and a browser with
WebGL 2 enabled.

```sh
pnpm install
pnpm dev
```

Open the Vite URL shown in the terminal, normally
[localhost:5173](http://localhost:5173).

**Drag** to orbit · **Scroll** to zoom · **Right-drag** to pan

1. Move the time slider or press play to watch shadows cross the roof.
2. Jump between the four seasons. In Buenos Aires the noon sun is always to the
   north, at about 79° in December and 32° in June.
3. Switch to **Top view** to see how far each neighbour's shadow reaches.
4. Use **Floors** to cut the house open at the ground floor or the first floor. Only the exterior walls are modelled so far.
5. Tick **Panels** to show the planned array of 16 panels (9.92 kWp) on the azotea. The panel shows the energy they generate, a day and a year, calibrated with a measured January.

The solar controls calculate locally; changing the date or time does not call an
external API. Time follows `America/Argentina/Buenos_Aires` (UTC-3, no daylight
saving).

## How it works

| Where | What it owns |
| --- | --- |
| [`apps/web/src/data/building-site.ts`](apps/web/src/data/building-site.ts) | The site: house volumes, neighbours, streets and lot, in metres |
| [`apps/web/src/lib/solar.ts`](apps/web/src/lib/solar.ts) | Sun geometry and civil-time conversion |
| [`apps/web/src/components`](apps/web/src/components) | React UI and the Three.js scene |

Coordinates are metres, with x east, y up and z south. The origin is the centre
of the Google Earth view that frames the house. See the
[architecture guide](docs/architecture/architecture.md) and the
[solar model](docs/model/solar-model.md) and the
[generation estimate](docs/model/generation.md).

## The model and its limits

The site comes from the owner's dimensions, the **municipal survey sketches** of the
lots, Street View and **Google Earth imagery captured on 2021-09-24**:

- **Lot:** 8.66 m of front (owner), 13.50 m and 13.70 m deep, 8.70 m at the rear (survey sketch),
  rotated about 45° from north. The house fills it.
- **House:** 9 m deep, two floors, flat roof at 6.4 m. The roof is 10 m deep counting a
  1 m cantilever in front, level with the balcony, and the azotea is 8.5 m wide between
  the parapets.
- **Rear ground-floor band:** 4.5 m deep, with a left arm, a light well (2.5 m) and the
  terrace with grill on the right seen from the street.
- **Neighbours:** the lot on the north-east, the corner and the lot behind come from their
  survey sketches; their buildings are estimated from Street View. The other lots of the
  block come from the block plan, digitised by eye, with default heights.

This is a shading model, **not a survey**. Expect about ±1 m on the buildings of the lots that have no survey.
Roofs are flat; parapets, trees, the terrace grill and anything built after 2021
are not modelled. Sunlight and shadows are a **visual study**, not a certified
insolation, energy or measured irradiance report.

## Development

```sh
pnpm check
```

This runs lint, TypeScript checks, unit tests and the production build.

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the web development server |
| `pnpm build` | Build the production web app |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run Playwright browser tests |

For browser tests, install Playwright's Chromium once with
`pnpm --filter @t3-designer/web exec playwright install chromium`.

## Documentation and analytics

The [documentation index](docs/README.md) lists the architecture, the solar
model, internationalization, analytics and [deployment](docs/deployment.md) notes.

Page views are measured with [Vercel Web Analytics](https://vercel.com/docs/analytics).
It only runs on a Vercel deployment with Web Analytics enabled for the project;
local and preview-less builds send nothing.

## License and attribution

Original code, documentation, authored 3D geometry and generated textures are
available under the [MIT License](LICENSE). Copyright © 2026 Pablo Coronel.
Forks, modifications and commercial use are welcome; retain the required
copyright and license notices.

If you build on this work, credit **T3 Designer by Pablo Coronel (pablitxn)** and
link to the original repository. This is appreciated, not an additional license
condition.

Third-party dependencies, public datasets and externally supplied reference
material retain their own licenses and rights. Preserve the source attribution
and retrieval dates documented in [`building-site.ts`](apps/web/src/data/building-site.ts).
