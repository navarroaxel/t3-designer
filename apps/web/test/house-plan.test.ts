import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT, SITE_BUILDINGS, houseSouthWestEdge, type SitePoint } from '../src/data/building-site.ts'
import {
  CUT_HEIGHT, FIRST_OUTLINE, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, OUTLINES, WALL_THICKNESS,
  polygonArea, wallBoxes, type Floor, type PlanBox, type PlanPoint,
} from '../src/data/house-plan.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const siteArea = (id: string) => Math.abs(polygonArea(SITE_BUILDINGS.find(building => building.id === id)!.footprint as SitePoint[]))
const floors: Floor[] = ['ground', 'first']

function contains(point: PlanPoint, ring: PlanPoint[]) {
  let inside = false
  ring.forEach((b, index) => {
    const a = ring[(index + ring.length - 1) % ring.length]
    if ((a[1] > point[1]) !== (b[1] > point[1]) && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  })
  return inside
}
const inBox = (box: PlanBox, [u, y, v]: [number, number, number]) =>
  [u, y, v].every((value, axis) => Math.abs(value - box.center[axis]) < box.size[axis] / 2 - 1e-9)
const solid = (boxes: PlanBox[], point: [number, number, number]) => boxes.some(box => inBox(box, point))

test('the plan outlines match the volumes of the site', () => {
  // The plans draw the leaning south-west wall at its mean position, so they differ from the volumes by under a square metre.
  closeTo(Math.abs(polygonArea(GROUND_OUTLINE)), siteArea('HOUSE') + siteArea('HOUSE-ARM') + siteArea('HOUSE-TERRACE'), 1)
  closeTo(Math.abs(polygonArea(FIRST_OUTLINE)), siteArea('HOUSE') + siteArea('HOUSE-ENTRY'), 1)
  // First floor: the 9 m x 8.95 m house; the roof's 1 m cantilever is not a floor.
  closeTo(Math.abs(polygonArea(FIRST_OUTLINE)), 9 * (4.475 - houseSouthWestEdge(1.8)), 1e-6)
  // Ground floor: the same footprint at the front, less the recess, plus the rear band.
  assert.ok(Math.abs(polygonArea(GROUND_OUTLINE)) > Math.abs(polygonArea(FIRST_OUTLINE)))
})

test('exterior walls sit inside each outline and are 0.3 m thick', () => {
  for (const floor of floors) {
    const boxes = wallBoxes(OUTLINES[floor], OPENINGS[floor], FLOOR_LEVEL[floor], FLOOR_LEVEL[floor] + FLOOR_HEIGHT)
    assert.ok(boxes.length > 8, `${floor}: walls all round`)
    for (const box of boxes) {
      assert.ok(contains([box.center[0], box.center[2]], OUTLINES[floor]), `${floor}: wall inside the outline`)
      closeTo(Math.min(box.size[0], box.size[2]), WALL_THICKNESS, 1e-9)
      assert.ok(box.center[1] - box.size[1] / 2 >= FLOOR_LEVEL[floor] - 1e-9, `${floor}: walls start at the floor`)
    }
  }
})

test('every opening lies on a wall of its floor, within that floor’s height', () => {
  for (const floor of floors) {
    const outline = OUTLINES[floor]
    for (const opening of OPENINGS[floor]) {
      const onWall = outline.some((a, index) => {
        const b = outline[(index + 1) % outline.length]
        return a[0] === opening.u && b[0] === opening.u
          && opening.v[0] >= Math.min(a[1], b[1]) && opening.v[1] <= Math.max(a[1], b[1])
      })
      assert.ok(onWall, `${floor}: opening at u = ${opening.u}, v = ${opening.v} is on a wall`)
      assert.ok(opening.y[0] >= FLOOR_LEVEL[floor] && opening.y[1] <= FLOOR_LEVEL[floor] + FLOOR_HEIGHT, `${floor}: opening height`)
      assert.ok(opening.v[1] > opening.v[0] && opening.y[1] > opening.y[0])
    }
  }
})

test('openings are real holes: solid piers, lintels and sills stay', () => {
  const boxes = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, FLOOR_HEIGHT)
  // Garage door: v in [-3.87, 0.14], up to 2.4 m, in the wall on the street line (u = -5 .. -4.7).
  assert.equal(solid(boxes, [-4.85, 1.2, -1.9]), false, 'garage door is open')
  assert.equal(solid(boxes, [-4.85, 2.8, -1.9]), true, 'lintel above the garage door')
  assert.equal(solid(boxes, [-4.85, 1.2, -4.05]), true, 'pier beside the garage door')
  // Entrance recess wall at u = -4: the window keeps a sill, the door has none.
  assert.equal(solid(boxes, [-3.85, 1, 2.85]), false, 'window is open')
  assert.equal(solid(boxes, [-3.85, .15, 2.85]), true, 'sill under the window')
  assert.equal(solid(boxes, [-3.85, 1, 1.5]), false, 'door is open')
  assert.equal(solid(boxes, [-3.85, .15, 1.5]), false, 'no sill under the door')
})

test('the cut removes everything above the section height, clamping the openings', () => {
  const boxes = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, CUT_HEIGHT)
  closeTo(Math.max(...boxes.map(box => box.center[1] + box.size[1] / 2)), CUT_HEIGHT, 1e-9)
  assert.equal(solid(boxes, [-4.85, 2, -1.9]), false, 'nothing above the cut')
  assert.equal(solid(boxes, [-4.85, .5, -1.9]), false, 'garage opening reaches the cut')
  assert.equal(solid(boxes, [-4.85, .5, -4.05]), true, 'pier reaches the cut')
})

test('the first floor has a 3 m balcony door and reaches the cut', () => {
  const door = OPENINGS.first[0]
  closeTo(door.v[1] - door.v[0], 3, 1e-9)
  const boxes = wallBoxes(FIRST_OUTLINE, OPENINGS.first, FLOOR_HEIGHT, FLOOR_HEIGHT + CUT_HEIGHT)
  assert.equal(solid(boxes, [-4.85, FLOOR_HEIGHT + .5, 1.6]), false, 'balcony door is open down to the floor')
  assert.equal(solid(boxes, [-4.85, FLOOR_HEIGHT + .5, 3.6]), true, 'wall beside the balcony door')
})

test('walls close the reflex corners of the notched outline', () => {
  const boxes = wallBoxes(GROUND_OUTLINE, [], 0, 1)
  // Inside corner of the light well at (u, v) = (4, -1): the square just inside it must be solid.
  assert.equal(solid(boxes, [3.85, .5, -1.15]), true, 'light-well corner is closed')
  // Corner of the entrance recess at (-4, 3.75): the recess itself is outside the house,
  // so the square that must be solid lies beyond the return wall, at (-3.85, 3.9).
  assert.equal(solid(boxes, [-3.85, .5, 3.9]), true, 'recess corner is closed')
  assert.equal(solid(boxes, [-4.5, .5, 3.4]), false, 'the recess itself stays open')
})

test('outlines that are not axis-aligned are rejected', () => {
  assert.throws(() => wallBoxes([[0, 0], [4, 1], [4, 5], [0, 5]], [], 0, 1), /axis-aligned/)
})
