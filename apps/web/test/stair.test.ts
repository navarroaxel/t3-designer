import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { FIRST_FLOOR_BATHROOM, FRONT_ROOMS, GROUND_HALL, GROUND_PARTITIONS, STAIRWELL_HOLE } from '../src/data/house-plan.ts'
import { RISER, STAIR, STAIR_BLOCKS, STAIR_CEILING, STAIR_LANDING, STAIR_LANDING_2, TREAD } from '../src/data/stair.ts'

const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
const flight = (n: 1 | 2 | 3) => STAIR_BLOCKS.filter(block => block.id.startsWith(`flight-${n}-`))
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('the base of the L is 3 steps and the 0.96 m landing, 1.74 m along, with steps 1 m wide starting 2.13 m from the front window\'s wall', () => {
  const first = flight(1)
  assert.equal(first.length, 3)
  for (const block of first) near(block.u[1] - block.u[0], 1)
  near(first[0].u[0] - GROUND_HALL.u[0], 2.13)
  // 3 treads + the landing add up to 1.74 m, so each tread is 26 cm.
  near(first.at(-1)!.v[1] - first[0].v[0] + (STAIR_LANDING.v[1] - STAIR_LANDING.v[0]), 1.74)
  near(TREAD, .26)
  // The base of the L climbs toward higher v, to the left seen from the street, toward the party wall.
  for (let index = 1; index < first.length; index++) assert.ok(first[index].v[0] > first[index - 1].v[0] && first[index].y[1] > first[index - 1].y[1])
  // Its first steps are about 1.5 m from the hall's back wall.
  assert.ok(Math.abs(GROUND_HALL.u[1] - first[0].u[1] - 1.52) < .06, `${GROUND_HALL.u[1] - first[0].u[1]}`)
})

test('the landing is 1 m by 0.96 m, the 0.96 m perpendicular to the party wall, against it', () => {
  near(STAIR_LANDING.u[1] - STAIR_LANDING.u[0], 1)
  near(STAIR_LANDING.v[1] - STAIR_LANDING.v[0], .96)
  near(STAIR_LANDING.v[1], GROUND_HALL.v[1])
  near(STAIR_BLOCKS.find(block => block.id === 'landing-1')!.y[1], 4 * RISER)
})

test('after the landing there are 2 steps toward the office, then a second turn to the right and the remaining steps', () => {
  const second = flight(2), third = flight(3)
  assert.equal(second.length, 2)
  // The 2 steps go toward higher u (the rear, where the office is), keeping to the party wall.
  assert.ok(second[1].u[0] > second[0].u[0] && second[0].u[0] >= STAIR_LANDING.u[1] - 1e-9)
  for (const block of second) near(block.v[1], GROUND_HALL.v[1])
  // Then the second landing, and the last flight turns right (toward lower v, toward the garage side) with the steps that are left: 10.
  assert.equal(third.length, 10)
  for (let index = 1; index < third.length; index++) assert.ok(third[index].v[1] < third[index - 1].v[1] && third[index].y[1] > third[index - 1].y[1])
  assert.ok(third[0].v[1] <= STAIR_LANDING.v[0] + 1e-9, 'the last flight starts where the landing ends')
  near(STAIR_BLOCKS.find(block => block.id === 'landing-2')!.y[1], 7 * RISER)
})

test('18 risers make a floor height, and the stair fits in the hall', () => {
  near(STAIR.risers * RISER, FLOOR_HEIGHT)
  assert.equal(STAIR.treads[0] + STAIR.treads[1] + STAIR.treads[2] + 3, STAIR.risers)
  near(Math.max(...STAIR_BLOCKS.map(block => block.y[1])) + RISER, FLOOR_HEIGHT)
  for (const block of STAIR_BLOCKS) {
    assert.ok(block.v[0] >= GROUND_HALL.v[0] - 1e-9 && block.v[1] <= GROUND_HALL.v[1] + 1e-9, `${block.id} within the hall's width`)
    assert.ok(block.u[0] >= GROUND_HALL.u[0] - 1e-9 && block.u[1] <= GROUND_HALL.u[1] + 1e-9, `${block.id} within the hall's depth`)
  }
  // The last step is close to the hall's wall on the garage side: 4 cm.
  assert.ok(Math.min(...STAIR_BLOCKS.map(block => block.v[0])) - GROUND_HALL.v[0] < .05)
})

test('the stair does not overlap any ground-floor wall', () => {
  for (const block of STAIR_BLOCKS) for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    assert.ok(!(overlap(block.u, [u0, u1]) > 1e-6 && overlap(block.v, [v0, v1]) > 1e-6), `${block.id} overlaps a wall`)
  }
})

test('the stairwell in the first-floor slab coincides with the corridor and covers what has no headroom', () => {
  const [u0, u1, v0, v1] = STAIRWELL_HOLE
  // The corridor: from the main room's back wall to the wall behind the bathroom, along v, up to the party wall.
  near(u0, FRONT_ROOMS.main.u[1] + .12)
  near(u1, FIRST_FLOOR_BATHROOM.u[1])
  near(v1, GROUND_HALL.v[1]); near(v0, GROUND_HALL.v[0])
  // The second landing and the last flight climb under it.
  for (const id of ['landing-2', ...flight(3).map(block => block.id)]) {
    const block = STAIR_BLOCKS.find(item => item.id === id)!
    assert.ok(block.u[0] >= u0 - .06 && block.u[1] <= u1 + 1e-9 && block.v[0] >= v0 - .05 && block.v[1] <= v1 + 1e-9, `${id} is under the stairwell`)
  }
  // Wherever the stair is not under the opening its steps stay low enough to walk under the slab (2 m of headroom, less 10 cm here and there).
  for (const block of STAIR_BLOCKS) {
    const inside = block.u[0] >= u0 - .06 && block.u[1] <= u1 + 1e-9 && block.v[0] >= v0 - .05
    if (!inside) assert.ok(STAIR_CEILING - block.y[1] >= 1.9, `${block.id} has ${(STAIR_CEILING - block.y[1]).toFixed(2)} m of headroom`)
  }
  // The landing between the flights is exactly as wide as the corridor.
  near(STAIR_LANDING_2.u[1], u1)
})

test('the stair is floating concrete: thin slabs with nothing beneath, so the floor under it and its doors stay clear', () => {
  for (const block of STAIR_BLOCKS) {
    near(block.y[1] - block.y[0], STAIR.slab)
    assert.ok(block.y[0] > 0, `${block.id} does not reach the floor`)
  }
  // The garage's doorway and the hall's arch, 2.10 m high, are not blocked: no slab of the stair lies lower than that over them.
  const doors = [[-.06, .64, .275, .575], [.99, 1.11, .655, 1.855]]
  for (const [du0, du1, dv0, dv1] of doors) for (const block of STAIR_BLOCKS) {
    const over = overlap(block.u, [du0 - .05, du1 + .05]) > 0 && overlap(block.v, [dv0 - .05, dv1 + .05]) > 0
    if (over) assert.ok(block.y[0] >= 2.1, `${block.id} is at ${block.y[0].toFixed(2)} m over a doorway`)
  }
})
