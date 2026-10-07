import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_HALL, GROUND_OFFICE } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { MAIN_BOARD, MAIN_BOARD_BOX } from '../src/data/main-board.ts'
import { OFFICE_DESK, OFFICE_DESK_BOX } from '../src/data/office-desk.ts'

test('the main board is flush in the hall\'s left wall, 20 mm of it out of the wall, 1.5 m to its middle', () => {
  const piece = furnishingsOn('ground').find(item => item.id === 'main-board')!
  assert.ok(piece && piece.model === '/models/house/main-board.glb')
  assert.ok(piece.u[0] >= GROUND_HALL.u[0] && piece.u[1] <= GROUND_HALL.u[1], 'along the hall')
  // Its frame stands out of the north-east wall by 20 mm, toward the hall.
  const wall = GROUND_HALL.v[1]
  assert.ok(Math.abs(piece.v[0] - (wall - MAIN_BOARD.frameOut - (MAIN_BOARD.depth - MAIN_BOARD.frameOut - MAIN_BOARD.behindMiddle - .008))) < .05)
  assert.ok(piece.v[0] < wall && piece.v[1] > wall, 'half in the wall, half out')
  assert.ok(Math.abs((MAIN_BOARD_BOX.y[0] + MAIN_BOARD_BOX.y[1]) / 2 - 1.5) < 1e-9)
})

test('the office has a 1.40 by 0.70 m desk against its north-east wall, clear of the door', () => {
  const piece = furnishingsOn('ground').find(item => item.id === 'office-desk')!
  assert.ok(piece)
  assert.ok(Math.abs(piece.u[1] - piece.u[0] - OFFICE_DESK.length) < 1e-9 && Math.abs(piece.v[1] - piece.v[0] - OFFICE_DESK.depth) < 1e-9)
  assert.ok(Math.abs(piece.v[1] - GROUND_OFFICE.v[1]) < 1e-9, 'against the wall')
  assert.ok(piece.u[0] > GROUND_OFFICE.u[0] + 1.5 && piece.u[1] < GROUND_OFFICE.u[1])
  assert.deepEqual(OFFICE_DESK_BOX.y, [0, .75])
})
