import { useState } from 'react'
import { BuildingScene } from './BuildingScene'
import { SolarControls, SolarMomentTag } from './SolarControls'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import type { FloorView } from './BuildingContext'
import { GenerationPanel } from './GenerationPanel'
import { ArraySummary } from './ArraySummary'
import { useGeneration } from '../lib/useGeneration'
import { usePvFactor } from '../lib/usePvFactor'
import { useInstalledPanels } from '../lib/useInstalledPanels'
import type { SolarStudy } from '../lib/useSolarStudy'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import '../building.css'

const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)

export function BuildingExplorer({ solar, onOpenGeneration }: { solar: SolarStudy; onOpenGeneration: () => void }) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useLocale()
  const { sun, instant } = solar
  const pvFactor = usePvFactor()
  const panels = useInstalledPanels()
  const generation = useGeneration(solar, pvFactor.factor, panels.installed)
  const [showNeighbors, setShowNeighbors] = useState(true)
  const [showSunPath, setShowSunPath] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [showPanels, setShowPanels] = useState(true)
  const [floor, setFloor] = useState<FloorView>('exterior')
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })
  function resetView(mode: '3d' | 'top') {
    setView(previous => ({ mode, revision: previous.revision + 1 }))
  }

  return <>
    <div className="workspace building-workspace">
      <section className={`viewport building-viewport ${sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label={t('building.sceneAria')}>
        <BuildingScene instant={instant} sun={sun} showNeighbors={showNeighbors} showSunPath={showSunPath} showLabels={showLabels} showPanels={showPanels} panelShade={generation.panelShade} installedPanels={panels.installed} floor={floor} view={view} />
        <div className="viewport-top building-viewport-top">
          <div className="building-location"><span className="eyebrow">{t('building.locationEyebrow')}</span><strong>{BUILDING_SITE.address.split(' · ')[0]}</strong><small>{t('building.location')}</small></div>
          <div className="view-buttons" role="group" aria-label={t('building.camera')}>
            <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>{t('building.perspective')}</button>
            <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>{t('building.plan')}</button>
            <button className="camera-reset" aria-label={t('building.resetView')} title={t('building.resetView')} onClick={() => resetView(view.mode)}>↺</button>
          </div>
        </div>
        <SolarMomentTag solar={solar} />
        <div className="viewport-bottom building-viewport-bottom">
          <div className="scene-guide"><span><i className="target-key" /> {t('building.buildingPart')} <i className="neighbor-key" /> {t('building.contextKey')}</span><small>{t('building.navigationHelp')}</small></div>
          <fieldset className="display-options building-layers">
            <legend className="sr-only">{t('building.buildingLayers')}</legend>
            <label><input type="checkbox" checked={showNeighbors} onChange={event => setShowNeighbors(event.target.checked)} /> {t('building.neighbors')}</label>
            <label><input type="checkbox" checked={showPanels} onChange={event => setShowPanels(event.target.checked)} /> {t('building.panels')}</label>
            <label><input type="checkbox" checked={showSunPath} onChange={event => setShowSunPath(event.target.checked)} /> {t('building.solarOrbit')}</label>
            <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> {t('building.labels')}</label>
          </fieldset>
        </div>
      </section>

      <aside className="inspector solar-inspector" aria-label={t('building.solarStudy')}>
        <section className="floor-selector" aria-label={t('building.floors')}>
          <span className="eyebrow">{t('building.floors')}</span>
          <div className="season-presets floor-presets" role="group" aria-label={t('building.floors')}>
            {([['exterior', 'building.floorExterior'], ['ground', 'building.floorGround'], ['first', 'building.floorFirst']] as const).map(([option, key]) =>
              <button key={option} aria-pressed={floor === option} onClick={() => { setFloor(option); resetView('3d') }}>{t(key)}</button>)}
          </div>
          {floor !== 'exterior' && <p className="floor-note">{t('building.floorNote')}</p>}
        </section>
        <ArraySummary generation={generation} panels={panels} />
        <GenerationPanel solar={solar} generation={generation} factor={pvFactor} onExpand={onOpenGeneration} />
        <div className="solar-heading"><span className="eyebrow">{t('building.solarStudy')}</span><h2>{t('building.annualLightLine1')}<br /> {t('building.annualLightLine2')}</h2><p>{t('building.sharedMoment')}</p></div>

        <SolarControls solar={solar} />

        <details className="evidence-notes building-evidence"><summary>{t('building.evidencePrecision')}</summary>
          <p>{t('building.modelScope', { radius: formatNumber(BUILDING_SITE.radiusMeters) })}</p>
          <p>{t('building.houseDescription', { height: formatNumber(targetBuilding?.height ?? 0, 1), area: formatNumber(SITE_PARCEL.area, 1) })}</p>
          <p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">{t('building.solarSource')}</a><br />{t('building.solarDescription')}</p>
          <p>{t('building.dataConsulted', { date: formatDate(new Date(`${BUILDING_SITE.retrievedAt}T12:00:00Z`), { dateStyle: 'long' }), attribution: BUILDING_SITE.attribution })}</p>
        </details>
      </aside>
    </div>
  </>
}
