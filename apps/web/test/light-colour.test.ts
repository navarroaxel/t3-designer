import assert from 'node:assert/strict'
import test from 'node:test'
import { clockLabel, DEFAULT_KITCHEN_KELVIN, KELVIN, KITCHEN_LIGHT_GROUPS, kelvinColour, kelvinRgb, lightGain, NIGHT_GAIN, TEST_TIMES } from '../src/data/light-colour.ts'

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

test('the light panel has the sun at hand: three times of day to test the lights at, and a clock label', () => {
  assert.equal(clockLabel(0), '00:00'); assert.equal(clockLabel(13 * 60), '13:00'); assert.equal(clockLabel(19 * 60 + 30), '19:30'); assert.equal(clockLabel(1425), '23:45')
  assert.ok(TEST_TIMES.day < TEST_TIMES.dusk && TEST_TIMES.dusk < TEST_TIMES.night, 'in order through the day')
  assert.ok(Object.values(TEST_TIMES).every(minutes => minutes % 15 === 0 && minutes >= 0 && minutes < 24 * 60), 'on the slider\'s quarter hours')
})

test('the lights are brighter in the dark: 1 by day, 4 times that at night, and a smooth run between as the sun sets', () => {
  assert.equal(lightGain(56), 1); assert.equal(lightGain(6), 1)
  assert.equal(lightGain(-6), NIGHT_GAIN); assert.equal(lightGain(-40), NIGHT_GAIN)
  assert.ok(lightGain(0) > 1 && lightGain(0) < NIGHT_GAIN, 'at the horizon, half way')
  assert.ok(Math.abs(lightGain(0) - (1 + NIGHT_GAIN) / 2) < 1e-9)
  let previous = Infinity
  for (let altitude = -10; altitude <= 10; altitude += 1) { const gain = lightGain(altitude); assert.ok(gain <= previous + 1e-12, `it never rises as the sun does (${altitude})`); previous = gain }
})
