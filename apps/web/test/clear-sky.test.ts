import assert from 'node:assert/strict'
import test from 'node:test'
import { CLIMATE } from '../src/data/climate.ts'
import { extraterrestrialNormal, ineichenClearSky, relativeAirmass } from '../src/lib/pv/clear-sky.ts'
import { clearSkyDailyGhi, middleOfMonth } from '../src/lib/pv/model.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const sky = (zenithDegrees: number, tl = 3, dayOfYear = 172) => ineichenClearSky({ zenithDegrees, dayOfYear, altitudeM: 25, linkeTurbidity: tl })

test('the Earth is closest to the sun in early January and farthest in early July', () => {
  const january = extraterrestrialNormal(3), july = extraterrestrialNormal(185)
  assert.ok(january > 1400 && january < 1420, `January ${january}`)
  assert.ok(july > 1310 && july < 1325, `July ${july}`)
  closeTo(january / july, 1.0688, .006) // about 6.9 % between the extremes
})

test('relative air mass is 1 at the zenith and grows toward the horizon', () => {
  closeTo(relativeAirmass(0), 1, .001)
  closeTo(relativeAirmass(60), 1.99, .01)
  closeTo(relativeAirmass(85), 10.3, .3)
  assert.equal(relativeAirmass(90), Infinity)
  let previous = 0
  for (let zenith = 0; zenith < 89; zenith += 5) { const value = relativeAirmass(zenith); assert.ok(value > previous); previous = value }
})

test('clear-sky irradiance is physically consistent', () => {
  const overhead = sky(0)
  assert.ok(overhead.ghi > 950 && overhead.ghi < 1150, `overhead global ${overhead.ghi}`)
  assert.ok(overhead.dni > 800 && overhead.dni < 1100, `overhead direct ${overhead.dni}`)
  for (const zenith of [0, 20, 40, 60, 75, 85]) {
    const { ghi, dni, dhi } = sky(zenith)
    assert.ok(ghi >= 0 && dni >= 0 && dhi >= 0)
    // Global is the direct beam on the horizontal plane plus the diffuse light.
    closeTo(ghi, dni * Math.cos(zenith * Math.PI / 180) + dhi, 1e-6)
    assert.ok(dhi < ghi, 'diffuse is a part of the global')
  }
  // The lower the sun, the less light; a hazier sky lets less through.
  const globals = [0, 20, 40, 60, 80].map(zenith => sky(zenith).ghi)
  assert.deepEqual([...globals].sort((a, b) => b - a), globals)
  assert.ok(sky(30, 5).ghi < sky(30, 2).ghi)
  assert.ok(sky(30, 5).dni < sky(30, 2).dni)
})

test('there is no light with the sun at or below the horizon', () => {
  for (const zenith of [90, 95, 120]) assert.deepEqual(sky(zenith), { ghi: 0, dni: 0, dhi: 0 })
})

test('the clear-sky daily energy matches NASA’s clear-sky climatology in every month', () => {
  // Linke turbidity 3.0 was chosen so that this holds: within 5 % each month, and much closer over the year.
  let modelYear = 0, nasaYear = 0
  for (let month = 0; month < 12; month++) {
    const model = clearSkyDailyGhi(middleOfMonth(month)), nasa = CLIMATE.clearSkyGhi[month]
    assert.ok(Math.abs(model / nasa - 1) < .05, `month ${month + 1}: model ${model.toFixed(2)} against NASA ${nasa}`)
    modelYear += model; nasaYear += nasa
  }
  assert.ok(Math.abs(modelYear / nasaYear - 1) < .02, 'annual clear-sky energy within 2 %')
})
