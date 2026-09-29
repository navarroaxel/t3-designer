import assert from 'node:assert/strict'
import test from 'node:test'
import { createInstance } from 'i18next'
import { resources } from '../src/i18n/resources.ts'

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value }
  assert.ok(value && typeof value === 'object', `Invalid resource at ${prefix}`)
  return Object.fromEntries(Object.entries(value).flatMap(([key, child]) => Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key))))
}

function placeholders(value: string) {
  return [...value.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort()
}

test('every locale has exactly the source keys and interpolation arguments', () => {
  const source = flatten(resources.es)
  for (const locale of ['en'] as const) {
    const translated = flatten(resources[locale])
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(source).sort(), `${locale} key parity`)
    for (const [key, value] of Object.entries(translated)) {
      assert.ok(value.trim(), `${locale}.${key} must not be empty`)
      assert.deepEqual(placeholders(value), placeholders(source[key]), `${locale}.${key} interpolation`)
    }
  }
})

test('all bundled messages resolve without fallback or leaking interpolation tokens', async () => {
  const instance = createInstance()
  await instance.init({ resources, fallbackLng: false, initAsync: false, interpolation: { escapeValue: false } })
  for (const locale of ['es', 'en'] as const) {
    for (const namespace of ['common', 'workspace'] as const) {
      const catalog = resources[locale][namespace]
      for (const [key, value] of Object.entries(flatten(catalog))) {
        const args = Object.fromEntries(placeholders(value).map(name => [name, name === 'count' ? 2 : 'sample']))
        assert.equal(instance.exists(key, { ns: namespace, lng: locale }), true, `${locale}:${namespace}:${key}`)
        // Iteration validates keys at runtime; production callers remain strictly typed.
        const rendered = instance.t(key as never, { ...args, ns: namespace, lng: locale }) as string
        assert.equal(rendered.includes('{{'), false, `${locale}:${namespace}:${key}`)
      }
    }
  }
})
