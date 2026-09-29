import { expect, test } from '@playwright/test'
import { setLanguage } from './settings-helpers'

test.use({
  locale: 'en-GB',
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle'] },
})

test('scene labels update without replacing the canvas', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('checkbox', { name: 'Labels', exact: true }).check()
  await expect(page.locator('.labels-overlay .cardinal-label').filter({ hasText: /^W$/ })).toBeAttached()
  await expect(page.locator('.labels-overlay .building-model-label')).toContainText('Tapalque')
  await page.locator('canvas').evaluate(element => element.setAttribute('data-original-canvas', 'true'))
  await setLanguage(page, 'fr')
  await expect(page.locator('.labels-overlay .cardinal-label').filter({ hasText: /^O$/ })).toBeAttached()
  await expect(page.locator('.building-location small')).toHaveText('Buenos Aires · Argentine')
  await expect(page.locator('canvas')).toHaveAttribute('data-original-canvas', 'true')
})
