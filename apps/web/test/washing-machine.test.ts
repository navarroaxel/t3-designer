import assert from 'node:assert/strict'
import test from 'node:test'
import { OPENINGS } from '../src/data/house-plan.ts'
import { LAUNDRY_INTERIOR, WASHING_MACHINE, WASHING_MACHINE_BOXES, WASHING_MACHINE_U, WASHING_MACHINE_V } from '../src/data/washing-machine.ts'

test('the washing machine stands in the laundry against the party wall, clear of the kitchen door', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(WASHING_MACHINE_U[1] - WASHING_MACHINE_U[0], WASHING_MACHINE.width)
  near(WASHING_MACHINE_V[1] - WASHING_MACHINE_V[0], WASHING_MACHINE.depth)
  assert.ok(WASHING_MACHINE_U[0] >= LAUNDRY_INTERIOR.u[0] && WASHING_MACHINE_U[1] <= LAUNDRY_INTERIOR.u[1])
  near(WASHING_MACHINE_V[1], LAUNDRY_INTERIOR.v[1])
  // The laundry door is in the rear wall (u = 4), against the wall on the well, on the other side of the laundry.
  const door = OPENINGS.first.find(opening => opening.u === 4 && Math.abs(opening.v[1] - opening.v[0] - .8) < 1e-9)!
  assert.ok(WASHING_MACHINE_V[0] > door.v[1], 'the machine is not in front of the door')
  // Every part stays within the body's plan, except the door and panel, which are proud of its front by a few centimetres.
  for (const box of WASHING_MACHINE_BOXES) {
    assert.ok(box.u[0] >= WASHING_MACHINE_U[0] - .006 && box.u[1] <= WASHING_MACHINE_U[1] + .006, `${box.id}: within the body's width`)
    assert.ok(box.v[1] <= WASHING_MACHINE_V[1] + 1e-9 && box.v[0] >= WASHING_MACHINE_V[0] - .035, `${box.id}: no more than 3.5 cm proud of the front`)
  }
})
