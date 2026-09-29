import { expect, test } from '@playwright/test'
import { closeSettings, openSettings } from './settings-helpers'

test.use({ locale: 'en-GB' })

test('settings link to the project repository on GitHub', async ({ page }) => {
  await page.goto('/#building')
  const dialog = await openSettings(page)
  await dialog.getByRole('button', { name: 'About' }).click()
  const link = dialog.getByRole('link', { name: /View on GitHub/ })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', 'https://github.com/navarroaxel/t3-designer')
  // It leaves the app in a new tab, safely.
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noopener/)
  await expect(link).toContainText('(opens in a new tab)')
  await closeSettings(page)
})

test('the repository link is in Spanish when the language is Spanish', async ({ page }) => {
  await page.goto('/#building')
  await page.getByRole('button', { name: 'ESPAÑOL' }).click().catch(() => undefined)
  const dialog = await openSettings(page)
  await dialog.getByRole('combobox', { name: /^(Language|Idioma)$/ }).selectOption('es')
  await dialog.getByRole('button', { name: 'Acerca de' }).click()
  await expect(dialog.getByRole('link', { name: /Ver en GitHub/ })).toHaveAttribute('href', 'https://github.com/navarroaxel/t3-designer')
})
