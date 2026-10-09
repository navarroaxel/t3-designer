import { lazy, Suspense, useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useSolarStudy } from './lib/useSolarStudy'
import { useApartmentView } from './lib/useApartmentView'
import { useDemoLayout } from './lib/useDemoLayout'
import { workspaceFromHash, workspaceViews, type WorkspaceView } from './lib/workspace-view'
import { useTranslation } from 'react-i18next'
import { listenForLanguageChanges } from './i18n/preferences'
import { ApplicationSettings } from './components/ApplicationSettings'
import { LanguageToggle } from './components/LanguageToggle'
import { listenForThemeChanges } from './lib/theme'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))
const GenerationExplorer = lazy(() => import('./components/GenerationExplorer').then(module => ({ default: module.GenerationExplorer })))
const ApartmentExplorer = lazy(() => import('./components/ApartmentExplorer').then(module => ({ default: module.ApartmentExplorer })))
const ReferenceWalkthrough = lazy(() => import('./walkthrough/ReferenceWalkthrough').then(module => ({ default: module.ReferenceWalkthrough })))

export default function App() {
  const { t } = useTranslation('common')
  const solar = useSolarStudy()
  const apartmentView = useApartmentView()
  const demoLayout = useDemoLayout()
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => workspaceFromHash(window.location.hash))
  const { setPlaying } = solar
  useEffect(listenForLanguageChanges, [])
  useEffect(listenForThemeChanges, [])
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
    <main className="designer">
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">{t('app.eyebrow')}</span>
          <h1>T3 Designer <span className="stage-label">{t(`workspaces.${workspaceView}.title`)}</span></h1>
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <ApplicationSettings />
        </div>
      </header>

      <nav className="workspace-switcher" aria-label={t('app.navigation')}>
        {workspaceViews.map(view => <button key={view} aria-pressed={workspaceView === view} onClick={() => switchWorkspace(view)}>{t(`workspaces.${view}.nav`)}</button>)}
      </nav>

      <Suspense fallback={<div className="workspace-loading" role="status">{t('app.loading', { workspace: t(`workspaces.${workspaceView}.title`) })}</div>}>
      {workspaceView === 'walkthrough'
        ? <ReferenceWalkthrough solar={solar} floor={apartmentView.floor} onFloorChange={apartmentView.setFloor} onClose={() => switchWorkspace('apartment')} />
        : workspaceView === 'apartment'
        ? <ApartmentExplorer solar={solar} state={apartmentView} layout={demoLayout} />
        : workspaceView === 'generation'
        ? <GenerationExplorer solar={solar} />
        : <BuildingExplorer solar={solar} onOpenGeneration={() => switchWorkspace('generation')} />}
      </Suspense>
      <Analytics />
    </main>
  )
}
