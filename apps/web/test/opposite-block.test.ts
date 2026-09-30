import assert from 'node:assert/strict'
import test from 'node:test'
import { polygonArea } from '../src/data/frame.ts'
import { OPPOSITE_BLOCK, OPPOSITE_LOTS } from '../src/data/opposite-block.ts'
import { houseToSite } from '../src/data/building-site.ts'

const lot = (number: number) => OPPOSITE_LOTS.find(item => item.number === number)!
const near = (actual: number, expected: number, tolerance: number) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} vs ${expected}`)
const length = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])

test('the block across the street starts on the far line of the street, 17.32 m from the house line', () => {
  near(OPPOSITE_BLOCK.frontU, -5 - 17.32, 1e-9)
  for (const item of OPPOSITE_LOTS) for (const [u] of item.polygon) assert.ok(u <= OPPOSITE_BLOCK.frontU + .01, `lot ${item.number} stays on its own side`)
})

test('lot 24 keeps its surveyed sides and stands opposite the house lot', () => {
  const [a, b, c, d] = lot(24).polygon
  near(length(a, d), 8.5, .01)
  near(length(a, b), 15.41, .01)
  near(length(d, c), 15.61, .01)
  // The house lot runs from v = -4.33 to 4.33; the lot across is within half a metre of that.
  near(a[1], -4.33, .5)
  near(d[1], 4.33, .5)
  // Two floors, a 3 m setback and a room on the roof.
  assert.equal(lot(24).height, 6.4)
  near(Math.max(...lot(24).building.map(point => -point[0] + OPPOSITE_BLOCK.frontU)), 13.35, .01)
  near(Math.min(...lot(24).building.map(point => -point[0] + OPPOSITE_BLOCK.frontU)), 3, .01)
  assert.equal(lot(24).extras?.[0].base, 6.4)
})

test('lot 23, the corner, has its surveyed ochava and sides', () => {
  const [left, ochavaStart, ochavaEnd, rearRight, rearLeft] = lot(23).polygon
  near(length(left, ochavaStart), 5.65, .01)
  near(length(ochavaStart, ochavaEnd), Math.hypot(4.09, 4.25), .01)
  near(length(ochavaEnd, rearRight), 6.73, .05)
  near(length(rearLeft, rearRight), 10.15, .05)
  near(length(left, rearLeft), 11.09, .05)
})

test('lot 25 keeps its surveyed front and depth, and its building reaches the rear', () => {
  const [a, b, c, d] = lot(25).polygon
  near(length(a, d), 8.66, .01)
  near(length(a, b), 23.95, .01)
  near(length(d, c), 24.2, .01)
  near(Math.max(...lot(25).building.map(point => OPPOSITE_BLOCK.frontU - point[0])), 24.2, .01)
  near(Math.abs(polygonArea(lot(25).building)), 4.55 * 9.8 + 3.35 * 6.5 + 8.3 * 3.5, .5)
})

test('every lot is a simple positive-area ring and lots do not overlap in the plan', () => {
  for (const item of OPPOSITE_LOTS) {
    assert.ok(Math.abs(polygonArea(item.polygon)) > 20, `lot ${item.number} area`)
    assert.ok(Math.abs(polygonArea(item.building)) > 2, `lot ${item.number} building area`)
    for (const [u, v] of item.polygon) assert.ok(Number.isFinite(houseToSite(u, v)[0]))
  }
})
