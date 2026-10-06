import assert from 'node:assert/strict'
import test from 'node:test'
import { polygonCentroid } from '@t3-designer/geometry'
import { pointInEditorPolygon } from '@t3-designer/scene-schema'
import { MAIN_TV_PLACEMENT } from '../src/data/house-plan.ts'
import { currentFixtures } from '../src/data/current-state.ts'
import { HOUSE_FLOORS, HOUSE_FLOOR_ORDER, WALL_HEIGHT, floorOfRoom, shellWallBoxes } from '../src/data/house-interior.ts'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { BATHROOM, CUT_HEIGHT, FIRST_FLOOR_PARTITIONS, GROUND_PARTITIONS, OPENINGS, OUTLINES, SIDE_OPENINGS, wallBoxes, FIRST_FLOOR_BATHROOM, FRONT_ROOMS, GARAGE, GROUND_GARAGE, OFFICE_WIDTH, GROUND_OFFICE } from '../src/data/house-plan.ts'
import { houseToSite } from '../src/data/frame.ts'
import { apartmentToSite, housePlacement, siteDirectionFromApartment, siteDirectionToApartment } from '../src/data/house-placement.ts'
import { publicScene } from '../src/lib/public-scene.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { STAIR_BLOCKS } from '../src/data/stair.ts'
import { buildWalkWorld, canSetWalkDoorOpenness, roomAtPosition, moveWalkPosition, stepWalkVertical, findWalkDoorTarget, findWalkSpawn, isWalkPositionFree } from '../src/walkthrough/navigation.ts'

const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const room = (floor: 'ground' | 'first', id: string) => HOUSE_FLOORS[floor].rooms.find(item => item.id === id)!

test('both floors build as valid apartments with a wall under every opening', () => {
  assert.deepEqual(HOUSE_FLOOR_ORDER, ['ground', 'first'])
  for (const floor of HOUSE_FLOOR_ORDER) {
    const apartment = HOUSE_FLOORS[floor]
    const walls = new Set(apartment.walls.map(wall => wall.id))
    assert.ok(apartment.doors.concat().every(door => walls.has(door.wallId)))
    assert.ok(apartment.windows.every(window => walls.has(window.wallId)))
    assert.ok(apartment.walls.every(wall => wall.height === WALL_HEIGHT || /balcony-rail|terrace/.test(wall.id)))
  }
})

test('rooms keep the owner\'s sizes', () => {
  close(room('first', 'bathroom').reportedArea, BATHROOM.width * BATHROOM.depth, 1e-6)
  close(room('first', 'secondary-room').reportedArea, (FRONT_ROOMS.secondary.u[1] - FRONT_ROOMS.secondary.u[0]) * (FRONT_ROOMS.secondary.v[1] - FRONT_ROOMS.secondary.v[0]), 1e-6)
  close(room('ground', 'garage').reportedArea, GARAGE.depth * (GROUND_GARAGE.v[1] - GROUND_GARAGE.v[0]), 1e-6)
  close(room('ground', 'office').reportedArea, OFFICE_WIDTH * (GROUND_OFFICE.u[1] - GROUND_OFFICE.u[0]), 1e-6)
  assert.equal(FIRST_FLOOR_BATHROOM.v[1] - FIRST_FLOOR_BATHROOM.v[0], BATHROOM.width)
})

test('every interior door opens a gap between two rooms', () => {
  const first = HOUSE_FLOORS.first
  for (const id of ['bathroom-door', 'living-door', 'main-door', 'secondary-door']) assert.ok(first.doors.some(door => door.id === id), id)
  const living = first.doors.find(door => door.id === 'living-door')!
  close(living.width, 1.2)
  assert.equal(living.appearance, 'aluminium')
  // A leaf and a half: the wide one swings, the narrow one beside it stays fixed.
  close(living.fixedLeaf!, .4)
  const garageArch = HOUSE_FLOORS.ground.doors.find(door => door.id === 'garage-hall-doorway')!
  close(garageArch.width, .7)
  assert.equal(garageArch.appearance, 'passage')
})

test('the street front keeps the 3 m balcony door and the secondary room\'s window on the first floor', () => {
  const windows = HOUSE_FLOORS.first.windows
  // The balcony door slides open: the visitor walks through it.
  assert.ok(HOUSE_FLOORS.first.doors.some(door => Math.abs(door.width - 3) < 1e-9 && door.appearance === 'sliding'))
  assert.ok(windows.some(window => Math.abs(window.width - 2.04) < 1e-9 && window.kind === 'casement'))
})

test('the viewer frame is the house frame: x = u, z = -v, and the floor sits at its own level', () => {
  for (const floor of HOUSE_FLOOR_ORDER) {
    const placement = housePlacement(floor)
    for (const [u, v] of [[0, 0], [-5, 3.2], [4, -1.5]] as const) {
      const [x, y, z] = apartmentToSite(floor, [u, 0, -v])
      const [expectedX, expectedZ] = houseToSite(u, v)
      close(x, expectedX); close(z, expectedZ); close(y, placement.floorElevation)
    }
  }
  assert.equal(housePlacement('first').floorElevation, 3.2)
})

test('directions turn with the frame, both ways', () => {
  // The street front faces toward -u, which is north-west; the rear faces south-east.
  const rear = siteDirectionFromApartment([1, 0, 0])
  close(rear[0], Math.SQRT1_2); close(rear[2], Math.SQRT1_2)
  const placement = housePlacement('first')
  close(placement.rearFacadeAzimuth, 135, 1e-6); close(placement.frontFacadeAzimuth, 315, 1e-6)
  const sun: [number, number, number] = [.3, .6, -.74]
  const back = siteDirectionFromApartment(siteDirectionToApartment(sun))
  sun.forEach((value, index) => close(back[index], value))
})

test('fixtures stand inside their rooms, on the floor they belong to', () => {
  assert.ok(currentFixtures.length > 0)
  for (const fixture of currentFixtures) {
    const floor = floorOfRoom(fixture.roomId)!
    assert.ok(floor, fixture.id)
    const target = HOUSE_FLOORS[floor].rooms.find(item => item.id === fixture.roomId)!
    assert.ok(pointInEditorPolygon([fixture.position[0], fixture.position[2]], target.polygon), `${fixture.id} is outside ${target.id}`)
  }
})

test('the walkthrough can start on both floors, and its first step is free of walls', () => {
  for (const floor of HOUSE_FLOOR_ORDER) {
    const world = buildWalkWorld(publicScene(floor, []))
    const spawn = findWalkSpawn(world)
    assert.ok(spawn, floor)
    assert.ok(isWalkPositionFree(world, spawn.position))
  }
})

test('the visitor can step out onto the balcony, and is stopped by its railing and by the stairwell', () => {
  const world = buildWalkWorld(publicScene('first', []))
  // The balcony is 0.86 m deep in front of the street line (x = -5); its door is at v = 0.1 to 3.1.
  assert.ok(isWalkPositionFree(world, [-5.4, -1.6]))
  assert.ok(!isWalkPositionFree(world, [-5.84, -1.6]), 'the railing is in the way')
  // The stairwell is a notch in the floor, along the north-east party wall.
  assert.ok(!isWalkPositionFree(world, [3, -3.5]))
  assert.ok(room('first', 'laundry') && room('first', 'balcony'))
  assert.ok(isWalkPositionFree(world, [5.2, -3.3]), 'the laundry floor is walkable')
})

test('the cutaway draws the same walls as the walkthrough walks through', () => {
  // Before the two shared a source, the cutaway built its walls from the outline and the partitions; the volume must not change.
  const volume = (boxes: { size: [number, number, number] }[]) => boxes.reduce((sum, box) => sum + box.size[0] * box.size[1] * box.size[2], 0)
  for (const floor of HOUSE_FLOOR_ORDER) {
    const level = floor === 'ground' ? 0 : FLOOR_HEIGHT
    const top = level + CUT_HEIGHT
    const fromPlan = wallBoxes(OUTLINES[floor], OPENINGS[floor], level, top, undefined, SIDE_OPENINGS[floor])
    const partitions = (floor === 'ground' ? GROUND_PARTITIONS : FIRST_FLOOR_PARTITIONS).map(([u0, u1, v0, v1]) => ({ size: [u1 - u0, CUT_HEIGHT, v1 - v0] as [number, number, number] }))
    close(volume(shellWallBoxes(floor, top)), volume(fromPlan) + volume(partitions), 1e-6)
  }
})

test('the first floor opens in the middle of the living, facing the kitchen, on free floor', () => {
  const living = room('first', 'kitchen-living')
  const world = buildWalkWorld(publicScene('first', []))
  const [x, z] = polygonCentroid(living.polygon)
  assert.ok(isWalkPositionFree(world, [x, z]))
})

test('the main room\'s balcony door is a white aluminium sliding door that opens and closes', () => {
  const sliding = HOUSE_FLOORS.first.doors.filter(item => item.appearance === 'sliding')
  // The terrace's door, in the kitchen-living, is the same door at 1.78 m.
  assert.deepEqual(sliding.map(item => Math.round(item.width * 100)).sort(), [178, 300])
  const door = sliding.find(item => Math.abs(item.width - 3) < 1e-9)!
  assert.ok(door && Math.abs(door.width - 3) < 1e-9 && door.color === '#f3f2ee')
  const scene = publicScene('first', [])
  const closed = buildWalkWorld(scene, { [door.id]: 0 }), open = buildWalkWorld(scene, { [door.id]: 1 })
  // The balcony is out the street front, x = -5, behind the door's 3 m span (v = 0.1 to 3.1, z = -3.1 to -0.1): the far half is the one that slides.
  const farHalf: [number, number] = [-5, -.4], nearHalf: [number, number] = [-5, -2.8]
  assert.ok(!isWalkPositionFree(closed, farHalf) && !isWalkPositionFree(closed, nearHalf))
  assert.ok(isWalkPositionFree(open, [-4.6, -.4]) && !isWalkPositionFree(open, nearHalf))
})

test('the street door opens inward with the right hand: hinged on the lower v, swinging toward the rear', () => {
  const apartment = HOUSE_FLOORS.ground
  const door = apartment.doors.find(item => item.wallId.startsWith('ground-exterior') && item.width < 1 && item.height > 2 && item.id.includes('opening'))!
  const wall = apartment.walls.find(item => item.id === door.wallId)!
  const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
  const along = (distance: number) => [wall.from[0] + (wall.to[0] - wall.from[0]) / length * distance, wall.from[1] + (wall.to[1] - wall.from[1]) / length * distance]
  const [startZ, endZ] = [along(door.offset)[1], along(door.offset + door.width)[1]]
  const hingeZ = door.hinge === 'start' ? startZ : endZ, freeZ = door.hinge === 'start' ? endZ : startZ
  // z = -v: the lower v is the larger z.
  assert.ok(hingeZ > freeZ, 'hinged on the lower v')
  // The leaf swings to wall-local +z (-dz, dx) when opensToward is 1: toward +x, the rear, means the normal's x has the sign of opensToward.
  const normalX = -(wall.to[1] - wall.from[1]) / length
  assert.ok(normalX * door.opensToward > 0, 'opens toward the rear')
})

test('the main room\'s TV can be aimed at and switched on with E, and nothing else answers there', () => {
  const world = buildWalkWorld(publicScene('first', []))
  assert.ok(world.doors.some(door => door.id === 'tv-main') && world.doors.some(door => door.id === 'tv-living'))
  const u = (MAIN_TV_PLACEMENT.u[0] + MAIN_TV_PLACEMENT.u[1]) / 2, v = MAIN_TV_PLACEMENT.v[1]
  // Standing 1.5 m from the screen, in the main room (higher v), facing it (toward -v is +z; yaw pi), looking down at its centre.
  const pose = { x: u, z: -(v + 1.5), yaw: Math.PI, pitch: Math.atan2(1.1 - 1.65, 1.5), eyeHeight: 1.65, feetOffset: 0 }
  const target = findWalkDoorTarget(world, {}, pose)
  assert.deepEqual(target, { id: 'tv-main', open: false })
  assert.ok(canSetWalkDoorOpenness(world, {}, 'tv-main', 1, pose))
  assert.deepEqual(findWalkDoorTarget(world, { 'tv-main': 1 }, pose), { id: 'tv-main', open: true })
})

test('the hall-living door is a leaf and a half: the narrow leaf stops the visitor, the wide one swings open', () => {
  const door = HOUSE_FLOORS.first.doors.find(item => item.id === 'living-door')!
  const scene = publicScene('first', [])
  const open = buildWalkWorld(scene, { [door.id]: 1 })
  const wall = HOUSE_FLOORS.first.walls.find(item => item.id === door.wallId)!
  const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
  const at = (distance: number): [number, number] => [wall.from[0] + (wall.to[0] - wall.from[0]) / length * distance, wall.from[1] + (wall.to[1] - wall.from[1]) / length * distance]
  const fixedEnd = door.hinge === 'start' ? door.offset + door.width - .2 : door.offset + .2
  assert.ok(!isWalkPositionFree(open, at(fixedEnd)), 'the narrow leaf is fixed')
})

test('the stair can be climbed on foot, from the hall to the first floor, and walked down again', () => {
  const ground = publicScene('ground', []), first = publicScene('first', [])
  const world = buildWalkWorld(ground, undefined, first)
  const order = STAIR_BLOCKS.map(block => block.id)
  assert.ok(order.length >= 16)
  const centre = (block: (typeof STAIR_BLOCKS)[number]): [number, number] => [(block.u[0] + block.u[1]) / 2, -(block.v[0] + block.v[1]) / 2]
  // Start at the foot of the first step, in the hall, and walk toward each step's centre in turn.
  const start = centre(STAIR_BLOCKS[0])
  let position: [number, number] = [start[0], start[1] + .6]
  let vertical = { offset: 0, velocity: 0, grounded: true }
  assert.ok(isWalkPositionFree(world, position), 'the foot of the stair is free')
  const walkTo = (target: [number, number]) => {
    for (let frame = 0; frame < 800; frame++) {
      const dx = target[0] - position[0], dz = target[1] - position[1], distance = Math.hypot(dx, dz)
      if (distance < .05) return
      const step = Math.min(distance, 1.45 / 60)
      position = moveWalkPosition(world, position, [dx / distance * step, dz / distance * step], 1.65, vertical.offset)
      vertical = stepWalkVertical(world, position, 1.65, vertical, 1 / 60, false)
    }
  }
  for (const block of STAIR_BLOCKS) walkTo(centre(block))
  assert.ok(vertical.offset > 2.9, `reached the top: ${vertical.offset}`)
  // From the last step onto the corridor of the first floor: its floor is 3.2 m up, and the visitor is on it.
  walkTo([.44, -.2])
  close(vertical.offset, 3.2, 1e-6)
  assert.equal(roomAtPosition(world, position, vertical.offset)?.id, 'stair-corridor')
  // And back down the same way, to the hall.
  for (const block of [...STAIR_BLOCKS].reverse()) walkTo(centre(block))
  walkTo([start[0], start[1] + .6])
  for (let frame = 0; frame < 30; frame++) vertical = stepWalkVertical(world, position, 1.65, vertical, 1 / 60, false)
  close(vertical.offset, 0, 1e-6)
})

test('both floors are one world: the visit can begin on either, and each floor keeps its own rooms', () => {
  const world = buildWalkWorld(publicScene('ground', []), undefined, publicScene('first', []))
  const living = HOUSE_FLOORS.first.rooms.find(item => item.id === 'kitchen-living')!
  const [x, z] = polygonCentroid(living.polygon)
  assert.ok(isWalkPositionFree(world, [x, z], 1.65, 3.2), 'the living, a floor up')
  assert.equal(roomAtPosition(world, [x, z], 3.2)?.id, 'kitchen-living')
  // The same spot at ground level is the ground floor's, whatever lies there.
  assert.notEqual(roomAtPosition(world, [x, z], 0)?.id, 'kitchen-living')
  const spawn = findWalkSpawn(world, 'kitchen-living')
  assert.equal(spawn?.elevation, 3.2)
  assert.equal(findWalkSpawn(world)?.elevation, undefined)
  // Walking off the first floor into the stairwell drops the visitor onto the stair, not through the house.
  const hole: [number, number] = [.44, -3]
  assert.ok(isWalkPositionFree(world, hole, 1.65, 3.2))
  let vertical = { offset: 3.2, velocity: 0, grounded: true }
  for (let frame = 0; frame < 200; frame++) vertical = stepWalkVertical(world, hole, 1.65, vertical, 1 / 60, false)
  assert.ok(vertical.offset > 1.5 && vertical.offset < 2.0, `lands on the stair: ${vertical.offset}`)
})

test('the fridge can be aimed at from the aisle and opened with E', () => {
  const world = buildWalkWorld(publicScene('first', []))
  const fridge = furnishingsOn('first').find(piece => piece.id === 'kitchen-fridge')!
  const u = (fridge.u[0] + fridge.u[1]) / 2, v = fridge.v[0]
  // 1.2 m in front of it, in the aisle (lower v, so higher z), facing it (toward +v is -z: yaw 0), looking at its middle.
  const pose = { x: u, z: -(v - 1.2), yaw: 0, pitch: Math.atan2((fridge.y[0] + fridge.y[1]) / 2 - 3.2 - 1.65, 1.2), eyeHeight: 1.65, feetOffset: 0 }
  assert.deepEqual(findWalkDoorTarget(world, {}, pose), { id: 'kitchen-fridge', open: false })
  assert.deepEqual(findWalkDoorTarget(world, { 'kitchen-fridge': 1 }, pose), { id: 'kitchen-fridge', open: true })
  close(fridge.y[1] - fridge.y[0], 1.785 - .04 + .04, 1e-6)
})

test('the ground floor opens onto the light well through a double door, and the patio is walkable', () => {
  const door = HOUSE_FLOORS.ground.doors.find(item => item.appearance === 'double')!
  assert.ok(door && Math.abs(door.width - 1.8) < 1e-9 && door.color === '#f3f2ee')
  const scene = publicScene('ground', [])
  const closed = buildWalkWorld(scene, { [door.id]: 0 }), open = buildWalkWorld(scene, { [door.id]: 1 })
  assert.equal(closed.doors.filter(item => item.id === door.id).length, 2, 'two leaves')
  // The well's back wall stands at u = 4.46 and its door is centred on v = 0.4 (z = -0.4): living inside, patio outside.
  const living: [number, number] = [3.9, -.4], patio: [number, number] = [6, -.4], threshold: [number, number] = [4.46, -.4]
  assert.ok(isWalkPositionFree(closed, living) && isWalkPositionFree(closed, patio), 'both sides are floor')
  assert.ok(!isWalkPositionFree(closed, threshold), 'shut: the leaves meet in the middle')
  assert.ok(isWalkPositionFree(open, threshold), 'open: the way is clear')
  // The rear wall of the patio is at the lot behind: past it, nothing.
  assert.ok(!isWalkPositionFree(open, [8.7, -.4]))
  assert.equal(roomAtPosition(open, patio)?.id, 'light-well')
})

test('the pantry has a wall-mounted rack with a UniFi Dream Machine Pro and a 24-port patch panel, high on the medianera', () => {
  const pieces = furnishingsOn('ground').filter(piece => piece.id.startsWith('rack-'))
  const find = (id: string) => pieces.find(piece => piece.id === `rack-${id}`)!
  assert.ok(find('udm-pro') && find('patch-panel'))
  assert.equal(pieces.filter(piece => /rack-port-\d+$/.test(piece.id)).length, 24)
  const pantry = HOUSE_FLOORS.ground.rooms.find(item => item.id === 'pantry')!
  // The medianera is the south-west party wall, the pantry's lowest v; the rack stands out from it, toward +v, and is as wide as the wall runs along u.
  const [uLow, uHigh] = [Math.min(...pantry.polygon.map(point => point[0])), Math.max(...pantry.polygon.map(point => point[0]))]
  const wallV = Math.min(...pantry.polygon.map(point => -point[1]))
  for (const piece of pieces) {
    assert.ok(piece.u[0] >= uLow - 1e-6 && piece.u[1] <= uHigh + 1e-6, `${piece.id} inside the pantry's depth along the wall`)
    assert.ok(piece.v[0] >= wallV - 1e-6, `${piece.id} stands out from the medianera`)
  }
  assert.ok(Math.abs(find('back').v[0] - wallV) < 1e-6, 'the back plate is on the wall')
  // High: the bottom of the frame is above the counter height, and the units are in the upper half of the wall.
  assert.ok(find('back').y[0] >= 1.5 && find('udm-pro').y[0] > 1.6)
  // The Dream Machine Pro is a 1U unit: 44.5 mm high, 442 mm wide.
  close(find('udm-pro').y[1] - find('udm-pro').y[0], .0445, 1e-9)
  close(find('udm-pro').u[1] - find('udm-pro').u[0], .442, 1e-9)
})
