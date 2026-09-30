import assert from 'node:assert/strict'
import test from 'node:test'
import { GROUND_LIVING, GROUND_PARTITIONS } from '../src/data/house-plan.ts'
import { FIREPLACE, FIREPLACE_BOXES, FIREPLACE_U, FIREPLACE_V } from '../src/data/fireplace.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
const box = (id: string) => FIREPLACE_BOXES.find(item => item.id === id)!
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('the gas fireplace stands against the living\'s party wall, centred on its depth, and inside the living', () => {
  // Against the party wall with neighbour A, at the living's north-east side; the opening faces the room (lower v).
  near(FIREPLACE_V[1], GROUND_LIVING.v[1])
  near(FIREPLACE_V[1] - FIREPLACE_V[0], FIREPLACE.depth)
  near(FIREPLACE_U[1] - FIREPLACE_U[0], FIREPLACE.width)
  near((FIREPLACE_U[0] + FIREPLACE_U[1]) / 2, (GROUND_LIVING.u[0] + GROUND_LIVING.u[1]) / 2)
  for (const item of FIREPLACE_BOXES) {
    assert.ok(item.u[0] >= GROUND_LIVING.u[0] && item.u[1] <= GROUND_LIVING.u[1], `${item.id} within the living's depth`)
    assert.ok(item.v[0] >= GROUND_LIVING.v[0] && item.v[1] <= GROUND_LIVING.v[1] + 1e-9, `${item.id} within the living's width`)
    assert.ok(item.y[0] >= 0 && item.y[1] <= 1.5, `${item.id} under the 1.5 m cut, whole`)
  }
})

test('the fireplace is a black box with a stone top, open at the front, with logs inside', () => {
  near(box('top').y[1], FIREPLACE.height)
  // A stone top over the black box, overhanging a little; black panels and back; the front, toward lower v, is open.
  assert.ok(box('top').u[1] - box('top').u[0] > FIREPLACE.width)
  for (const id of ['panel-left', 'panel-right', 'back', 'plinth']) assert.match(box(id).color, /^#[01]/, `${id} is black`)
  assert.ok(box('back').v[0] > FIREPLACE_V[0] + .2, 'the back is at the wall, so the front is open')
  for (const id of ['log-front', 'log-back-left', 'log-back-right']) {
    const log = box(id)
    assert.ok(log.u[0] > box('panel-left').u[1] && log.u[1] < box('panel-right').u[0], `${id} between the panels`)
    assert.ok(log.y[0] >= box('floor').y[1] - 1e-9 && log.y[1] < box('lintel').y[0], `${id} inside the opening`)
  }
})

test('the fireplace stays clear of the living\'s walls and of the well\'s door', () => {
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    assert.ok(!(overlap(FIREPLACE_U, [u0, u1]) > 1e-6 && overlap(FIREPLACE_V, [v0, v1]) > 1e-6), 'no wall inside the fireplace')
  }
})
