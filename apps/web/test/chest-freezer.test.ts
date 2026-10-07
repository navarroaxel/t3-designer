import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_PANTRY } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { CHEST_FREEZER } from '../src/data/chest-freezer.ts'

test('the pantry has a chest freezer against the medianera, under the rack and clear of it', () => {
  const pieces = furnishingsOn('ground')
  const freezer = pieces.find(item => item.id === 'chest-freezer')!, rack = pieces.find(item => item.id === 'rack')!
  assert.ok(freezer && freezer.model === '/models/house/chest-freezer.glb')
  assert.ok(Math.abs(freezer.u[1] - freezer.u[0] - CHEST_FREEZER.width) < 1e-9 && Math.abs(freezer.y[1] - .85) < 1e-9)
  assert.ok(Math.abs(freezer.v[0] - GROUND_PANTRY.v[0]) < 1e-9, 'against the south-west wall')
  assert.ok(freezer.u[0] >= GROUND_PANTRY.u[0] && freezer.u[1] <= GROUND_PANTRY.u[1], 'inside the pantry')
  assert.ok(freezer.y[1] < rack.y[0], 'the rack is above it')
})
