import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_GARAGE, GROUND_PARTITIONS } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { BOARD, BOARD_U, GARAGE_EQUIPMENT, INVERTER, INVERTER_RIGHT_SPOT_U, INVERTER_U, TSINV, TSINV_U, TSINV_Y } from '../src/data/garage-equipment.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
const box = (id: string) => GARAGE_EQUIPMENT.find(item => item.id === id)!
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('the inverter hangs on the garage\'s south-west wall, 1 m from the back wall the pantry is behind', () => {
  near(box('inverter').v[0], GROUND_GARAGE.v[0])
  near(GROUND_GARAGE.u[1] - INVERTER_U[1], 1)
  // The Deye SUN-10K-SG05LP3-EU-SM2: 386 x 660 x 250 mm.
  near(INVERTER.width, .386); near(INVERTER.height, .66); near(INVERTER.depth, .25)
  near(INVERTER_U[1] - INVERTER_U[0], INVERTER.width)
  near(box('inverter').v[1] - box('inverter').v[0], INVERTER.depth)
  near(box('inverter').y[1] - box('inverter').y[0], INVERTER.height)
  // It hangs off the floor, starts under the cutaway's 1.5 m cut and, hung on the wall, is drawn whole.
  assert.ok(box('inverter').y[0] > .5 && box('inverter').y[0] < 1.5)
})

test('the TSPA is between the inverter and the garage\'s back wall, 0.25 m from the wall, on the same wall as the inverter', () => {
  // Facing the south-west wall the left hand is toward higher u: the back wall the pantry is behind.
  assert.ok(BOARD_U[0] >= INVERTER_U[1] + 1e-9, 'on the back wall\'s side of the inverter')
  near(GROUND_GARAGE.u[1] - BOARD_U[1], BOARD.fromBackWall)
  near(INVERTER_U[0] - INVERTER_RIGHT_SPOT_U[1], BOARD.gap)
  near(box('board').v[0], GROUND_GARAGE.v[0])
  near(BOARD_U[1] - BOARD_U[0], BOARD.width)
  assert.ok(box('board').y[0] < 1.5 && box('board-door').v[1] > box('board').v[1], 'the door is on the board\'s front')
  near(box('board').y[0], 1)
  assert.match(box('board-door').color, /^#[01]/, 'smoked black')
})

test('the equipment stays inside the garage, clear of its walls and of each other', () => {
  for (const item of GARAGE_EQUIPMENT) {
    assert.ok(item.u[0] >= GROUND_GARAGE.u[0] && item.u[1] <= GROUND_GARAGE.u[1], `${item.id} within the garage's depth`)
    assert.ok(item.v[0] >= GROUND_GARAGE.v[0] - 1e-9 && item.v[1] <= GROUND_GARAGE.v[1], `${item.id} within the garage's width`)
  }
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    for (const id of ['inverter', 'board', 'tsinv']) assert.ok(!(overlap(box(id).u, [u0, u1]) > 1e-6 && overlap(box(id).v, [v0, v1]) > 1e-6), `${id} inside no wall`)
  }
  assert.ok(overlap(INVERTER_U, BOARD_U) <= 0, 'the board and the inverter do not overlap')
})

test('the TSINV is 320 by 280 by 110 mm, right above the TSPA, centred on it, on the same wall, and hung', () => {
  near(TSINV.width, .32); near(TSINV.height, .28); near(TSINV.depth, .11)
  near(TSINV_U[1] - TSINV_U[0], TSINV.width)
  near((TSINV_U[0] + TSINV_U[1]) / 2, (BOARD_U[0] + BOARD_U[1]) / 2)
  near(TSINV_Y[0] - (box('board').y[1]), TSINV.aboveBoard)
  near(TSINV_Y[1] - TSINV_Y[0], TSINV.height)
  near(box('tsinv').v[0], GROUND_GARAGE.v[0]); near(box('tsinv').v[1] - box('tsinv').v[0], TSINV.depth)
  assert.match(box('tsinv-door').color, /^#[01]/, 'smoked black')
  const piece = furnishingsOn('ground').find(item => item.id === 'tsinv')!
  assert.equal(piece.model, '/models/house/tsinv.glb')
  assert.ok(piece.hung && piece.y[0] >= 1.5, 'over the cutaway\'s cut, so only the walkthrough shows it')
})
