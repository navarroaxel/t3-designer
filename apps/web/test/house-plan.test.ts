import assert from 'node:assert/strict'
import test from 'node:test'
import { ENTRY_RECESS, FLOOR_HEIGHT, PARTY_WALL, SITE_BUILDINGS, WELL_BACK_U, WELL_BACK_WALL, houseSouthWestEdge, type SitePoint } from '../src/data/building-site.ts'
import {
  BALCONY, GROUND_BATHROOM, GROUND_BATHROOM_DOOR, GROUND_PANTRY, PANTRY, PANTRY_DOOR, LIVING_KITCHEN_DOOR, GROUND_LIVING, GROUND_LIVING_WALL, STAIRWELL_HOLE, HALL_ARCH, RIGHT_ARM_WINDOW_WIDTH, OFFICE_WINDOW_HEIGHT, OFFICE_WINDOW_SILL, OFFICE_WINDOW_WIDTH, SIDE_OPENINGS, GARAGE_DOOR, GROUND_DOOR_SWINGS, OFFICE_DOOR, GROUND_OFFICE, GROUND_OFFICE_WALL, LIGHT_WELL_DOOR_WIDTH, GARAGE, GROUND_BACK_WALL, GROUND_GARAGE, GROUND_HALL, GROUND_PARTITIONS, CUT_HEIGHT, ENTRY_RECESS_OUTLINE, LAUNDRY_DOOR_WIDTH, LIVING_DOOR_FRAME, LIVING_DOOR, LIVING_DOOR_LEAVES, BATHROOM_FLOOR, FLOOR_TILING, NAVONA_TILES, SAING_PLANKS, LIVING_TV_PLACEMENT, LIVING_TV_SIZE, LIVING_TV, MAIN_BED, CLOSET_SLIDING_PANELS, MAIN_ROOM_CLOSET_WARDROBE, MAIN_ROOM_CLOSET, MAIN_ROOM_DRYWALL, MAIN_TV, MAIN_TV_PLACEMENT, TV_SIZE, MAIN_DOOR, FIRST_FLOOR_DOOR_SWINGS, MAIN_ROOM_SETBACK, BATHROOM_DOOR, BATHROOM_DOOR_SWING, KITCHEN_LIVING, WARDROBE_LEAVES, SECONDARY_BED, SECONDARY_DOOR, FIRST_FLOOR_BATHROOM, FIRST_FLOOR_PARTITIONS, SECONDARY_WARDROBE, FIRST_OUTLINE, FRONT_ROOMS, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, OUTLINES, WALL_THICKNESS,
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
  closeTo(Math.abs(polygonArea(GROUND_OUTLINE)), siteArea('HOUSE') + siteArea('HOUSE-ARM') + siteArea('HOUSE-TERRACE') + siteArea('HOUSE-WELL-BACK'), 1)
  closeTo(Math.abs(polygonArea(FIRST_OUTLINE)), siteArea('HOUSE') + siteArea('HOUSE-ENTRY'), 1)
  // First floor: the 9 m x 8.66 m house; the roof's 1 m cantilever is not a floor.
  closeTo(Math.abs(polygonArea(FIRST_OUTLINE)), 9 * (4.33 - houseSouthWestEdge(1.8)), 1e-6)
  // Ground floor: the same footprint at the front, less the recess, plus the rear band.
  assert.ok(Math.abs(polygonArea(GROUND_OUTLINE)) > Math.abs(polygonArea(FIRST_OUTLINE)))
})

test('exterior walls sit inside each outline; the party walls are 0.15 m of this lot\'s and the others 0.3 m', () => {
  for (const floor of floors) {
    const boxes = wallBoxes(OUTLINES[floor], OPENINGS[floor], FLOOR_LEVEL[floor], FLOOR_LEVEL[floor] + FLOOR_HEIGHT)
    assert.ok(boxes.length > 8, `${floor}: walls all round`)
    for (const box of boxes) {
      assert.ok(contains([box.center[0], box.center[2]], OUTLINES[floor]), `${floor}: wall inside the outline`)
      const thickness = Math.min(box.size[0], box.size[2])
      assert.ok([WALL_THICKNESS, PARTY_WALL, WELL_BACK_WALL].some(expected => Math.abs(thickness - expected) < 1e-9), `${floor}: wall ${thickness} m thick`)
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
  // Inside corner of the light well at (u, v) = (4.46, -1): the square just inside it must be solid.
  assert.equal(solid(boxes, [4.37, .5, -1.15]), true, 'light-well corner is closed')
  // Corner of the entrance recess at (-4, 3.75): the recess itself is outside the house,
  // so the square that must be solid lies beyond the return wall, at (-3.85, 3.9).
  assert.equal(solid(boxes, [-3.85, .5, 3.9]), true, 'recess corner is closed')
  assert.equal(solid(boxes, [-4.5, .5, 3.4]), false, 'the recess itself stays open')
})

test('outlines that are not axis-aligned are rejected', () => {
  assert.throws(() => wallBoxes([[0, 0], [4, 1], [4, 5], [0, 5]], [], 0, 1), /axis-aligned/)
})

test('the rear wall has a 1.78 m door centred on the terrace and a 2.3 m by 1.64 m window centred on the light well', () => {
  const rear = OPENINGS.first.filter(opening => opening.u === 4 && Math.abs(opening.v[1] - opening.v[0] - LAUNDRY_DOOR_WIDTH) > 1e-9)
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
  assert.ok(secondary.v[0] >= houseSouthWestEdge(-5) + PARTY_WALL - .05)
  assert.ok(main.v[1] <= 4.33 - PARTY_WALL + 1e-9)
})

test('the first-floor slab covers the entrance recess, which the ground outline leaves open', () => {
  const [, , , recessTop] = ENTRY_RECESS_OUTLINE
  // 1 m deep between the entrance's pier and the flush wall.
  assert.ok(Math.abs(polygonArea(ENTRY_RECESS_OUTLINE)) > 1 && Math.abs(polygonArea(ENTRY_RECESS_OUTLINE)) < 4)
  const us = ENTRY_RECESS_OUTLINE.map(point => point[0]), vs = ENTRY_RECESS_OUTLINE.map(point => point[1])
  assert.ok(Math.abs(Math.max(...us) - Math.min(...us) - 1) < 1e-9)
  // The recess lies inside the first floor's block, over the main room's side of the front.
  assert.ok(Math.min(...vs) >= -4.33 && Math.max(...vs) <= 4.33 && recessTop[0] <= 4)
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
  const inner = FIRST_OUTLINE[0][1] + PARTY_WALL
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
  near(KITCHEN_LIVING.v[1], 4.33 - .15)
  near(KITCHEN_LIVING.u[0], FIRST_FLOOR_BATHROOM.u[1] + .12)
  // 8.2 m across and about 2.7 m deep: a long room.
  assert.ok(KITCHEN_LIVING.v[1] - KITCHEN_LIVING.v[0] > 8 && KITCHEN_LIVING.u[1] - KITCHEN_LIVING.u[0] > 2.5 && KITCHEN_LIVING.u[1] - KITCHEN_LIVING.u[0] < 3)
  // The wall in front of it runs the whole width, except for the door to the hall; nothing partitions the room itself.
  const front = FIRST_FLOOR_PARTITIONS.filter(([u0]) => Math.abs(u0 - FIRST_FLOOR_BATHROOM.u[1]) < 1e-9 && u0 >= FIRST_FLOOR_BATHROOM.u[1])
  const covered = front.reduce((sum, [, , v0, v1]) => sum + (v1 - v0), 0) + (LIVING_DOOR.v[1] - LIVING_DOOR.v[0])
  assert.ok(Math.abs(covered - (KITCHEN_LIVING.v[1] - KITCHEN_LIVING.v[0])) < 1e-6, 'the wall and the door fill the width')
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

test('the main room\'s 0.80 m wenge door is on the wall that steps back, and all five doors are right-handed and swing clear', () => {
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
  assert.equal(FIRST_FLOOR_DOOR_SWINGS.length, 5)
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
  // 1.5 m from the party wall's inner face (v = 4.18) to the drywall's near face.
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

test('the floors are Saing almendra and Saing miel planks of 20 by 120 cm and Navona natural tiles of 80 by 80 cm, without overlapping', () => {
  const colors = Object.fromEntries(FLOOR_TILING.map(zone => [zone.id, zone.color]))
  assert.deepEqual(Object.keys(colors).sort(), ['bathroom', 'bedrooms', 'hall', 'laundry', 'living', 'terrace'])
  // The first-floor terrace has the bathroom's tile.
  assert.equal(colors.terrace, colors.bathroom)
  // So does the laundry.
  assert.equal(colors.laundry, colors.bathroom)
  assert.equal(FLOOR_TILING.find(zone => zone.id === 'laundry')!.pattern, NAVONA_TILES)
  assert.equal(FLOOR_TILING.find(zone => zone.id === 'terrace')!.pattern, NAVONA_TILES)
  assert.equal(colors.bathroom, BATHROOM_FLOOR.color)
  // The bedrooms and the living are laid with 20 cm by 120 cm wood-look planks; the bathroom with 80 cm squares.
  assert.ok(SAING_PLANKS.length === 1.2 && SAING_PLANKS.width === .2 && !SAING_PLANKS.veins)
  assert.ok(NAVONA_TILES.length === .8 && NAVONA_TILES.width === .8 && NAVONA_TILES.veins, 'travertine veins, 80 by 80')
  assert.equal(FLOOR_TILING.find(zone => zone.id === 'bathroom')!.pattern, NAVONA_TILES)
  assert.deepEqual(FLOOR_TILING.filter(zone => zone.pattern === SAING_PLANKS).map(zone => zone.id).sort(), ['bedrooms', 'hall', 'living'])
  // The hall has the living's floor.
  assert.equal(colors.hall, colors.living)
  // Almond is light and warm; honey is darker and more saturated than the almond.
  const luminance = (color: string) => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16)).reduce((sum, value) => sum + value, 0)
  assert.ok(luminance(colors.bedrooms) > luminance(colors.living))
  const rects = FLOOR_TILING.flatMap(zone => zone.rects.map(rect => ({ zone: zone.id, rect })))
  for (const [index, a] of rects.entries()) for (const b of rects.slice(index + 1)) {
    const overlapU = Math.min(a.rect[1], b.rect[1]) - Math.max(a.rect[0], b.rect[0])
    const overlapV = Math.min(a.rect[3], b.rect[3]) - Math.max(a.rect[2], b.rect[2])
    assert.ok(!(overlapU > 1e-6 && overlapV > 1e-6), `${a.zone} and ${b.zone} tiles overlap`)
  }
  // Every indoor rectangle stays inside the first floor's block; the terrace and the laundry lie beyond its rear wall.
  for (const { rect, zone } of rects.filter(item => item.zone !== 'terrace' && item.zone !== 'laundry')) assert.ok(rect[0] >= -5 && rect[1] <= 4 && rect[2] >= -4.5 && rect[3] <= 4.475, `${zone} inside the block`)
})

test('the terrace floor lies over the rear band, between its two walls', () => {
  const [u0, u1, v0, v1] = FLOOR_TILING.find(zone => zone.id === 'terrace')!.rects[0]
  assert.ok(Math.abs(u0 - 4) < 1e-9 && u1 > 8 && u1 < 9)
  // Between the 1.6 m wall on the party wall and the 1.1 m railing wall over the light well (v = -1).
  assert.ok(v0 < -4 && v0 > -4.5 && Math.abs(v1 - (-1.15)) < 1e-9)
})

test('the door between the hall and the living is 30 cm from the bathroom, partly faces the secondary room\'s door and clears the walls', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(LIVING_DOOR.v[1] - LIVING_DOOR.v[0], 1.2)
  near(LIVING_DOOR_LEAVES.wide, .8); near(LIVING_DOOR_LEAVES.narrow, .4)
  // It lies in the wall between the hall and the living and covers the span of the secondary room's door: they face each other.
  near(LIVING_DOOR.u[0], FIRST_FLOOR_BATHROOM.u[1])
  // It stands 30 cm from the bathroom's north-east wall, toward the north-east, and still partly faces the secondary room's door.
  near(LIVING_DOOR.v[0] - (FIRST_FLOOR_BATHROOM.v[1] + .12), .3)
  const facing = Math.min(LIVING_DOOR.v[1], SECONDARY_DOOR.v[1]) - Math.max(LIVING_DOOR.v[0], SECONDARY_DOOR.v[0])
  assert.ok(facing > .25, 'still partly faces the secondary room\'s door')
  // It does not cut into the bathroom, which ends at its north-east wall.
  assert.ok(LIVING_DOOR.v[0] >= FIRST_FLOOR_BATHROOM.v[1] + .12 - 1e-9)
  for (const [u0, u1, v0, v1] of FIRST_FLOOR_PARTITIONS) {
    const blocks = u0 < LIVING_DOOR.u[1] - 1e-9 && u1 > LIVING_DOOR.u[0] + 1e-9 && v0 < LIVING_DOOR.v[1] - 1e-9 && v1 > LIVING_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the living door opening is free of walls')
  }
  // The wide leaf is hinged on the south-west end and swings into the living.
  const swing = FIRST_FLOOR_DOOR_SWINGS.find(door => door.id === 'living')!
  near(swing.hinge[1], LIVING_DOOR.v[0]); near(swing.hinge[0], LIVING_DOOR.u[1]); near(swing.radius, LIVING_DOOR_LEAVES.wide)
  assert.deepEqual(swing.open, [1, 0])
})

test('the living and laundry doors are white aluminium frames with glass, and only those doors are glazed', () => {
  assert.equal(LIVING_DOOR_FRAME.material, 'aluminium')
  assert.ok(LIVING_DOOR_FRAME.glassOpacity > .1 && LIVING_DOOR_FRAME.glassOpacity < .6, 'translucent enough to read as glass')
  assert.ok(LIVING_DOOR_FRAME.profile > .02 && LIVING_DOOR_FRAME.profile < .08, 'a slim aluminium profile')
  assert.deepEqual(FIRST_FLOOR_DOOR_SWINGS.filter(door => door.glazed).map(door => door.id).sort(), ['laundry', 'living'])
})

test('the laundry door is 0.80 m, single-leaf, right-handed and 1.30 m from the party wall, on the rear wall', () => {
  const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
  const door = OPENINGS.first.find(opening => opening.u === 4 && Math.abs(opening.v[1] - opening.v[0] - .8) < 1e-9)!
  near(door.y[1] - door.y[0], 2.1)
  // 1.30 m from the party wall's inner face (v = 4.18) to the door's nearer edge.
  near(KITCHEN_LIVING.v[1] - door.v[1], 1.3)
  assert.ok(door.v[0] >= KITCHEN_LIVING.v[0] && door.v[1] <= KITCHEN_LIVING.v[1])
  for (const other of OPENINGS.first.filter(opening => opening.u === 4 && opening !== door)) assert.ok(other.v[1] < door.v[0] || other.v[0] > door.v[1], 'clear of the other openings')
  const swing = FIRST_FLOOR_DOOR_SWINGS.find(item => item.id === 'laundry')!
  near(swing.radius, .8); near(swing.hinge[1], door.v[0]); near(swing.hinge[0], 4)
  assert.deepEqual(swing.open, [1, 0])
})

test('the first-floor balcony is 7.94 m wide and 0.86 m deep, centred on the facade and in front of the street line', () => {
  assert.ok(Math.abs(BALCONY.width - 7.94) < 1e-9 && Math.abs(BALCONY.depth - .86) < 1e-9)
  // Narrower than the 8.66 m facade, so it fits the front, and it never reaches the balcony door's walls.
  assert.ok(BALCONY.width < 8.66 && BALCONY.width > 3.1)
  // It carries the 3 m balcony door and the window of the secondary room.
  for (const opening of OPENINGS.first.filter(item => item.u === -5)) assert.ok(opening.v[0] >= -BALCONY.width / 2 && opening.v[1] <= BALCONY.width / 2, 'the balcony reaches every front opening')
})

test('the laundry floor lies beyond the rear wall, on the left band, and includes the laundry door\'s way in', () => {
  const [u0, u1, v0, v1] = FLOOR_TILING.find(zone => zone.id === 'laundry')!.rects[0]
  assert.ok(Math.abs(u0 - 4) < 1e-9 && u1 > 8 && u1 < 9)
  assert.ok(v0 >= 1.5 && v1 <= 4.33, 'on the left ground-floor band, past the light well')
  const door = OPENINGS.first.find(opening => opening.u === 4 && Math.abs(opening.v[1] - opening.v[0] - LAUNDRY_DOOR_WIDTH) < 1e-9)!
  assert.ok(door.v[0] >= v0 && door.v[1] <= v1, 'the laundry door opens onto it')
})

test('the ground floor has a 5.69 m deep, 4.43 m wide garage and a 3.7 m wide hall to its left, both ending at the same back wall', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(GROUND_GARAGE.u[1] - GROUND_GARAGE.u[0], 5.69)
  // The hall is 3.7 m wide and the garage 4.43 m (owner); what is left between them, about 18 cm, is the wall that separates them.
  near(GROUND_HALL.v[1] - GROUND_HALL.v[0], 3.7)
  near(GROUND_GARAGE.v[1] - GROUND_GARAGE.v[0], 4.43)
  assert.equal(GARAGE.depth, 5.69)
  // The recess's side wall on the garage's side continues to the back wall, so the recess starts where the garage's wall ends.
  near(GROUND_HALL.v[0], ENTRY_RECESS.inner)
  // Against the south-west party wall, under the secondary room.
  near(GROUND_GARAGE.v[0], FRONT_ROOMS.secondary.v[0])
  // The hall is to the garage's left seen from the street: north-east, higher v, past a 0.12 m wall.
  assert.ok(GROUND_HALL.v[0] - GROUND_GARAGE.v[1] > .1 && GROUND_HALL.v[0] - GROUND_GARAGE.v[1] < .3, 'a wall between them')
  near(GROUND_HALL.v[1], 4.33 - .15)
  // Both end at the same back wall, the "contrafrente", which runs from party wall to party wall.
  near(GROUND_HALL.u[1], GROUND_GARAGE.u[1])
  near(GROUND_BACK_WALL[0], GROUND_GARAGE.u[1])
  near(GROUND_BACK_WALL[2], GROUND_GARAGE.v[0]); near(GROUND_BACK_WALL[3], GROUND_HALL.v[1])
  // The garage door and the entrance door open onto their rooms.
  const garageDoor = OPENINGS.ground.find(opening => opening.u === -5 && opening.v[1] - opening.v[0] > 3.5)!
  assert.ok(garageDoor.v[0] >= GROUND_GARAGE.v[0] && garageDoor.v[1] <= GROUND_GARAGE.v[1], 'the garage door is within the garage')
  for (const opening of OPENINGS.ground.filter(item => item.u === -4)) assert.ok(opening.v[0] >= GROUND_HALL.v[0] && opening.v[1] <= GROUND_HALL.v[1], 'the entrance openings lead into the hall')
  // The interior walls of the ground floor are the garage/hall wall and the back wall, and they stay under the first floor's block.
  assert.equal(GROUND_PARTITIONS.length, 13)
  assert.ok(GROUND_BACK_WALL[1] <= 4)
})

test('the ground-floor light well has a 1.80 m balcony door, centred on it, on the wall that closes it', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const door = OPENINGS.ground.find(opening => opening.u === WELL_BACK_U)!
  near(door.v[1] - door.v[0], 1.8); near(LIGHT_WELL_DOOR_WIDTH, 1.8)
  // The well runs from v = -1 to 1.5 (2.5 m): the door is centred on it, leaving 0.35 m each side.
  near((door.v[0] + door.v[1]) / 2, .25)
  assert.ok(door.v[0] >= -1 + .3 && door.v[1] <= 1.5 - .3)
  // It is cut out of the ground floor's wall at u = 4 and reaches the floor.
  assert.equal(door.y[0], 0)
  const boxes = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2)
  const wallAtWell = boxes.filter(box => box.center[0] > WELL_BACK_U - WELL_BACK_WALL - .01 && box.center[0] < WELL_BACK_U + .01 && box.center[2] > -1 && box.center[2] < 1.5)
  assert.ok(wallAtWell.length >= 1)
  // Its opening is not solid at the door's height: no wall box covers the door's span up to 2.10 m.
  for (const box of wallAtWell) assert.ok(box.center[1] - box.size[1] / 2 >= 2.1 - 1e-9 || box.center[2] + box.size[2] / 2 <= door.v[0] + 1e-9 || box.center[2] - box.size[2] / 2 >= door.v[1] - 1e-9)
})

test('the well\'s balcony-door wall continues to the left to the party wall, and the office lies behind it', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const [u0, u1, v0, v1] = GROUND_OFFICE_WALL
  // On the same line as the well's wall (u = 4), as thick as the exterior walls, from past the well's corner to the party wall's inner face.
  near(u1, WELL_BACK_U); near(u1 - u0, WELL_BACK_WALL)
  near(v0, 1.5 + .3); near(v1, 4.33 - .15)
  // It is split around the office door: two pieces on the same line.
  const pieces = GROUND_PARTITIONS.filter(wall => wall[0] === u0 && wall[1] === u1)
  assert.equal(pieces.length, 2)
  // The office is behind it, in the left band, and the well's door does not open into it: the well is at lower v.
  assert.ok(GROUND_OFFICE.u[0] >= u1 - 1e-9 && GROUND_OFFICE.v[0] >= v0)
  near(GROUND_OFFICE.v[1], v1)
  assert.ok(GROUND_OFFICE.v[0] > 1.5 && GROUND_OFFICE.u[1] < 8.5)
  const well = OPENINGS.ground.find(opening => opening.u === WELL_BACK_U)!
  assert.ok(well.v[1] < v0 + .35, 'the balcony door lies within the well, before the wall continues')
})

test('the office door is 0.80 m, wenge, right-handed, 5 cm from the patio wall, and swings into the office', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(OFFICE_DOOR.v[1] - OFFICE_DOOR.v[0], .8)
  // 5 cm from the wall on the patio's side (the light well's), not centred.
  near(OFFICE_DOOR.v[0] - GROUND_OFFICE_WALL[2], .05)
  assert.ok(Math.abs((OFFICE_DOOR.v[0] + OFFICE_DOOR.v[1]) / 2 - (GROUND_OFFICE_WALL[2] + GROUND_OFFICE_WALL[3]) / 2) > .5)
  // It is in the wall that closes the office.
  near(OFFICE_DOOR.u[1], GROUND_OFFICE_WALL[1])
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < OFFICE_DOOR.u[1] - 1e-9 && u1 > OFFICE_DOOR.u[0] + 1e-9 && v0 < OFFICE_DOOR.v[1] - 1e-9 && v1 > OFFICE_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the office door opening is free of walls')
  }
  // Right hand for someone coming in along `open` (see the first floor's doors): the closed leaf extends toward the walker's left.
  const swing = GROUND_DOOR_SWINGS[0]
  near(-swing.open[1], swing.closed[0]); near(swing.open[0], swing.closed[1])
  // Hinged on the south-west end, and the open leaf stays inside the office.
  near(swing.hinge[1], OFFICE_DOOR.v[0])
  assert.ok(swing.hinge[0] + swing.radius < GROUND_OFFICE.u[1] && swing.hinge[1] > GROUND_OFFICE.v[0] - .5)
})

test('the garage has a 0.70 m doorway to the hall, 35 cm from the back wall, with no door for now', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(GARAGE_DOOR.u[1] - GARAGE_DOOR.u[0], .7)
  // Its nearer edge is 35 cm from the back wall.
  near(GROUND_GARAGE.u[1] - GARAGE_DOOR.u[1], .35)
  near(GARAGE_DOOR.v[0], GROUND_GARAGE.v[1]); near(GARAGE_DOOR.v[1], GROUND_HALL.v[0])
  assert.ok(GARAGE_DOOR.u[0] > GROUND_GARAGE.u[0] && GARAGE_DOOR.u[1] < GROUND_GARAGE.u[1], 'along the wall between the garage and the hall')
  // Only the opening: no door leaf and no swing are drawn for it.
  assert.equal(GROUND_DOOR_SWINGS.some(item => item.id === 'garage'), false)
  // The wall leaves the doorway free.
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < GARAGE_DOOR.u[1] - 1e-9 && u1 > GARAGE_DOOR.u[0] + 1e-9 && v0 < GARAGE_DOOR.v[1] - 1e-9 && v1 > GARAGE_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the garage doorway is free of walls')
  }
})

test('interior walls do not overlap the exterior walls, on either floor', () => {
  const overlaps = (a: [number, number, number, number], box: PlanBox) => {
    const [bu0, bu1, bv0, bv1] = [box.center[0] - box.size[0] / 2, box.center[0] + box.size[0] / 2, box.center[2] - box.size[2] / 2, box.center[2] + box.size[2] / 2]
    return Math.min(a[1], bu1) - Math.max(a[0], bu0) > 1e-6 && Math.min(a[3], bv1) - Math.max(a[2], bv0) > 1e-6
  }
  const ground = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2)
  for (const wall of GROUND_PARTITIONS) assert.ok(!ground.some(box => overlaps(wall, box)), `ground wall ${wall} overlaps an exterior wall`)
  const first = wallBoxes(FIRST_OUTLINE, OPENINGS.first, 3.2, 6.4)
  for (const wall of FIRST_FLOOR_PARTITIONS) assert.ok(!first.some(box => overlaps(wall, box)), `first-floor wall ${wall} overlaps an exterior wall`)
})

test('no loose wall stands in front of the office wall: every ground-floor wall touches another wall', () => {
  // A wall that touches nothing would float in the middle of the floor. Each interior wall of the ground floor must meet another wall
  // (interior or exterior) at an end or along a side.
  const exterior = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2, undefined, SIDE_OPENINGS.ground)
  const rects = [
    ...exterior.map(box => [box.center[0] - box.size[0] / 2, box.center[0] + box.size[0] / 2, box.center[2] - box.size[2] / 2, box.center[2] + box.size[2] / 2] as [number, number, number, number]),
    ...GROUND_PARTITIONS,
    // The living's right wall is split around its door; the pantry's wall meets the wall itself, at the door's jamb or not.
    GROUND_LIVING_WALL,
  ]
  const touch = (a: [number, number, number, number], b: [number, number, number, number]) =>
    a !== b && Math.min(a[1], b[1]) - Math.max(a[0], b[0]) > -1e-6 && Math.min(a[3], b[3]) - Math.max(a[2], b[2]) > -1e-6
  for (const wall of GROUND_PARTITIONS) assert.ok(rects.some(other => touch(wall, other)), `ground wall ${wall} touches no other wall`)
  assert.equal(GROUND_PARTITIONS.length, 13)
})

test('the office has a 1.5 m window onto the light well, centred on it, cut out of the wall that runs along the well', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const window = SIDE_OPENINGS.ground.find(opening => opening.v === 1.5)!
  near(window.u[1] - window.u[0], 1.5); near(OFFICE_WINDOW_WIDTH, 1.5)
  // On the well's wall (v = 1.5) and centred on the office, whose interior runs u = 4 to 8.2.
  near(window.v, 1.5)
  near((window.u[0] + window.u[1]) / 2, (GROUND_OFFICE.u[0] + GROUND_OFFICE.u[1]) / 2)
  assert.ok(window.u[0] > GROUND_OFFICE.u[0] + .5 && window.u[1] < GROUND_OFFICE.u[1] - .5, 'clear of the office\'s end walls')
  // A window, not a door: its sill is above the floor and its head under the ceiling.
  near(window.y[0], OFFICE_WINDOW_SILL); near(window.y[1] - window.y[0], OFFICE_WINDOW_HEIGHT)
  assert.ok(window.y[0] > .5 && window.y[1] < 3)
  // The wall is really open there: a point inside the opening is not solid, and the wall on either side is.
  const boxes = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2, undefined, SIDE_OPENINGS.ground)
  const solid = (point: [number, number, number]) => boxes.some(box =>
    Math.abs(point[0] - box.center[0]) <= box.size[0] / 2 && Math.abs(point[1] - box.center[1]) <= box.size[1] / 2 && Math.abs(point[2] - box.center[2]) <= box.size[2] / 2)
  const middle = (window.u[0] + window.u[1]) / 2, inside = window.v + .15
  assert.equal(solid([middle, window.y[0] + .5, inside]), false, 'the window is open')
  assert.equal(solid([middle, window.y[0] - .2, inside]), true, 'sill under the window')
  assert.equal(solid([window.u[0] - .3, window.y[0] + .5, inside]), true, 'wall beside the window')
  // Without the side opening the wall would be solid there: the cut is the window's doing.
  assert.equal(wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2).some(box => Math.abs(middle - box.center[0]) <= box.size[0] / 2 && Math.abs(window.y[0] + .5 - box.center[1]) <= box.size[1] / 2 && Math.abs(inside - box.center[2]) <= box.size[2] / 2), true)
})

test('the right arm of the well has a 1.8 m window onto it, in the wall at v = -1, and the two windows face each other across the well', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  const window = SIDE_OPENINGS.ground.find(opening => opening.v === -1)!
  near(window.u[1] - window.u[0], 1.8); near(RIGHT_ARM_WINDOW_WIDTH, 1.8)
  // Within the arm, which runs from u = 4 to the rear wall, clear of its end walls.
  assert.ok(window.u[0] > 4.3 && window.u[1] < 8.6 - .3)
  // It is cut out of the wall: open at its height, solid beside it and under it.
  const boxes = wallBoxes(GROUND_OUTLINE, OPENINGS.ground, 0, 3.2, undefined, SIDE_OPENINGS.ground)
  const solid = (point: [number, number, number]) => boxes.some(box =>
    Math.abs(point[0] - box.center[0]) <= box.size[0] / 2 && Math.abs(point[1] - box.center[1]) <= box.size[1] / 2 && Math.abs(point[2] - box.center[2]) <= box.size[2] / 2)
  const middle = (window.u[0] + window.u[1]) / 2, inside = window.v - .15
  assert.equal(solid([middle, window.y[0] + .5, inside]), false, 'the window is open')
  assert.equal(solid([middle, window.y[0] - .2, inside]), true, 'sill under the window')
  assert.equal(solid([window.u[0] - .3, window.y[0] + .5, inside]), true, 'wall beside the window')
  // Both windows look onto the well: one is on each side of it.
  const sides = SIDE_OPENINGS.ground.map(opening => opening.v).sort((a, b) => a - b)
  assert.deepEqual(sides, [-1, 1.5])
})

test('the hall has a 1.2 m doorway without a leaf, 8 cm from the garage wall, in the back wall', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(HALL_ARCH.v[1] - HALL_ARCH.v[0], 1.2)
  // Inside the hall's width, 8 cm from the wall on the garage's side, not centred, in the back wall.
  assert.ok(HALL_ARCH.v[0] >= GROUND_HALL.v[0] && HALL_ARCH.v[1] <= GROUND_HALL.v[1])
  near(HALL_ARCH.v[0] - GROUND_HALL.v[0], .08)
  assert.ok(Math.abs((HALL_ARCH.v[0] + HALL_ARCH.v[1]) / 2 - (GROUND_HALL.v[0] + GROUND_HALL.v[1]) / 2) > .5)
  near(HALL_ARCH.u[0], GROUND_BACK_WALL[0])
  // No door leaf is drawn for it; the back wall is split around it and no wall blocks the opening.
  assert.equal(GROUND_DOOR_SWINGS.some(item => item.id === 'hall'), false)
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < HALL_ARCH.u[1] - 1e-9 && u1 > HALL_ARCH.u[0] + 1e-9 && v0 < HALL_ARCH.v[1] - 1e-9 && v1 > HALL_ARCH.v[0] + 1e-9
    assert.ok(!blocks, 'the hall doorway is free of walls')
  }
})

test('the stairwell is open in the first floor: no floor tile covers it', () => {
  const [u0, u1, v0, v1] = STAIRWELL_HOLE
  for (const zone of FLOOR_TILING) for (const [ru0, ru1, rv0, rv1] of zone.rects) {
    const overlapU = Math.min(u1, ru1) - Math.max(u0, ru0), overlapV = Math.min(v1, rv1) - Math.max(v0, rv0)
    assert.ok(!(overlapU > 1e-6 && overlapV > 1e-6), `${zone.id} tile covers the stairwell`)
  }
})

test('the ground floor\'s living, its distributor, is 4.97 m wide, behind the back wall and taking in the hall doorway and the well door', () => {
  const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)
  near(GROUND_LIVING.v[1] - GROUND_LIVING.v[0], 4.97)
  // Against the party wall with neighbour A, behind the contrafrente, up to the wall that closes the rear.
  near(GROUND_LIVING.v[1], GROUND_HALL.v[1])
  near(GROUND_LIVING.u[0], GROUND_BACK_WALL[1]); near(GROUND_LIVING.u[1], 4.28)
  // 3.17 m deep (owner), and the office behind its wall is 3.89 m: 3.17 + 0.18 + 3.89 = 7.24 m from the contrafrente to the rear wall.
  near(GROUND_LIVING.u[1] - GROUND_LIVING.u[0], 3.17)
  near(GROUND_OFFICE.u[1] - GROUND_OFFICE.u[0], 3.89)
  // The hall's doorway in the back wall and the well's balcony door both open onto it.
  assert.ok(HALL_ARCH.v[0] >= GROUND_LIVING.v[0] && HALL_ARCH.v[1] <= GROUND_LIVING.v[1], 'the hall doorway opens onto the living')
  const well = OPENINGS.ground.find(opening => opening.u === WELL_BACK_U)!
  assert.ok(well.v[0] >= GROUND_LIVING.v[0] && well.v[1] <= GROUND_LIVING.v[1], 'the well\'s balcony door is in the living')
  // A wall closes it on the right, the south-west, along its whole depth, at its edge...
  near(GROUND_LIVING_WALL[1] - GROUND_LIVING_WALL[0], GROUND_LIVING.u[1] - GROUND_LIVING.u[0])
  near(GROUND_LIVING_WALL[3], GROUND_LIVING.v[0]); near(GROUND_LIVING_WALL[3] - GROUND_LIVING_WALL[2], .12)
  // ...with a 0.80 m door 20 cm from the wall the living shares with the light well, at the rear: open there, and the wall stands on either side.
  near(LIVING_KITCHEN_DOOR.u[1] - LIVING_KITCHEN_DOOR.u[0], .8)
  near(GROUND_LIVING.u[1] - LIVING_KITCHEN_DOOR.u[1], .2)
  // The door is beyond the pantry's wall, in the hall, and does not open onto the pantry.
  assert.ok(LIVING_KITCHEN_DOOR.u[0] > GROUND_PANTRY.u[1] + .12)
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < LIVING_KITCHEN_DOOR.u[1] - 1e-9 && u1 > LIVING_KITCHEN_DOOR.u[0] + 1e-9 && v0 < LIVING_KITCHEN_DOOR.v[1] - 1e-9 && v1 > LIVING_KITCHEN_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the kitchen door is free of walls')
  }
  const pieces = GROUND_PARTITIONS.filter(wall => wall[3] === GROUND_LIVING_WALL[3] && wall[2] === GROUND_LIVING_WALL[2])
  assert.equal(pieces.length, 2)
})

test('the pantry is 1.73 m deep and 3.14 m wide, against the garage\'s wall, with a door to the hall perpendicular to the living', () => {
  const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
  // 1.73 m deep from the contrafrente, the garage's back wall, toward the rear.
  near(GROUND_PANTRY.u[1] - GROUND_PANTRY.u[0], 1.73); near(PANTRY.depth, 1.73)
  near(GROUND_PANTRY.u[0], GROUND_BACK_WALL[1])
  // 3.14 m wide: all the width between the living's wall and the south-west party wall.
  // 3.14 m (owner); the drawn width is 8 cm more, because the south-west party wall's lean puts it that much further out.
  near(GROUND_PANTRY.v[1] - GROUND_PANTRY.v[0], 3.14, .1)
  near(GROUND_PANTRY.v[1], GROUND_LIVING_WALL[2]); near(GROUND_PANTRY.v[0], GROUND_GARAGE.v[0])
  // Its door is in the wall that runs along v, perpendicular to the living's wall (which runs along u), and it is free of walls.
  near(PANTRY_DOOR.u[0], GROUND_PANTRY.u[1])
  assert.ok(PANTRY_DOOR.v[0] > GROUND_PANTRY.v[0] && PANTRY_DOOR.v[1] < GROUND_PANTRY.v[1])
  for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < PANTRY_DOOR.u[1] - 1e-9 && u1 > PANTRY_DOOR.u[0] + 1e-9 && v0 < PANTRY_DOOR.v[1] - 1e-9 && v1 > PANTRY_DOOR.v[0] + 1e-9
    assert.ok(!blocks, 'the pantry door opening is free of walls')
  }
  // The pantry ends before the wall that closes the rear, leaving room beyond it for the hall.
  assert.ok(GROUND_PANTRY.u[1] + .12 < GROUND_LIVING.u[1])
})

test('the ground floor\'s bathroom is 1.75 m deep and 2.06 m wide, against the pantry and the party wall, and the doors open onto the hall beside it', () => {
  const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)
  near(GROUND_BATHROOM.u[1] - GROUND_BATHROOM.u[0], 1.75); near(GROUND_BATHROOM.v[1] - GROUND_BATHROOM.v[0], 2.06)
  // Against the pantry's far wall (u), and against the south-west party wall (v).
  near(GROUND_BATHROOM.u[0], GROUND_PANTRY.u[1] + .12)
  near(GROUND_BATHROOM.v[0], GROUND_PANTRY.v[0])
  // The pantry's door is in the rest of that wall: not into the bathroom, and it leads to the hall between the bathroom and the living's wall.
  assert.ok(PANTRY_DOOR.v[0] > GROUND_BATHROOM.v[1] + .1, 'the pantry door does not open into the bathroom')
  assert.ok(PANTRY_DOOR.v[1] < GROUND_PANTRY.v[1])
  // The living's 0.80 m door opens onto that same hall, beside the bathroom and clear of it.
  assert.ok(LIVING_KITCHEN_DOOR.v[0] > GROUND_BATHROOM.v[1], 'the living door lands in the hall')
  assert.ok(LIVING_KITCHEN_DOOR.u[0] >= GROUND_BATHROOM.u[0] - 1e-9 && LIVING_KITCHEN_DOOR.u[1] <= GROUND_LIVING.u[1] + 1e-9)
  // Its own door, 0.70 m, is in the wall on its north-east side, which faces the hall, and inside that wall's length.
  near(GROUND_BATHROOM_DOOR.u[1] - GROUND_BATHROOM_DOOR.u[0], .7)
  near(GROUND_BATHROOM_DOOR.v[0], GROUND_BATHROOM.v[1])
  assert.ok(GROUND_BATHROOM_DOOR.u[0] > GROUND_BATHROOM.u[0] && GROUND_BATHROOM_DOOR.u[1] < GROUND_BATHROOM.u[1])
  // The bathroom's walls join the pantry's wall and the party wall; none blocks any of the doors.
  for (const door of [PANTRY_DOOR, LIVING_KITCHEN_DOOR, GROUND_BATHROOM_DOOR]) for (const [u0, u1, v0, v1] of GROUND_PARTITIONS) {
    const blocks = u0 < door.u[1] - 1e-9 && u1 > door.u[0] + 1e-9 && v0 < door.v[1] - 1e-9 && v1 > door.v[0] + 1e-9
    assert.ok(!blocks, 'no wall across a door')
  }
})
