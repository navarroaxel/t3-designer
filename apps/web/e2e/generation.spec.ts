import { expect, test } from '@playwright/test'

test.use({
  locale: 'en-GB',
  launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--use-gl=angle'] },
})

test('hovering a month bar shows that month\'s estimated generation', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  const bars = page.locator('.month-bar-button')
  await expect(bars).toHaveCount(12, { timeout: 30_000 })
  // Every bar is reachable and named for assistive technology with the month's figure.
  await expect(bars.first()).toHaveAttribute('aria-label', /January: [\d,.]+ kWh a month, [\d.]+ kWh a day/)
  await bars.nth(11).hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText('December')
  await expect(tooltip).toContainText(/kWh a month/)
  await expect(tooltip).toContainText(/kWh a day/)
  // Leaving the bar hides it; the keyboard shows it too.
  await page.mouse.move(5, 5)
  await expect(tooltip).toHaveCount(0)
  await bars.nth(5).focus()
  await expect(page.getByRole('tooltip')).toContainText('June')
})
