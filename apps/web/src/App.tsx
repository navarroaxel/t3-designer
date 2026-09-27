import { lazy, Suspense, useEffect, useState } from 'react'
import { useSolarStudy } from './lib/useSolarStudy'
import { useApartmentView } from './lib/useApartmentView'
import { t3Apartment } from './data/t3'
import { workspaceFromHash, type WorkspaceView } from './lib/workspace-view'
import { useTranslation } from 'react-i18next'
import { useLocale } from './i18n/useLocale'
import { listenForLanguageChanges } from './i18n/preferences'
import { LanguageSettings } from './components/LanguageSettings'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))
const ApartmentExplorer = lazy(() => import('./components/ApartmentExplorer').then(module => ({ default: module.ApartmentExplorer })))
const DossierExplorer = lazy(() => import('./components/DossierExplorer').then(module => ({ default: module.DossierExplorer })))

export default function App() {
  const { t } = useTranslation('common')
  const { formatNumber } = useLocale()
  const solar = useSolarStudy()
  const apartmentView = useApartmentView()
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => workspaceFromHash(window.location.hash))
  const { setPlaying } = solar
  useEffect(listenForLanguageChanges, [])
  useEffect(() => {
    document.title = t('app.title', { workspace: t(`workspaces.${workspaceView}.title`) })
  }, [t, workspaceView])
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
          <span className="eyebrow">{t('app.eyebrow')}</span>
          <h1>T3 Designer <span className="stage-label">{t(`workspaces.${workspaceView}.title`)}</span></h1>
        </div>
        <div className="project-details">
          <span className="estimate-badge"><span /> {t(`workspaces.${workspaceView}.badge`)}</span>
          <div className="area-stat"><strong>{formatNumber(t3Apartment.metadata.reportedCarrezArea, 2)} m²</strong><span>{t('app.areaLabel')}</span></div>
        </div>
      </header>

      <nav className="workspace-switcher" aria-label={t('app.navigation')}>
        {(['apartment', 'building', 'documentation'] as const).map(view => <button key={view} aria-pressed={workspaceView === view} onClick={() => switchWorkspace(view)}>{t(`workspaces.${view}.nav`)}</button>)}
      </nav>
      <Suspense fallback={<div className="workspace-loading" role="status">{t('app.loading', { workspace: t(`workspaces.${workspaceView}.title`) })}</div>}>
      {workspaceView === 'documentation'
        ? <DossierExplorer onOpenApartment={() => { apartmentView.setPanel('rooms'); switchWorkspace('apartment') }} onOpenBuilding={() => switchWorkspace('building')} />
        : workspaceView === 'building'
        ? <BuildingExplorer solar={solar} onOpenApartment={() => { apartmentView.setPanel('sun'); switchWorkspace('apartment') }} />
        : <ApartmentExplorer solar={solar} state={apartmentView} />}
      </Suspense>
      <footer className="settings-footer"><LanguageSettings /></footer>
    </main>
  )
}
