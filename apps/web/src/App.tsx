import { lazy, Suspense, useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { useSolarStudy } from './lib/useSolarStudy'
import { workspaceFromHash, type WorkspaceView } from './lib/workspace-view'
import { useTranslation } from 'react-i18next'
import { listenForLanguageChanges } from './i18n/preferences'
import { ApplicationSettings } from './components/ApplicationSettings'
import { LanguageToggle } from './components/LanguageToggle'
import { listenForThemeChanges } from './lib/theme'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))

export default function App() {
  const { t } = useTranslation('common')
  const solar = useSolarStudy()
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

      <Suspense fallback={<div className="workspace-loading" role="status">{t('app.loading', { workspace: t(`workspaces.${workspaceView}.title`) })}</div>}>
      <BuildingExplorer solar={solar} />
      </Suspense>
      <Analytics />
    </main>
  )
}
