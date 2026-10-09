import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { ArraySummary } from './ArraySummary'
import { GenerationDetails } from './GenerationDetails'
import { FactorControl } from './GenerationPanel'
import { SolarControls } from './SolarControls'
import { useGeneration } from '../lib/useGeneration'
import { usePvFactor } from '../lib/usePvFactor'
import { useInstalledPanels } from '../lib/useInstalledPanels'
import type { SolarStudy } from '../lib/useSolarStudy'
import '../building.css'

/**
 * The generation, the bill and the investment as a page of their own: the numbers do not need the 3D scene. The date and time are the study's, shared with the house view, and the panels
 * and the efficiency factor are the same ones, remembered in the browser.
 */
export function GenerationExplorer({ solar }: { solar: SolarStudy }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const pvFactor = usePvFactor()
  const panels = useInstalledPanels()
  const generation = useGeneration(solar, pvFactor.factor, panels.installed)
  return <div className="workspace generation-workspace">
    <section className="generation-main" aria-label={t('building.genDetailsTitle')}>
      <GenerationDetails solar={solar} generation={generation} panels={panels} />
    </section>
    <aside className="inspector solar-inspector" aria-label={t('building.solarStudy')}>
      <ArraySummary generation={generation} panels={panels} />
      <div className="generation"><FactorControl factor={pvFactor} /><p className="array-note generation-caveat">{t('building.genCaveat')}</p></div>
      <div className="solar-heading"><span className="eyebrow">{t('building.solarStudy')}</span><p>{t('building.sharedMoment')}</p></div>
      <SolarControls solar={solar} />
      <p className="array-note">{t('building.genNow', { typical: formatNumber(generation.nowTypicalKw, 1), clear: formatNumber(generation.nowClearKw, 1) })}</p>
    </aside>
  </div>
}
