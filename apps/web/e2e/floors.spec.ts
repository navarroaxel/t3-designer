import { expect, test } from '@playwright/test'

test.use({
  locale: 'en-GB',
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle'] },
})

test('the floor selector cuts the house open without replacing the canvas', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  await expect(page.locator('canvas')).toBeVisible({ timeout: 30_000 })
  await page.locator('canvas').evaluate(element => element.setAttribute('data-original-canvas', 'true'))
  const buttons = page.locator('.floor-presets button')
  await expect(buttons).toHaveCount(3)
  await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.floor-note')).toHaveCount(0)

  await buttons.nth(1).click()
  await expect(buttons.nth(1)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.floor-note')).toContainText('1.5 m')
  await buttons.nth(2).click()
  await expect(buttons.nth(2)).toHaveAttribute('aria-pressed', 'true')
  await buttons.first().click()
  await expect(buttons.first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.floor-note')).toHaveCount(0)
  await expect(page.locator('canvas')).toHaveAttribute('data-original-canvas', 'true')
})
