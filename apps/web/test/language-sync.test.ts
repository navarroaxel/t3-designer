import assert from 'node:assert/strict'
import test from 'node:test'
import { createLanguageTab, type StorageChange } from '../src/i18n/language-sync.ts'
import { languageStorageKey, type LanguagePreference } from '../src/i18n/locale.ts'

/** A tab of the app: its local storage (one object, as in a browser) and what its language did. */
function tabWith(initial: LanguagePreference, fromLink: boolean) {
  const storage = {}
  const applied: LanguagePreference[] = []
  const tab = createLanguageTab({ initial, fromLink, storage: () => storage, apply: next => applied.push(next) })
  /** Another tab saves (or, with null, clears) the language: this tab hears a storage event. */
  const otherTabSaves = (value: string | null, overrides: Partial<StorageChange> = {}) => tab.storageChanged({ key: languageStorageKey, storageArea: storage, newValue: value, ...overrides })
  return { tab, applied, otherTabSaves, storage }
}

test('a tab opened at /?lang=es keeps Spanish when another tab chooses English, until a language is chosen in it', () => {
  const { tab, applied, otherTabSaves } = tabWith('es', true)
  // The sequence: the link holds Spanish; another tab saves English; this tab does not follow, so that its address and its language agree and a reload shows the same.
  assert.equal(tab.linkOverride, true)
  otherTabSaves('en')
  assert.equal(tab.preference, 'es'); assert.deepEqual(applied, [], 'the language was not touched')
  otherTabSaves(null); otherTabSaves('auto', { key: null })
  assert.equal(tab.preference, 'es'); assert.deepEqual(applied, [], 'nor by the other tab clearing its choice')
  // A language chosen in this tab takes over from the link, and from then on it follows the other tabs.
  tab.choose('en')
  assert.equal(tab.linkOverride, false); assert.equal(tab.preference, 'en'); assert.deepEqual(applied, ['en'])
  otherTabSaves('es')
  assert.equal(tab.preference, 'es'); assert.deepEqual(applied, ['en', 'es'])
})

test('choosing the browser\'s language in a tab that came with a link also ends the override', () => {
  const { tab, applied, otherTabSaves } = tabWith('es', true)
  tab.choose('auto')
  assert.equal(tab.linkOverride, false); assert.deepEqual(applied, ['auto'])
  otherTabSaves('en')
  assert.equal(tab.preference, 'en')
})

test('a tab without a link follows the other tabs, ignores what is not its language key or its storage, and clears with them', () => {
  const { tab, applied, otherTabSaves, storage } = tabWith('auto', false)
  assert.equal(tab.linkOverride, false)
  otherTabSaves('es'); assert.equal(tab.preference, 'es')
  otherTabSaves('en'); assert.equal(tab.preference, 'en')
  otherTabSaves('fr'); assert.equal(tab.preference, 'auto', 'a value that is no language is automatic')
  otherTabSaves('es'); otherTabSaves(null); assert.equal(tab.preference, 'auto', 'the other tab cleared its choice')
  const before = applied.length
  otherTabSaves('en', { key: 'another-key' }); otherTabSaves('en', { storageArea: {} })
  assert.equal(applied.length, before, 'another key, or another storage, is not ours')
  // The whole storage cleared sends no key: from this tab's storage it clears the choice, from another it is ignored.
  otherTabSaves('en'); tab.storageChanged({ key: null, storageArea: {}, newValue: null })
  assert.equal(tab.preference, 'en', 'a clear of another storage is ignored')
  tab.storageChanged({ key: null, storageArea: storage, newValue: null })
  assert.equal(tab.preference, 'auto', 'a clear of this storage is the automatic mode')
})

test('the browser\'s languages changing moves only the automatic mode, with a link or not', () => {
  const auto = tabWith('auto', false)
  auto.tab.browserChanged(); assert.deepEqual(auto.applied, ['auto'])
  const chosen = tabWith('en', false)
  chosen.tab.browserChanged(); assert.deepEqual(chosen.applied, [], 'a choice is not moved by the browser')
  const linked = tabWith('es', true)
  linked.tab.browserChanged(); assert.deepEqual(linked.applied, [], 'nor a link\'s language')
})

test('a storage that throws where it is blocked does not break the tab', () => {
  const applied: LanguagePreference[] = []
  const tab = createLanguageTab({ initial: 'auto', fromLink: false, storage: () => { throw new Error('blocked') }, apply: next => applied.push(next) })
  tab.storageChanged({ key: languageStorageKey, storageArea: {}, newValue: 'es' })
  assert.deepEqual(applied, [])
  tab.choose('es'); assert.deepEqual(applied, ['es'], 'a choice in this tab still applies')
})
