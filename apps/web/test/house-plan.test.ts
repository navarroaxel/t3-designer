import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT, SITE_BUILDINGS, houseSouthWestEdge, type SitePoint } from '../src/data/building-site.ts'
import {
  CUT_HEIGHT, ENTRY_RECESS_OUTLINE, BATHROOM_FLOOR, LIVING_TV_PLACEMENT, LIVING_TV_SIZE, LIVING_TV, MAIN_BED, CLOSET_SLIDING_PANELS, MAIN_ROOM_CLOSET_WARDROBE, MAIN_ROOM_CLOSET, MAIN_ROOM_DRYWALL, MAIN_TV, MAIN_TV_PLACEMENT, TV_SIZE, MAIN_DOOR, FIRST_FLOOR_DOOR_SWINGS, MAIN_ROOM_SETBACK, BATHROOM_DOOR, BATHROOM_DOOR_SWING, KITCHEN_LIVING, WARDROBE_LEAVES, SECONDARY_BED, SECONDARY_DOOR, FIRST_FLOOR_BATHROOM, FIRST_FLOOR_PARTITIONS, SECONDARY_WARDROBE, FIRST_OUTLINE, FRONT_ROOMS, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, OUTLINES, WALL_THICKNESS,
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

test('the rear wall has a 1.78 m door centred on the terrace and a 2.3 m by 1.64 m window centred on the light well', () => {
  const rear = OPENINGS.first.filter(opening => opening.u === 4)
  assert.equal(rear.length, 2)
  const [door, window] = rear.sort((a, b) => a.v[0] - b.v[0])
  assert.ok(Math.abs(door.v[1] - door.v[0] - 1.78) < 1e-9)
  assert.ok(Math.abs((door.v[0] + door.v[1]) / 2 - (houseSouthWestEdge(1.8) - 1) / 2) < 1e-9, 'door centred on the terrace')
  assert.ok(Math.abs(window.v[1] - window.v[0] - 2.3) < 1e-9)
  assert.ok(Math.abs((window.v[0] + window.v[1]) / 2 - .25) < 1e-9, 'window centred on the light well (v = -1 to 1.5)')
  assert.ok(Math.abs(window.y[1] - window.y[0] - 1.64) < 1e-9)
  // The openings are cut out of the rear wall of the first floor.
  const boxes = wallBoxes(FIRST_OUTLINE, OPENINGS.first, FLOOR_HEIGHT, FLOOR_HEIGHT + CUT_HEIGHT)
  assert.ok(boxes.length > 4)
})

test('the front rooms of the first floor have the owner\'s sizes and fit inside the walls', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const { main, secondary } = FRONT_ROOMS
  near(main.v[1] - main.v[0], 5.12); near(main.u[1] - main.u[0], 4.54)
  near(secondary.u[1] - secondary.u[0], 3.41)
  assert.ok(Math.abs(secondary.v[1] - secondary.v[0] - 3.09) < .12, 'the leaning party wall costs about 0.1 m')
  // The main room is on the north-east (left from the street) and holds the 3 m balcony door.
  assert.ok(main.v[0] > secondary.v[1])
  const balcony = OPENINGS.first.find(opening => opening.u === -5 && opening.v[1] - opening.v[0] > 2.9)!
  assert.ok(balcony.v[0] >= main.v[0] && balcony.v[1] <= main.v[1])
  // The secondary room holds the 2.04 m window.
  const window = OPENINGS.first.find(opening => opening.u === -5 && opening.v[1] - opening.v[0] < 2.5)!
  near(window.v[1] - window.v[0], 2.04)
  assert.ok(window.v[0] >= secondary.v[0] && window.v[1] <= secondary.v[1])
  // Both rooms sit within the first floor's outline.
  assert.ok(secondary.v[0] >= houseSouthWestEdge(-5) + WALL_THICKNESS - .05)
  assert.ok(main.v[1] <= 4.475 - WALL_THICKNESS + 1e-9)
})

test('the first-floor slab covers the entrance recess, which the ground outline leaves open', () => {
  const [, , , recessTop] = ENTRY_RECESS_OUTLINE
  // 1 m deep between the entrance's pier and the flush wall.
  assert.ok(Math.abs(polygonArea(ENTRY_RECESS_OUTLINE)) > 1 && Math.abs(polygonArea(ENTRY_RECESS_OUTLINE)) < 4)
  const us = ENTRY_RECESS_OUTLINE.map(point => point[0]), vs = ENTRY_RECESS_OUTLINE.map(point => point[1])
  assert.ok(Math.abs(Math.max(...us) - Math.min(...us) - 1) < 1e-9)
  // The recess lies inside the first floor's block, over the main room's side of the front.
  assert.ok(Math.min(...vs) >= -4.475 && Math.max(...vs) <= 4.475 && recessTop[0] <= 4)
  // Ground outline plus recess fills the front of the first-floor block: the notch is exactly this rectangle.
  const groundFrontVs = GROUND_OUTLINE.filter(point => point[0] <= -4 && point[0] >= -5).map(point => point[1])
  assert.ok(groundFrontVs.includes(Math.max(...vs)) && groundFrontVs.includes(Math.min(...vs)))
})

test('the secondary room has a 0.60 m by 2.16 m wardrobe recessed behind its back face, flush with the party wall', () => {
  const { secondary } = FRONT_ROOMS
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(SECONDARY_WARDROBE.u[1] - SECONDARY_WARDROBE.u[0], .6)
  near(SECONDARY_WARDROBE.v[1] - SECONDARY_WARDROBE.v[0], 2.16)
  // Opposite the window, recessed behind the room's back face, on the party-wall (south-west) side.
  near(SECONDARY_WARDROBE.u[0], secondary.u[1])
  near(SECONDARY_WARDROBE.v[0], secondary.v[0])
  assert.ok(SECONDARY_WARDROBE.v[1] < secondary.v[1], 'it leaves part of the wall free')
  // The room keeps its size.
  near(secondary.u[1] - secondary.u[0], 3.41)
  assert.ok(Math.abs(secondary.v[1] - secondary.v[0] - 3.09) < .12, 'the leaning party wall costs about 0.1 m')
})

test('the bathroom is 2.16 m by 1.50 m, behind the wardrobe and against the party wall', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const { secondary } = FRONT_ROOMS
  near(FIRST_FLOOR_BATHROOM.v[1] - FIRST_FLOOR_BATHROOM.v[0], 2.16)
  near(FIRST_FLOOR_BATHROOM.u[1] - FIRST_FLOOR_BATHROOM.u[0], 1.5)
  // Flush with the party wall, as wide as the wardrobe, and on the far side of the room's back wall.
  near(FIRST_FLOOR_BATHROOM.v[0], secondary.v[0])
  near(FIRST_FLOOR_BATHROOM.v[1] - FIRST_FLOOR_BATHROOM.v[0], SECONDARY_WARDROBE.v[1] - SECONDARY_WARDROBE.v[0])
  // It starts after the wardrobe's recess and the wardrobe's 0.12 m back panel.
  near(FIRST_FLOOR_BATHROOM.u[0], SECONDARY_WARDROBE.u[1] + .12)
  // It stays clear of the main room and inside the first floor's block (u up to 4).
  assert.ok(FIRST_FLOOR_BATHROOM.v[1] + .12 < FRONT_ROOMS.main.v[0] - .12)
  assert.ok(FIRST_FLOOR_BATHROOM.u[1] + .12 <= 4)
  // Its back wall is one of the partitions, closing the full width plus the north-east wall.
  assert.ok(FIRST_FLOOR_PARTITIONS.some(([u0, , v0, v1]) => Math.abs(u0 - FIRST_FLOOR_BATHROOM.u[1]) < 1e-9 && v0 <= FIRST_FLOOR_BATHROOM.v[0] + 1e-9 && v1 >= FIRST_FLOOR_BATHROOM.v[1]))
})

test('the secondary room\'s 0.70 m door is on the back wall, next to the wardrobe on its north-east side', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const { secondary } = FRONT_ROOMS
  near(SECONDARY_DOOR.v[1] - SECONDARY_DOOR.v[0], .7)
  near(SECONDARY_DOOR.u[0], secondary.u[1])
  assert.ok(SECONDARY_DOOR.v[0] >= SECONDARY_WARDROBE.v[1], 'to the left of the wardrobe, seen from the window')
  assert.ok(SECONDARY_DOOR.v[1] <= secondary.v[1], 'and inside the room\'s width')
  // No partition blocks the door.
  for (const [u0, u1, v0, v1] of FIRST_FLOOR_PARTITIONS) {
    const overlapsU = u0 < SECONDARY_DOOR.u[1] - 1e-9 && u1 > SECONDARY_DOOR.u[0] + 1e-9
    const overlapsV = v0 < SECONDARY_DOOR.v[1] - 1e-9 && v1 > SECONDARY_DOOR.v[0] + 1e-9
    assert.ok(!(overlapsU && overlapsV), 'the door opening is free of walls')
  }
})

test('the single bed has its head against the party wall, centred on it, and clears the wardrobe and the door', () => {
  const { secondary } = FRONT_ROOMS
  const near = (p: number, q: number) => assert.ok(Math.abs(p - q) < 1e-9, `${p} vs ${q}`)
  assert.ok(SECONDARY_BED.u[0] >= secondary.u[0] - 1e-9 && SECONDARY_BED.u[1] <= secondary.u[1])
  assert.ok(SECONDARY_BED.v[0] >= secondary.v[0] - 1e-9 && SECONDARY_BED.v[1] <= secondary.v[1])
  // 1 plaza: 0.90 m by 1.90 m, the long side running away from the wall.
  near(SECONDARY_BED.u[1] - SECONDARY_BED.u[0], .9); near(SECONDARY_BED.v[1] - SECONDARY_BED.v[0], 1.9)
  // Head against the party wall, and centred on the wall's length (the room's depth).
  near(SECONDARY_BED.v[0], secondary.v[0])
  near((SECONDARY_BED.u[0] + SECONDARY_BED.u[1]) / 2, (secondary.u[0] + secondary.u[1]) / 2)
  // The wardrobe's leaves stay clear, and so does the door on the back wall.
  assert.ok(SECONDARY_WARDROBE.u[0] - SECONDARY_BED.u[1] >= 1)
  assert.ok(SECONDARY_BED.v[1] < SECONDARY_DOOR.v[0])
})

test('nothing in the secondary room or the bathroom enters the party wall', () => {
  const inner = FIRST_OUTLINE[0][1] + WALL_THICKNESS
  for (const [name, v0] of [
    ['room', FRONT_ROOMS.secondary.v[0]], ['wardrobe', SECONDARY_WARDROBE.v[0]], ['bed', SECONDARY_BED.v[0]], ['bathroom', FIRST_FLOOR_BATHROOM.v[0]],
  ] as const) assert.ok(v0 >= inner - 1e-9, `${name} stays inside the party wall's inner face`)
  // The door still fits in the wall beside the wardrobe.
  assert.ok(SECONDARY_DOOR.v[0] >= SECONDARY_WARDROBE.v[1] + .12 - 1e-9 && SECONDARY_DOOR.v[1] <= FRONT_ROOMS.secondary.v[1] + 1e-9)
})

test('the wardrobe has three doors of two leaves that fill its width without overlapping', () => {
  assert.equal(WARDROBE_LEAVES.length, 6)
  for (const [index, [v0, v1]] of WARDROBE_LEAVES.entries()) {
    assert.ok(v1 > v0 && v0 >= SECONDARY_WARDROBE.v[0] && v1 <= SECONDARY_WARDROBE.v[1], `leaf ${index} inside the wardrobe`)
    if (index > 0) assert.ok(v0 >= WARDROBE_LEAVES[index - 1][1], `leaf ${index} clear of the previous one`)
  }
  const width = WARDROBE_LEAVES[0][1] - WARDROBE_LEAVES[0][0]
  assert.ok(Math.abs(width - (2.16 / 6 - .005)) < 1e-9, 'six equal leaves')
})

test('the kitchen-living is one long room from party wall to party wall behind the bathroom', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(KITCHEN_LIVING.v[0], FIRST_FLOOR_BATHROOM.v[0])
  near(KITCHEN_LIVING.v[1], 4.475 - .3)
  near(KITCHEN_LIVING.u[0], FIRST_FLOOR_BATHROOM.u[1] + .12)
  // 8.2 m across and about 2.7 m deep: a long room.
  assert.ok(KITCHEN_LIVING.v[1] - KITCHEN_LIVING.v[0] > 8 && KITCHEN_LIVING.u[1] - KITCHEN_LIVING.u[0] > 2.5 && KITCHEN_LIVING.u[1] - KITCHEN_LIVING.u[0] < 3)
  // The wall in front of it runs the whole width; nothing partitions the room itself.
  assert.ok(FIRST_FLOOR_PARTITIONS.some(([u0, , v0, v1]) => Math.abs(u0 - FIRST_FLOOR_BATHROOM.u[1]) < 1e-9 && v0 <= KITCHEN_LIVING.v[0] + 1e-9 && v1 >= KITCHEN_LIVING.v[1] - 1e-9))
  assert.ok(FIRST_FLOOR_PARTITIONS.every(([u0]) => u0 < KITCHEN_LIVING.u[0]))
  // The terrace door and the light-well window are in it.
  for (const opening of OPENINGS.first.filter(item => item.u === 4)) assert.ok(opening.v[0] >= KITCHEN_LIVING.v[0] && opening.v[1] <= KITCHEN_LIVING.v[1])
})

test('the bathroom has a 0.70 m door on its north-east wall, toward the wardrobe, facing the hall', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(BATHROOM_DOOR.u[1] - BATHROOM_DOOR.u[0], .7)
  // Closer to the wardrobe than to the bathroom's back wall, and inside the wall's length.
  assert.ok(BATHROOM_DOOR.u[0] - FIRST_FLOOR_BATHROOM.u[0] < FIRST_FLOOR_BATHROOM.u[1] - BATHROOM_DOOR.u[1])
  assert.ok(BATHROOM_DOOR.u[0] >= FIRST_FLOOR_BATHROOM.u[0] && BATHROOM_DOOR.u[1] <= FIRST_FLOOR_BATHROOM.u[1])
  // On the wall that faces the rest of the house, not the party wall.
  near(BATHROOM_DOOR.v[0], FIRST_FLOOR_BATHROOM.v[1])
  // The hall lies beyond it: the main room's back wall (u = -0.16 to -0.04) is behind the door's edge, not across it.
  assert.ok(BATHROOM_DOOR.v[1] < FRONT_ROOMS.main.v[0])
  for (const [u0, u1, v0, v1] of FIRST_FLOOR_PARTITIONS) {
    const blocks = u0 < BATHROOM_DOOR.u[1] - 1e-9 && u1 > BATHROOM_DOOR.u[0] + 1e-9 && v0 < BATHROOM_DOOR.v[1] - 1e-9 && v1 > BATHROOM_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the door opening is free of walls')
  }
})

test('the bathroom door is hinged on the wardrobe side and swings into the bathroom', () => {
  assert.equal(BATHROOM_DOOR_SWING.hingeU, BATHROOM_DOOR.u[0])
  // The leaf, 0.70 m long, swings toward lower v: into the bathroom, not the hall.
  const leafEnd = BATHROOM_DOOR_SWING.hingeV - BATHROOM_DOOR_SWING.radius
  assert.ok(leafEnd > FIRST_FLOOR_BATHROOM.v[0] + .3, 'the open leaf stays inside the bathroom')
  assert.ok(Math.abs(BATHROOM_DOOR_SWING.hingeU - FIRST_FLOOR_BATHROOM.u[0] - .05) < 1e-9, '5 cm from the wardrobe')
})

test('the main room\'s wall steps back 20 cm along the hall, which is wider there than beside the secondary room', () => {
  const { main, secondary } = FRONT_ROOMS
  assert.ok(Math.abs(MAIN_ROOM_SETBACK - .2) < 1e-9)
  // The wall between the main and secondary rooms stays where it was; the stretch past the secondary room is 20 cm further north-east.
  const before = FIRST_FLOOR_PARTITIONS.find(([u0, u1, v0]) => Math.abs(u0 - main.u[0]) < 1e-9 && Math.abs(u1 - secondary.u[1]) < 1e-9 && Math.abs(v0 - (main.v[0] - .12)) < 1e-9)
  const after = FIRST_FLOOR_PARTITIONS.find(([u0, , v0]) => Math.abs(u0 - secondary.u[1]) < 1e-9 && Math.abs(v0 - (main.v[0] - .12 + .2)) < 1e-9)
  assert.ok(before && after)
  // The hall is wider along the main room's wall than the 0.59 m of the stretch between the bathroom and the room's old wall.
  const hallWidth = after![2] + .12 - (FIRST_FLOOR_BATHROOM.v[1] + .12) - .12 + .12
  assert.ok(hallWidth - (main.v[0] - (FIRST_FLOOR_BATHROOM.v[1] + .12)) > .19)
})

test('the main room\'s 0.80 m wenge door is on the wall that steps back, and all three doors are right-handed and swing clear', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(MAIN_DOOR.u[1] - MAIN_DOOR.u[0], .8)
  // On the stepped-back wall, past the secondary room's back face and inside the main room's depth.
  assert.ok(MAIN_DOOR.u[0] >= FRONT_ROOMS.secondary.u[1] + .12 - 1e-9 && MAIN_DOOR.u[1] <= FRONT_ROOMS.main.u[1] + 1e-9)
  near(MAIN_DOOR.v[1], FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK)
  for (const [u0, u1, v0, v1] of FIRST_FLOOR_PARTITIONS) {
    const blocks = u0 < MAIN_DOOR.u[1] - 1e-9 && u1 > MAIN_DOOR.u[0] + 1e-9 && v0 < MAIN_DOOR.v[1] - 1e-9 && v1 > MAIN_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the main door opening is free of walls')
  }
  // Right hand for someone coming in along `open`. The house frame [u, v] is right-handed seen from above (v is u turned
  // 90 degrees counter-clockwise), so the walker's left is (-open_v, open_u); hinged on the right, the closed leaf
  // extends from the hinge toward that left.
  assert.equal(FIRST_FLOOR_DOOR_SWINGS.length, 3)
  for (const door of FIRST_FLOOR_DOOR_SWINGS) {
    near(-door.open[1], door.closed[0]); near(door.open[0], door.closed[1])
    near(Math.hypot(...door.closed), 1); near(Math.hypot(...door.open), 1)
  }
})

test('the 55 inch TV is a 16:9 screen hung on the shared wall, centred on it, facing the main room', () => {
  const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
  // 55 inches diagonal: 1.218 m by 0.685 m.
  near(Math.hypot(TV_SIZE.width, TV_SIZE.height), 55 * .0254)
  near(TV_SIZE.width / TV_SIZE.height, 16 / 9)
  near(TV_SIZE.width, 1.218, .002); near(TV_SIZE.height, .685, .002)
  assert.equal(MAIN_TV.model, 'Samsung OLED S90')
  const { main, secondary } = FRONT_ROOMS
  // Centred between the front wall and the hall-side wall (the room's whole depth), and still on the shared wall.
  near((MAIN_TV_PLACEMENT.u[0] + MAIN_TV_PLACEMENT.u[1]) / 2, (main.u[0] + main.u[1]) / 2)
  assert.ok(MAIN_TV_PLACEMENT.u[0] > main.u[0] && MAIN_TV_PLACEMENT.u[1] < secondary.u[1])
  // On the main room's side, held off the wall by its bracket.
  near(MAIN_TV_PLACEMENT.bracket.v[0], main.v[0]); near(MAIN_TV_PLACEMENT.v[0], main.v[0] + .03)
  assert.ok(MAIN_TV_PLACEMENT.v[1] < main.v[1])
  // It hangs clear of the floor and stays under the 1.5 m cut, so it shows whole.
  assert.ok(MAIN_TV_PLACEMENT.y[0] > FLOOR_HEIGHT + .5 && MAIN_TV_PLACEMENT.y[1] < FLOOR_HEIGHT + 1.5)
})

test('a 0.10 m drywall wall divides the main room, 1.5 m from the party wall with neighbour A', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const [u0, u1, v0, v1] = MAIN_ROOM_DRYWALL
  const { main } = FRONT_ROOMS
  near(v1 - v0, .1)
  // 1.5 m from the party wall's inner face (v = 4.175) to the drywall's near face.
  near(main.v[1] - v1, 1.5)
  // It runs from the back wall toward the street and stops 0.70 m short of the front wall: the closet's only way in.
  near(u0 - main.u[0], .7); near(u1, main.u[1])
  assert.ok(v0 > main.v[0] && v1 < main.v[1])
  assert.ok(FIRST_FLOOR_PARTITIONS.some(wall => wall === MAIN_ROOM_DRYWALL))
})

test('the walk-in closet is the 1.5 m strip along the party wall, reached only through a 0.70 m passage at the front', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const { main } = FRONT_ROOMS
  near(MAIN_ROOM_CLOSET.v[1] - MAIN_ROOM_CLOSET.v[0], 1.5)
  near(MAIN_ROOM_CLOSET.v[1], main.v[1])
  // Its passage is the gap between the front wall and the end of the drywall, 0.70 m wide.
  near(MAIN_ROOM_DRYWALL[0] - main.u[0], .7)
  // No door anywhere on the closet: no door swing or opening lies along the drywall.
  for (const door of FIRST_FLOOR_DOOR_SWINGS) assert.ok(door.hinge[1] < MAIN_ROOM_CLOSET.v[0] || door.hinge[1] > MAIN_ROOM_CLOSET.v[1] + 1, `${door.id} is not the closet's`)
  // The balcony door lies partly in the closet's strip, next to the passage.
  const balcony = OPENINGS.first.find(opening => opening.u === -5 && opening.v[1] - opening.v[0] > 2.9)!
  assert.ok(balcony.v[1] > MAIN_ROOM_CLOSET.v[0] && balcony.v[0] < MAIN_ROOM_CLOSET.v[0])
})

test('the closet has a 0.60 m wardrobe along the whole party wall with neighbour A, leaving 0.90 m to walk', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(MAIN_ROOM_CLOSET_WARDROBE.v[1] - MAIN_ROOM_CLOSET_WARDROBE.v[0], .6)
  near(MAIN_ROOM_CLOSET_WARDROBE.v[1], MAIN_ROOM_CLOSET.v[1])
  // The whole depth of the room, from the front wall to the back wall.
  near(MAIN_ROOM_CLOSET_WARDROBE.u[0], FRONT_ROOMS.main.u[0]); near(MAIN_ROOM_CLOSET_WARDROBE.u[1], FRONT_ROOMS.main.u[1])
  near(MAIN_ROOM_CLOSET_WARDROBE.v[0] - MAIN_ROOM_DRYWALL[3], .9)
})

test('the closet wardrobe has sliding panels on two tracks that cover its length with small overlaps', () => {
  const [u0, u1] = MAIN_ROOM_CLOSET_WARDROBE.u
  assert.equal(CLOSET_SLIDING_PANELS.length, 5)
  assert.ok(Math.abs(CLOSET_SLIDING_PANELS[0].u[0] - u0) < 1e-9 && Math.abs(CLOSET_SLIDING_PANELS[4].u[1] - u1) < 1e-9)
  for (const [index, panel] of CLOSET_SLIDING_PANELS.entries()) {
    // On the aisle side of the wardrobe, on one of two tracks, alternating.
    assert.ok(panel.v[1] <= MAIN_ROOM_CLOSET_WARDROBE.v[0] + 1e-9, 'in front of the wardrobe, not inside it')
    assert.equal(panel.front, index % 2 === 0)
    if (index > 0) {
      const previous = CLOSET_SLIDING_PANELS[index - 1]
      assert.ok(panel.u[0] < previous.u[1], 'neighbouring panels overlap a little, with no gap')
      assert.notEqual(panel.v[0], previous.v[0], 'and run on different tracks')
    }
  }
})

test('the queen bed has its head on the drywall wall, centred like the TV, and leaves the room usable', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(MAIN_BED.u[1] - MAIN_BED.u[0], 1.6); near(MAIN_BED.v[1] - MAIN_BED.v[0], 2)
  // Head against the drywall's face toward the TV, and centred on the same line as the TV.
  near(MAIN_BED.v[1], MAIN_ROOM_DRYWALL[2])
  near((MAIN_BED.u[0] + MAIN_BED.u[1]) / 2, (MAIN_TV_PLACEMENT.u[0] + MAIN_TV_PLACEMENT.u[1]) / 2)
  // Within the drywall's length, so the wall is behind its whole head.
  assert.ok(MAIN_BED.u[0] >= MAIN_ROOM_DRYWALL[0] && MAIN_BED.u[1] <= MAIN_ROOM_DRYWALL[1])
  // At least a metre of floor between the foot and the TV, and the hall door swing (0.8 m) stays clear.
  assert.ok(MAIN_BED.v[0] - (FRONT_ROOMS.main.v[0] + .06) >= 1)
  assert.ok(MAIN_BED.u[1] < MAIN_DOOR.u[0] - .3)
})

test('the 65 inch TV in the living hangs on the party wall on the bathroom\'s side, centred on the living\'s depth', () => {
  const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
  near(Math.hypot(LIVING_TV_SIZE.width, LIVING_TV_SIZE.height), 65 * .0254)
  near(LIVING_TV_SIZE.width, 1.439, .002); near(LIVING_TV_SIZE.height, .809, .002)
  assert.equal(LIVING_TV.inches, 65)
  // On the south-west party wall (the bathroom's side), held off it by its bracket, facing into the living.
  near(LIVING_TV_PLACEMENT.bracket.v[0], KITCHEN_LIVING.v[0]); near(LIVING_TV_PLACEMENT.v[0], KITCHEN_LIVING.v[0] + .03)
  // Centred on the living's depth, between the bathroom's back wall and the rear wall.
  near((LIVING_TV_PLACEMENT.u[0] + LIVING_TV_PLACEMENT.u[1]) / 2, (KITCHEN_LIVING.u[0] + KITCHEN_LIVING.u[1]) / 2)
  assert.ok(LIVING_TV_PLACEMENT.u[0] > KITCHEN_LIVING.u[0] && LIVING_TV_PLACEMENT.u[1] < KITCHEN_LIVING.u[1])
  assert.ok(LIVING_TV_PLACEMENT.y[0] > FLOOR_HEIGHT + .5 && LIVING_TV_PLACEMENT.y[1] < FLOOR_HEIGHT + 1.5)
})

test('the bathroom floor is a thin travertine-coloured porcelain layer', () => {
  assert.ok(BATHROOM_FLOOR.thickness > 0 && BATHROOM_FLOOR.thickness < .03)
  // Travertine is a warm, light beige: red above green above blue, all fairly high.
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(BATHROOM_FLOOR.color.slice(index, index + 2), 16))
  assert.ok(red > green && green > blue && blue > 140 && red < 245)
})
