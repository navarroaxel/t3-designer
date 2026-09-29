import assert from 'node:assert/strict'
import test from 'node:test'
import { houseToSite } from '../src/data/building-site.ts'
import { FRONT_BEARING, defaultCamera, viewAngles } from '../src/lib/default-camera.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const angleBetween = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

test('the opening view looks at the house from the street side, raised', () => {
  const view = viewAngles(defaultCamera('3d'))
  assert.ok(angleBetween(view.bearing, FRONT_BEARING) <= 45, `the camera is on the street side: bearing ${view.bearing}`)
  assert.ok(angleBetween(view.bearing, FRONT_BEARING) >= 5, 'a three-quarter view, not dead on')
  assert.ok(view.elevation >= 25 && view.elevation <= 55, `the roof is visible: elevation ${view.elevation}`)
  assert.ok(view.distance >= 45 && view.distance <= 90, `the house fills the view: distance ${view.distance}`)
})

test('the camera targets the roof of the house, not the site origin', () => {
  const [roofX, roofZ] = houseToSite(-1, 0)
  for (const mode of ['3d', 'top'] as const) {
    const { target } = defaultCamera(mode)
    closeTo(target[0], roofX, 1e-9)
    closeTo(target[2], roofZ, 1e-9)
    closeTo(target[1], 3, 1e-9)
  }
})

test('the top view is straight above the house', () => {
  const { position, target } = defaultCamera('top')
  closeTo(position[0], target[0], .05)
  closeTo(position[2], target[2], .05)
  assert.ok(position[1] > 50)
})

test('narrow screens back the camera off along the same line of sight', () => {
  const wide = viewAngles(defaultCamera('3d', 1)), narrow = viewAngles(defaultCamera('3d', 1.6))
  closeTo(narrow.bearing, wide.bearing, 1e-6)
  closeTo(narrow.elevation, wide.elevation, 1e-6)
  closeTo(narrow.distance, wide.distance * 1.6, 1e-6)
})
