import { lazy, Suspense, useEffect, useState, type MouseEvent } from 'react'
import { useSolarStudy } from './lib/useSolarStudy'
import { workspaceFromHash, type WorkspaceView } from './lib/workspace-view'
import { useTranslation } from 'react-i18next'
import { listenForLanguageChanges } from './i18n/preferences'
import { ApplicationSettings } from './components/ApplicationSettings'
import { LanguageToggle } from './components/LanguageToggle'
import { listenForThemeChanges } from './lib/theme'
import { PrivacyControls } from './components/PrivacyControls'
import { analytics } from './lib/analytics'
import { PrivacyPage } from './components/PrivacyPage'
import { isPrivacyPath, PRIVACY_PATH } from './lib/privacy-route'
import { privacyCopy } from './lib/privacy-copy'

const BuildingExplorer = lazy(() => import('./components/BuildingExplorer').then(module => ({ default: module.BuildingExplorer })))

export default function App() {
  const { t, i18n } = useTranslation('common')
  const privacy = privacyCopy[i18n.resolvedLanguage === 'es' ? i18n.resolvedLanguage : 'en']
  const solar = useSolarStudy()
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>(() => workspaceFromHash(window.location.hash))
  const [privacyPage, setPrivacyPage] = useState(() => isPrivacyPath(window.location.pathname))
  const { setPlaying } = solar
  useEffect(listenForLanguageChanges, [])
  useEffect(listenForThemeChanges, [])
  useEffect(() => {
    analytics.view(privacyPage ? null : workspaceView, !privacyPage)
  }, [workspaceView, privacyPage])
  useEffect(() => {
    document.title = t('app.title', { workspace: privacyPage ? privacy.policy : t(`workspaces.${workspaceView}.title`) })
  }, [t, workspaceView, privacyPage, privacy.policy])
  useEffect(() => {
    function handleNavigation() {
      const nextIsPrivacy = isPrivacyPath(window.location.pathname)
      setPrivacyPage(nextIsPrivacy)
      if (!nextIsPrivacy) setWorkspaceView(workspaceFromHash(window.location.hash))
      else analytics.view(null, false)
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
    setPrivacyPage(false)
    setWorkspaceView(next)
    solar.setPlaying(false)
    if (window.location.pathname !== '/' || window.location.hash !== `#${next}`) window.history.pushState(null, '', `/#${next}`)
  }

  function openPrivacy(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    if (!privacyPage) window.history.pushState(null, '', PRIVACY_PATH)
    analytics.view(null, false)
    setPlaying(false)
    setPrivacyPage(true)
  }

  return (
    <main className={`designer${privacyPage ? ' privacy-designer' : ''}`}>
      <header className="app-header">
        <div className="project-heading">
          <span className="eyebrow">{t('app.eyebrow')}</span>
          {privacyPage ? <div className="privacy-brand-heading">T3 Designer</div> : <h1>T3 Designer <span className="stage-label">{t(`workspaces.${workspaceView}.title`)}</span></h1>}
        </div>
        <div className="header-actions">
          <LanguageToggle />
          <ApplicationSettings />
        </div>
      </header>

      {privacyPage ? <PrivacyPage workspace={workspaceView} onReturn={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        switchWorkspace(workspaceView)
      }} /> : <>
      <Suspense fallback={<div className="workspace-loading" role="status">{t('app.loading', { workspace: t(`workspaces.${workspaceView}.title`) })}</div>}>
      <BuildingExplorer solar={solar} />
      </Suspense>
      </>}
      <PrivacyControls onOpenPrivacy={openPrivacy} privacyPage={privacyPage} />
    </main>
  )
}
