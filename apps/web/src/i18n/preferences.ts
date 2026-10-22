import { useSyncExternalStore } from 'react'
import { browserLanguages, i18n, readPreference } from './instance'
import { createLanguageTab } from './language-sync.ts'
import { languageFromQuery, languageStorageKey, parsePreference, resolveLocale, type LanguagePreference } from './locale'

const listeners = new Set<() => void>()

// A link's `?lang=` holds this tab's language until a language is chosen in it (see `createLanguageTab`).
const tab = createLanguageTab({
  initial: readPreference(),
  fromLink: languageFromQuery(window.location.search) !== undefined,
  storage: () => window.localStorage,
  apply: next => {
    void i18n.changeLanguage(resolveLocale(next, browserLanguages()))
    listeners.forEach(listener => listener())
  },
})

/** A choice made in Settings takes over from the link's `?lang=`: it leaves the address, so that a reload keeps the choice and not the link's language. */
function dropLanguageFromAddress() {
  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('lang')) return
    url.searchParams.delete('lang')
    window.history.replaceState(window.history.state, '', url)
  } catch {
    // An address that cannot be rewritten keeps working: the choice still applies to this page.
  }
}

export function setLanguagePreference(next: LanguagePreference) {
  const validated = parsePreference(next)
  let saved = true
  try {
    if (validated === 'auto') window.localStorage.removeItem(languageStorageKey)
    else window.localStorage.setItem(languageStorageKey, validated)
  } catch {
    // Private/blocked storage still permits changing language for this session.
    saved = false
  }
  dropLanguageFromAddress()
  tab.choose(validated)
  return saved
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function useLanguagePreference() {
  return useSyncExternalStore(subscribe, () => tab.preference)
}

/** Install once at the app boundary; return cleanup for StrictMode/HMR. */
export function listenForLanguageChanges() {
  const browserChanged = () => tab.browserChanged()
  const storageChanged = (event: StorageEvent) => tab.storageChanged(event)
  window.addEventListener('languagechange', browserChanged)
  window.addEventListener('storage', storageChanged)
  return () => {
    window.removeEventListener('languagechange', browserChanged)
    window.removeEventListener('storage', storageChanged)
  }
}
