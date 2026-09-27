import { expect, test } from '@playwright/test'

const storageKey = 't3-designer.language'
const variants = [
  { browser: 'es-AR', language: 'es', label: 'Idioma', title: 'Documentación', area: '49,18' },
  { browser: 'en-US', language: 'en', label: 'Language', title: 'Documentation', area: '49.18' },
  { browser: 'fr-CA', language: 'fr', label: 'Langue', title: 'Documentation', area: '49,18' },
] as const

for (const variant of variants) {
  test.describe(variant.browser, () => {
    test.use({ locale: variant.browser, timezoneId: 'America/Argentina/Buenos_Aires' })

    test('uses browser language on a direct workspace link', async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      await page.goto('/#documentation')
      await expect(page.locator('html')).toHaveAttribute('lang', variant.language)
      await expect(page).toHaveTitle(`T3 Designer · ${variant.title}`)
      await expect(page.getByRole('combobox', { name: variant.label, exact: true })).toHaveValue('auto')
      await expect(page.locator('.area-stat strong')).toContainText(variant.area)
      await expect(page.locator('.dossier-hero')).toBeVisible()
      expect(await page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull()
      expect(errors).toEqual([])
    })

    test('translates all workspaces and preserves solar controls and selection', async ({ page }) => {
      await page.goto('/#apartment')
      await expect(page.locator('#solar-date')).toBeVisible()
      await page.locator('#solar-date').fill('2026-12-21')
      await page.locator('#solar-time').fill('15:30')
      await page.locator('.inspector-tabs button').nth(1).click()
      await page.locator('.room-navigation button').first().click()
      const selectedRoom = await page.locator('.room-navigation .selected').innerText()
      expect(selectedRoom).toBeTruthy()
      await page.getByRole('combobox').selectOption('fr')
      await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
      await expect(page.locator('.room-navigation button').first()).toHaveClass(/selected/)
      await expect(page.locator('.room-navigation button').first()).toContainText('Chambre')
      await page.locator('.inspector-tabs button').first().click()
      await expect(page.locator('#solar-date')).toHaveValue('2026-12-21')
      await expect(page.locator('#solar-time')).toHaveValue('15:30')
      await page.locator('.workspace-switcher button').nth(1).click()
      await expect(page.locator('#solar-date')).toHaveValue('2026-12-21')
      await expect(page.locator('#solar-time')).toHaveValue('15:30')
      await expect(page.locator('.solar-time-heading')).toContainText('Europe/Paris')
      await expect(page.locator('.canvas-fallback')).toContainText('WebGL')
      await page.locator('.workspace-switcher button').nth(2).click()
      await expect(page.locator('.dossier-hero')).toBeVisible()
      await page.getByRole('combobox').selectOption('auto')
      await expect(page.locator('html')).toHaveAttribute('lang', variant.language)
      await expect(page).toHaveURL(/#documentation$/)
    })

    test('localizes dossier sections, search, source dialogs and original downloads', async ({ page }) => {
      await page.goto('/#documentation')
      await expect(page.locator('.dossier-hero')).toBeVisible()
      const navigation = page.locator('.dossier-sidebar nav button')
      for (let index = 0; index < 6; index++) {
        await navigation.nth(index).click()
        await expect(navigation.nth(index)).toHaveAttribute('aria-current', 'page')
        await expect(page.locator('.dossier-content')).not.toContainText('{{')
        await expect(page.locator('.dossier-content')).not.toContainText(/(?:facts|sources|questions|ui)\.[a-z]/)
        if (index === 1) {
          await expect(page.locator('.dossier-surfaces tbody tr')).toHaveCount(8)
          await expect(page.locator('.dossier-surfaces tfoot')).toContainText(variant.area)
        }
      }
      await navigation.nth(4).click()
      await page.locator('.dossier-source-card').first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await expect(dialog.locator('h2')).toHaveText({ es: 'Dirección normalizada', en: 'Normalized address', fr: 'Adresse normalisée' }[variant.language])
      await expect(dialog.locator('a[href="/dossier/official-sources-2026-09-27.json"]')).toBeVisible()
      await expect(dialog).not.toContainText('{{')
      await page.keyboard.press('Escape')
      await expect(dialog).not.toBeVisible()
      await page.locator('#dossier-search').fill({ es: 'superficie', en: 'area', fr: 'energie' }[variant.language])
      await expect(page.locator('.dossier-search-results .dossier-fact').first()).toBeVisible()
      await page.locator('#dossier-search').fill('zzz-no-such-record')
      await expect(page.locator('.dossier-empty')).toBeVisible()
    })
  })
}

test('honours ordered navigator.languages, then falls back to English', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'languages', { configurable: true, value: ['de-DE', 'fr-BE', 'es-AR'] }))
  await page.goto('/#documentation')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['de-DE', 'ja-JP'] })
    window.dispatchEvent(new Event('languagechange'))
  })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('manual preference persists and synchronizes across tabs', async ({ page, context }) => {
  await page.goto('/#documentation')
  await page.getByRole('combobox').selectOption('es')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await expect(page.getByRole('combobox')).toHaveValue('es')
  await page.locator('.dossier-sidebar nav button').nth(4).click()
  await page.locator('.dossier-source-card').first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const other = await context.newPage()
  await other.goto('/#documentation')
  await expect(other.locator('html')).toHaveAttribute('lang', 'es')
  await other.getByRole('combobox').selectOption('fr')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await expect(page.getByRole('dialog').locator('h2')).toHaveText('Adresse normalisée')
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['es'] })
    window.dispatchEvent(new Event('languagechange'))
  })
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await other.getByRole('combobox').selectOption('auto')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('combobox')).toHaveValue('auto')
})

test('invalid or unavailable storage does not prevent rendering or switching', async ({ page }) => {
  await page.addInitScript(key => {
    localStorage.setItem(key, 'unsupported')
    Object.defineProperty(navigator, 'languages', { configurable: true, value: ['fr-CA'] })
  }, storageKey)
  await page.goto('/#documentation')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('Blocked', 'SecurityError') } })
  })
  await page.reload()
  await expect(page.locator('.dossier-hero')).toBeVisible()
  await page.getByRole('combobox').selectOption('es')
  await expect(page.locator('html')).toHaveAttribute('lang', 'es')
})

test('keyboard language control fits on a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#documentation')
  const select = page.getByRole('combobox')
  await select.scrollIntoViewIfNeeded()
  await select.focus()
  await expect(select).toBeFocused()
  await select.press('f')
  await select.press('Enter')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr')
  const bounds = await select.boundingBox()
  expect(bounds).toBeTruthy()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390)
})

test('season labels stay on Quimper dates even across the international date line', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-GB', timezoneId: 'Pacific/Kiritimati' })
  const page = await context.newPage()
  try {
    await page.goto('http://127.0.0.1:4173/#building')
    await expect(page.locator('.season-presets button').last()).toContainText('21 Dec')
    await page.locator('.season-presets button').last().click()
    await expect(page.locator('#solar-date')).toHaveValue(/-12-21$/)
  } finally {
    await context.close()
  }
})
