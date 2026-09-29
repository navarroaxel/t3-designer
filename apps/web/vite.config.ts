import { cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Vercel looks for `dist` at the repository root, whatever the build command or
 * framework preset it ends up using. On Vercel only, publish the build there too. */
const publishToRepositoryRoot = (): Plugin => ({
  name: 'publish-dist-to-repository-root',
  apply: 'build',
  closeBundle() {
    if (!process.env.VERCEL) return
    const from = fileURLToPath(new URL('./dist', import.meta.url))
    const to = fileURLToPath(new URL('../../dist', import.meta.url))
    rmSync(to, { recursive: true, force: true })
    cpSync(from, to, { recursive: true })
  },
})

export default defineConfig({
  plugins: [react(), publishToRepositoryRoot()],
})
