import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { DEFAULT_ROBOTS, OG_IMAGE_PATH, normalizeSiteUrl, robotsValue, siteMetaTags } from '../site-meta.ts'

const root = fileURLToPath(new URL('../', import.meta.url))
const html = readFileSync(`${root}index.html`, 'utf8')
const attrs = (tag: { attrs?: Record<string, string | boolean | undefined> }) => tag.attrs ?? {}

test('site URLs are normalised to a safe origin', () => {
  assert.equal(normalizeSiteUrl('tapalque-solar.vercel.app'), 'https://tapalque-solar.vercel.app')
  assert.equal(normalizeSiteUrl('https://example.test/some/path?x=1#y'), 'https://example.test')
  assert.equal(normalizeSiteUrl(' http://localhost:5173/ '), 'http://localhost:5173')
  for (const unsafe of [undefined, '', '   ', 'http://example.test', 'ftp://example.test', 'https://user:pass@example.test', 'javascript:alert(1)', 'https://']) {
    assert.equal(normalizeSiteUrl(unsafe), null, String(unsafe))
  }
})

test('robots values are limited to known directives', () => {
  assert.equal(robotsValue(undefined), DEFAULT_ROBOTS)
  assert.equal(robotsValue('noindex,nofollow'), 'noindex, nofollow')
  assert.equal(robotsValue('  NoIndex ,  NoFollow '), 'noindex, nofollow')
  for (const invalid of ['', 'all', 'index; drop', '<script>', 'noindex follow']) assert.equal(robotsValue(invalid), DEFAULT_ROBOTS, invalid)
})

test('deployment tags: robots always, the absolute preview image only with a known URL', () => {
  const local = siteMetaTags({})
  assert.deepEqual(local.map(tag => attrs(tag).name), ['robots'])
  assert.equal(attrs(local[0]).content, DEFAULT_ROBOTS)

  const deployed = siteMetaTags({ siteUrl: 'my-site.vercel.app', robots: 'noindex, nofollow' })
  const byKey = Object.fromEntries(deployed.map(tag => [attrs(tag).property ?? attrs(tag).name, attrs(tag).content]))
  assert.equal(byKey.robots, 'noindex, nofollow')
  assert.equal(byKey['og:image'], `https://my-site.vercel.app${OG_IMAGE_PATH}`)
  assert.equal(byKey['twitter:image'], byKey['og:image'])
  // The page is one HTML file for every path, so no fixed canonical or og:url.
  assert.equal(deployed.some(tag => tag.tag === 'link' || attrs(tag).property === 'og:url'), false)
  assert.equal(siteMetaTags({ siteUrl: 'http://not-secure.test' }).length, 1)
})

test('index.html carries the title, description, sharing and icon tags', () => {
  const content = (selector: RegExp) => html.match(selector)?.[1]
  const title = content(/<title>([^<]+)<\/title>/)
  const description = content(/<meta name="description" content="([^"]+)"/)
  assert.ok(title && title.length <= 60, `title within 60 characters: ${title}`)
  assert.ok(description && description.length >= 70 && description.length <= 160, `description length: ${description?.length}`)
  assert.match(html, /<html lang="en">/)
  for (const required of [
    /<meta property="og:type" content="website"/, /<meta property="og:site_name" content="T3 Designer"/,
    /<meta property="og:title"/, /<meta property="og:description"/, /<meta property="og:locale" content="es_AR"/,
    /<meta property="og:image:width" content="1200"/, /<meta property="og:image:height" content="630"/, /<meta property="og:image:alt"/,
    /<meta name="twitter:card" content="summary_large_image"/, /<meta name="twitter:title"/, /<meta name="twitter:description"/,
    /<meta name="theme-color" content="#f9faf6" media="\(prefers-color-scheme: light\)"/,
    /<meta name="theme-color" content="#171e19" media="\(prefers-color-scheme: dark\)"/,
    /<meta name="color-scheme" content="light dark"/, /<link rel="icon" href="\/favicon\.svg"/,
  ]) assert.match(html, required)
  // The og and twitter descriptions repeat the page description.
  assert.equal(html.split(`content="${description}"`).length - 1, 3)
})

test('the structured data is valid JSON describing the app', () => {
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
  assert.ok(json, 'JSON-LD present')
  const data = JSON.parse(json)
  assert.equal(data['@type'], 'WebApplication')
  assert.deepEqual(data.inLanguage, ['es', 'en'])
  assert.equal(data.isAccessibleForFree, true)
})

test('the icon, preview image and robots.txt exist, and nothing identifies the house', () => {
  for (const file of ['public/favicon.svg', 'public/robots.txt']) assert.ok(existsSync(`${root}${file}`), file)
  assert.match(readFileSync(`${root}public/robots.txt`, 'utf8'), /^User-agent: \*\nAllow: \/\n$/)
  const png = readFileSync(`${root}public${OG_IMAGE_PATH}`)
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1200, 'preview image width')
  assert.equal(png.readUInt32BE(20), 630, 'preview image height')
  assert.ok(png.length < 600_000, `preview image under 600 kB: ${png.length}`)
  // The page metadata names the city only, never the street.
  assert.doesNotMatch(html, /Tapalque/i)
})
