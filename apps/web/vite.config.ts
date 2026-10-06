import { cpSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { siteMetaTags } from './site-meta'

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

/** Adds the tags that depend on the deployment: robots and the absolute preview image. */
const siteMeta = (): Plugin => ({
  name: 'site-meta',
  transformIndexHtml: () => siteMetaTags({
    // Vercel provides the production host without a scheme; VITE_SITE_URL overrides it.
    siteUrl: process.env.VITE_SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL,
    robots: process.env.VITE_ROBOTS,
  }),
})

export default defineConfig({
  plugins: [react(), tailwindcss(), publishToRepositoryRoot(), siteMeta()],
})
