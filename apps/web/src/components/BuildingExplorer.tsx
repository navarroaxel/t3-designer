import { useState } from 'react'
import { BuildingScene } from './BuildingScene'
import { SolarControls, SolarMomentTag } from './SolarControls'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import { APARTMENT_PLACEMENT } from '../data/apartment-placement'
import type { SolarStudy } from '../lib/useSolarStudy'
import '../building.css'

const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)

export function BuildingExplorer({ solar, onOpenApartment }: { solar: SolarStudy; onOpenApartment: () => void }) {
  const { sun, instant } = solar
  const [cutaway, setCutaway] = useState<'none' | 'floor' | 'apartment'>('none')
  const [focusApartment, setFocusApartment] = useState(false)
  const [showNeighbors, setShowNeighbors] = useState(true)
  const [showSunPath, setShowSunPath] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })
  function resetView(mode: '3d' | 'top') {
    setView(previous => ({ mode, revision: previous.revision + 1 }))
  }

  return <>
    <div className="workspace building-workspace">
      <section className={`viewport building-viewport ${sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label="Edificio y entorno en tres dimensiones">
        <BuildingScene instant={instant} sun={sun} showNeighbors={showNeighbors} showSunPath={showSunPath} showLabels={showLabels} view={view} cutaway={cutaway} focusApartment={focusApartment} />
        <div className="viewport-top building-viewport-top">
          <div className="building-location"><span className="eyebrow">El edificio y su entorno</span><strong>Jean-Baptiste Colbert</strong><small>Quimper · Bretaña, Francia</small></div>
          <div className="view-buttons" role="group" aria-label="Cámara del edificio">
            <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>Perspectiva</button>
            <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>Planta</button>
            <button className="camera-reset" aria-label="Reiniciar vista" title="Reiniciar vista" onClick={() => resetView(view.mode)}>↺</button>
          </div>
        </div>
        <SolarMomentTag solar={solar} />
        <div className="viewport-bottom building-viewport-bottom">
          <div className="scene-guide"><span><i className="target-key" /> Edificio <i className="apartment-key" /> Nuestro T3 <i className="neighbor-key" /> Entorno</span><small>Arrastrar para orbitar · Rueda para acercar</small></div>
          <fieldset className="display-options building-layers">
            <legend className="sr-only">Capas del edificio</legend>
            <label><input type="checkbox" checked={showNeighbors} onChange={event => setShowNeighbors(event.target.checked)} /> Vecinos</label>
            <label><input type="checkbox" checked={showSunPath} onChange={event => setShowSunPath(event.target.checked)} /> Órbita solar</label>
            <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> Rótulos</label>
          </fieldset>
        </div>
      </section>

      <aside className="inspector solar-inspector" aria-label="Simulador de luz solar">
        <section className="apartment-location-card" aria-label="Departamento en el edificio">
          <span className="eyebrow">Nuestro departamento</span><h2>El T3, en su lugar.</h2>
          <p>{APARTMENT_PLACEMENT.label}<br /><small>Fachada al patio · Ubicación según tu marca.</small></p>
          <div className="building-section-options" role="group" aria-label="Cortes del edificio">
            {([{ mode: 'none', label: 'Completo' }, { mode: 'floor', label: 'Corte de piso' }, { mode: 'apartment', label: 'Ver interior' }] as const).map(option => <button key={option.mode} aria-pressed={cutaway === option.mode} onClick={() => { setCutaway(option.mode); setFocusApartment(option.mode !== 'none'); resetView('3d') }}>{option.label}</button>)}
          </div>
          <button className="apartment-locate" aria-pressed={focusApartment} onClick={() => { setFocusApartment(previous => !previous); resetView('3d') }}>{focusApartment ? 'Ver edificio completo ↗' : 'Ubicar mi departamento ↗'}</button>
          <button className="apartment-enter" onClick={onOpenApartment}>Explorar luz en el departamento <span>→</span></button>
        </section>
        <div className="solar-heading"><span className="eyebrow">Estudio solar</span><h2>La luz, a lo largo<br /> del año.</h2><p>La misma fecha y hora en ambas vistas.</p></div>

        <SolarControls solar={solar} />

        <details className="evidence-notes building-evidence"><summary>Fuentes y precisión</summary>
          <p><a href={BUILDING_SITE.rnbUrl} target="_blank" rel="noreferrer">Registro Nacional de Edificios ↗</a><br />Vincula los números 1, 1 bis y 1 ter al mismo edificio. Dirección oficial: {BUILDING_SITE.officialAddress}.</p>
          <p><a href="https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/" target="_blank" rel="noreferrer">IGN · BD TOPO ↗</a><br />Huellas, alturas y calles. Altura del edificio: {targetBuilding?.height} m; {targetBuilding?.floors} niveles. Precisión declarada: {targetBuilding?.planarAccuracy} m en planta y {targetBuilding?.verticalAccuracy} m en altura.</p>
          <p><a href="https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=29232&section=AL&numero=0538" target="_blank" rel="noreferrer">Catastro · parcela {SITE_PARCEL.label} ↗</a><br />{SITE_PARCEL.area.toLocaleString('es-ES')} m² de parcela. Capturas de Google Maps / Earth para interpretar fachadas.</p>
          <p>Volúmenes georreferenciados en un entorno de aproximadamente {BUILDING_SITE.radiusMeters} m. Terreno plano y tejados vecinos simplificados; ventanas, materiales y cubiertas aproximados. {APARTMENT_PLACEMENT.assumption} Su encaje, altura y orientación necesitan confirmación; las sombras interiores son una aproximación.</p>
          <p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">Cálculo solar · NOAA / Meeus ↗</a><br />Posición solar astronómica y sombras sobre este modelo. No incluye nubes ni vegetación, y no es un estudio de radiación. Los horarios de salida y puesta usan un horizonte ideal.</p>
          <p>Datos consultados: {BUILDING_SITE.retrievedAt}. {BUILDING_SITE.attribution}.</p>
        </details>
      </aside>
    </div>
    <footer className="app-footer building-footer"><span className="footer-label">Edificio + sol</span><p>Geometría IGN y catastro · T3 ubicado según tu marca · Piso y encaje aproximados</p><a href={BUILDING_SITE.mapUrl} target="_blank" rel="noreferrer">Ver ubicación ↗</a></footer>
  </>
}
