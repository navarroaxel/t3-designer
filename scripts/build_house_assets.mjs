// Builds the house's Blender models: every job in scripts/blender/jobs/*.json becomes apps/web/public/models/house/<id>.glb (and its preview).
// Each run writes to a new directory under artifacts/ (the worker never overwrites), then copies the validated GLB into the app.
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const jobs = join(root, 'scripts/blender/jobs')
const target = join(root, 'apps/web/public/models/house')
const only = process.argv[2]
mkdirSync(target, { recursive: true })
for (const file of readdirSync(jobs).filter(name => name.endsWith('.json'))) {
  const { id } = JSON.parse(readFileSync(join(jobs, file), 'utf8'))
  if (only && id !== only) continue
  const output = join(root, 'artifacts/house-assets', `${id}-${Date.now()}`)
  const run = spawnSync('node', [join(root, 'scripts/run_blender.mjs'), 'generate_asset.py', '--input', join(jobs, file), '--output-dir', output, '--resolution', '512', '--samples', '24'], { cwd: root, stdio: 'inherit' })
  if (run.status !== 0) process.exit(run.status ?? 1)
  copyFileSync(join(output, 'model.glb'), join(target, `${id}.glb`))
  copyFileSync(join(output, 'preview.png'), join(target, `${id}-preview.png`))
  console.log(`${id}: ${join(target, `${id}.glb`)}`)
}
