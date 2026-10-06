import assert from 'node:assert/strict'
import test from 'node:test'
import { polygonCentroid } from '@t3-designer/geometry'
import { pointInEditorPolygon } from '@t3-designer/scene-schema'
import { currentFixtures } from '../src/data/current-state.ts'
import { HOUSE_FLOORS, HOUSE_FLOOR_ORDER, WALL_HEIGHT, floorOfRoom, shellWallBoxes } from '../src/data/house-interior.ts'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { BATHROOM, CUT_HEIGHT, FIRST_FLOOR_PARTITIONS, GROUND_PARTITIONS, OPENINGS, OUTLINES, SIDE_OPENINGS, wallBoxes, FIRST_FLOOR_BATHROOM, FRONT_ROOMS, GARAGE, GROUND_GARAGE, OFFICE_WIDTH, GROUND_OFFICE } from '../src/data/house-plan.ts'
import { houseToSite } from '../src/data/frame.ts'
import { apartmentToSite, housePlacement, siteDirectionFromApartment, siteDirectionToApartment } from '../src/data/house-placement.ts'
import { publicScene } from '../src/lib/public-scene.ts'
import { buildWalkWorld, findWalkSpawn, isWalkPositionFree } from '../src/walkthrough/navigation.ts'

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
  assert.equal(living.appearance, 'glazed')
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
