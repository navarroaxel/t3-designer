import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { BALCONY_BOXES, BALCONY_CEILING, BALCONY_LIGHT_POSITIONS, BALCONY_SWITCH_ID, balconyLightsOn } from '../src/data/balcony-lights.ts'
import { furnishingDevices, furnishingsOn } from '../src/data/house-furnishings.ts'
import { BALCONY, FRONT_ROOMS, OPENINGS, SLAB_THICKNESS } from '../src/data/house-plan.ts'

test('the balcony has three recessed lights in the roof over it, one in the middle and one each side, evenly spaced', () => {
  const lights = BALCONY_BOXES.filter(piece => piece.id.startsWith('balcony-light-'))
  assert.equal(lights.length, 3)
  assert.equal(BALCONY_LIGHT_POSITIONS.length, 3)
  const vs = BALCONY_LIGHT_POSITIONS.map(at => at.v).sort((a, b) => a - b)
  assert.ok(Math.abs(vs[1]) < 1e-9, 'one in the middle')
  assert.ok(Math.abs(vs[1] - vs[0] - (vs[2] - vs[1])) < 1e-9 && vs[0] > -BALCONY.width / 2 && vs[2] < BALCONY.width / 2, 'evenly spaced, inside the balcony')
  for (const light of lights) assert.ok(light.glow && light.round && light.u[0] > -5 - BALCONY.depth && light.u[1] < -5 && light.y[0] < BALCONY_CEILING, light.id)
  assert.ok(Math.abs(BALCONY_CEILING - (2 * FLOOR_HEIGHT - SLAB_THICKNESS)) < 1e-9)
})

test('the balcony\'s switch is inside the main room, beside the balcony door, 1.10 m up, and starts on', () => {
  const plate = furnishingsOn('first').find(piece => piece.id === BALCONY_SWITCH_ID)!, door = OPENINGS.first.find(opening => opening.u === -5 && Math.abs(opening.v[1] - opening.v[0] - 3) < 1e-9)!
  // On the wall of the door, on the room's side of it, past the door's edge and clear of the closet.
  assert.ok(Math.abs(plate.u[0] - FRONT_ROOMS.main.u[0]) < 1e-9 && plate.u[1] > plate.u[0])
  assert.ok(plate.v[0] > door.v[1] && plate.v[1] < FRONT_ROOMS.main.v[1] - .6, 'beside the door, before the closet')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (FLOOR_HEIGHT + 1.1)) < 1e-9)
  const device = furnishingDevices('first', 3.2).find(item => item.id === BALCONY_SWITCH_ID) as { initialOpenness?: number } | undefined
  assert.ok(device && device.initialOpenness === 1 && balconyLightsOn({}) && !balconyLightsOn({ [BALCONY_SWITCH_ID]: 0 }))
})

test('an outlet under the balcony\'s middle light, on the front wall, 0.30 m up, clear of the balcony door', () => {
  const pieces = furnishingsOn('first'), plate = pieces.find(piece => piece.id === 'outlet-balcony-plate')!
  const middle = BALCONY_LIGHT_POSITIONS.map(at => at.v).sort((a, b) => a - b)[1], door = OPENINGS.first.find(opening => opening.u === -5 && Math.abs(opening.v[1] - opening.v[0] - 3) < 1e-9)!
  assert.ok(Math.abs((plate.v[0] + plate.v[1]) / 2 - middle) < 1e-9, 'under the middle light')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (FLOOR_HEIGHT + .3)) < 1e-9)
  // Flat on the wall's outer face, facing the balcony (lower u), and out of the door's way.
  assert.ok(Math.abs(plate.u[1] + 5) < 1e-9 && plate.u[0] < plate.u[1])
  assert.ok(plate.v[1] < door.v[0] || plate.v[0] > door.v[1], 'not in the balcony door')
  assert.ok(pieces.filter(piece => piece.id.startsWith('outlet-balcony-')).every(piece => piece.u[1] <= -5 + 1e-9 && piece.rollAboutU))
})
