import { useState } from 'react'
import { BuildingExplorer } from './components/BuildingExplorer'
import { ApartmentExplorer } from './components/ApartmentExplorer'
import { useSolarStudy } from './lib/useSolarStudy'
import { useApartmentView } from './lib/useApartmentView'
import { t3Apartment } from './data/t3'

export default function App() {
  const solar = useSolarStudy()
  const apartmentView = useApartmentView()
  const [workspaceView, setWorkspaceView] = useState<'apartment' | 'building'>(() => window.location.hash === '#apartment' ? 'apartment' : 'building')
  function switchWorkspace(next: 'apartment' | 'building') {
    setWorkspaceView(next)
    solar.setPlaying(false)
    window.history.replaceState(null, '', `#${next}`)
  }

  return (
    <main className="designer">
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">Quimper / Estudio de arquitectura</span>
          <h1>T3 Designer <span className="stage-label">{workspaceView === 'building' ? 'Edificio y entorno' : 'Luz en el departamento'}</span></h1>
        </div>
        <div className="project-details">
          <span className="estimate-badge"><span /> {workspaceView === 'building' ? 'IGN + reconstrucción visual' : 'Medidas estimadas'}</span>
          <div className="area-stat"><strong>{t3Apartment.metadata.reportedCarrezArea.toFixed(2)} m²</strong><span>Superficie Carrez reportada</span></div>
        </div>
      </header>

      <nav className="workspace-switcher" aria-label="Elegir vista del proyecto">
        <button aria-pressed={workspaceView === 'apartment'} onClick={() => switchWorkspace('apartment')}>Departamento</button>
        <button aria-pressed={workspaceView === 'building'} onClick={() => switchWorkspace('building')}>Edificio y sol</button>
      </nav>
      {workspaceView === 'building'
        ? <BuildingExplorer solar={solar} onOpenApartment={() => { apartmentView.setPanel('sun'); switchWorkspace('apartment') }} />
        : <ApartmentExplorer solar={solar} state={apartmentView} />}
    </main>
  )
}
