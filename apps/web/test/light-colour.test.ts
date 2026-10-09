import assert from 'node:assert/strict'
import test from 'node:test'
import { DEFAULT_KITCHEN_KELVIN, KELVIN, KITCHEN_LIGHT_GROUPS, kelvinColour, kelvinRgb } from '../src/data/light-colour.ts'

test('a colour temperature is a black body\'s colour: orange when warm, white in the middle, bluish when cool, and a smooth run in between', () => {
  const [wr, wg, wb] = kelvinRgb(KELVIN.warm), [nr, ng, nb] = kelvinRgb(KELVIN.neutral), [cr, cg, cb] = kelvinRgb(KELVIN.cool), [xr, , xb] = kelvinRgb(KELVIN.max)
  assert.ok(wr === 255 && wr > wg && wg > wb && wb < 150, 'warm is orange: red full, blue low')
  assert.ok(nr === 255 && ng > 195 && nb > wb && nb < 200, 'neutral is a whiter white')
  assert.ok(cb === 255 && cr < 250 && cr > 215 && cg > 225, 'cool is bluish: the blue full and the red down')
  assert.ok(xb === 255 && xr < cr, 'at 8000 K it is bluer still')
  // Smooth: blue only rises with the temperature (up to full), red only falls once it passes 6600 K.
  let blue = -1
  for (let kelvin = KELVIN.min; kelvin <= KELVIN.max; kelvin += KELVIN.step) { const [, , b] = kelvinRgb(kelvin); assert.ok(b >= blue, `blue rises at ${kelvin} K`); blue = b }
  assert.match(kelvinColour(2700), /^#[0-9a-f]{6}$/)
  assert.equal(kelvinColour(2700), '#ffa757')
})

test('the panel edits three groups of the kitchen\'s lights, each starting warm; a value outside the range is held to it', () => {
  assert.deepEqual([...KITCHEN_LIGHT_GROUPS], ['pendants', 'line', 'conduit'])
  for (const group of KITCHEN_LIGHT_GROUPS) assert.ok(DEFAULT_KITCHEN_KELVIN[group] >= KELVIN.min && DEFAULT_KITCHEN_KELVIN[group] <= 3200, `${group} starts warm`)
  assert.deepEqual(kelvinRgb(100), kelvinRgb(KELVIN.min)); assert.deepEqual(kelvinRgb(20000), kelvinRgb(KELVIN.max))
})
