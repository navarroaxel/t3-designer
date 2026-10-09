import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { PANELS, PANEL_SPEC, ROWS, TILT_DEGREES } from '../data/solar-array'
import type { Generation } from '../lib/useGeneration'
import type { InstalledPanels } from '../lib/useInstalledPanels'

/** What is installed: how many panels, their power and their rows. It heads the side column of the house view and of the generation tab. */
export function ArraySummary({ generation, panels }: { generation: Generation; panels: InstalledPanels }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  return <section className="array-summary" aria-label={t('building.arrayTitle')}>
    <span className="eyebrow">{t('building.arrayTitle')}</span>
    <strong>{t('building.arraySummary', { panels: formatNumber(panels.count), watts: formatNumber(PANEL_SPEC.watts), kwp: formatNumber(generation.day.kwp, 2) })}</strong>
    {!panels.isFull && <p className="array-note">{t('building.arrayPartial', { count: panels.count, total: panels.total })}</p>}
    <p className="array-note">{t('building.arrayLayout', { rows: ROWS.map(row => PANELS.filter(panel => panel.row === row && panels.isIn(panel.id)).length).filter(count => count > 0).join(' + '), tilt: formatNumber(TILT_DEGREES) })}</p>
  </section>
}
