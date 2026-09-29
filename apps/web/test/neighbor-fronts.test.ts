import assert from 'node:assert/strict'
import test from 'node:test'
import { LOTS } from '../src/data/block.ts'
import { SITE_BUILDINGS, siteToHouse } from '../src/data/building-site.ts'
import { REAR_LOT_FRONT, REAR_LOT_WALL_COLOR } from '../src/data/neighbor-fronts.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)

test('the front of the lot behind stands at the lot’s end on the cross street, 7.80 m wide', () => {
  const lot = LOTS.find(item => item.number === 10)!
  closeTo(REAR_LOT_FRONT.v, Math.min(...lot.polygon.map(point => point[1])), 1e-9)
  closeTo(REAR_LOT_FRONT.span[1] - REAR_LOT_FRONT.span[0], 7.8, 1e-9)
  const building = SITE_BUILDINGS.find(item => item.id === 'NEIGHBOR-B')!
  const at = building.footprint.map(point => siteToHouse(point as [number, number])).filter(([, v]) => Math.abs(v - REAR_LOT_FRONT.v) < 1e-6)
  assert.equal(at.length, 2, 'two corners of the building on that wall')
  closeTo(Math.min(...at.map(([u]) => u)), REAR_LOT_FRONT.span[0], 1e-6)
  closeTo(Math.max(...at.map(([u]) => u)), REAR_LOT_FRONT.span[1], 1e-6)
  closeTo(building.height, REAR_LOT_FRONT.height, 1e-9)
})

test('the doors and trim sit on the wall, below its parapet, and do not overlap', () => {
  const [low, high] = REAR_LOT_FRONT.span
  for (const part of REAR_LOT_FRONT.parts) {
    assert.ok(part.u[0] >= low - 1e-9 && part.u[1] <= high + 1e-9, 'within the wall')
    assert.ok(part.y[0] >= 0 && part.y[1] <= REAR_LOT_FRONT.height + 1e-9, 'below the parapet')
    assert.ok(part.u[1] > part.u[0] && part.y[1] > part.y[0] && part.depth > 0)
  }
  const [garage, side] = REAR_LOT_FRONT.parts
  assert.ok(garage.u[1] < side.u[0], 'a pier between the garage door and the side door')
  closeTo(garage.u[1] - garage.u[0], 2.5, .01)
  closeTo(garage.y[1], 2.1, .01)
})

test('the wall is painted light yellow', () => {
  assert.match(REAR_LOT_WALL_COLOR, /^#[0-9a-f]{6}$/)
  const [r, g, b] = [1, 3, 5].map(index => parseInt(REAR_LOT_WALL_COLOR.slice(index, index + 2), 16))
  assert.ok(r > 200 && g > 190 && b < r - 40 && b < g - 30, `yellow and light: ${REAR_LOT_WALL_COLOR}`)
})
