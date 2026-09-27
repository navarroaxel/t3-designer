import { ApartmentScene } from './ApartmentScene'
import { SolarControls, SolarMomentTag } from './SolarControls'
import { t3Apartment } from '../data/t3'
import { APARTMENT_PLACEMENT } from '../data/apartment-placement'
import { assetCatalog, currentFixtures, reconstructionNotes } from '../data/current-state'
import type { SolarStudy } from '../lib/useSolarStudy'
import type { ApartmentView } from '../lib/useApartmentView'

function facadeBearing(azimuth: number) {
  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(azimuth / 45) % 8]
  return `${compass} · ${azimuth.toFixed(0)}°`
}

const finishes = [
  { color: '#a97539', name: 'Parquet existente', rooms: 'Living y dormitorios' },
  { color: '#595955', name: 'Cerámica oscura', rooms: 'Cocina' },
  { color: '#ddddd0', name: 'Cerámica clara', rooms: 'Baño' },
  { color: '#68726a', name: 'Piso gris verdoso', rooms: 'Entrada y WC' },
  { color: '#637e89', name: 'Pintura azul gris', rooms: 'Marcos de servicio' },
]

export function ApartmentExplorer({ solar, state }: { solar: SolarStudy; state: ApartmentView }) {
  const {
    cutaway, setCutaway, showLabels, setShowLabels, showFixtures, setShowFixtures,
    focusRoomId, setFocusRoomId, panel, setPanel, showContext, setShowContext,
    selectedAsset, setSelectedAsset, view, resetView, focusRoom,
  } = state
  const asset = assetCatalog.find(item => item.id === selectedAsset)

  return <>
      <div className="workspace apartment-workspace">
        <section className={`viewport apartment-viewport ${solar.sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label="Modelo del apartamento con luz solar">
          <ApartmentScene apartment={t3Apartment} cutaway={cutaway} showLabels={showLabels} showFixtures={showFixtures} focusRoomId={focusRoomId} view={view} sun={solar.sun} showContext={showContext} />
          <div className="viewport-top">
            <div className="model-caption"><span className="caption-dot" /> Nuestro T3 <span className="version">Sol en Quimper</span></div>
            <div className="view-buttons" role="group" aria-label="Vista de cámara">
              <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>Perspectiva</button>
              <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>Planta</button>
              <button className="camera-reset" aria-label="Reiniciar vista" title="Reiniciar vista" onClick={() => { setFocusRoomId(undefined); resetView(view.mode) }}>↺</button>
            </div>
          </div>
          <SolarMomentTag solar={solar} className="apartment-moment-tag" />
          <button className="apartment-context-toggle" aria-pressed={showContext} onClick={() => setShowContext(previous => !previous)}><span aria-hidden="true">▥</span> {showContext ? 'Ocultar edificio' : 'Mostrar edificio'}</button>
          <div className="viewport-bottom">
            <div className="scene-guide"><span>{solar.sun.isDaylight ? 'Luz solar y sombras interiores' : 'Sin sol directo · Luz ambiental de referencia'}</span><small>Arrastrar: orbitar · Rueda: zoom · Botón derecho: desplazar</small></div>
            <fieldset className="display-options">
              <legend className="sr-only">Capas del modelo</legend>
              <label><input type="checkbox" checked={cutaway} onChange={event => setCutaway(event.target.checked)} /> Corte</label>
              <label><input type="checkbox" checked={showFixtures} onChange={event => setShowFixtures(event.target.checked)} /> Equipamiento</label>
              <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> Rótulos</label>
            </fieldset>
          </div>
        </section>

        <aside className="inspector solar-inspector apartment-inspector" aria-label="Explorar el departamento y la luz solar">
          <div className="inspector-heading"><span className="eyebrow">Adentro del T3</span><p>Tu casa, a la luz del día.</p></div>
          <div className="inspector-tabs" role="group" aria-label="Contenido del inspector">
            <button aria-pressed={panel === 'sun'} onClick={() => setPanel('sun')}>Sol</button>
            <button aria-pressed={panel === 'rooms'} onClick={() => setPanel('rooms')}>Ambientes <span>8</span></button>
            <button aria-pressed={panel === 'assets'} onClick={() => setPanel('assets')}>Assets <span>{assetCatalog.length}</span></button>
          </div>
          {panel === 'sun' ? <>
            <section className="solar-room-focus" aria-label="Observar la luz por ambiente">
              <h2>Mirar la luz en</h2>
              <div role="group" aria-label="Enfocar ambiente">
                {([{ id: undefined, label: 'Todo el T3' }, { id: 'living', label: 'Living' }, { id: 'bedroom-1', label: 'Habitación 1' }, { id: 'bedroom-2', label: 'Habitación 2' }]).map(room => <button key={room.id ?? 'all'} aria-pressed={focusRoomId === room.id} onClick={() => focusRoom(room.id)}>{room.label}</button>)}
              </div>
              <p>Mové la hora y compará estaciones para ver hasta dónde entra el sol por las ventanas.</p>
              <div className="apartment-orientation"><span>Living <b>{facadeBearing(APARTMENT_PLACEMENT.livingFacadeAzimuth)}</b></span><span>Habitaciones <b>{facadeBearing(APARTMENT_PLACEMENT.bedroomFacadeAzimuth)}</b></span><small>Orientación estimada</small></div>
            </section>
            <SolarControls solar={solar} />
            <div className="solar-interior-note"><strong>El edificio también da sombra.</strong><p>Mostrarlo u ocultarlo solo cambia la vista. Sus sombras y las de los vecinos siguen presentes; el corte conserva el efecto de muros y techo.</p></div>
            <details className="evidence-notes"><summary>Ubicación y precisión del sol</summary><p>{APARTMENT_PLACEMENT.assumption} Piso, posición y orientación quedan por confirmar.</p><p>La posición del sol se calcula para Quimper con la hora de Europe/Paris. Las ventanas, muros y volúmenes cercanos tienen medidas estimadas; no se incluyen nubes ni vegetación. Es una visualización de luz directa, no una medición de radiación.</p><p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">Cálculo solar · NOAA / Meeus ↗</a></p></details>
          </> : panel === 'rooms' ? <>
            <button className={`room-nav overview ${!focusRoomId ? 'selected' : ''}`} onClick={() => focusRoom()}><span>Vista completa</span><small>Todo el T3 ↗</small></button>
            <div className="room-navigation">
              {t3Apartment.rooms.map((room, index) => <button key={room.id} className={`room-nav ${focusRoomId === room.id ? 'selected' : ''}`} onClick={() => focusRoom(room.id)}>
                <span><i>{String(index + 1).padStart(2, '0')}</i>{room.name}</span><small>{room.reportedArea.toFixed(2)} m²</small>
              </button>)}
            </div>
            <div className="finish-list"><h2>Materiales existentes</h2>{finishes.map(finish => <div className="finish" key={finish.name}><span style={{ background: finish.color }} /><div>{finish.name}<small>{finish.rooms}</small></div></div>)}</div>
          </> : <>
            <p className="inspector-note">{currentFixtures.length} elementos colocados. Elegí un asset para ver sus dimensiones y su ambiente.</p>
            <div className="asset-list">{assetCatalog.map(item => <button key={item.id} className={`asset-row ${selectedAsset === item.id ? 'selected' : ''}`} onClick={() => { setSelectedAsset(item.id); focusRoom(currentFixtures.find(f => f.assetId === item.id)?.roomId); setShowFixtures(true) }}><span>{item.label}</span><small>×{currentFixtures.filter(f => f.assetId === item.id).length}</small></button>)}</div>
            {asset && <div className="asset-details"><h2>{asset.label}</h2><p>{asset.dimensions.map(n => (n * 100).toFixed(0)).join(' × ')} cm <span>ancho × alto × fondo</span></p><small>Dimensiones estimadas</small><p className="asset-evidence">{asset.evidence}</p><a href={asset.url} download>Descargar GLB ↗</a></div>}
          </>}
          <details className="evidence-notes"><summary>Fuentes y alcance</summary>{reconstructionNotes.map(note => <p key={note}>{note}</p>)}</details>
        </aside>
      </div>
      <footer className="app-footer">
        <span className="footer-label">Departamento + sol</span>
        <p>Luz según fecha y hora local de Quimper. Ubicación en el edificio, orientación y dimensiones aproximadas según tus referencias.</p>
        <span className="wall-height">Altura: {t3Apartment.walls[0]?.height.toFixed(2)} m <span>estimada</span></span>
      </footer>
  </>
}
