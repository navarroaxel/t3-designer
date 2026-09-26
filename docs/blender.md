# Blender + Codex

Configured and verified on macOS on 2026-09-26:

- Blender **5.2.2 LTS**, `/Applications/Blender.app`.
- Community integration **mcp-for-blender 2.1.0**, installed with `uv tool`.
- Matching bundled add-on, protocol **11**, enabled in Blender's saved preferences.
- Codex server `blender`, registered in `~/.codex/config.toml` using the absolute
  executable path `~/.local/bin/mcp-for-blender` (expanded during registration).
- Blender listens on **127.0.0.1:9876**. Keep this socket local: it executes Python
  inside Blender and has no authentication.
- `DISABLE_TELEMETRY=true` in the MCP environment and **Allow Telemetry** disabled
  in Blender. External asset/generation providers remain disabled; no API key is
  needed for local modeling, materials, rendering, or GLB export.

## Daily use

1. Open Blender. The enabled add-on defaults to starting its local server.
2. Run `pnpm blender:check` from the repository root. It performs a real MCP
   handshake, checks the matching add-on and disabled consent, and lists the
   number of available tools. It exits unsuccessfully if Blender is unreachable.
3. Ask Codex to inspect the scene, create geometry, assign materials, or export
   the asset. Save important work before modeling.

If disconnected, use the 3D Viewport sidebar (`N`) → **MCP for Blender** → start
the server. Some upstream UI labels still mention Claude; this connection also
works with Codex. If a Codex session predates registration and lacks the Blender
tools, reopen Codex to reload its MCP configuration. The initial setup was tested
through a real MCP client, including `execute_blender_code`, not just a socket probe.

## Asset pipeline

```sh
pnpm blender:sample
```

This macOS command runs Blender in the background and regenerates these files:

- `assets/blender/door-frame.blend`: editable source scene with studio helpers.
- `assets/blender/door-frame.png`: transparent preview.
- `apps/web/public/models/door-frame.glb`: three meshes and a PBR paint material,
  with no camera or lights, served by Vite at `/models/door-frame.glb`.

The generator is `scripts/blender/create_door_frame.py`. It creates its own scene
and preserves pre-existing scenes when called interactively through MCP. Repeated
interactive calls create another sample scene; the three output files above are
regenerated, so keep authored variants under different names.

The sample has an **0.80 × 2.10 m opening**, 0.06 m trim, and 0.14 m depth. Its
outside bounds are **0.92 × 2.16 × 0.14 m** in Three.js XYZ. These are sample
dimensions, not surveyed apartment dimensions. It is not yet placed in the
apartment, whose current procedural doors and cutaway behavior are unchanged.

Asset conventions:

- One unit is one meter. Apply object scale before export.
- Place the asset origin at floor level, centered horizontally on the opening.
- Author with Blender Z up. Export with `export_yup=True`: glTF/Three.js uses Y up,
  with `(x, y, z)` in Blender becoming `(x, z, -y)` in the web app.
- Export only the asset selection, apply modifiers, and use glTF-compatible PBR
  materials. Bake procedural textures before using them as web assets.
- Keep the apartment's canonical geometry in `apps/web/src/data/t3.ts`; asset
  creation does not convert estimated apartment values into measured ones.

Validation performed: MCP handshake and execution, GLB export, PNG inspection,
and load through this app's installed Three.js `GLTFLoader`. The GLB has three
meshes, a standard PBR material, correct metric bounds, and a floor-level origin.

## Reinstall on another Mac

With Blender and `uv` installed:

```sh
DISABLE_TELEMETRY=true uv tool install mcp-for-blender==2.1.0
DISABLE_TELEMETRY=true "$HOME/.local/bin/mcp-for-blender" install-addon
codex mcp add blender \
  --env DISABLE_TELEMETRY=true \
  --env BLENDER_HOST=127.0.0.1 \
  --env BLENDER_PORT=9876 \
  -- "$HOME/.local/bin/mcp-for-blender"
```

Enable **MCP for Blender** in Blender Preferences → Add-ons, keep **Allow
Telemetry** off, and save preferences. Run `pnpm blender:check`. Update the MCP
package and its bundled Blender add-on together when upgrading deliberately.

References: [MCP for Blender](https://github.com/ahujasid/mcp-for-blender) and
[Codex MCP configuration](https://developers.openai.com/codex/mcp).
