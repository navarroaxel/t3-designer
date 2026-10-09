import assert from 'node:assert/strict'
import test from 'node:test'
import { STAIRWELL_HOLE } from '../src/data/house-plan.ts'
import { ACCESS_POINT_BOXES, ACCESS_POINT_CEILING } from '../src/data/access-point.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'

test('the access point is a white disc flat on the ceiling of the stair hall, with a glowing ring and a cap, all round', () => {
  const body = ACCESS_POINT_BOXES[0]
  assert.equal(body.y[1], ACCESS_POINT_CEILING)
  assert.ok(body.u[0] > STAIRWELL_HOLE[0] && body.u[1] < STAIRWELL_HOLE[1] && body.v[0] > STAIRWELL_HOLE[2] && body.v[1] < STAIRWELL_HOLE[3], 'inside the stair hall')
  const mine = furnishingsOn('first').filter(p => p.id.startsWith('access-point'))
  assert.equal(mine.length, 3)
  assert.ok(mine.every(p => p.shape === 'ellipse' && !p.solid))
  assert.equal(mine.filter(p => p.glow).length, 1, 'only the ring shines')
  assert.ok(mine.every(p => p.y[0] > 3.2 + 2, 'well above the first floor'))
})
