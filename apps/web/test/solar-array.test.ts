import assert from 'node:assert/strict'
import test from 'node:test'
import { ROOF_LEVEL, SITE_BUILDINGS, houseSouthWestEdge, siteToHouse, type BuildingFootprint } from '../src/data/building-site.ts'
import {
  ARRAY_WATTS, FACING_BEARING, FRONT_OVERHANG, LOW_EDGE_HEIGHT, PANELS, PANEL_SPEC, ROWS, ROW_COUNTS, TILT_DEGREES, buildPanels,
  type Panel,
} from '../src/data/solar-array.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)
const rowPanels = (row: string) => PANELS.filter(panel => panel.row === row)
const byId = (id: string) => SITE_BUILDINGS.find(building => building.id === id)!

const houseFrame = (point: [number, number]) => siteToHouse(point)
const planBox = (building: BuildingFootprint) => {
  const points = building.footprint.map(point => houseFrame(point as [number, number]))
  return { u: [Math.min(...points.map(p => p[0])), Math.max(...points.map(p => p[0]))], v: [Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[1]))] }
}
const overlap = (a: [number, number] | number[], b: [number, number] | number[]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('eighteen panels of 620 Wp in three rows of 6', () => {
  assert.equal(PANELS.length, 18)
  assert.deepEqual(ROWS.map(row => rowPanels(row).length), [6, 6, 6])
  assert.deepEqual(ROW_COUNTS, { back: 6, middle: 6, front: 6 })
  assert.equal(new Set(PANELS.map(panel => panel.id)).size, 18)
  assert.equal(ARRAY_WATTS, 18 * 620)
  assert.equal(ARRAY_WATTS, 11160)
  assert.equal(PANEL_SPEC.lengthM, 2.465)
  assert.equal(PANEL_SPEC.widthM, 1.134)
})

test('every panel is tilted 5 degrees and faces the street', () => {
  for (const panel of PANELS) {
    const [nu, ny, nv] = panel.normal
    closeTo(Math.hypot(nu, ny, nv), 1, 1e-12)
    closeTo(Math.acos(ny) * 180 / Math.PI, TILT_DEGREES, 1e-9)
    closeTo(nv, 0, 1e-12)
    // The horizontal part of the normal points toward -u; in site axes (x east, z south) that is north-west.
    const bearing = (Math.atan2(nu * Math.SQRT1_2, -(nu * Math.SQRT1_2)) * 180 / Math.PI + 360) % 360
    closeTo(bearing, FACING_BEARING, 1e-9)
    // The low edge is at the street side, the high edge at the rear, and the plane holds together.
    assert.ok(panel.highEdgeY > panel.lowEdgeY)
    closeTo(panel.highEdgeY - panel.lowEdgeY, PANEL_SPEC.lengthM * Math.sin(TILT_DEGREES * Math.PI / 180), 1e-9)
    closeTo(panel.u[1] - panel.u[0], PANEL_SPEC.lengthM * Math.cos(TILT_DEGREES * Math.PI / 180), 1e-9)
    closeTo(panel.v[1] - panel.v[0], PANEL_SPEC.widthM, 1e-9)
    const [lowLeft, lowRight, highRight, highLeft] = panel.corners
    closeTo(lowLeft[1], lowRight[1], 1e-12)
    closeTo(highLeft[1], highRight[1], 1e-12)
    closeTo(Math.hypot(highLeft[0] - lowLeft[0], highLeft[1] - lowLeft[1]), PANEL_SPEC.lengthM, 1e-9)
  }
})

test('panels do not touch each other: the same small gap in a row and between rows, no walkway', () => {
  for (const row of ROWS) {
    const panels = rowPanels(row)
    for (let i = 1; i < panels.length; i++) {
      const gap = panels[i - 1].v[0] - panels[i].v[1]
      assert.ok(gap >= .009 && gap <= .05, `${row}: gap ${gap}`)
    }
    for (const panel of panels) assert.deepEqual(panel.u, panels[0].u, `${row}: one line`)
  }
  const [back, middle, front] = ROWS.map(row => rowPanels(row)[0])
  for (const [behind, ahead] of [[back, middle], [middle, front]]) {
    const gap = behind.u[0] - ahead.u[1]
    assert.ok(gap >= .009 && gap <= .05, `gap between rows ${gap}`)
  }
})

test('the array sits toward the street, its front row cantilevered past the front wall', () => {
  const front = rowPanels('front')[0]
  closeTo(front.u[0], -5 - FRONT_OVERHANG, 1e-9)
  assert.ok(FRONT_OVERHANG > 0 && FRONT_OVERHANG <= 1, 'no further than the roof edge, 1 m past the wall')
  // Rows are packed one behind the other from the street.
  const [back, middle] = [rowPanels('back')[0], rowPanels('middle')[0]]
  closeTo(middle.u[0] - front.u[1], .01, 1e-9)
  closeTo(back.u[0] - middle.u[1], .01, 1e-9)
})

test('every row is centred between the side walls, with a walkway along each', () => {
  const walkways: number[] = []
  for (const row of ROWS) {
    const panels = rowPanels(row)
    const depthMiddle = (panels[0].u[0] + panels[0].u[1]) / 2
    // The south-west wall leans slightly; the walkways are measured at the middle of the row's depth.
    const southWest = panels.at(-1)!.v[0] - houseSouthWestEdge(depthMiddle)
    const northEast = 4.33 - panels[0].v[1]
    closeTo(southWest, northEast, 1e-9)
    assert.ok(southWest >= .7, `${row}: a walkway of at least 0.7 m on each side`)
    walkways.push(southWest)
  }
  // The rows line up, so the rectangle is one block (the wall's lean moves each row sideways by a few centimetres).
  for (const walkway of walkways) closeTo(walkway, walkways[0], .05)
})

test('the array fits on the azotea and leaves room behind it', () => {
  for (const panel of PANELS) {
    assert.ok(panel.u[0] >= -6 && panel.u[1] <= 4, `${panel.id}: within the 10 m depth of the roof, cantilever included`)
    assert.ok(panel.v[0] >= houseSouthWestEdge((panel.u[0] + panel.u[1]) / 2) - 1e-9 && panel.v[1] <= 4.33 + 1e-9, `${panel.id}: within the width of the roof`)
  }
  // Space at the rear, by the water tank and behind the array, for access and maintenance.
  assert.ok(3.775 - rowPanels('back')[0].u[1] >= 1, 'room between the array and the rear parapet')
})

test('the panels clear the parapets and the water tank', () => {
  const parapet = byId('HOUSE-PARAPET-REAR').height
  for (const panel of PANELS) assert.ok(panel.lowEdgeY >= parapet + .1, `${panel.id}: above the parapets`)
  closeTo(LOW_EDGE_HEIGHT, PANELS[0].lowEdgeY - ROOF_LEVEL, 1e-12)
  const obstacles = SITE_BUILDINGS.filter(building => /^HOUSE-TANK-/.test(building.id))
  assert.ok(obstacles.length >= 6)
  for (const obstacle of obstacles) {
    const box = planBox(obstacle)
    for (const panel of PANELS) {
      const shared = overlap(panel.u, box.u) > 1e-6 && overlap(panel.v, box.v) > 1e-6
      // Where a panel is over an obstacle in plan, it must pass above the top of it.
      if (shared) assert.ok(panel.lowEdgeY >= obstacle.height + .04, `${panel.id} collides with ${obstacle.id}`)
    }
  }
  // The back row sits beside the tank block, not over it.
  const block = planBox(byId('HOUSE-TANK-BLOCK'))
  for (const panel of rowPanels('back')) assert.ok(!(overlap(panel.u, block.u) > 1e-6 && overlap(panel.v, block.v) > 1e-6), `${panel.id} beside the tank`)
})

test('building the array twice gives the same panels', () => {
  const again: Panel[] = buildPanels()
  assert.deepEqual(again, PANELS)
})
