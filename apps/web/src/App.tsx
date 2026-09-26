import { useState } from 'react'
import { ApartmentScene } from './components/ApartmentScene'
import { t3Apartment } from './data/t3'

export default function App() {
  const [cutaway, setCutaway] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })

  function resetView(mode: '3d' | 'top') {
    setView((previous) => ({ mode, revision: previous.revision + 1 }))
  }

  return (
    <main className="designer">
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">Quimper / Apartment study</span>
          <h1>T3 Designer</h1>
        </div>
        <div className="project-details">
          <span className="estimate-badge"><span /> Estimated geometry</span>
          <div className="area-stat"><strong>{t3Apartment.metadata.reportedCarrezArea.toFixed(2)} m²</strong><span>Reported Carrez area</span></div>
        </div>
      </header>

      <section className="viewport" aria-label="Apartment model">
        <ApartmentScene apartment={t3Apartment} cutaway={cutaway} showLabels={showLabels} view={view} />

        <div className="viewport-top">
          <div className="model-caption"><span className="caption-dot" /> Apartment geometry <span className="version">v1</span></div>
          <div className="view-buttons" role="group" aria-label="Reset camera view">
            <button onClick={() => resetView('3d')} title="Reset to the default perspective">3D View</button>
            <button onClick={() => resetView('top')} title="Reset to a north-up plan view">Top View</button>
          </div>
        </div>

        <div className="viewport-bottom">
          <div className="scene-guide"><span>1 unit = 1 meter</span><small>Drag to orbit · Scroll to zoom · Right-drag to pan</small></div>
          <fieldset className="display-options">
            <legend className="sr-only">Display options</legend>
            <label><input type="checkbox" checked={cutaway} onChange={(event) => setCutaway(event.target.checked)} /> Cutaway walls</label>
            <label><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Room labels</label>
          </fieldset>
        </div>
      </section>

      <footer className="app-footer">
        <span className="footer-label">About this model</span>
        <p>Room areas are documented. Wall lengths, height and openings are estimated; the amber WC door is inferred. Windows and balcony access are unknown.</p>
        <span className="wall-height">Full wall height: {t3Apartment.walls[0]?.height.toFixed(2)} m <span>estimated</span></span>
      </footer>
    </main>
  )
}
