import assert from 'node:assert/strict'
import test from 'node:test'
import type { Vec3 } from '../src/lib/pv/plane.ts'
import {
  OBSTACLES, SITE_PANELS, litFractions, rayHitsPrism, rayHitsTriangle, segmentHitsRing, type Prism, type SitePanel,
} from '../src/lib/pv/shading.ts'

const sunTo = (altitudeDegrees: number, azimuth: 'north' | 'east' = 'north'): Vec3 => {
  const a = altitudeDegrees * Math.PI / 180
  return azimuth === 'north' ? [0, Math.sin(a), -Math.cos(a)] : [Math.cos(a), Math.sin(a), 0]
}
const prism = (x0: number, x1: number, z0: number, z1: number, base: number, top: number): Prism => ({
  ring: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], base, top, min: [x0, z0], max: [x1, z1],
})
/** A horizontal panel at height y facing up, with a grid of samples. */
function flatPanel(id: string, x0: number, x1: number, z0: number, z1: number, y: number, n = 6): SitePanel {
  const corners: SitePanel['corners'] = [[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]]
  const samples: Vec3[] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) samples.push([x0 + (x1 - x0) * (i + .5) / n, y + 1e-3, z0 + (z1 - z0) * (j + .5) / n])
  return { id, corners, normal: [0, 1, 0], samples, triangles: [[corners[0], corners[1], corners[2]], [corners[0], corners[2], corners[3]]] }
}

test('a wall shades a point only while the sun is lower than the wall’s top seen from it', () => {
  // A wall 3 m high, its near face 5 m north of the point, which is 1 m up: it blocks below tan(a) = 2 / 5.
  const wall = prism(-5, 5, -6, -5, 0, 3)
  const point: Vec3 = [0, 1, 0]
  assert.equal(rayHitsPrism(point, sunTo(15), wall), true)
  assert.equal(rayHitsPrism(point, sunTo(21), wall), true)
  assert.equal(rayHitsPrism(point, sunTo(23), wall), false)
  assert.equal(rayHitsPrism(point, sunTo(40), wall), false)
})

test('a wall behind the point, or beside the sun’s line, never shades it', () => {
  const point: Vec3 = [0, 1, 0]
  assert.equal(rayHitsPrism(point, sunTo(10), prism(-5, 5, 5, 6, 0, 30)), false, 'behind')
  assert.equal(rayHitsPrism(point, sunTo(10), prism(20, 30, -8, -5, 0, 30)), false, 'to the side')
  assert.equal(rayHitsPrism(point, sunTo(10), prism(-5, 5, -6, -5, 0, .5)), false, 'lower than the point')
})

test('a prism that starts above the ray’s path does not shade it', () => {
  const floating = prism(-5, 5, -6, -5, 8, 10)
  assert.equal(rayHitsPrism([0, 1, 0], sunTo(10), floating), false)
  // From 1 m up, reaching 8 m within 2 to 3 m needs the sun above atan(7 / 3) = 66.8 degrees.
  assert.equal(rayHitsPrism([0, 1, 0], sunTo(60), prism(-1, 1, -3, -2, 8, 10)), false, 'too low to reach it')
  assert.equal(rayHitsPrism([0, 1, 0], sunTo(75), prism(-1, 1, -3, -2, 8, 10)), true, 'steep enough to reach it')
})

test('a ray that starts inside a prism is blocked, and a ray going down never is', () => {
  assert.equal(rayHitsPrism([0, 1, -5.5], sunTo(50), prism(-5, 5, -6, -5, 0, 3)), true)
  assert.equal(rayHitsPrism([0, 1, 0], [0, -.5, -.87], prism(-5, 5, -6, -5, 0, 3)), false)
})

test('ring tests handle concave shapes', () => {
  const ell: [number, number][] = [[0, 0], [4, 0], [4, 1], [1, 1], [1, 4], [0, 4]]
  assert.equal(segmentHitsRing(2, 2, 3, 3, ell), false, 'in the notch of the L')
  assert.equal(segmentHitsRing(-1, .5, 5, .5, ell), true, 'through the long arm')
  assert.equal(segmentHitsRing(.5, 5, .5, 8, ell), false, 'clear of the top')
  assert.equal(segmentHitsRing(2, 2, .5, 3, ell), true, 'ends inside the short arm')
})

test('a ray meets a triangle in front of its origin only', () => {
  const triangle: [Vec3, Vec3, Vec3] = [[-1, 5, -1], [1, 5, -1], [0, 5, 1]]
  assert.equal(rayHitsTriangle([0, 0, 0], [0, 1, 0], triangle), true)
  assert.equal(rayHitsTriangle([0, 0, 0], [0, -1, 0], triangle), false, 'behind the origin')
  assert.equal(rayHitsTriangle([3, 0, 0], [0, 1, 0], triangle), false, 'beside it')
  assert.equal(rayHitsTriangle([0, 6, 0], [0, 1, 0], triangle), false, 'origin above it')
})

test('lit fractions: open sky, a full shadow, a partial shadow and a panel turned away', () => {
  const panel = flatPanel('p', -1, 1, -1, 1, 1)
  assert.equal(litFractions(sunTo(40), { panels: [panel], obstacles: [] }).p, 1)
  assert.equal(litFractions(sunTo(-5), { panels: [panel], obstacles: [] }).p, 0, 'sun below the horizon')
  assert.equal(litFractions([0, -1, 0], { panels: [panel], obstacles: [] }).p, 0, 'panel turned away from the sun')
  assert.equal(litFractions(sunTo(20), { panels: [panel], obstacles: [prism(-5, 5, -9, -4, 0, 20)] }).p, 0, 'a tall wall blocks it all')
  // A wall 3 m high starting 2.2 m north of the panel: at 30 degrees its shadow covers part of the panel.
  const partial = litFractions(sunTo(30), { panels: [panel], obstacles: [prism(-5, 5, -3.2, -2.2, 0, 2.6)] }).p
  assert.ok(partial > 0 && partial < 1, `partial ${partial}`)
})

test('a higher panel shades a lower one when the sun is low behind it, and not when the sun is high', () => {
  // Two flat panels: a low one to the north and a panel 1 m higher to the south of it.
  const low = flatPanel('low', -1, 1, -6, -4, 1.5), high = flatPanel('high', -1, 1, -1, 1, 2.5)
  const fromSouth = (altitude: number): Vec3 => [0, Math.sin(altitude * Math.PI / 180), Math.cos(altitude * Math.PI / 180)]
  // The sun is south at 15 degrees: a ray from the low panel crosses 2.5 m within the higher one (dz between 3 and 5 m).
  const shaded = litFractions(fromSouth(15), { panels: [low, high], obstacles: [] })
  assert.ok(shaded.low < 1, `the low panel is shaded: ${shaded.low}`)
  assert.equal(shaded.high, 1, 'nothing stands in front of the high one')
  // From the north the same pair does not shade at all.
  const north = litFractions(sunTo(15), { panels: [low, high], obstacles: [] })
  assert.equal(north.low, 1)
  assert.equal(north.high, 1)
  // With the sun high the shadow falls past the low panel.
  assert.equal(litFractions(fromSouth(60), { panels: [low, high], obstacles: [] }).low, 1)
})

test('on the real array the water tank does not shade the panels at noon, and the whole array is lit', () => {
  // Winter noon: the sun is north at about 32 degrees.
  const noon = litFractions(sunTo(32))
  for (const panel of SITE_PANELS) assert.equal(noon[panel.id], 1, `${panel.id} lit at winter noon`)
  assert.equal(SITE_PANELS.length, 16)
})

test('only prisms that rise above the panels are kept as obstacles', () => {
  assert.ok(OBSTACLES.length > 0)
  const lowest = Math.min(...SITE_PANELS.map(panel => Math.min(...panel.corners.map(corner => corner[1]))))
  for (const obstacle of OBSTACLES) assert.ok(obstacle.top > lowest)
})
