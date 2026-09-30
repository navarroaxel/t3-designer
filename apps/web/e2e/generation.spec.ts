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

test('hovering the power curve reads the values of that moment, and clicking moves the study there', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  const chart = page.locator('.generation .power-chart-plot')
  await expect(chart).toBeVisible({ timeout: 30_000 })
  const box = (await chart.boundingBox())!
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5)
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(/^\d\d:\d\d/)
  await expect(tooltip).toContainText(/Typical day: [\d.]+ kW/)
  await expect(tooltip).toContainText(/Clear sky: [\d.]+ kW/)
  await expect(tooltip).toContainText(/kWh so far today/)
  // Noon-ish: the reading sits at the middle of the chart.
  await expect(tooltip.locator('strong')).toHaveText(/^(11|12|13):/)
  await page.mouse.move(5, 5)
  await expect(tooltip).toHaveCount(0)
  // The keyboard reads it too, and Enter applies the reading to the study.
  await chart.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Shift+ArrowRight')
  await page.keyboard.press('Shift+ArrowRight')
  await expect(tooltip.locator('strong')).toHaveText('03:00')
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Local time in Buenos Aires')).toHaveValue('03:00')
})

test('the expanded panel has a day view and a year view that drive the study', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  await expect(page.locator('.month-bar-button')).toHaveCount(12, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Expand' }).click()
  const details = page.getByRole('dialog', { name: 'Generation in detail' })
  await expect(details).toBeVisible()
  // The day: the wide curve and the figures read off the simulation.
  await expect(details.locator('.power-chart-large')).toBeVisible()
  for (const label of ['Typical day', 'Clear day', 'Overcast day', 'Peak, clear sky', 'Producing', 'Shading, clear day']) await expect(details.getByText(label, { exact: true }).first()).toBeVisible()
  // The year: the metric toggle, the table and its CSV.
  await details.getByRole('tab', { name: 'Year' }).click()
  await expect(details.locator('.gen-table tbody tr')).toHaveCount(12)
  await details.getByRole('button', { name: 'kWh per kWp a day', exact: true }).click()
  await expect(details.getByRole('button', { name: 'kWh per kWp a day', exact: true })).toHaveAttribute('aria-pressed', 'true')
  const download = page.waitForEvent('download')
  await details.getByRole('button', { name: 'Download CSV' }).click()
  expect((await download).suggestedFilename()).toBe('generation-by-month.csv')
  // Selecting a month moves the study to its 15th.
  await details.getByRole('button', { name: /^June:/ }).click()
  await expect(page.getByLabel('Day of the year')).toHaveValue('2026-06-15')
  await expect(details.locator('.gen-table tr[aria-current="true"] th')).toHaveText('June')
  // Escape closes it.
  await page.keyboard.press('Escape')
  await expect(details).toHaveCount(0)
})

test('the efficiency factor can be edited, moves the figures and is remembered', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  const total = page.locator('.generation-total strong')
  const number = page.getByRole('spinbutton', { name: 'Efficiency factor' })
  await expect(number).toHaveValue('83', { timeout: 30_000 })
  const before = Number(await total.textContent())
  await number.fill('60')
  await number.press('Enter')
  await expect(page.getByText(/Edited; the calibrated value is 83%/)).toBeVisible()
  const after = Number(await total.textContent())
  expect(after).toBeLessThan(before * .8)
  // The year follows, and the choice survives a reload.
  await page.reload()
  await expect(number).toHaveValue('60', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Back to the calibrated value' }).click()
  await expect(number).toHaveValue('83')
  expect(Number(await total.textContent())).toBe(before)
  // Out-of-range input is clamped, not trusted.
  await number.fill('900')
  await number.press('Enter')
  await expect(number).toHaveValue('110')
})

test('the panels tab shows every panel and string, with a tooltip for each', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/#building')
  await expect(page.locator('.month-bar-button')).toHaveCount(12, { timeout: 30_000 })
  await page.getByRole('button', { name: 'Expand' }).click()
  const details = page.getByRole('dialog', { name: 'Generation in detail' })
  await details.getByRole('tab', { name: 'Panels' }).click()
  const panels = details.locator('.panel-hit button')
  await expect(panels).toHaveCount(16)
  await expect(panels.first()).toHaveAttribute('aria-label', /^(Back|Middle|Front) \d+, string [12]: [\d.]+ kWh on the typical day, shade takes [\d.]+% on a clear day$/)
  // Two strings of eight panels, and the day's energy adds up across them.
  const strings = details.locator('.gen-stat', { hasText: /^String \d/ })
  await expect(strings).toHaveCount(2)
  await expect(strings.first()).toContainText('8 panels')
  await panels.nth(7).hover()
  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toBeVisible()
  await expect(tooltip).toContainText(/String [12]/)
  await expect(tooltip).toContainText(/kWh on the typical day/)
  await expect(tooltip).toContainText(/Shade takes [\d.]+% on a clear day/)
  // The colouring can switch to shade.
  await details.getByRole('button', { name: 'Shade, clear day' }).click()
  await expect(details.locator('.panel-cell-shade')).toHaveCount(16)
})
