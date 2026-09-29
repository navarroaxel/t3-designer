import assert from 'node:assert/strict'
import test from 'node:test'
import { genericBuildings } from '../src/data/block.ts'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL, SITE_ROADS, houseSouthWestEdge, houseToSite, siteToHouse, type BuildingFootprint, type SitePoint } from '../src/data/building-site.ts'

function area(ring: SitePoint[]) {
  return Math.abs(ring.reduce((sum, a, index) => {
    const b = ring[(index + 1) % ring.length]
    return sum + a[0] * b[1] - b[0] * a[1]
  }, 0)) / 2
}

function contains(point: SitePoint, ring: SitePoint[]) {
  let inside = false
  ring.forEach((b, index) => {
    const a = ring[(index + ring.length - 1) % ring.length]
    if ((a[1] > point[1]) !== (b[1] > point[1])
      && point[0] < (b[0] - a[0]) * (point[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside
  })
  return inside
}

function validateRing(ring: SitePoint[], label: string) {
  assert.ok(ring.length >= 3, `${label}: at least three vertices`)
  assert.notDeepEqual(ring[0], ring.at(-1), `${label}: open ring without duplicated closing vertex`)
  for (const [index, point] of ring.entries()) {
    assert.equal(point.length, 2, `${label}: planar [east,south] coordinates`)
    assert.ok(point.every(Number.isFinite), `${label}: finite coordinates`)
    const next = ring[(index + 1) % ring.length]
    assert.ok(Math.hypot(point[0] - next[0], point[1] - next[1]) > 1e-6, `${label}: nonzero edge`)
  }
  assert.ok(area(ring) > .01, `${label}: nondegenerate polygon`)
  const cross = (a: SitePoint, b: SitePoint, c: SitePoint) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 2; j < ring.length; j++) {
      if (i === 0 && j === ring.length - 1) continue
      const a = ring[i], b = ring[(i + 1) % ring.length], c = ring[j], d = ring[(j + 1) % ring.length]
      const crossing = cross(a, b, c) * cross(a, b, d) < -1e-10 && cross(c, d, a) * cross(c, d, b) < -1e-10
      assert.equal(crossing, false, `${label}: edges ${i} and ${j} cross`)
    }
  }
}

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)

const centroid = (ring: SitePoint[]): SitePoint => [
  ring.reduce((sum, point) => sum + point[0], 0) / ring.length,
  ring.reduce((sum, point) => sum + point[1], 0) / ring.length,
]
const byId = (id: string) => SITE_BUILDINGS.find(building => building.id === id)!
const HOUSE_PARTS = ['HOUSE', 'HOUSE-ENTRY', 'HOUSE-ARM', 'HOUSE-TERRACE']
// House frame from the source: u toward the rear (south-east), v toward the north-east.
const houseFrame = siteToHouse

test('one target locates the house at Tapalque, Buenos Aires', () => {
  const targets = SITE_BUILDINGS.filter(building => building.isTarget)
  assert.equal(targets.length, 1)
  const target = targets[0]
  assert.equal(target.id, 'HOUSE')
  assert.equal(target.id, BUILDING_SITE.targetId)
  // Two decimals only: the exact location of the house is not published.
  closeTo(BUILDING_SITE.latitude, -34.65, 1e-9)
  closeTo(BUILDING_SITE.longitude, -58.5, 1e-9)
  assert.equal(Object.keys(BUILDING_SITE).some(key => /url/i.test(key)), false, 'no map links with exact coordinates')
  assert.equal(BUILDING_SITE.timeZone, 'America/Argentina/Buenos_Aires')
  // The street only: the house number is not published.
  assert.match(BUILDING_SITE.officialAddress, /^Tapalque, Buenos Aires/)
  assert.doesNotMatch(`${BUILDING_SITE.address} ${BUILDING_SITE.officialAddress}`, /\d/, 'no house number in any address')
  assert.ok(contains([0, 0], target.footprint), 'origin lies on the upper block')
})

test('the upper block, rear band and lot keep the owner’s dimensions', () => {
  const block = byId('HOUSE'), arm = byId('HOUSE-ARM'), terrace = byId('HOUSE-TERRACE')
  // The house fills the lot's 8.95 m front. The block plus the strip over the recessed entrance make up
  // 9 m of house, and the 1 m cantilever in front brings the roof to 10 m.
  // The south-west wall stands on the lot's boundary, which leans 0.25 m over the depth of the lot, so the
  // house is 8.95 m wide at the street line and a little narrower behind it.
  closeTo(houseSouthWestEdge(-5), -4.475, 1e-9)
  closeTo(houseSouthWestEdge(8.7), -4.225, 1e-9)
  closeTo(area(block.footprint) + area(byId('HOUSE-ENTRY').footprint), 9 * (4.475 - houseSouthWestEdge(-.5)), .02)
  closeTo(area(byId('HOUSE-CANTILEVER').footprint), 1 * (4.475 - houseSouthWestEdge(-5.5)), .02)
  // The rear band: the owner's 3.95 m inside plus the walls, from the street line to the rear boundary.
  closeTo(area(arm.footprint), (8.5 - 4) * (4.475 - 1.5), .05)
  closeTo(area(terrace.footprint), (8.6 - 4) * (-1 - houseSouthWestEdge((4 + 8.6) / 2)), .02)
  // The lot polygon comes from the municipal sketch: 120.03 m2.
  closeTo(area(SITE_PARCEL.footprint), 120.03, .02)
  closeTo(SITE_PARCEL.area, 120.03, .02)
  validateRing(SITE_PARCEL.footprint, 'lot')
  for (const id of HOUSE_PARTS) {
    for (const point of byId(id).footprint) {
      const [u, v] = houseFrame(point)
      assert.ok(u >= -5.01 && u <= 8.71 && Math.abs(v) <= 4.48, `${id}: inside the 13.5 m x 8.95 m lot`)
    }
  }
  // The terrace is on the right seen from the street, the south-west side.
  assert.ok(houseFrame(centroid(terrace.footprint))[1] < 0)
  assert.ok(houseFrame(centroid(arm.footprint))[1] > 0)
})

test('the light well is an open void between the terrace and the left arm', () => {
  const site = houseToSite(6.25, .25) // the middle of the 2.5 m x 4.5 m notch
  assert.ok(contains(site, SITE_PARCEL.footprint))
  for (const building of groundVolumes) assert.equal(contains(site, building.footprint), false, `${building.id} must leave the well open`)
  // What the house leaves free of the lot is the well (2.5 m wide, about 4.6 m deep) plus thin slivers
  // along the boundaries that lean away from the house's straight walls.
  const free = area(SITE_PARCEL.footprint) - HOUSE_PARTS.reduce((sum, id) => sum + area(byId(id).footprint), 0)
  assert.ok(free > 2.5 * 4.4 && free < 2.5 * 4.6 + 3, `free area ${free.toFixed(2)} m2`)
})

const isRooftop = (building: BuildingFootprint) => /^HOUSE-(PARAPET|TANK)/.test(building.id)
const groundVolumes = SITE_BUILDINGS.filter(building => !isRooftop(building))

test('heights follow the reported floor counts, refined by Street View where it shows more', () => {
  // [height above ground, floors]. Owner floor counts: house 2, A 1, the lot behind 1, C 2.
  const expected: Record<string, [number, number]> = {
    'HOUSE': [6.4, 2], 'HOUSE-ENTRY': [6.4, 1], 'HOUSE-CANTILEVER': [6.4, 0], 'HOUSE-ARM': [3.2, 1], 'HOUSE-TERRACE': [3.2, 1],
    'NEIGHBOR-A': [3.8, 1], 'NEIGHBOR-A-WALL': [2.1, 0], 'NEIGHBOR-A-GARAGE': [2.7, 1], 'NEIGHBOR-A-REAR': [5.6, 2], 'NEIGHBOR-B': [3.3, 1],
    'NEIGHBOR-C-UPPER': [6.6, 2], 'NEIGHBOR-C-REAR': [3, 1], 'NEIGHBOR-C-FRONT': [3, 1],
  }
  // The other lots of the block: one prism each, 3.3 m by default, 6.4 m where Street View shows two floors.
  for (const { lot } of genericBuildings()) expected[`LOT-${String(lot.number).padStart(2, '0')}`] = [lot.height, lot.floors]
  assert.deepEqual(groundVolumes.map(building => building.id).sort(), Object.keys(expected).sort())
  for (const building of groundVolumes) {
    closeTo(building.height, expected[building.id][0], .001)
    assert.equal(building.floors, expected[building.id][1], building.id)
    assert.equal(building.roofHeight, 0, `${building.id}: flat roof`)
    assert.equal(building.source, 'estimated')
    closeTo(building.groundOffset, 0, .001)
  }
})

test('the entrance is set back 1 m between a 0.5 m flush wall and a pier, and the garage stands on the line', () => {
  const block = byId('HOUSE'), entry = byId('HOUSE-ENTRY')
  const us = (building: BuildingFootprint) => building.footprint.map(point => houseFrame(point))
  const has = (u: number, v: number) => us(block).some(([pu, pv]) => Math.abs(pu - u) < .02 && Math.abs(pv - v) < .02)
  // Recess: back wall 1 m behind the line, from the pier (v = 0.85) to the return wall (v = 3.975)...
  assert.ok(has(-4, .85) && has(-4, 3.975), 'entrance wall 1 m behind the line')
  // ...a 0.5 m wall stays on the line next to the neighbour, and the garage stands on the line.
  assert.ok(has(-5, 3.975) && has(-5, 4.475), '0.5 m flush wall at the north-east end')
  assert.ok(has(-5, .85) && has(-5, -4.475), 'pier and garage on the street line')
  // The upper floor overhangs the recess up to the line.
  closeTo(Math.min(...us(entry).map(([u]) => u)), -5, .02)
  closeTo(area(entry.footprint), 1 * (3.975 - .85), .02)
  closeTo(entry.base!, 3.0, .001)
})

test('the sheet-metal roof of the garage of lot 7 is a single pitch of more than 5 degrees, rising toward the back', () => {
  const garage = byId('NEIGHBOR-A-GARAGE')
  assert.ok(garage.slope, 'has a pitch')
  const us = garage.footprint.map(point => houseFrame(point)[0])
  const depth = Math.max(...us) - Math.min(...us)
  const degrees = Math.atan(garage.slope!.rise / depth) * 180 / Math.PI
  closeTo(depth, 9, .02)
  assert.ok(degrees > 5 && degrees < 15, `pitch ${degrees.toFixed(1)} degrees`)
  // It rises toward the rear (the house frame's +u), and stays under the taller volume behind it.
  closeTo(garage.slope!.direction[0], Math.SQRT1_2, 1e-12)
  closeTo(garage.slope!.direction[1], Math.SQRT1_2, 1e-12)
  assert.ok(garage.height + garage.slope!.rise < byId('NEIGHBOR-A-REAR').height)
  // The other buildings are flat.
  assert.equal(SITE_BUILDINGS.filter(item => item.slope).length, 1)
})

test('every front stands on the same street line, u = -5, and A keeps a 2 m patio', () => {
  const frontOf = (id: string) => Math.min(...byId(id).footprint.map(point => houseFrame(point)[0]))
  for (const id of ['HOUSE', 'NEIGHBOR-A-WALL', 'NEIGHBOR-A-GARAGE', 'NEIGHBOR-C-UPPER', 'NEIGHBOR-C-FRONT']) {
    closeTo(frontOf(id), -5, .02)
  }
  // A's house stands 2 m behind its street wall.
  closeTo(frontOf('NEIGHBOR-A'), -3, .02)
  // The corner lot's building runs on to the corner where the street lines meet.
  closeTo(Math.min(...byId('NEIGHBOR-C-FRONT').footprint.map(point => houseFrame(point)[1])), -15.175, .02)
})

test('the roof is 10 m deep counting a 1 m cantilever that ends on the balcony line', () => {
  const cantilever = byId('HOUSE-CANTILEVER'), block = byId('HOUSE')
  const us = (building: BuildingFootprint) => building.footprint.map(point => houseFrame(point)[0])
  closeTo(Math.min(...us(cantilever)), -6, .02)
  closeTo(Math.max(...us(cantilever)), -5, .02)
  closeTo(Math.max(...us(block)), 4, .02)
  closeTo(Math.max(...us(block)) - Math.min(...us(cantilever)), 10, .04)
  closeTo(cantilever.height, block.height, 1e-9)
  closeTo(cantilever.base!, block.height - .5, 1e-9)
  // The front parapet stands on the roof's front edge, 1 m in front of the facade.
  closeTo(Math.min(...us(byId('HOUSE-PARAPET-FRONT'))), -6, .02)
})

test('rooftop obstacles stand on the azotea slab and inside its outline', () => {
  const block = byId('HOUSE')
  const obstacles = SITE_BUILDINGS.filter(isRooftop)
  assert.deepEqual(obstacles.map(item => item.id).filter(id => /TANK/.test(id)).sort(),
    ['HOUSE-TANK-BLOCK', 'HOUSE-TANK-COLUMN-FR', 'HOUSE-TANK-COLUMN-RL', 'HOUSE-TANK-COLUMN-RR', 'HOUSE-TANK-SLAB', 'HOUSE-TANK-STEEL'])
  assert.ok(obstacles.some(item => /PARAPET/.test(item.id)))
  for (const item of obstacles) {
    closeTo(item.base! >= 0 ? block.height : 0, block.height, .001)
    assert.ok(item.height > item.base!, `${item.id}: positive thickness`)
    assert.ok(item.base! >= block.height - .001, `${item.id}: rests on or above the roof slab`)
    for (const point of item.footprint) {
      const [u, v] = houseFrame(point)
      assert.ok(u >= -6.01 && u <= 4.01 && v >= houseSouthWestEdge(u) - .01 && v <= 4.476, `${item.id}: inside the 10 m roof, between the walls on the lot boundaries`)
    }
  }
  // The concrete tank rests on three legs that stay under its slab.
  const legs = obstacles.filter(item => /TANK-COLUMN/.test(item.id))
  assert.equal(legs.length, 3)
  const slab = byId('HOUSE-TANK-SLAB')
  for (const leg of legs) {
    closeTo(leg.height - block.height, .9, .001)
    // The rear legs share the slab's rear edge, so test the centre of each leg.
    const centre: SitePoint = [leg.footprint.reduce((sum, point) => sum + point[0], 0) / 4, leg.footprint.reduce((sum, point) => sum + point[1], 0) / 4]
    assert.ok(contains(centre, slab.footprint), `${leg.id}: under the slab`)
  }
  // One leg at the front and two at the back, against the rear parapet.
  const legU = (id: string) => Math.max(...byId(id).footprint.map(point => houseFrame(point)[0]))
  const rearFace = Math.min(...byId('HOUSE-PARAPET-REAR').footprint.map(point => houseFrame(point)[0]))
  assert.ok(legU('HOUSE-TANK-COLUMN-FR') < 3.7, 'front leg near the front of the tank')
  for (const id of ['HOUSE-TANK-COLUMN-RL', 'HOUSE-TANK-COLUMN-RR']) closeTo(legU(id), rearFace, .01)
  closeTo(Math.max(...slab.footprint.map(point => houseFrame(point)[0])), rearFace, .01)
  const tank = byId('HOUSE-TANK-BLOCK')
  closeTo(area(tank.footprint), 1.6 * 1.6, .01)
  // Side and rear parapets are 1.1 m high; the tiled front band is lower.
  closeTo(byId('HOUSE-PARAPET-REAR').height - block.height, 1.1, .001)
  closeTo(byId('HOUSE-PARAPET-FRONT').height - block.height, .8, .001)
})

test('building rings are finite and simple, and no ground footprints overlap', () => {
  assert.equal(new Set(SITE_BUILDINGS.map(building => building.id)).size, SITE_BUILDINGS.length)
  for (const building of SITE_BUILDINGS) validateRing(building.footprint, building.id)
  // Estimate the shared area on a fine grid, so notched footprints are handled and
  // party walls that merely touch do not count.
  const overlapArea = (a: BuildingFootprint, b: BuildingFootprint) => {
    const xs = a.footprint.map(point => point[0]), zs = a.footprint.map(point => point[1]), step = .1
    let hits = 0
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) {
      for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step) {
        if (contains([x, z], a.footprint) && contains([x, z], b.footprint)) hits++
      }
    }
    return hits * step * step
  }
  for (const [index, a] of groundVolumes.entries()) for (const b of groundVolumes.slice(index + 1)) {
    assert.ok(overlapArea(a, b) < .05, `${a.id} overlaps ${b.id} by ${overlapArea(a, b).toFixed(2)} m²`)
  }
})

test('road geometry remains finite, metric and clipped to the local context', () => {
  assert.equal(new Set(SITE_ROADS.map(road => road.id)).size, SITE_ROADS.length)
  assert.ok(SITE_ROADS.some(road => /Tapalque/i.test(road.name)))
  for (const road of SITE_ROADS) {
    assert.ok(road.width > 0 && Number.isFinite(road.width), `${road.id}: real width`)
    assert.ok(road.points.length >= 2)
    assert.ok(road.points.every(point => point.length === 2 && point.every(value => Number.isFinite(value) && Math.abs(value) <= 110.001)), `${road.id}: clipped local metric points`)
  }
})
