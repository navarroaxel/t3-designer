import assert from 'node:assert/strict'
import test from 'node:test'
import { pointInEditorPolygon } from '@t3-designer/scene-schema'
import { currentFixtures } from '../src/data/current-state.ts'
import { HOUSE_FLOORS, HOUSE_FLOOR_ORDER, WALL_HEIGHT, floorOfRoom } from '../src/data/house-interior.ts'
import { BATHROOM, FIRST_FLOOR_BATHROOM, FRONT_ROOMS, GARAGE, GROUND_GARAGE, OFFICE_WIDTH, GROUND_OFFICE } from '../src/data/house-plan.ts'
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
    assert.ok(apartment.walls.every(wall => wall.height === WALL_HEIGHT))
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
  assert.ok(windows.some(window => Math.abs(window.width - 3) < 1e-9 && window.kind === 'balcony-door'))
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
    const world = buildWalkWorld(publicScene(floor, currentFixtures))
    const spawn = findWalkSpawn(world)
    assert.ok(spawn, floor)
    assert.ok(isWalkPositionFree(world, spawn.position))
  }
})
