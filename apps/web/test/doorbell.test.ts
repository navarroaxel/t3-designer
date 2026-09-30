import assert from 'node:assert/strict'
import test from 'node:test'
import { OPENINGS } from '../src/data/house-plan.ts'
import { DOORBELL, DOORBELL_BOXES, DOORBELL_U, DOORBELL_V } from '../src/data/doorbell.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
const box = (id: string) => DOORBELL_BOXES.find(item => item.id === id)!

test('the doorbell stands on the recess wall, beside the entrance door, 15 cm from it, on its south-west side', () => {
  const door = OPENINGS.ground.find(opening => opening.u === -4 && opening.y[0] === 0 && opening.v[1] - opening.v[0] < 1)!
  // The recess's back wall is at u = -4 and faces the street, so the doorbell stands out toward lower u.
  near(DOORBELL_U[1], -4); near(DOORBELL_U[1] - DOORBELL_U[0], DOORBELL.depth)
  // On the door's south-west side (the right seen from the street, lower v), 15 cm from it.
  near(door.v[0] - DOORBELL_V[1], .15)
  near(DOORBELL_V[1] - DOORBELL_V[0], DOORBELL.width)
  // Clear of the door and of the recess's end, on the wall.
  assert.ok(DOORBELL_V[1] < door.v[0] && DOORBELL_V[0] > .48)
})

test('the doorbell is the UVC-Doorbell-B, 5.4 x 1.6 x 1 inches: a slim black unit with a lens near the top and a button in the middle, at a usual height', () => {
  // 5.4 x 1.6 x 1 inches: 13.7 cm high, 4.1 cm wide, 2.5 cm deep.
  near(DOORBELL.height, .13716); near(DOORBELL.width, .04064); near(DOORBELL.depth, .0254)
  near(box('doorbell').y[1] - box('doorbell').y[0], DOORBELL.height)
  near((box('doorbell').y[0] + box('doorbell').y[1]) / 2, DOORBELL.middleHeight)
  // Under the 1.5 m cut, so it shows whole.
  assert.ok(box('doorbell').y[1] < 1.5)
  // The lens is above the button, both on the front.
  assert.ok(box('doorbell-lens').y[0] > box('doorbell-button').y[1])
  assert.ok(box('doorbell-lens').u[0] < DOORBELL_U[0] && box('doorbell-button').u[0] < DOORBELL_U[0])
  assert.match(box('doorbell').color, /^#[01]/, 'black')
})
