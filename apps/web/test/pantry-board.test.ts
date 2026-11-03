import assert from 'node:assert/strict'
import test from 'node:test'
import { BOARD, BOARD_U } from '../src/data/garage-equipment.ts'
import { GROUND_GARAGE, GROUND_PANTRY } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { CHEST_FREEZER } from '../src/data/chest-freezer.ts'
import { PANTRY_BOARD, PANTRY_BOARD_BOX } from '../src/data/pantry-board.ts'
import { RACK_BOX, RACK_FROM_BOARD } from '../src/data/rack.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
const piece = (id: string) => furnishingsOn('ground').find(item => item.id === id)!

test('the TSPB is the same unit as the TSPA, at the same height, 0.10 m from the shared wall on the pantry\'s side', () => {
  const tspa = piece('tspa'), tspb = piece('tspb')
  assert.ok(tspa && tspb)
  assert.equal(tspb.model, tspa.model)
  near(tspb.u[1] - tspb.u[0], BOARD.width); near(tspb.y[1] - tspb.y[0], BOARD.height); near(tspb.v[1] - tspb.v[0], BOARD.depth)
  near(tspb.y[0], tspa.y[0]); near(tspb.y[1], tspa.y[1])
  near(tspb.u[0] - GROUND_PANTRY.u[0], PANTRY_BOARD.fromWall)
  near(GROUND_GARAGE.u[1] - BOARD_U[1], PANTRY_BOARD.fromWall)
  near(tspb.v[0], GROUND_PANTRY.v[0])
})

test('the rack is to the TSPB\'s left, facing the wall, clear of it by RACK_FROM_BOARD, and still inside the pantry', () => {
  assert.ok(RACK_BOX.u[0] >= PANTRY_BOARD_BOX.u[1] + RACK_FROM_BOARD - 1e-9)
  assert.ok(RACK_BOX.u[1] <= GROUND_PANTRY.u[1])
  assert.ok(RACK_BOX.u[0] > (GROUND_PANTRY.u[0] + GROUND_PANTRY.u[1]) / 2 - (RACK_BOX.u[1] - RACK_BOX.u[0]) / 2 - 1e-9, 'moved toward the far wall, not toward the garage')
})

test('the TSPB hangs above the chest freezer and below the 1.5 m cut', () => {
  const freezer = piece('chest-freezer'), tspb = piece('tspb')
  assert.ok(freezer.y[1] <= tspb.y[0] + 1e-9)
  assert.ok(tspb.y[1] < 1.5)
  assert.equal(CHEST_FREEZER.height, .85)
})
