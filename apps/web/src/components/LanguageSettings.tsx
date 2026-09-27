import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { parsePreference, supportedLocales } from '../i18n/locale'
import { setLanguagePreference, useLanguagePreference } from '../i18n/preferences'
import { useLocale } from '../i18n/useLocale'

/** Self-contained preference control, ready to move into the settings panel. */
export function LanguageSettings() {
  const { t } = useTranslation('common')
  const preference = useLanguagePreference()
  const { locale } = useLocale()
  const [announceChange, setAnnounceChange] = useState(false)
  const id = useId()
  return <div className="language-settings">
    <label htmlFor={id}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 6.5h14M5 17.5h14" /></svg>
      {t('language.label')}
    </label>
    <select id={id} aria-describedby={`${id}-description`} value={preference} onChange={event => { setLanguagePreference(parsePreference(event.target.value)); setAnnounceChange(true) }}>
      <option value="auto">{t('language.automatic')}</option>
      {supportedLocales.map(locale => <option key={locale} value={locale} lang={locale}>{t(`language.${locale}`)}</option>)}
    </select>
    <span id={`${id}-description`} className="sr-only">{t('language.description')}</span>
    <span className="sr-only" role="status">{announceChange ? t('language.changed', { language: t(`language.${locale}`) }) : ''}</span>
  </div>
}
