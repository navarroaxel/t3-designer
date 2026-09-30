import type { HtmlTagDescriptor } from 'vite'

/** Path of the social preview image inside `public/`. */
export const OG_IMAGE_PATH = '/og-image.png'
export const DEFAULT_ROBOTS = 'index, follow'

const ROBOTS_DIRECTIVES = /^(?:index|noindex|follow|nofollow|noarchive|nosnippet)(?:\s*,\s*(?:index|noindex|follow|nofollow|noarchive|nosnippet))*$/i

/**
 * The origin of the public site, or null when it is unknown or unsafe. Accepts a
 * bare host such as Vercel's `VERCEL_PROJECT_PRODUCTION_URL`. Only https is
 * allowed, plus http for localhost; paths, credentials and queries are dropped.
 */
export function normalizeSiteUrl(value: string | undefined): string | null {
  const text = value?.trim()
  if (!text) return null
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.username || url.password) return null
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return null
    return url.origin
  } catch {
    return null
  }
}

/** A robots directive list such as `noindex, nofollow`, or the default when the value is not one. */
export function robotsValue(value: string | undefined): string {
  const text = value?.trim()
  return text && ROBOTS_DIRECTIVES.test(text) ? text.toLowerCase().replace(/\s*,\s*/g, ', ') : DEFAULT_ROBOTS
}

/**
 * Tags that depend on the deployment. The absolute preview image only exists once
 * the public URL is known. There is deliberately no canonical URL or `og:url`: the
 * page is one HTML file served for every path, so a fixed one would mislabel
 * other routes.
 */
export function siteMetaTags(env: { siteUrl?: string; robots?: string }): HtmlTagDescriptor[] {
  const tags: HtmlTagDescriptor[] = [
    { tag: 'meta', attrs: { name: 'robots', content: robotsValue(env.robots) }, injectTo: 'head' },
  ]
  const origin = normalizeSiteUrl(env.siteUrl)
  if (origin) {
    const image = `${origin}${OG_IMAGE_PATH}`
    tags.push(
      { tag: 'meta', attrs: { property: 'og:image', content: image }, injectTo: 'head' },
      { tag: 'meta', attrs: { name: 'twitter:image', content: image }, injectTo: 'head' },
    )
  }
  return tags
}
