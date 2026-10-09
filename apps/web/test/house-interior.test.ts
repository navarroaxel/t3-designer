import { RACK_BOXES } from '../src/data/rack.ts'
import assert from 'node:assert/strict'
import test from 'node:test'
import { polygonCentroid } from '@t3-designer/geometry'
import { pointInEditorPolygon } from '@t3-designer/scene-schema'
import { KITCHEN_LIVING, MAIN_TV_PLACEMENT } from '../src/data/house-plan.ts'
import { currentFixtures } from '../src/data/current-state.ts'
import { HOUSE_FLOORS, HOUSE_FLOOR_ORDER, WALL_HEIGHT, floorOfRoom, shellWallBoxes } from '../src/data/house-interior.ts'
import { AZOTEA_REAR, FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { BATHROOM, CUT_HEIGHT, FIRST_FLOOR_PARTITIONS, GROUND_PARTITIONS, OPENINGS, OUTLINES, SIDE_OPENINGS, wallBoxes, FIRST_FLOOR_BATHROOM, FRONT_ROOMS, GARAGE, GROUND_GARAGE, OFFICE_WIDTH, GROUND_OFFICE } from '../src/data/house-plan.ts'
import { houseToSite } from '../src/data/frame.ts'
import { apartmentToSite, housePlacement, siteDirectionFromApartment, siteDirectionToApartment } from '../src/data/house-placement.ts'
import { publicScene } from '../src/lib/public-scene.ts'
const LAUNDRY_FLIGHT_V = 2.18 + .475
import { AZOTEA_OBSTACLES } from '../src/data/azotea.ts'
import { armKey, armReach, furnishingDevices, furnishingsOn, isLivingSetPiece, isLivingSetPresent, isTvMounted, LIVING_SET_ID, livingSetKey, tvMountKey } from '../src/data/house-furnishings.ts'
import { tvMountLinks } from '../src/data/tv-mount.ts'
import { STAIR_BLOCKS } from '../src/data/stair.ts'
import { buildWalkWorld, canSetWalkDoorOpenness, roomAtPosition, moveWalkPosition, stepWalkVertical, findWalkDoorTarget, findWalkSpawn, withWalkDoorStates, isWalkPositionFree } from '../src/walkthrough/navigation.ts'

const close = (actual: number, expected: number, tolerance = 1e-9) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`)
const room = (floor: 'ground' | 'first', id: string) => HOUSE_FLOORS[floor].rooms.find(item => item.id === id)!

test('both floors build as valid apartments with a wall under every opening', () => {
  assert.deepEqual(HOUSE_FLOOR_ORDER, ['ground', 'first'])
  for (const floor of HOUSE_FLOOR_ORDER) {
    const apartment = HOUSE_FLOORS[floor]
    const walls = new Set(apartment.walls.map(wall => wall.id))
    assert.ok(apartment.doors.concat().every(door => walls.has(door.wallId)))
    assert.ok(apartment.windows.every(window => walls.has(window.wallId)))
    assert.ok(apartment.walls.every(wall => wall.height === WALL_HEIGHT || /balcony-rail|terrace|back-low/.test(wall.id)))
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

test('the ground floor opens onto the light well through a sliding door of two leaves, and the patio is walkable', () => {
  const door = HOUSE_FLOORS.ground.doors.find(item => item.appearance === 'sliding')!
  assert.ok(door && Math.abs(door.width - 1.8) < 1e-9 && door.color === '#f3f2ee')
  const scene = publicScene('ground', [])
  const closed = buildWalkWorld(scene, { [door.id]: 0 }), open = buildWalkWorld(scene, { [door.id]: 1 })
  // The well's back wall stands at u = 4.46 and its door is centred on v = 0.4 (z = -0.4): living inside, patio outside.
  const living: [number, number] = [3.9, -.4], patio: [number, number] = [6, -.4], threshold: [number, number] = [4.46, -.4]
  assert.ok(isWalkPositionFree(closed, living) && isWalkPositionFree(closed, patio), 'both sides are floor')
  assert.ok(!isWalkPositionFree(closed, threshold), 'shut: the panels fill the span')
  // Open, the sliding panel rests over the fixed one: the way is clear on the half it uncovered.
  assert.ok(isWalkPositionFree(open, [4.46, -.4 + .45]) || isWalkPositionFree(open, [4.46, -.4 - .45]), 'open: half the span is clear')
  // The rear wall of the patio is at the lot behind: past it, nothing.
  assert.ok(!isWalkPositionFree(open, [8.7, -.4]))
  assert.equal(roomAtPosition(open, patio)?.id, 'light-well')
})

test('the pantry has a wall-mounted rack with a UniFi Dream Machine Pro and a 24-port patch panel, high on the medianera', () => {
  // The rack is one Blender model in the walkthrough; its boxes keep the units' sizes.
  const unit = (id: string) => RACK_BOXES.find(box => box.id === id)!
  assert.ok(unit('udm-pro') && unit('patch-panel'))
  assert.equal(RACK_BOXES.filter(box => /^port-\d+$/.test(box.id)).length, 24)
  const piece = furnishingsOn('ground').find(item => item.id === 'rack')!
  assert.equal(piece.model, '/models/house/rack.glb')
  const pantry = HOUSE_FLOORS.ground.rooms.find(item => item.id === 'pantry')!
  // The medianera is the south-west party wall, the pantry's lowest v; the rack stands out from it, toward +v, and is as wide as the wall runs along u.
  const [uLow, uHigh] = [Math.min(...pantry.polygon.map(point => point[0])), Math.max(...pantry.polygon.map(point => point[0]))]
  const wallV = Math.min(...pantry.polygon.map(point => -point[1]))
  assert.ok(piece.u[0] >= uLow - 1e-6 && piece.u[1] <= uHigh + 1e-6, 'inside the pantry\'s depth along the wall')
  close(piece.v[0], wallV, 1e-6)
  // High: the bottom of the frame is above the counter height, and the units are in the upper half of the wall.
  assert.ok(piece.y[0] >= 1.5 && unit('udm-pro').y[0] > 1.6)
  // The Dream Machine Pro is a 1U unit: 44.5 mm high, 442 mm wide.
  close(unit('udm-pro').y[1] - unit('udm-pro').y[0], .0445, 1e-9)
  close(unit('udm-pro').u[1] - unit('udm-pro').u[0], .442, 1e-9)
})

test('the azotea can be reached on foot: the laundry\'s flight, the landing, the flight back over the laundry and the roof', () => {
  // The door at the top of the first flight starts shut; the visitor has opened it.
  const world = buildWalkWorld(publicScene('ground', []), { 'first-laundry-back-door': 1 }, publicScene('first', []))
  const centre = (obstacle: (typeof AZOTEA_OBSTACLES)[number]): [number, number] => {
    const xs = obstacle.polygon.map(point => point[0]), zs = obstacle.polygon.map(point => point[1])
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2]
  }
  const pick = (pattern: RegExp) => AZOTEA_OBSTACLES.filter(obstacle => pattern.test(obstacle.id))
  // From the laundry floor, on the light-well side, where the first flight starts.
  let position: [number, number] = [5, -2.63]
  let vertical = { offset: 3.2, velocity: 0, grounded: true }
  assert.ok(isWalkPositionFree(world, position, 1.65, 3.2))
  const walkTo = (target: [number, number]) => {
    for (let frame = 0; frame < 900; frame++) {
      const dx = target[0] - position[0], dz = target[1] - position[1], distance = Math.hypot(dx, dz)
      if (distance < .05) return
      const step = Math.min(distance, 1.45 / 60)
      position = moveWalkPosition(world, position, [dx / distance * step, dz / distance * step], 1.65, vertical.offset)
      vertical = stepWalkVertical(world, position, 1.65, vertical, 1 / 60, false)
    }
  }
  for (const obstacle of [...pick(/LAUNDRY-STEP-1-/), ...pick(/LAUNDRY-LANDING$/), ...pick(/LAUNDRY-STEP-2-/)]) walkTo(centre(obstacle))
  close(vertical.offset, 6.4, 1e-6)
  // Past the foot of the flight, the roof: through the opening the rear parapet leaves for the stair.
  walkTo([2.5, -3.73])
  close(vertical.offset, 6.4, 1e-6)
  assert.equal(roomAtPosition(world, position, vertical.offset)?.id, 'azotea')
  // The panels, raised 1.25 m on their beams, are obstacles too: a visitor ducks under them, and does not walk through.
  assert.ok(AZOTEA_OBSTACLES.filter(obstacle => obstacle.bottom > 7.5).length >= 16)
})

test('the laundry\'s door onto the landing is a white aluminium door that stands 1 m up and opens inward, with E', () => {
  const door = HOUSE_FLOORS.first.doors.find(item => item.id === 'first-laundry-back-door')!
  assert.ok(door && door.sill === 1 && door.appearance === 'aluminium' && door.color === '#f3f2ee')
  const wall = HOUSE_FLOORS.first.walls.find(item => item.id === door.wallId)!
  // Inward is toward the laundry, -x here: the leaf swings to the wall's local +z when opensToward is 1, and +z has the sign of the wall normal's x.
  const length = Math.hypot(wall.to[0] - wall.from[0], wall.to[1] - wall.from[1])
  assert.ok(-(wall.to[1] - wall.from[1]) / length * door.opensToward < 0, 'opens toward the laundry')
  const ground = publicScene('ground', []), first = publicScene('first', [])
  const shut = buildWalkWorld(ground, undefined, first), open = buildWalkWorld(ground, { [door.id]: 1 }, first)
  // It starts shut: at the landing's height, the doorway is closed. Open, it is clear.
  const doorway: [number, number] = [7.05 + (AZOTEA_REAR - 4), -(LAUNDRY_FLIGHT_V)]
  assert.ok(!isWalkPositionFree(shut, doorway, 1.65, 4.2))
  assert.ok(isWalkPositionFree(open, doorway, 1.65, 4.2))
  // The wall under the door is there below the sill: at the laundry's floor, the doorway is a wall.
  assert.ok(!isWalkPositionFree(open, doorway, 1.65, 3.2))
})

test('under the living\'s TV: a low table against the party wall with a PlayStation 5 standing on it, clear of the screen', () => {
  const pieces = furnishingsOn('first')
  const find = (id: string) => pieces.find(piece => piece.id === id)!
  const table = find('living-table-top'), tv = find('tv-living')
  assert.ok(table && find('ps5') && find('ps5-controller'))
  // The table is under the TV and centred on it, with the screen above the PS5.
  close((table.u[0] + table.u[1]) / 2, (tv.u[0] + tv.u[1]) / 2, 1e-9)
  assert.ok(table.y[1] <= 3.2 + .45 && table.y[1] < tv.y[0] - .15, 'the table is low, and the screen clears the console')
  // The PS5 is a Blender model (scripts/blender/jobs/ps5-job.json) standing in a box that is its size: 104 mm thick, 260 mm deep and 390 mm tall with its stand.
  const core = find('ps5')
  assert.equal(core.model, '/models/house/ps5.glb')
  assert.ok(core.y[0] >= table.y[1] && core.y[1] <= tv.y[0] + .5)
  close(core.u[1] - core.u[0], .104, 1e-9)
  close(core.v[1] - core.v[0], .26, 1e-9)
  close(core.y[1] - table.y[1], .39, 1e-9)
  // On the table's top, inside it.
  assert.ok(core.u[0] >= table.u[0] && core.u[1] <= table.u[1] && core.v[0] >= table.v[0] && core.v[1] <= table.v[1])
})

test('both TVs hang on the same articulated VESA mount, folded 67 mm from the wall, rails as far apart as each TV\'s pattern', () => {
  const pieces = furnishingsOn('first')
  for (const [name, vesa] of [['main', .2], ['living', .4]] as const) {
    const mount = pieces.filter(piece => piece.id.startsWith(`tv-${name}-mount-`))
    assert.ok(mount.length >= 6, `${name}: plate, links, head and two rails`)
    const rails = mount.filter(piece => piece.id.includes('-rail-')), tv = pieces.find(piece => piece.id === `tv-${name}`)!
    close(Math.abs((rails[0].u[0] + rails[0].u[1]) / 2 - (rails[1].u[0] + rails[1].u[1]) / 2), vesa, 1e-9)
    // The rails are 420 mm tall and the mount reaches 67 mm out: the TV's back is where they end.
    close(rails[0].y[1] - rails[0].y[0], .42, 1e-9)
    close(Math.max(...mount.map(piece => piece.v[1])) - Math.min(...mount.map(piece => piece.v[0])), .067, 1e-9)
    assert.ok(tv.v[0] >= Math.max(...mount.map(piece => piece.v[1])) - 1e-9, 'the TV does not touch the mount\'s plate')
    // The wall plate is 440 by 135 mm.
    const plate = mount.find(piece => piece.id.endsWith('wall-plate'))!
    close(plate.u[1] - plate.u[0], .44, 1e-9); close(plate.y[1] - plate.y[0], .135, 1e-9)
  }
})

test('the DualSense is a 160 by 106 mm model, 66 mm tall, that lies on the living\'s table', () => {
  const pieces = furnishingsOn('first'), pad = pieces.find(piece => piece.id === 'ps5-controller')!, table = pieces.find(piece => piece.id === 'living-table-top')!
  close(pad.u[1] - pad.u[0], .16, 1e-9); close(pad.v[1] - pad.v[0], .106, 1e-9); close(pad.y[1] - pad.y[0], .066, 1e-9)
  assert.equal(pad.model, '/models/house/dualsense.glb')
  assert.ok(pad.u[0] >= table.u[0] && pad.u[1] <= table.u[1] && pad.v[0] >= table.v[0] && pad.v[1] <= table.v[1])
  close(pad.y[0], table.y[1], 1e-9)
})

test('two double outlets of the Argentine kind, shaped like the Australian one, flank the living\'s low table, on the party wall', () => {
  const pieces = furnishingsOn('first')
  const table = pieces.find(piece => piece.id === 'living-table-top')!, wallV = table.v[0] - .03
  const plates = ['left', 'right'].map(side => pieces.find(piece => piece.id === `outlet-${side}-plate`)!)
  assert.ok(plates.every(Boolean))
  // One each side of the table, the same distance from it, and clear of it.
  const [left, right] = plates.map(plate => (plate.u[0] + plate.u[1]) / 2)
  close((table.u[0] + table.u[1]) / 2 - left, right - (table.u[0] + table.u[1]) / 2, 1e-9)
  assert.ok(plates.every(plate => plate.u[1] < table.u[0] || plate.u[0] > table.u[1]), 'clear of the table')
  for (const plate of plates) {
    // 114 by 72 mm, matte black, flat on the wall, 30 cm up from the floor's centre.
    close(plate.u[1] - plate.u[0], .114, 1e-9); close(plate.y[1] - plate.y[0], .072, 1e-9); close(plate.v[0], wallV, 1e-9)
    close((plate.y[0] + plate.y[1]) / 2, 3.2 + .3, 1e-9)
  }
  for (const side of ['left', 'right']) {
    const slots = pieces.filter(piece => piece.id.startsWith(`outlet-${side}-socket-`))
    // Two sockets, each with a live and a neutral slot in an inverted V (30 degrees off the vertical, opposite ways) and a vertical earth slot below.
    assert.equal(slots.length, 6)
    for (const socket of [-1, 1]) {
      const live = slots.find(piece => piece.id.endsWith(`socket-${socket}-live`))!, neutral = slots.find(piece => piece.id.endsWith(`socket-${socket}-neutral`))!, earth = slots.find(piece => piece.id.endsWith(`socket-${socket}-earth`))!
      close(Math.abs(live.roll!), Math.PI / 6, 1e-9); close(live.roll!, -neutral.roll!, 1e-9)
      assert.ok(earth.roll === 0 || earth.roll === undefined)
      assert.ok(earth.y[1] < live.y[0] + 1e-9, 'the earth slot is below the other two')
    }
  }
})

test('a TV is on its mount until X takes it off, and it can be hung back', () => {
  assert.equal(tvMountKey('tv-main'), 'mount-main')
  assert.ok(isTvMounted({}, 'tv-living'), 'mounted by default')
  assert.ok(!isTvMounted({ 'mount-living': 0 }, 'tv-living') && isTvMounted({ 'mount-living': 0 }, 'tv-main'), 'each TV on its own')
  assert.ok(isTvMounted({ 'mount-living': 1 }, 'tv-living'))
  // The mount stays on the wall when the TV is off it, and the spot can still be aimed at to hang the TV back.
  const world = buildWalkWorld(publicScene('first', []))
  assert.ok(world.doors.some(door => door.id === 'tv-living'))
  assert.ok(furnishingsOn('first').some(piece => piece.id.startsWith('tv-living-mount-')))
})

test('Q unfolds a TV mount\'s arm: the TV comes out 29 cm, the links join the wall plate to the head, and the TV can still be looked at', () => {
  assert.equal(armKey('tv-living'), 'arm-living')
  assert.equal(armReach({}, 'tv-living'), 0)
  close(armReach({ 'arm-living': 1 }, 'tv-living'), .355 - .067, 1e-9)
  // The arm unfolds with the TV off the mount too: the mount's head comes out, the TV is not there to come with it.
  close(armReach({ 'arm-living': 1, 'mount-living': 0 }, 'tv-living'), .355 - .067, 1e-9)
  const plate = furnishingsOn('first').find(piece => piece.id === 'tv-living-mount-wall-plate')!
  const wallV = plate.v[0], centreU = (plate.u[0] + plate.u[1]) / 2, centreY = (plate.y[0] + plate.y[1]) / 2
  for (const reach of [0, .1, .288]) {
    const links = tvMountLinks('living', wallV, centreU, centreY, reach)
    assert.equal(links.length, 4, 'two links, an upper and a lower arm')
    for (const [from, to] of [[0, 1], [2, 3]]) {
      // Each link is a box laid along u at its midpoint and turned by its yaw: its two ends are where it joins the next.
      const end = (link: (typeof links)[number], sign: number): [number, number] => {
        const length = link.u[1] - link.u[0], middle: [number, number] = [(link.u[0] + link.u[1]) / 2, (link.v[0] + link.v[1]) / 2]
        return [middle[0] + sign * Math.cos(link.yaw) * length / 2, middle[1] + sign * Math.sin(link.yaw) * length / 2]
      }
      const elbowA = end(links[from], 1), elbowB = end(links[to], -1)
      close(elbowA[0], elbowB[0], 1e-9); close(elbowA[1], elbowB[1], 1e-9)
      // The first link starts on the wall plate, the second ends on the head, which has come out by `reach`.
      close(end(links[from], -1)[1], wallV + .03, 1e-9)
      close(end(links[to], 1)[1], wallV + .051 + reach, 1e-9)
    }
  }
  // The aim volume of the TV reaches the folded and the extended TV alike.
  const device = furnishingDevices('first', 3.2).find(item => item.id === 'tv-living')!
  assert.ok(device.halfDepth * 2 >= .03 + (.355 - .067) - 1e-9)
})

test('the TV wall has the in-wall media box over the network socket, the cable pass-through beside the mount and a plug at the TV\'s height', () => {
  const pieces = furnishingsOn('first')
  const find = (id: string) => pieces.find(piece => piece.id === id)!
  const table = find('living-table-top'), tv = find('tv-living'), wallV = table.v[0] - .03
  // The media box: 403 by 275 mm trim ring, centred under the TV, just over the network socket's plate, flat on the wall.
  const left = find('wallbox-trim-left'), right = find('wallbox-trim-right'), top = find('wallbox-trim-top'), bottom = find('wallbox-trim-bottom')
  close(left.u[1] - right.u[0], .403, 1e-9); close(top.y[1] - bottom.y[0], .275, 1e-9)
  close((top.y[0] + bottom.y[1]) / 2, table.y[1] + .105, 1e-9)
  const data = find('data-ps5-plate')
  assert.ok(bottom.y[0] - data.y[1] >= .05 && bottom.y[0] - data.y[1] < .06, 'the media box sits just over 5 cm above the network socket')
  close((data.y[0] + data.y[1]) / 2, find('outlet-left-plate').y[0] + .036, 1e-9)
  assert.ok(data.u[0] >= table.u[0] && data.u[1] <= table.u[1], 'behind the table')
  close((data.u[0] + data.u[1]) / 2, (KITCHEN_LIVING.u[0] + KITCHEN_LIVING.u[1]) / 2, 1e-9)
  close(data.v[0], wallV, 1e-9)
  close((left.u[1] + right.u[0]) / 2, (tv.u[0] + tv.u[1]) / 2, 1e-9)
  close(top.v[0], wallV, 1e-9)
  // Its cover has a slot along the lower edge, about two thirds of its width.
  const cover = find('wallbox-cover'), slot = find('wallbox-slot')
  assert.ok(slot.y[0] < cover.y[0] + .02 && (slot.u[1] - slot.u[0]) / (cover.u[1] - cover.u[0]) > .6)
  // The pass-through: round, 150 mm, beside the mount (past its plate), at the TV's height, with a cable that goes up behind the TV.
  const plate = find('cable-hole-plate'), mountPlate = find('tv-living-mount-wall-plate')
  close(plate.u[1] - plate.u[0], .15, 1e-9); assert.ok(plate.disc)
  assert.ok(plate.u[0] > mountPlate.u[1] || plate.u[1] < mountPlate.u[0], 'beside the mount, not behind it')
  close((plate.y[0] + plate.y[1]) / 2, (tv.y[0] + tv.y[1]) / 2, 1e-9)
  assert.ok(find('cable-hole-cable-up').v[1] < tv.v[0], 'the cable goes up behind the TV')
  // It is flat on the wall (4 mm), an HDMI cable's pass-through: no raised dish, and the cable ends in an HDMI plug.
  close(plate.v[1] - plate.v[0], .004, 1e-9)
  assert.ok(!pieces.some(piece => piece.id === 'cable-hole-dish') && find('cable-hole-hdmi-body') && find('cable-hole-hdmi-tip'))
  // The plug at the TV's height: an outlet plate on the other side of the mount.
  const outlet = find('outlet-tv-plate')
  close((outlet.y[0] + outlet.y[1]) / 2, (tv.y[0] + tv.y[1]) / 2, 1e-9)
  assert.ok(outlet.u[1] < mountPlate.u[0] || outlet.u[0] > mountPlate.u[1])
  const mountMiddle = (mountPlate.u[0] + mountPlate.u[1]) / 2
  assert.ok(((outlet.u[0] + outlet.u[1]) / 2 - mountMiddle) * ((plate.u[0] + plate.u[1]) / 2 - mountMiddle) < 0, 'the plug and the hole are on opposite sides of the mount')
  // They are all behind the TV (v: the wall to the TV's back): none sticks out past 67 mm.
  for (const piece of pieces.filter(item => /^(wallbox|cable-hole|outlet-tv)-/.test(item.id))) assert.ok(piece.v[1] <= wallV + .067 + 1e-9, piece.id)
})

test('the living\'s table, PS5 and controller are one device: aimed at they can be taken away, and the spot stays free to walk through', () => {
  const world = buildWalkWorld(publicScene('first', []))
  const device = world.doors.find(door => door.id === LIVING_SET_ID)
  assert.ok(device?.device)
  const table = furnishingsOn('first').find(piece => piece.id === 'living-table-top')!
  const u = (table.u[0] + table.u[1]) / 2, v = table.v[1]
  // Standing 1 m from the table's front edge in the living, facing the party wall, looking at the table top.
  const pose = { x: u, z: -(v + 1), yaw: Math.PI, pitch: Math.atan2(.42 - 1.65, 1), eyeHeight: 1.65, feetOffset: 0 }
  assert.deepEqual(findWalkDoorTarget(world, {}, pose), { id: LIVING_SET_ID, open: false })
  // Taken away, it can still be aimed at (to set it back), but it no longer stops the visitor.
  assert.equal(findWalkDoorTarget(world, { [livingSetKey]: 0 }, pose)?.id, LIVING_SET_ID)
  assert.ok(withWalkDoorStates(world, {}).blockers.length > withWalkDoorStates(world, { [livingSetKey]: 0 }).blockers.length)
  assert.equal(isLivingSetPresent({ [livingSetKey]: 0 }), false)
  assert.ok(['living-table-top', 'living-table-leg-1', 'ps5', 'ps5-controller'].every(isLivingSetPiece) && !isLivingSetPiece('wallbox-trim-top'))
})

test('the bathroom has an outlet on the wall shared with the living, centred between the toilet and the vanity', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const plate = find('outlet-bathroom-plate'), toilet = find('toilet-body'), vanity = find('vanity-body')
  const toiletEdge = Math.max(toilet.v[0], toilet.v[1]), gap: [number, number] = [toiletEdge, vanity.v[0]]
  assert.ok(plate.v[0] > gap[0] && plate.v[1] < gap[1], 'the plate fits in the wall between the two')
  close((plate.v[0] + plate.v[1]) / 2, (gap[0] + gap[1]) / 2, 1e-9)
  close((plate.y[0] + plate.y[1]) / 2, FLOOR_HEIGHT + .15, 1e-9)  // at floor level, for the smart toilet
  // Flat on the wall the bathroom shares with the living, facing the bathroom (lower u).
  close(plate.u[1], FIRST_FLOOR_BATHROOM.u[1], 1e-9)
  assert.ok(plate.u[0] < plate.u[1] && pieces.filter(piece => piece.id.startsWith('outlet-bathroom-')).every(piece => piece.u[1] <= plate.u[1] + 1e-9 && piece.rollAboutU))
})

test('the kitchen has an outlet 0.30 m up on the other side of the wall from the bathroom\'s, at the same place along it', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const kitchen = find('outlet-kitchen-hall-plate'), bathroom = find('outlet-bathroom-plate')
  close((kitchen.v[0] + kitchen.v[1]) / 2, (bathroom.v[0] + bathroom.v[1]) / 2, 1e-9)
  close((kitchen.y[0] + kitchen.y[1]) / 2, FLOOR_HEIGHT + .3, 1e-9)
  // Flat on the kitchen's face of the wall, which is the bathroom's wall plus its 12 cm, facing the kitchen (higher u).
  close(kitchen.u[0], KITCHEN_LIVING.u[0], 1e-9)
  assert.ok(kitchen.u[0] - bathroom.u[1] > .11 && kitchen.u[1] > kitchen.u[0])
  assert.ok(pieces.filter(piece => piece.id.startsWith('outlet-kitchen-hall-')).every(piece => piece.u[0] >= KITCHEN_LIVING.u[0] - 1e-9 && piece.rollAboutU))
})

test('the kitchen\'s rear wall has an outlet 0.30 m up between the light well\'s window and the terrace\'s balcony door', () => {
  const pieces = furnishingsOn('first'), plate = pieces.find(piece => piece.id === 'outlet-kitchen-rear-plate')!
  const rear = OPENINGS.first.filter(opening => opening.u === AZOTEA_REAR).sort((a, b) => a.v[0] - b.v[0])
  const [door, window] = rear
  assert.ok(plate.v[0] > door.v[1] && plate.v[1] < window.v[0], 'between the balcony door and the window')
  close((plate.v[0] + plate.v[1]) / 2, (door.v[1] + window.v[0]) / 2, 1e-9)
  close((plate.y[0] + plate.y[1]) / 2, FLOOR_HEIGHT + .3, 1e-9)
  // Flat on the wall's inner face, facing the kitchen (lower u).
  close(plate.u[1], KITCHEN_LIVING.u[1], 1e-9)
  assert.ok(pieces.filter(piece => piece.id.startsWith('outlet-kitchen-rear-')).every(piece => piece.u[1] <= KITCHEN_LIVING.u[1] + 1e-9 && piece.rollAboutU))
})

test('the main room\'s TV wall has the same scheme: a network socket, an outlet each side of the bed, the media box over the socket and the TV\'s pass-through and plug', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const tv = find('tv-main'), wallV = MAIN_TV_PLACEMENT.bracket.v[0], tvMiddle = (tv.u[0] + tv.u[1]) / 2
  const data = find('main-data-plate'), left = find('main-outlet-left-plate'), right = find('main-outlet-right-plate'), top = find('main-wallbox-trim-top'), bottom = find('main-wallbox-trim-bottom')
  close((data.u[0] + data.u[1]) / 2, tvMiddle, 1e-9); close((data.y[0] + data.y[1]) / 2, FLOOR_HEIGHT + .3, 1e-9); close(data.v[0], wallV, 1e-9)
  // An outlet each side of the bed (1.60 m wide, centred like the TV), 25 cm clear of it, at the same height as the socket.
  const bed = find('bed-main')
  const [lower, upper] = [left, right].sort((a, b) => a.u[0] - b.u[0])
  assert.ok(lower.u[1] <= bed.u[0] - .19 && upper.u[0] >= bed.u[1] + .19, 'one each side of the bed, clear of it')
  for (const outlet of [left, right]) close((outlet.y[0] + outlet.y[1]) / 2, FLOOR_HEIGHT + .3, 1e-9)
  close((left.u[0] + left.u[1]) / 2 + (right.u[0] + right.u[1]) / 2, 2 * tvMiddle, 1e-9)
  assert.ok(bottom.y[0] - data.y[1] >= .05 && top.y[1] < tv.y[0], 'the media box is over the socket and under the TV')
  close((top.y[0] + bottom.y[1]) / 2, find('living-table-top').y[1] + .105, 1e-9)
  const hole = find('main-cable-hole-plate'), plug = find('main-outlet-tv-plate'), mount = find('tv-main-mount-wall-plate')
  assert.ok(hole.disc && (hole.u[1] < mount.u[0] || hole.u[0] > mount.u[1]) && (plug.u[1] < mount.u[0] || plug.u[0] > mount.u[1]))
  close((plug.y[0] + plug.y[1]) / 2, (tv.y[0] + tv.y[1]) / 2, 1e-9)
})
