import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_GARAGE, GROUND_PARTITIONS } from '../src/data/house-plan.ts'
import { BOARD, BOARD_U, GARAGE_EQUIPMENT, INVERTER, INVERTER_U } from '../src/data/garage-equipment.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
const box = (id: string) => GARAGE_EQUIPMENT.find(item => item.id === id)!
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('the inverter hangs on the garage\'s south-west wall, 1 m from the back wall the pantry is behind', () => {
  near(box('inverter').v[0], GROUND_GARAGE.v[0])
  near(GROUND_GARAGE.u[1] - INVERTER_U[1], 1)
  near(INVERTER_U[1] - INVERTER_U[0], INVERTER.width)
  near(box('inverter').v[1] - box('inverter').v[0], INVERTER.depth)
  near(box('inverter').y[1] - box('inverter').y[0], INVERTER.height)
  // It hangs off the floor and shows whole under the 1.5 m cut.
  assert.ok(box('inverter').y[0] > .5 && box('inverter').y[1] < 1.5)
})

test('the electrical board is to the inverter\'s right, facing the wall: toward the front, lower u, on the same wall', () => {
  // Facing the south-west wall the right hand is toward lower u (the front of the house).
  assert.ok(BOARD_U[1] <= INVERTER_U[0] + 1e-9)
  near(INVERTER_U[0] - BOARD_U[1], BOARD.gap)
  near(box('board').v[0], GROUND_GARAGE.v[0])
  near(BOARD_U[1] - BOARD_U[0], BOARD.width)
  assert.ok(box('board').y[1] < 1.5 && box('board-door').v[1] > box('board').v[1], 'the door is on the board\'s front')
  assert.match(box('board-door').color, /^#[01]/, 'smoked black')
})

test('the equipment stays inside the garage, clear of its walls and of each other', () => {
  for (const item of GARAGE_EQUIPMENT) {
    assert.ok(item.u[0] >= GROUND_GARAGE.u[0] && item.u[1] <= GROUND_GARAGE.u[1], `${item.id} within the garage's depth`)
    assert.ok(item.v[0] >= GROUND_GARAGE.v[0] - 1e-9 && item.v[1] <= GROUND_GARAGE.v[1], `${item.id} within the garage's width`)
  }
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    for (const id of ['inverter', 'board']) assert.ok(!(overlap(box(id).u, [u0, u1]) > 1e-6 && overlap(box(id).v, [v0, v1]) > 1e-6), `${id} inside no wall`)
  }
  assert.ok(overlap(INVERTER_U, BOARD_U) <= 0, 'the board and the inverter do not overlap')
})
