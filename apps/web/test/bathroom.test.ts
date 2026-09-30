import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { BATHROOM_DOOR, BATHROOM_DOOR_SWING, CUT_HEIGHT, FIRST_FLOOR_BATHROOM } from '../src/data/house-plan.ts'
import { BATHROOM_BOXES, BATHROOM_RUN, BATHROOM_SIZES } from '../src/data/bathroom.ts'

const box = (id: string) => BATHROOM_BOXES.find(item => item.id === id)!
const overlap = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) - Math.max(a[0], b[0])
const near = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) < tolerance, `${a} vs ${b}`)

test('every fixture stands inside the bathroom and under the cut', () => {
  for (const item of BATHROOM_BOXES) {
    assert.ok(item.u[0] >= FIRST_FLOOR_BATHROOM.u[0] - 1e-9 && item.u[1] <= FIRST_FLOOR_BATHROOM.u[1] + 1e-9, `${item.id} within the depth`)
    assert.ok(item.v[0] >= FIRST_FLOOR_BATHROOM.v[0] - 1e-9 && item.v[1] <= FIRST_FLOOR_BATHROOM.v[1] + 1e-9 + .011, `${item.id} within the width`)
    assert.ok(item.y[0] >= FLOOR_HEIGHT - 1e-9 && item.y[1] <= FLOOR_HEIGHT + CUT_HEIGHT + 1e-9, `${item.id} between the floor and the cut`)
  }
})

test('along the wall shared with the living, from the door to the back wall: a 60 cm vanity, the toilet, the shower', () => {
  const { vanity, toilet, shower } = BATHROOM_RUN
  near(vanity[1] - vanity[0], .6)
  // From the north-east corner, where the door is, toward the south-west party wall: decreasing v.
  near(vanity[1], FIRST_FLOOR_BATHROOM.v[1])
  assert.ok(vanity[0] >= toilet[1] - 1e-9 && toilet[0] >= shower[1] - 1e-9)
  near(shower[0], FIRST_FLOOR_BATHROOM.v[0])
  // Each fixture sits against the wall, on the bathroom's back wall.
  for (const id of ['vanity-body', 'toilet-body', 'shower-glass', 'mirror']) near(box(id).u[1], FIRST_FLOOR_BATHROOM.u[1])
})

test('the vanity is the photo\'s unit, wall-hung and floating: body, drawer, ceramic top, tap, mirror with a side shelf', () => {
  for (const id of ['vanity-body', 'vanity-drawer', 'vanity-top', 'vanity-tap', 'mirror', 'mirror-shelf']) assert.ok(box(id), id)
  // No legs: it floats, with its underside off the floor, and the top is at a usual height, 0.85 m.
  assert.equal(BATHROOM_BOXES.some(item => /leg/.test(item.id)), false)
  near(box('vanity-body').y[0] - FLOOR_HEIGHT, BATHROOM_SIZES.vanityFloat)
  assert.ok(BATHROOM_SIZES.vanityFloat >= .2, 'clear of the floor, so it can be cleaned under')
  near(box('vanity-top').y[1] - FLOOR_HEIGHT, .85)
  // The mirror is above the top, over the vanity's width less the shelf panel; the shelf panel is beside it.
  assert.ok(box('mirror').y[0] > box('vanity-top').y[1])
  near(box('mirror').v[1], box('mirror-shelf').v[0])
  near(box('mirror').v[1] - box('mirror').v[0] + (box('mirror-shelf').v[1] - box('mirror-shelf').v[0]), .6)
})

test('the toilet is the 77 by 48 by 58 cm egg-shaped one-piece unit, without a cistern, centred on its space with its back to the wall', () => {
  const { toilet } = BATHROOM_RUN
  const body = box('toilet-body'), lid = box('toilet-lid'), panel = box('toilet-panel')
  // One smooth elliptical body, narrower at the floor, 0.77 m out from the wall and 0.48 m wide; 0.58 m high with its lid.
  assert.equal(body.shape, 'ellipse'); assert.ok((body.taper ?? 1) < 1 && (body.taper ?? 1) > .7, 'narrower at the floor, like the photo')
  near(body.u[1] - body.u[0], .77); near(body.v[1] - body.v[0], .48)
  near(lid.y[1] - FLOOR_HEIGHT, .58)
  near(body.u[1], FIRST_FLOOR_BATHROOM.u[1])
  near((body.v[0] + body.v[1]) / 2, (toilet[0] + toilet[1]) / 2)
  // The lid sits on the body; the dark control panel is on the back of the lid.
  near(lid.y[0], body.y[1])
  assert.ok(panel.y[0] >= lid.y[1] - 1e-9 && panel.u[0] > body.u[0] + .3, 'the panel is at the back of the lid')
  assert.equal(BATHROOM_BOXES.some(item => /tank|cistern/.test(item.id)), false)
  // It fits between the vanity and the shower with room to sit: at least 0.15 m either side.
  assert.ok(toilet[1] - toilet[0] - (body.v[1] - body.v[0]) >= .3)
})

test('the shower has no tray and no enclosure: the same floor, and a single fixed glass panel on the toilet side', () => {
  const { shower } = BATHROOM_RUN
  near(shower[1] - shower[0], .75)
  assert.equal(BATHROOM_BOXES.some(item => /tray/.test(item.id)), false, 'the floor does not change')
  // One glass panel only, on the toilet side; nothing closes the front or the other side.
  const glass = BATHROOM_BOXES.filter(item => (item.opacity ?? 1) < .5)
  assert.deepEqual(glass.map(item => item.id), ['shower-glass'])
  near(box('shower-glass').v[0], shower[1])
  assert.ok(box('shower-glass').u[1] - box('shower-glass').u[0] > .8, 'the panel runs out from the wall')
  near(box('shower-glass').y[0], FLOOR_HEIGHT)
  // A thin black frame on the panel's free edge and at its foot.
  assert.ok(box('shower-glass-frame-edge') && box('shower-glass-frame-foot'))
  assert.ok(box('shower-glass-frame-edge').u[1] - box('shower-glass-frame-edge').u[0] < .03)
  // The taps are on the back wall inside the shower.
  assert.ok(box('shower-taps').v[0] >= shower[0] && box('shower-taps').v[1] <= shower[1])
})

test('fixtures do not overlap, except a top over its body, the seat on its bowl and the glass in its frame', () => {
  const allowed = new Set(['toilet-lid:toilet-light', 'vanity-top:vanity-drawer', 'vanity-top:vanity-body', 'vanity-tap:vanity-top', 'shower-glass:shower-glass-frame-foot', 'shower-glass:shower-glass-frame-edge', 'shower-glass-frame-foot:shower-glass-frame-edge'])
  for (const [index, a] of BATHROOM_BOXES.entries()) for (const b of BATHROOM_BOXES.slice(index + 1)) {
    const inside = overlap(a.u, b.u) > 1e-6 && overlap(a.v, b.v) > 1e-6 && overlap(a.y, b.y) > 1e-6
    if (inside) assert.ok(allowed.has(`${a.id}:${b.id}`) || allowed.has(`${b.id}:${a.id}`), `${a.id} overlaps ${b.id}`)
  }
})

test('the open bathroom door leaf and its swing clear every fixture', () => {
  // The leaf, 0.70 m long, is hinged at the door's wardrobe end and swings into the bathroom: its arc is a quarter circle of
  // 0.70 m from the hinge, toward higher u and lower v.
  const { hingeU, hingeV, radius } = BATHROOM_DOOR_SWING
  assert.ok(BATHROOM_DOOR.u[0] === hingeU)
  for (const item of BATHROOM_BOXES) {
    const uLow = Math.max(item.u[0], hingeU), vHigh = Math.min(item.v[1], hingeV)
    if (uLow >= item.u[1] || vHigh <= item.v[0]) continue
    const distance = Math.hypot(Math.max(uLow - hingeU, 0), Math.max(hingeV - vHigh, 0))
    assert.ok(distance >= radius, `${item.id} stays out of the door's swing`)
  }
})
