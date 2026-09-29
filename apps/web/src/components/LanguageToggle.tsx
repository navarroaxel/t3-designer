import { useTranslation } from 'react-i18next'
import type { Locale } from '../i18n/locale'
import { setLanguagePreference } from '../i18n/preferences'
import { useLocale } from '../i18n/useLocale'

const OPTIONS: { locale: Locale; short: string }[] = [
  { locale: 'es', short: 'SPA' },
  { locale: 'en', short: 'ENG' },
]

/** Header shortcut between the two languages. The full choice, including the browser's, stays in Settings. */
export function LanguageToggle() {
  const { t } = useTranslation('common')
  const { locale } = useLocale()
  return <div className="language-toggle" role="group" aria-label={t('language.label')}>
    {OPTIONS.map(option => <button key={option.locale} type="button" lang={option.locale}
      aria-pressed={locale === option.locale} aria-label={t(`language.${option.locale}`)}
      onClick={() => setLanguagePreference(option.locale)}>{option.short}</button>)}
  </div>
}
