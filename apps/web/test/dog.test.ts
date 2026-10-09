import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { DOG, DOG_BOX } from '../src/data/dog.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { BALCONY, OPENINGS } from '../src/data/house-plan.ts'

test('the dog lies on the balcony, along it, in front of the secondary room\'s window and clear of the balcony door', () => {
  const dog = furnishingsOn('first').find(piece => piece.id === 'dog')!
  assert.ok(dog.model === DOG.model && dog.turn === 0)
  // On the balcony's floor, inside it, lying along it (0.92 m long on a balcony 0.86 m deep is no fit across).
  assert.ok(Math.abs(DOG_BOX.y[0] - FLOOR_HEIGHT) < 1e-9)
  assert.ok(DOG_BOX.u[0] >= -5 - BALCONY.depth && DOG_BOX.u[1] <= -5 && DOG_BOX.v[0] >= -BALCONY.width / 2 && DOG_BOX.v[1] <= BALCONY.width / 2)
  assert.ok(DOG_BOX.v[1] - DOG_BOX.v[0] > BALCONY.depth, 'longer than the balcony is deep, so it lies along it')
  const door = OPENINGS.first.find(opening => opening.u === -5 && Math.abs(opening.v[1] - opening.v[0] - 3) < 1e-9)!
  assert.ok(DOG_BOX.v[1] < door.v[0] || DOG_BOX.v[0] > door.v[1], 'out of the balcony door\'s way')
  const window = OPENINGS.first.find(opening => opening.u === -5 && opening.y[0] > FLOOR_HEIGHT + .5 && opening.y[0] < FLOOR_HEIGHT + 1.5)!
  assert.ok(DOG.v >= window.v[0] && DOG.v <= window.v[1], 'in front of the window')
})
