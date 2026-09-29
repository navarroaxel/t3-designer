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
  // The lines of text must not inherit the bars' fill: they sit on the tooltip's own background.
  for (const line of await tooltip.locator('span').all()) await expect(line).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  // Leaving the bar hides it; the keyboard shows it too.
  await page.mouse.move(5, 5)
  await expect(tooltip).toHaveCount(0)
  await bars.nth(5).focus()
  await expect(page.getByRole('tooltip')).toContainText('June')
})

test('the tooltip stands out from the panel in the dark theme', async ({ page }) => {
  test.setTimeout(60_000)
  await page.addInitScript(() => { try { window.localStorage.setItem('t3-designer.theme', 'dark') } catch { /* storage may be blocked */ } })
  await page.goto('/#building')
  const bars = page.locator('.month-bar-button')
  await expect(bars).toHaveCount(12, { timeout: 30_000 })
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await bars.nth(5).focus()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  // Light text on a raised surface: readable, and lighter than the panel behind it.
  const colors = await tooltip.evaluate(element => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    const luminance = ([red, green, blue]: number[]) => [red, green, blue].map(channel => { const c = channel / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }).reduce((sum, c, index) => sum + c * [.2126, .7152, .0722][index], 0)
    const style = getComputedStyle(element), panel = getComputedStyle(element.closest('.inspector')!)
    const text = luminance(parse(style.color)), surface = luminance(parse(style.backgroundColor)), behind = luminance(parse(panel.backgroundColor))
    return { textOnSurface: (Math.max(text, surface) + .05) / (Math.min(text, surface) + .05), surfaceOverPanel: surface / behind }
  })
  expect(colors.textOnSurface).toBeGreaterThan(7)
  expect(colors.surfaceOverPanel).toBeGreaterThan(1.5)
})
