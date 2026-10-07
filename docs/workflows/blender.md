# Blender models

The furniture of the house is mostly boxes drawn from the plan's measurements, which is why it can look like voxels. The objects that give a room its look (the PS5 first, then the fridge and the TVs)
are modelled in Blender instead, at the owner's sizes, and loaded as `.glb` files. The pipeline is upstream's asset worker, trimmed to what this house needs.

## Prerequisites

Blender (5.2 LTS was used; `pacman -S blender` on Arch), Node.js 24+ and Python 3. The runner uses `BLENDER_BIN` or `blender` on `PATH`, and starts Blender with `--background --factory-startup`;
the scene is never built in an open GUI session.

## Build the house's models

```sh
pnpm blender:house          # every job in scripts/blender/jobs
pnpm blender:house ps5      # one of them
```

Each job is a JSON request (`scripts/blender/jobs/<id>-job.json`): an id, a label, the outer **dimensions** in metres (width, height, depth), a material, the source of the measurements and a list of **parts**.
The worker validates the request, builds the parts, **normalises the whole object to the declared dimensions**, exports a GLB (origin at the middle of the floor, +Y up, +Z front), audits that GLB
(size, origin, resources) and renders previews. Each run writes to a new directory under `artifacts/house-assets/` (the worker never overwrites); the validated `model.glb` and `preview.png` are copied to
`apps/web/public/models/house/`.

The PS5 has a recipe of its own (`ps5_recipe.py`, `kind: "ps5"`): two white shells built as solids that taper and bow outward, a tapered black core with its blue light, the stand, the ports and the disc slot, drawn from the owner's photos. The other objects are built from parts: `box`, `ellipsoid`, `cylinder`, `cone`, `cushion` (upholstery, for beds and pillows) and `panel` (added here): a thin plate whose outline is a superellipse (`roundness` 0 to 1), extruded along
its width and bent about the vertical axis (`bend`, degrees), for curved shells. Boxes and panels take a `bevel`. Each part has a colour, a roughness and a metallic value.

## In the app

A piece of furniture with a `model` (`data/house-furnishings.ts`) is drawn from its GLB, standing on the floor at the middle of its box and facing the room; the box stays as its size, for collisions
and tests, and as a fallback if the file does not load. The PS5 is the first one.

## Checks

```sh
pnpm blender:test           # the worker's validation, the recipes, the audit
pnpm blender:asset --input scripts/blender/jobs/ps5-job.json --output-dir artifacts/ps5/try --skip-preview
```

## What it does not do

It builds from parts and from small recipes, not CAD: a model is as faithful as its recipe, and the measurement contract (the outer size) is exact, not the look. A new complex object gets a recipe next to `ps5_recipe.py`.
bezel) the next step is to add a recipe next to `procedural_recipe.py` that builds them with `bmesh`.
