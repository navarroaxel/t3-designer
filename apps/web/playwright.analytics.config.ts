import { defineConfig } from '@playwright/test'

// A separate production build is essential: analytics is disabled in development.
// The UUID below belongs only to the intercepted test collector, never to Umami.
process.env.T3_ANALYTICS_E2E = '1'
const outputDirectory = '/tmp/t3-designer-analytics-e2e'

export default defineConfig({
  testDir: './e2e',
  testMatch: 'analytics.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: 'list',
  outputDir: '/tmp/t3-designer-analytics-results',
  use: {
    baseURL: 'http://127.0.0.1:4175',
    locale: 'en-GB',
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--disable-webgl'] },
  },
  webServer: [{
    command: `pnpm exec vite build --outDir ${outputDirectory} --emptyOutDir && pnpm exec vite preview --outDir ${outputDirectory} --host 127.0.0.1 --port 4175 --strictPort`,
    env: {
      VITE_UMAMI_SCRIPT_URL: '/umami/script.js',
      VITE_UMAMI_HOST_URL: '/umami',
      VITE_UMAMI_WEBSITE_ID: '00000000-0000-4000-8000-000000000001',
      VITE_UMAMI_ALLOWED_HOSTNAME: '127.0.0.1',
    },
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    timeout: 120_000,
  }, {
    command: 'pnpm exec vite build --outDir /tmp/t3-designer-analytics-disabled-e2e --emptyOutDir && pnpm exec vite preview --outDir /tmp/t3-designer-analytics-disabled-e2e --host 127.0.0.1 --port 4176 --strictPort',
    env: {
      VITE_UMAMI_SCRIPT_URL: '',
      VITE_UMAMI_HOST_URL: '',
      VITE_UMAMI_WEBSITE_ID: '',
      VITE_UMAMI_ALLOWED_HOSTNAME: '',
    },
    url: 'http://127.0.0.1:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  }],
})
