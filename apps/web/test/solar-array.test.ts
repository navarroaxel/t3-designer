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

test('sixteen panels of 620 Wp in rows of 4, 6 and 6', () => {
  assert.equal(PANELS.length, 16)
  assert.deepEqual(ROWS.map(row => rowPanels(row).length), [4, 6, 6])
  assert.deepEqual(ROW_COUNTS, { back: 4, middle: 6, front: 6 })
  assert.equal(new Set(PANELS.map(panel => panel.id)).size, 16)
  assert.equal(ARRAY_WATTS, 16 * 620)
  assert.equal(ARRAY_WATTS, 9920)
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

test('panels do not touch each other: a small gap in each row, a walkway between rows', () => {
  for (const row of ROWS) {
    const panels = rowPanels(row)
    for (let i = 1; i < panels.length; i++) {
      const gap = panels[i - 1].v[0] - panels[i].v[1]
      assert.ok(gap >= .009 && gap <= .05, `${row}: gap ${gap}`)
    }
    for (const panel of panels) assert.deepEqual(panel.u, panels[0].u, `${row}: one line`)
  }
  const [back, middle, front] = ROWS.map(row => rowPanels(row)[0])
  assert.ok(back.u[0] - middle.u[1] >= .5, 'gap between the back and middle rows')
  assert.ok(middle.u[0] - front.u[1] >= .5, 'gap between the middle and front rows')
})

test('the array sits toward the street, its front row cantilevered past the front wall', () => {
  const front = rowPanels('front')[0]
  closeTo(front.u[0], -5 - FRONT_OVERHANG, 1e-9)
  assert.ok(FRONT_OVERHANG > 0 && FRONT_OVERHANG <= 1, 'no further than the roof edge, 1 m past the wall')
  // Rows are packed one behind the other from the street.
  const [back, middle] = [rowPanels('back')[0], rowPanels('middle')[0]]
  closeTo(middle.u[0] - front.u[1], .55, 1e-9)
  closeTo(back.u[0] - middle.u[1], .55, 1e-9)
})

test('the row of 4 rests on the north-east wall and the two rows of 6 on the south-west wall', () => {
  closeTo(rowPanels('back')[0].v[1], 4.33, 1e-9)
  for (const row of ['middle', 'front'] as const) {
    const panels = rowPanels(row)
    // The wall leans slightly; a row rests on it at the middle of its depth.
    closeTo(panels.at(-1)!.v[0], houseSouthWestEdge((panels[0].u[0] + panels[0].u[1]) / 2), 1e-9)
    assert.ok(panels[0].v[1] < 4.33 - 1, `${row}: leaves room on the north-east side`)
  }
  // Seen from the street the row of 4 is on the left and the rows of 6 are pushed to the right.
  const centre = (row: string) => rowPanels(row).reduce((sum, panel) => sum + (panel.v[0] + panel.v[1]) / 2, 0) / rowPanels(row).length
  assert.ok(centre('back') > 0 && centre('middle') < 0 && centre('front') < 0)
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
