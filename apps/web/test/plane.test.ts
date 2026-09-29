import assert from 'node:assert/strict'
import test from 'node:test'
import { incidenceModifier, planeIrradiance, type Vec3 } from '../src/lib/pv/plane.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const unit = (v: Vec3): Vec3 => { const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n] }
const sky = { ghi: 800, dni: 700, dhi: 150 }

test('the glass loses nothing at normal incidence and more at grazing angles', () => {
  closeTo(incidenceModifier(1, .05), 1, 1e-12)
  closeTo(incidenceModifier(.5, .05), 1 - .05 * (2 - 1), 1e-12) // 60 degrees: 5 % loss
  assert.equal(incidenceModifier(0, .05), 0)
  assert.equal(incidenceModifier(-.5, .05), 0)
  assert.ok(incidenceModifier(.2, .05) < incidenceModifier(.8, .05))
})

test('a flat plane receives the global horizontal irradiance', () => {
  const sunAt = (altitude: number): Vec3 => [0, Math.sin(altitude * Math.PI / 180), -Math.cos(altitude * Math.PI / 180)]
  for (const altitude of [15, 40, 70]) {
    const parts = planeIrradiance({ sun: sunAt(altitude), normal: [0, 1, 0], sky, albedo: .3, iamB0: 0 })
    // With no glass loss, beam times cosine plus diffuse is the global irradiance by definition.
    const cosZenith = Math.sin(altitude * Math.PI / 180)
    closeTo(parts.beam + parts.diffuse, sky.dni * cosZenith + sky.dhi, 1e-9)
    assert.equal(parts.ground, 0, 'no ground light on a flat plane')
  }
})

test('a plane facing the sun receives the whole beam', () => {
  const sun = unit([.3, .8, -.5])
  const parts = planeIrradiance({ sun, normal: sun, sky, albedo: .3, iamB0: .05 })
  closeTo(parts.cosIncidence, 1, 1e-12)
  closeTo(parts.beam, sky.dni, 1e-9)
})

test('a plane turned away from the sun gets no beam, but still sky light', () => {
  const parts = planeIrradiance({ sun: [0, .5, -.866], normal: unit([0, .5, .866]), sky, albedo: .3, iamB0: .05 })
  assert.equal(parts.beam, 0)
  assert.ok(parts.diffuse > 0)
})

test('a tilted plane sees less sky and some ground', () => {
  const sun: Vec3 = [0, 1, 0]
  const vertical = planeIrradiance({ sun, normal: [0, 0, -1], sky, albedo: .5, iamB0: 0 })
  closeTo(vertical.diffuse, sky.dhi / 2, 1e-9)
  closeTo(vertical.ground, sky.ghi * .5 / 2, 1e-9)
  const tilted = planeIrradiance({ sun, normal: unit([0, Math.cos(.1), -Math.sin(.1)]), sky, albedo: .5, iamB0: 0 })
  assert.ok(tilted.diffuse < sky.dhi && tilted.diffuse > sky.dhi * .99)
})

test('the beam is scaled by the share of it that is lit', () => {
  const full = planeIrradiance({ sun: [0, 1, 0], normal: [0, 1, 0], sky, albedo: .3, iamB0: 0 })
  const half = planeIrradiance({ sun: [0, 1, 0], normal: [0, 1, 0], sky, albedo: .3, iamB0: 0, beamLit: .5 })
  closeTo(half.beam, full.beam / 2, 1e-9)
  assert.equal(half.diffuse, full.diffuse)
})
