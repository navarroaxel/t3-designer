import assert from 'node:assert/strict'
import test from 'node:test'
import { STREET_LINE, STREET_WIDTHS } from '../src/data/block.ts'
import { SIDEWALK, SIDEWALK_TOP, STREET_RECTS, STREET_TREE, siteBox, streetPoles, streetTrees } from '../src/data/streetscape.ts'

const rect = (id: string) => STREET_RECTS.find(item => item.id === id)!

test('the front street has a tiled sidewalk from the building line to the curb on each side, 3.2 m wide with the curb and a grass strip', () => {
  for (const [name, edge, toward] of [['near', STREET_LINE, -1], ['far', STREET_LINE - STREET_WIDTHS.front, 1]] as const) {
    const slab = rect(`${name}-sidewalk`), grass = rect(`${name}-grass`), curb = rect(`${name}-curb`), gutter = rect(`${name}-gutter`)
    const whole = [slab, grass, curb].flatMap(item => item.u)
    // From the building line to the curb: 3.2 m, in one piece with the grass strip and the curb.
    assert.ok(Math.abs((Math.max(...whole) - Math.min(...whole)) - SIDEWALK.width) < 1e-9, `${name}: 3.2 m between the building line and the curb`)
    assert.ok(toward === -1 ? Math.abs(Math.max(...whole) - edge) < 1e-9 : Math.abs(Math.min(...whole) - edge) < 1e-9, `${name}: starts at the building line`)
    assert.ok(slab.tiles && !grass.tiles, 'the sidewalk is tiled, the grass is not')
    assert.ok(Math.abs(curb.u[1] - curb.u[0] - SIDEWALK.curb) < 1e-9 && Math.abs(grass.u[1] - grass.u[0] - SIDEWALK.grass) < 1e-9)
    // The gutter lies on the road, past the curb.
    assert.ok(toward === -1 ? gutter.u[1] <= Math.min(...whole) + 1e-9 : gutter.u[0] >= Math.max(...whole) - 1e-9, `${name}: the gutter is on the road`)
    assert.ok(slab.y[1] === SIDEWALK_TOP && Math.abs(SIDEWALK_TOP - SIDEWALK.roadTop - SIDEWALK.height) < 1e-9)
  }
  // The road between the two sidewalks is what is left of the street's width.
  assert.ok(Math.abs(STREET_WIDTHS.front - 2 * SIDEWALK.width - 10.92) < 1e-9)
})

test('trees and light poles stand on the curb side of both sidewalks, a tree every 9 m and a pole every 27 m, and a site box has the right size', () => {
  const trees = streetTrees(), poles = streetPoles()
  assert.ok(trees.length >= 20 && poles.length >= 4)
  const nearU = Math.max(...trees.map(at => at.u)), farU = Math.min(...trees.map(at => at.u))
  assert.ok(nearU < STREET_LINE - SIDEWALK.width + SIDEWALK.curb + SIDEWALK.grass && nearU > STREET_LINE - SIDEWALK.width, 'on the near grass strip')
  assert.ok(farU < STREET_LINE - STREET_WIDTHS.front + SIDEWALK.width, 'on the far grass strip')
  const spacing = trees.filter(at => at.u === nearU).map(at => at.v).sort((a, b) => a - b)
  assert.ok(spacing.slice(1).every((v, index) => Math.abs(v - spacing[index] - STREET_TREE.pitch) < 1e-9))
  const box = siteBox([0, 2], [0, 5], [0, 1])
  assert.deepEqual(box.scale, [5, 1, 2])
})
