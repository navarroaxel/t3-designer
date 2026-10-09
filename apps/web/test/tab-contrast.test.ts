import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8')
// The tokens of a block: the first `:root { ... }` is the light theme, and the `:root[data-theme='dark'] { ... }` is the dark.
const block = (start: RegExp) => { const at = css.search(start); return css.slice(at, css.indexOf('\n  }', at) >= 0 && /dark/.test(String(start)) ? css.indexOf('\n  }', at) : css.indexOf('\n}', at)) }
const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})/gi)].map(match => [match[1], match[2]]))
const light = tokens(block(/^:root \{/m)), dark = tokens(block(/:root\[data-theme='dark'\] \{/))

const channel = (value: number) => { const c = value / 255; return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4 }
const luminance = (hex: string) => { const n = parseInt(hex.slice(1), 16); return .2126 * channel(n >> 16) + .7152 * channel((n >> 8) & 255) + .0722 * channel(n & 255) }
const contrast = (a: string, b: string) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + .05) / (lo + .05) }

test('the workspace tabs read well in both themes: every text is at least 4.5:1 over what it sits on', () => {
  for (const [name, theme] of [['light', light], ['dark', dark]] as const) {
    assert.ok(theme['tab-bar'] && theme['tab-text'] && theme['tab-on'] && theme['tab-on-text'] && theme['tab-tag'] && theme['tab-hover'], `${name} has the tab tokens`)
    assert.ok(contrast(theme['tab-text'], theme['tab-bar']) >= 4.5, `${name}: an idle tab's text over the bar (${contrast(theme['tab-text'], theme['tab-bar']).toFixed(2)})`)
    assert.ok(contrast(theme['tab-text'], theme['tab-hover']) >= 4.5, `${name}: an idle tab's text over its hover (${contrast(theme['tab-text'], theme['tab-hover']).toFixed(2)})`)
    assert.ok(contrast(theme['tab-on-text'], theme['tab-on']) >= 4.5, `${name}: the tab that is on (${contrast(theme['tab-on-text'], theme['tab-on']).toFixed(2)})`)
    assert.ok(contrast(theme['tab-tag'], theme['tab-bar']) >= 4.5 || contrast(theme['tab-tag'], theme['tab-on']) >= 4.5, `${name}: the small tag`)
  }
})

test('the tab that is on stands apart from the bar in both themes, so that which one is chosen can be seen', () => {
  for (const theme of [light, dark]) assert.ok(contrast(theme['tab-on'], theme['tab-bar']) >= 1.08, 'the chosen tab\'s fill differs from the bar\'s')
})
