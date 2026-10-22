import { languageStorageKey, parsePreference, type LanguagePreference } from './locale.ts'

/** What a `storage` event carries, as far as the language needs it. */
export type StorageChange = { key: string | null; storageArea: unknown; newValue: string | null }

export type LanguageTab = {
  readonly preference: LanguagePreference
  /** Whether this tab still shows the language its link asked for with `?lang=`, and no language has been chosen in it since. */
  readonly linkOverride: boolean
  /** A language chosen in this tab (Settings): it takes over from the link's, and from then on the tab follows the other tabs again. */
  choose(next: LanguagePreference): void
  /** Another tab saved (or cleared) the language. A tab that still shows its link's language ignores it: otherwise it would switch while its address kept saying otherwise, and a reload would switch it back. */
  storageChanged(event: StorageChange): void
  /** The browser's languages changed: only the automatic mode follows them. */
  browserChanged(): void
}

/**
 * The state of the page's language: its preference, and whether a link's `?lang=` still holds it. `apply` does what a change of preference means (the interface's language, the listeners), `storage` is the
 * page's local storage, which can throw where it is blocked. Kept free of the browser so that the sequences, a link in one tab and a choice in another, can be tested.
 */
export function createLanguageTab({ initial, fromLink, storage, apply }: { initial: LanguagePreference; fromLink: boolean; storage: () => unknown; apply: (next: LanguagePreference) => void }): LanguageTab {
  let preference = initial
  let override = fromLink
  const change = (next: LanguagePreference) => { preference = next; apply(next) }
  return {
    get preference() { return preference },
    get linkOverride() { return override },
    choose(next) { override = false; change(next) },
    storageChanged(event) {
      if (override) return
      if (event.key !== null && event.key !== languageStorageKey) return
      try {
        if (event.storageArea !== storage()) return
      } catch {
        return
      }
      change(parsePreference(event.newValue))
    },
    browserChanged() { if (preference === 'auto') change('auto') },
  }
}
