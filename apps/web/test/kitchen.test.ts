import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { CUT_HEIGHT, KITCHEN_LIVING, LIVING_TV_PLACEMENT, OPENINGS } from '../src/data/house-plan.ts'
import { TOSCANA_VENA_SLAB } from '../src/data/house-plan.ts'
import { COUNTER_V, KITCHEN_BOXES, KITCHEN_SIZES } from '../src/data/kitchen.ts'

const box = (id: string) => KITCHEN_BOXES.find(item => item.id === id)!
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])

test('every kitchen piece stands inside the living, under the cut and above the floor', () => {
  for (const item of KITCHEN_BOXES) {
    assert.ok(item.u[0] >= KITCHEN_LIVING.u[0] - 1e-9 && item.u[1] <= KITCHEN_LIVING.u[1] + 1e-9, `${item.id} within the living's depth`)
    assert.ok(item.v[0] >= KITCHEN_LIVING.v[0] && item.v[1] <= KITCHEN_LIVING.v[1] + 1e-9, `${item.id} within the living's width`)
    assert.ok(item.y[0] >= FLOOR_HEIGHT - 1e-9 && item.y[1] <= FLOOR_HEIGHT + CUT_HEIGHT + 1e-9, `${item.id} between the floor and the cut`)
  }
})

test('the cabinets run along the party wall with neighbour A, facing the TV wall, from the rear: column, fridge, base', () => {
  const wall = KITCHEN_LIVING.v[1]
  for (const id of ['column', 'fridge', 'base']) assert.ok(Math.abs(box(id).v[1] - wall) < 1e-9, `${id} against the party wall`)
  assert.ok(box('column').u[1] > box('fridge').u[1] - 1e-9 && box('fridge').u[1] > box('base').u[1] - 1e-9)
  // The run is as deep as the living: from the front (bathroom) wall to the rear wall.
  assert.ok(Math.abs(box('base').u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && Math.abs(box('column').u[1] - KITCHEN_LIVING.u[1]) < 1e-9)
  // The second counter is in front of the run, toward the living and the TV, with 1.1 m to walk between them: a parallel kitchen.
  assert.ok(Math.abs(box('base').v[0] - COUNTER_V[1] - KITCHEN_SIZES.aisle) < 1e-9)
  assert.ok(COUNTER_V[1] < box('base').v[0])
})

test('the second counter is 2.20 m by 1.00 m against the wall behind the bathroom, with a top, an overhang and three stools', () => {
  const stools = KITCHEN_BOXES.filter(item => item.id.startsWith('stool'))
  assert.equal(stools.length, 3)
  const counter = box('counter')
  assert.ok(Math.abs(counter.u[1] - counter.u[0] - 2.2) < 1e-9 && Math.abs(counter.v[1] - counter.v[0] - 1) < 1e-9)
  assert.ok(Math.abs(counter.u[0] - KITCHEN_LIVING.u[0]) < 1e-9, 'its end is against the wall behind the bathroom')
  assert.ok(box('counter-top').v[0] < box('counter').v[0] - .2, 'overhang toward the stools')
  for (const stool of stools) {
    assert.ok(stool.v[1] <= box('counter').v[0] + 1e-9, 'stools on the side away from the cabinets')
    assert.ok(stool.y[1] < box('counter-top').y[0], 'and tucked under the top')
  }
})

test('kitchen pieces do not overlap, except a top over its cabinet and stools under the overhang', () => {
  const allowed = new Set(['worktop:base', 'oven:base', 'cooktop:worktop', 'counter-top:counter'])
  for (const [index, a] of KITCHEN_BOXES.entries()) for (const b of KITCHEN_BOXES.slice(index + 1)) {
    const inside = overlap(a.u, b.u) > 1e-6 && overlap(a.v, b.v) > 1e-6 && overlap(a.y, b.y) > 1e-6
    if (inside) assert.ok(allowed.has(`${a.id}:${b.id}`) || allowed.has(`${b.id}:${a.id}`), `${a.id} overlaps ${b.id}`)
  }
})

test('the kitchen leaves room in front of every opening on the rear wall, and keeps away from the TV wall', () => {
  // Whatever stands in front of a door or the window, within its span of v, ends at least 0.4 m before the rear wall.
  for (const opening of OPENINGS.first.filter(item => item.u === 4)) {
    for (const item of KITCHEN_BOXES) {
      assert.ok(overlap(item.v, opening.v) < 1e-6 || item.u[1] <= KITCHEN_LIVING.u[1] - .4 + 1e-9, `${item.id} leaves 0.4 m in front of a rear opening`)
    }
  }
  assert.ok(COUNTER_V[0] - KITCHEN_SIZES.overhang - KITCHEN_SIZES.stool > LIVING_TV_PLACEMENT.v[1] + 2, 'the stools stay well away from the TV')
})

test('the worktop and the counter top are Purastone Toscana Vena: an ivory slab with ochre veins', () => {
  for (const id of ['worktop', 'counter-top']) assert.equal(box(id).pattern, TOSCANA_VENA_SLAB)
  assert.ok(TOSCANA_VENA_SLAB.veins && /176, 130, 58/.test(TOSCANA_VENA_SLAB.veinColor ?? ''), 'golden ochre veins')
  assert.ok(Math.abs(TOSCANA_VENA_SLAB.length - 3.2) < 1e-9 && Math.abs(TOSCANA_VENA_SLAB.width - 1.6) < 1e-9)
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(box('worktop').color.slice(index, index + 2), 16))
  assert.ok(red > green && green > blue && blue > 170, 'a warm ivory base')
})

test('the sink is in the second counter, inside its top, with a tap at its back edge', () => {
  const sink = box('sink'), top = box('counter-top'), tap = box('tap')
  assert.ok(sink.u[0] >= top.u[0] && sink.u[1] <= top.u[1] && sink.v[0] >= top.v[0] && sink.v[1] <= top.v[1], 'the sink is within the counter top')
  // On the counter with the stools, not on the run along the wall.
  assert.ok(overlap(sink.v, box('base').v) < 1e-6)
  // Flush with the top, and the tap stands at the sink's back edge.
  assert.ok(Math.abs(sink.y[0] - top.y[1]) < 1e-9)
  assert.ok(tap.v[0] >= sink.v[1] - 1e-9 && tap.v[1] <= top.v[1], 'the tap is behind the basin, on the counter')
  assert.ok(tap.u[0] >= sink.u[0] && tap.u[1] <= sink.u[1], 'centred on it')
})

test('the oven and the cooktop start 45 cm from the wall on the hall side, on the run along the party wall', () => {
  for (const id of ['oven', 'cooktop']) assert.ok(Math.abs(box(id).u[0] - KITCHEN_LIVING.u[0] - .45) < 1e-9, `${id} is 45 cm from the wall`)
  // The oven is in the base and the cooktop above it, between that wall and the fridge.
  assert.ok(box('oven').u[1] < box('fridge').u[0] && box('cooktop').u[1] < box('fridge').u[0])
  assert.ok(overlap(box('oven').u, box('base').u) > .5 && Math.abs(box('oven').v[1] - box('base').v[0]) < 1e-9)
})

test('the fridge is silver metal: a light, neutral grey', () => {
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(box('fridge').color.slice(index, index + 2), 16))
  assert.ok(red > 150 && Math.abs(red - green) < 12 && Math.abs(green - blue) < 12, 'a light grey with no strong tint')
})
