import assert from 'node:assert/strict'
import test from 'node:test'
import { BLOCK_DIMENSIONS, CORNER_NE, CORNER_SW, LOTS, STREET_WIDTHS, blockStreets, genericBuildings, type Lot } from '../src/data/block.ts'
import { polygonArea, type PlanPoint } from '../src/data/frame.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const lotOf = (number: number) => LOTS.find(item => item.number === number)!
const distance = (a: PlanPoint, b: PlanPoint) => Math.hypot(a[0] - b[0], a[1] - b[1])
const sides = (ring: PlanPoint[]) => ring.map((point, index) => distance(point, ring[(index + 1) % ring.length]))

function contains(point: PlanPoint, ring: PlanPoint[]) {
  let inside = false
  ring.forEach((b, index) => {
    const a = ring[(index + ring.length - 1) % ring.length]
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  })
  return inside
}
const bounds = (ring: PlanPoint[]) => ({ u: [Math.min(...ring.map(p => p[0])), Math.max(...ring.map(p => p[0]))], v: [Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[1]))] })
/** Area shared by two rings, on a grid, so touching neighbours do not count. */
function sharedArea(a: PlanPoint[], b: PlanPoint[], step = .25) {
  const [ba, bb] = [bounds(a), bounds(b)]
  const u0 = Math.max(ba.u[0], bb.u[0]), u1 = Math.min(ba.u[1], bb.u[1]), v0 = Math.max(ba.v[0], bb.v[0]), v1 = Math.min(ba.v[1], bb.v[1])
  if (u1 <= u0 || v1 <= v0) return 0
  let hits = 0
  for (let u = u0 + step / 2; u < u1; u += step) for (let v = v0 + step / 2; v < v1; v += step) if (contains([u, v], a) && contains([u, v], b)) hits++
  return hits * step * step
}

test('the block has its 24 lots, four of them from municipal surveys', () => {
  assert.deepEqual(LOTS.map(item => item.number).sort((a, b) => a - b), Array.from({ length: 24 }, (_, i) => i + 1))
  assert.deepEqual(LOTS.filter(item => item.source === 'survey').map(item => item.number).sort((a, b) => a - b), [7, 8, 9, 10])
})

test('the house lot has the surveyed 8.95 m front, 13.50 m and 13.70 m sides and 8.70 m rear', () => {
  // Order: front-right (south-west), rear-right, rear-left (north-east), front-left.
  const [right, rear, left, front] = sides(lotOf(8).polygon)
  closeTo(right, 13.7, .01)
  closeTo(rear, 8.7, .01)
  closeTo(left, 13.5, .01)
  closeTo(front, 8.95, .01)
})

test('lot 7 (north-east neighbour) has the surveyed 9.00 m front, 9.10 m rear, 13.30 m and 13.50 m sides', () => {
  const [right, rear, left, front] = sides(lotOf(7).polygon)
  closeTo(right, 13.5, .01)
  closeTo(rear, 9.1, .01)
  closeTo(left, 13.3, .01)
  closeTo(front, 9, .01)
})

test('the corner lot (9) has the surveyed 10.60 m rear, 13.70 m side, 10.70 m front and 5.95 m ochava', () => {
  const [straightFront, ochava, cornerSide, rear, houseSide] = sides(lotOf(9).polygon)
  closeTo(houseSide, 13.7, .01)
  closeTo(rear, 10.6, .02)
  closeTo(ochava, 5.95, .02)
  // The front reaches the corner where the street lines meet: the straight part plus the two legs of the ochava.
  const legs = ochava / Math.SQRT2
  closeTo(straightFront + legs, 10.7, .02)
  // The side on the cross street: 13.28 m to the corner, of which one leg of the ochava.
  closeTo(cornerSide + legs, 13.28, .05)
})

test('the lot behind (10) is 7.80 m wide and 28.40 m long', () => {
  const ring = lotOf(10).polygon
  const s = sides(ring)
  closeTo(s[3], 7.8, .01)
  closeTo(s[7], 7.8, .01)
  // Its front edge is the rear boundary of lots 9, 8 and 7, end to end.
  closeTo(s[0] + s[1] + s[2], 28.4, .02)
  closeTo(s[0], sides(lotOf(9).polygon)[3], .01)
  closeTo(s[1], sides(lotOf(8).polygon)[1], .01)
  closeTo(s[2], sides(lotOf(7).polygon)[1], .01)
})

test('neighbouring surveys share their boundaries exactly', () => {
  // The house's 13.50 m side is lot 7's, and its 13.70 m side is the corner lot's.
  const [house, seven, nine] = [lotOf(8).polygon, lotOf(7).polygon, lotOf(9).polygon]
  assert.deepEqual([house[3], house[2]], [seven[0], seven[1]])
  assert.deepEqual([house[0], house[1]], [nine[0], nine[4]])
})

test('the lots along the front street add up to the block front', () => {
  const chain = [9, 8, 7, 6, 5, 4, 3, 2, 1]
  // Each lot's street-line vertices are at u = -5; together they span the block's front.
  const frontSpan = (lot: Lot) => {
    const onLine = lot.polygon.filter(point => Math.abs(point[0] + 5) < 1e-9).map(point => point[1])
    return [Math.min(...onLine), Math.max(...onLine)]
  }
  let cursor = CORNER_SW
  for (const number of chain) {
    const [low, high] = frontSpan(lotOf(number))
    if (number === 9) { closeTo(low, CORNER_SW + (10.7 - 6.49) , .05); cursor = high; continue }
    closeTo(low, cursor, .01)
    cursor = high
  }
  closeTo(cursor, CORNER_NE, .01)
  closeTo(CORNER_NE - CORNER_SW, BLOCK_DIMENSIONS.frontLength, 1e-9)
})

test('lots are simple polygons and do not overlap', () => {
  for (const item of LOTS) {
    assert.ok(Math.abs(polygonArea(item.polygon)) > 20, `lot ${item.number}: real area`)
    assert.ok(sides(item.polygon).every(length => length > 1e-6), `lot ${item.number}: no zero edge`)
  }
  for (const [index, a] of LOTS.entries()) for (const b of LOTS.slice(index + 1)) {
    const shared = sharedArea(a.polygon, b.polygon)
    assert.ok(shared < .15, `lots ${a.number} and ${b.number} share ${shared.toFixed(2)} m2`)
  }
})

test('the lots fill the block', () => {
  const total = LOTS.reduce((sum, item) => sum + Math.abs(polygonArea(item.polygon)), 0)
  // The block plan gives 4308 m2 for the whole block, courtyard included; the drawn lots cover most of it.
  assert.ok(total > 2500 && total < 4400, `total ${total.toFixed(0)} m2`)
})

test('every generic building stands inside its lot, and only in the band nearest its street', () => {
  const buildings = genericBuildings()
  assert.equal(buildings.length, 20)
  for (const { lot, footprint } of buildings) {
    assert.ok(lot.source === 'block-plan')
    assert.ok(Math.abs(polygonArea(footprint)) > 10, `lot ${lot.number}: a real building`)
    assert.ok(Math.abs(polygonArea(footprint)) <= Math.abs(polygonArea(lot.polygon)) + 1e-6)
    for (const point of footprint) {
      const inside = contains(point, lot.polygon) || lot.polygon.some(vertex => distance(vertex, point) < 1e-6)
        || sharedArea([[point[0] - .3, point[1] - .3], [point[0] + .3, point[1] - .3], [point[0] + .3, point[1] + .3], [point[0] - .3, point[1] + .3]], lot.polygon, .1) > .01
      assert.ok(inside, `lot ${lot.number}: building corner inside the lot`)
    }
    assert.ok(lot.height >= 3.3 && lot.floors >= 1)
  }
  // Deep lots keep a courtyard: the building is shallower than the lot.
  for (const number of [3, 4, 5, 17, 18]) {
    const { footprint, lot } = buildings.find(item => item.lot.number === number)!
    assert.ok(Math.abs(polygonArea(footprint)) < Math.abs(polygonArea(lot.polygon)) * .7, `lot ${number}: courtyard left free`)
  }
})

test('buildings of different lots never overlap', () => {
  const buildings = genericBuildings()
  for (const [index, a] of buildings.entries()) for (const b of buildings.slice(index + 1)) {
    assert.ok(sharedArea(a.footprint, b.footprint) < .15, `lots ${a.lot.number} and ${b.lot.number}`)
  }
})

test('the streets use the widths of the block plan', () => {
  assert.deepEqual(blockStreets().map(street => street.width), [STREET_WIDTHS.front, STREET_WIDTHS.southWest, STREET_WIDTHS.northEast, STREET_WIDTHS.back])
  assert.deepEqual(STREET_WIDTHS, { front: 17.32, southWest: 17.32, northEast: 17.32, back: 12 })
  // The front street's centre line runs half a street width in front of the street line.
  closeTo(blockStreets()[0].points[0][0], -5 - 17.32 / 2, 1e-9)
})
