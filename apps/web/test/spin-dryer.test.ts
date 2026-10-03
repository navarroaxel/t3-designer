import assert from 'node:assert/strict'
import test from 'node:test'
import { LAUNDRY_INTERIOR, WASHING_MACHINE_U, WASHING_MACHINE_V } from '../src/data/washing-machine.ts'
import { SPIN_DRYER, SPIN_DRYER_CENTRE, SPIN_DRYER_PARTS } from '../src/data/spin-dryer.ts'

test('the spin dryer is 35 cm across and 64 cm high, beside the washing machine and against the party wall', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const drum = SPIN_DRYER_PARTS.find(part => part.id === 'dryer-drum')!
  near(drum.u[1] - drum.u[0], .35)
  const top = Math.max(...SPIN_DRYER_PARTS.map(part => part.y[1])), bottom = Math.min(...SPIN_DRYER_PARTS.map(part => part.y[0]))
  near(top - bottom, .64); near(SPIN_DRYER.height, .64)
  // To the right of the machine seen from its front (+u), clear of it, inside the laundry, and touching the party wall.
  near(SPIN_DRYER_CENTRE[0] - .175 - WASHING_MACHINE_U[1], SPIN_DRYER.gap)
  near(SPIN_DRYER_CENTRE[1] + .175, WASHING_MACHINE_V[1])
  assert.ok(SPIN_DRYER_CENTRE[0] + .175 <= LAUNDRY_INTERIOR.u[1])
})
