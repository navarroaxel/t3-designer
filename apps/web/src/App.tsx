import { useState } from 'react'
import { ApartmentScene } from './components/ApartmentScene'
import { t3Apartment } from './data/t3'
import { assetCatalog, currentFixtures, reconstructionNotes } from './data/current-state'

const finishes = [
  { color: '#a97539', name: 'Parquet existente', rooms: 'Living y dormitorios' },
  { color: '#595955', name: 'Cerámica oscura', rooms: 'Cocina' },
  { color: '#ddddd0', name: 'Cerámica clara', rooms: 'Baño' },
  { color: '#68726a', name: 'Piso gris verdoso', rooms: 'Entrada y WC' },
  { color: '#637e89', name: 'Pintura azul gris', rooms: 'Marcos de servicio' },
]

export default function App() {
  const [cutaway, setCutaway] = useState(true)
  const [showLabels, setShowLabels] = useState(false)
  const [showFixtures, setShowFixtures] = useState(true)
  const [focusRoomId, setFocusRoomId] = useState<string>()
  const [panel, setPanel] = useState<'rooms' | 'assets'>('rooms')
  const [selectedAsset, setSelectedAsset] = useState<string>()
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })
  const asset = assetCatalog.find(item => item.id === selectedAsset)

  function resetView(mode: '3d' | 'top') {
    setView(previous => ({ mode, revision: previous.revision + 1 }))
  }
  function focusRoom(id?: string) {
    setFocusRoomId(id)
    resetView(view.mode)
  }

  return (
    <main className="designer">
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">Quimper / Estudio del apartamento</span>
          <h1>T3 Designer <span className="stage-label">Estado actual</span></h1>
        </div>
        <div className="project-details">
          <span className="estimate-badge"><span /> Medidas estimadas</span>
          <div className="area-stat"><strong>{t3Apartment.metadata.reportedCarrezArea.toFixed(2)} m²</strong><span>Superficie Carrez reportada</span></div>
        </div>
      </header>

      <div className="workspace">
        <section className="viewport" aria-label="Modelo del apartamento">
          <ApartmentScene apartment={t3Apartment} cutaway={cutaway} showLabels={showLabels} showFixtures={showFixtures} focusRoomId={focusRoomId} view={view} />
          <div className="viewport-top">
            <div className="model-caption"><span className="caption-dot" /> Reconstrucción visual <span className="version">01</span></div>
            <div className="view-buttons" role="group" aria-label="Vista de cámara">
              <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>Perspectiva</button>
              <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>Planta</button>
            </div>
          </div>
          <div className="viewport-bottom">
            <div className="scene-guide"><span>1 unidad = 1 metro</span><small>Arrastrar: orbitar · Rueda: zoom · Botón derecho: desplazar</small></div>
            <fieldset className="display-options">
              <legend className="sr-only">Capas del modelo</legend>
              <label><input type="checkbox" checked={cutaway} onChange={event => setCutaway(event.target.checked)} /> Corte</label>
              <label><input type="checkbox" checked={showFixtures} onChange={event => setShowFixtures(event.target.checked)} /> Equipamiento</label>
              <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> Rótulos</label>
            </fieldset>
          </div>
        </section>

        <aside className="inspector" aria-label="Explorar la reconstrucción">
          <div className="inspector-heading"><span className="eyebrow">El apartamento, hoy</span><p>Una base para diseñar lo que viene.</p></div>
          <div className="inspector-tabs" role="group" aria-label="Contenido del inspector">
            <button aria-pressed={panel === 'rooms'} onClick={() => setPanel('rooms')}>Ambientes <span>8</span></button>
            <button aria-pressed={panel === 'assets'} onClick={() => setPanel('assets')}>Assets <span>{assetCatalog.length}</span></button>
          </div>
          {panel === 'rooms' ? <>
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
        <span className="footer-label">11 fotos + 4 videos</span>
        <p>Estado actual reconstruido. Superficies reportadas; geometría, medidas y posiciones estimadas. Los materiales y detalles de desgaste son aproximaciones visuales.</p>
        <span className="wall-height">Altura: {t3Apartment.walls[0]?.height.toFixed(2)} m <span>estimada</span></span>
      </footer>
    </main>
  )
}
