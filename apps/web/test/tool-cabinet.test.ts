import assert from 'node:assert/strict'
import test from 'node:test'
import { INVERTER_RIGHT_SPOT_U, INVERTER_U } from '../src/data/garage-equipment.ts'
import { GROUND_GARAGE } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { TOOL_CABINET } from '../src/data/tool-cabinet.ts'

test('the tool cabinet is 2.70 by 0.472 by 1.92 m, against the garage\'s wall, to the right of the inverter, where the board used to be, and inside the garage', () => {
  const piece = furnishingsOn('ground').find(item => item.id === 'tool-cabinet')!
  assert.ok(piece && piece.model === '/models/house/tool-cabinet.glb')
  assert.ok(Math.abs(piece.u[1] - piece.u[0] - TOOL_CABINET.width) < 1e-9 && Math.abs(piece.v[1] - piece.v[0] - TOOL_CABINET.depth) < 1e-9 && Math.abs(piece.y[1] - 1.92) < 1e-9)
  assert.ok(Math.abs(piece.v[0] - GROUND_GARAGE.v[0]) < 1e-9, 'against the south-west wall')
  assert.ok(piece.u[1] <= INVERTER_RIGHT_SPOT_U[0] - .1 + 1e-9, 'toward the front of the house from the board\'s old spot, which is its right')
  assert.ok(piece.u[1] <= INVERTER_U[0], 'clear of the inverter')
  assert.ok(piece.u[0] >= GROUND_GARAGE.u[0], 'inside the garage')
})
