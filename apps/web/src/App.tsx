import { lazy, Suspense, useEffect, useState } from 'react'
import { useSolarStudy } from './lib/useSolarStudy'
import { useApartmentView } from './lib/useApartmentView'
import { t3Apartment } from './data/t3'
import { workspaceFromHash, type WorkspaceView } from './lib/workspace-view'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))
const ApartmentExplorer = lazy(() => import('./components/ApartmentExplorer').then(module => ({ default: module.ApartmentExplorer })))
const DossierExplorer = lazy(() => import('./components/DossierExplorer').then(module => ({ default: module.DossierExplorer })))

const workspaceLabels: Record<WorkspaceView, { title: string; badge: string }> = {
  apartment: { title: 'Luz en el departamento', badge: 'Medidas estimadas' },
  building: { title: 'Edificio y entorno', badge: 'IGN + reconstrucción visual' },
  documentation: { title: 'Documentación', badge: 'Datos con sus fuentes' },
}

export default function App() {
  const solar = useSolarStudy()
  const apartmentView = useApartmentView()
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => workspaceFromHash(window.location.hash))
  const { setPlaying } = solar
  useEffect(() => {
    function handleNavigation() {
      setWorkspaceView(workspaceFromHash(window.location.hash))
      setPlaying(false)
    }
    window.addEventListener('hashchange', handleNavigation)
    window.addEventListener('popstate', handleNavigation)
    return () => {
      window.removeEventListener('hashchange', handleNavigation)
      window.removeEventListener('popstate', handleNavigation)
    }
  }, [setPlaying])

  function switchWorkspace(next: WorkspaceView) {
    setWorkspaceView(next)
    solar.setPlaying(false)
    if (window.location.hash !== `#${next}`) window.history.pushState(null, '', `#${next}`)
  }

  return (
    <main className={`designer${workspaceView === 'documentation' ? ' documentation-designer' : ''}`}>
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">Quimper / Estudio de arquitectura</span>
          <h1>T3 Designer <span className="stage-label">{workspaceLabels[workspaceView].title}</span></h1>
        </div>
        <div className="project-details">
          <span className="estimate-badge"><span /> {workspaceLabels[workspaceView].badge}</span>
          <div className="area-stat"><strong>{t3Apartment.metadata.reportedCarrezArea.toFixed(2)} m²</strong><span>Superficie Carrez reportada</span></div>
        </div>
      </header>

      <nav className="workspace-switcher" aria-label="Elegir vista del proyecto">
        <button aria-pressed={workspaceView === 'apartment'} onClick={() => switchWorkspace('apartment')}>Departamento</button>
        <button aria-pressed={workspaceView === 'building'} onClick={() => switchWorkspace('building')}>Edificio y sol</button>
        <button aria-pressed={workspaceView === 'documentation'} onClick={() => switchWorkspace('documentation')}>Documentación</button>
      </nav>
      <Suspense fallback={<div className="workspace-loading" role="status">Abriendo {workspaceLabels[workspaceView].title.toLowerCase()}…</div>}>
      {workspaceView === 'documentation'
        ? <DossierExplorer onOpenApartment={() => { apartmentView.setPanel('rooms'); switchWorkspace('apartment') }} onOpenBuilding={() => switchWorkspace('building')} />
        : workspaceView === 'building'
        ? <BuildingExplorer solar={solar} onOpenApartment={() => { apartmentView.setPanel('sun'); switchWorkspace('apartment') }} />
        : <ApartmentExplorer solar={solar} state={apartmentView} />}
      </Suspense>
    </main>
  )
}
