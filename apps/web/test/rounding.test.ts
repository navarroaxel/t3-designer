import assert from 'node:assert/strict'
import test from 'node:test'
import { EDGE_RATIO, MAX_EDGE_RADIUS, MIN_ROUNDED_SIDE, edgeRadius } from '../src/lib/rounding.ts'

test('edges are rounded by a fifth of the smallest side, up to 2 cm, and plates and ports stay sharp', () => {
  // A wardrobe, a bed, a table top: the cap, or a fifth of the thinnest side.
  assert.equal(edgeRadius([2.16, 2.4, .6]), MAX_EDGE_RADIUS)
  assert.equal(edgeRadius([1, .04, .45]), .04 * EDGE_RATIO)
  // A slot or a port, a plate, a pillow's thin side: under 3 cm, nothing to round.
  assert.equal(edgeRadius([.0032, .0075, .001]), 0)
  assert.equal(edgeRadius([.44, .135, .02]), 0)
  assert.equal(edgeRadius([.5, MIN_ROUNDED_SIDE - .001, .5]), 0)
  assert.ok(edgeRadius([.5, MIN_ROUNDED_SIDE, .5]) > 0)
  // The radius never exceeds the half of any side, or the box would fold.
  for (const size of [[.03, .03, .03], [.05, 1, 2], [3, 3, .031]] as const) assert.ok(edgeRadius(size) * 2 <= Math.min(...size) + 1e-9)
})
