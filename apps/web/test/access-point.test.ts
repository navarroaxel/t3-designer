import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_GARAGE, GROUND_OFFICE, STAIRWELL_HOLE } from '../src/data/house-plan.ts'
import { ACCESS_POINT_SPOTS, CEILING_UNDERSIDE } from '../src/data/access-point.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'

const within = (at: readonly [number, number], u: [number, number], v: [number, number]) => at[0] > u[0] && at[0] < u[1] && at[1] > v[0] && at[1] < v[1]

test('each access point is a white disc flat on its ceiling, with a glowing ring and a cap, all round', () => {
  for (const [floor, names] of [['first', ['hall', 'living']], ['ground', ['office', 'garage']]] as const) {
    for (const name of names) {
      const mine = furnishingsOn(floor).filter(p => p.id.startsWith(`access-point-${name}-`))
      assert.equal(mine.length, 3, `${name}: body, ring and cap`)
      assert.ok(mine.every(p => p.shape === 'ellipse' && !p.solid))
      assert.equal(mine.filter(p => p.glow).length, 1, `${name}: only the ring shines`)
      assert.equal(mine.find(p => p.id.endsWith('-body'))!.y[1], CEILING_UNDERSIDE[floor], `${name}: flat on the ceiling`)
    }
  }
})

test('the access points are in the rooms they are for', () => {
  assert.ok(within(ACCESS_POINT_SPOTS.hall.at, [STAIRWELL_HOLE[0], STAIRWELL_HOLE[1]], [STAIRWELL_HOLE[2], STAIRWELL_HOLE[3]]))
  assert.ok(within(ACCESS_POINT_SPOTS.office.at, GROUND_OFFICE.u, GROUND_OFFICE.v))
  assert.ok(within(ACCESS_POINT_SPOTS.garage.at, GROUND_GARAGE.u, GROUND_GARAGE.v))
})
