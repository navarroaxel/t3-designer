import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { isOn } from '../src/data/devices.ts'
import { HOUSE_FLOORS, shellWallBoxes, wallNiches } from '../src/data/house-interior.ts'
import { wallRotation } from '@t3-designer/geometry'
import { furnishingDevices, furnishingsOn } from '../src/data/house-furnishings.ts'
import { BATHROOM_DOOR, BATHROOM_DOOR_SWING, CUT_HEIGHT, FIRST_FLOOR_BATHROOM, SLAB_THICKNESS } from '../src/data/house-plan.ts'
import { BATHROOM_BOXES, BATHROOM_SWITCH_ID, BATHROOM_LIGHT_BOXES, BATHROOM_LIGHT_POSITIONS, BATHROOM_FRONT_SPOT_AT, BATHROOM_FRONT_SPOT_BOXES, VANITY_LED_BOX, BATHROOM_NICHE, BATHROOM_NICHE_BOXES, MIRROR, MIRROR_LIGHT_BOXES, BATHROOM_RUN, BATHROOM_SIZES } from '../src/data/bathroom.ts'

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

test('the mirror is backlit: a bright strip all around its glass, a halo on the wall and two touch buttons at the lower right', () => {
  const glass = box('mirror'), light = (id: string) => MIRROR_LIGHT_BOXES.find(item => item.id === id)!
  for (const id of ['top', 'bottom', 'left', 'right']) {
    const strip = light(`mirror-led-${id}`)
    assert.ok(strip.glow && strip.v[0] >= glass.v[0] && strip.v[1] <= glass.v[1] && strip.y[0] >= glass.y[0], `${id} strip within the glass`)
    assert.ok(strip.u[1] <= glass.u[1] - .03 + 1e-9 && strip.u[0] < strip.u[1], `${id} strip stands in front of the glass`)
  }
  assert.ok(light('mirror-led-top').y[1] < light('mirror-halo').y[1] && light('mirror-led-top').y[1] > light('mirror-led-bottom').y[1] && MIRROR.top === 1.9)
  const halo = light('mirror-halo')
  assert.ok(halo.opacity! < .3 && halo.v[0] < glass.v[0] && halo.v[1] > glass.v[1], 'the halo spills past the glass')
  // The right hand, facing the wall, is the lower v: the buttons are at the lower end, near the bottom strip.
  for (const id of ['mirror-button-1', 'mirror-button-2']) assert.ok(light(id).v[1] < (glass.v[0] + glass.v[1]) / 2 && light(id).y[1] < glass.y[0] + .15, id)
})

test('the bathroom has a drywall light box under the ceiling on the wall facing the mirror, with three lit recessed downlights in a row', () => {
  const box = BATHROOM_LIGHT_BOXES.find(item => item.id === 'ceiling-box')!, lights = BATHROOM_LIGHT_BOXES.filter(item => item.id.startsWith('ceiling-light-'))
  // On the front wall, the one opposite the mirror's (the mirror is on the back wall, at the bathroom's higher u), and the width of the room.
  near(box.u[0], FIRST_FLOOR_BATHROOM.u[0]); assert.ok(Math.abs(box.v[0] - FIRST_FLOOR_BATHROOM.v[0]) < 1e-9 && Math.abs(box.v[1] - FIRST_FLOOR_BATHROOM.v[1]) < 1e-9)
  assert.ok(box.u[1] - box.u[0] <= .35 && box.u[1] < FIRST_FLOOR_BATHROOM.u[1] - 1, 'a slim box, far from the mirror')
  assert.ok(Math.abs(box.y[1] - FLOOR_HEIGHT - (FLOOR_HEIGHT - SLAB_THICKNESS)) < 1e-9, 'up to the ceiling')
  assert.equal(lights.length, 3); assert.equal(BATHROOM_LIGHT_POSITIONS.length, 3)
  for (const light of lights) assert.ok(light.glow && light.round && light.u[0] >= box.u[0] && light.u[1] <= box.u[1] && light.v[0] >= box.v[0] && light.v[1] <= box.v[1] && light.y[0] < box.y[0] + 1e-9, light.id)
  const steps = BATHROOM_LIGHT_POSITIONS.map(at => at.v).sort((a, b) => a - b)
  near(steps[1] - steps[0], steps[2] - steps[1])
  assert.ok(new Set(BATHROOM_LIGHT_POSITIONS.map(at => at.u)).size === 1, 'in a row')
  // The extractor takes the box's end at the back wall; no downlight overlaps it.
  const ring = BATHROOM_LIGHT_BOXES.find(item => item.id === 'ceiling-extractor-ring')!
  assert.ok(lights.every(light => light.v[0] >= ring.v[1]), 'the downlights start past the extractor')
})

test('the extractor is a round grille in the underside of the light box, at its end against the back wall, facing down', () => {
  const box = BATHROOM_LIGHT_BOXES.find(item => item.id === 'ceiling-box')!, ring = BATHROOM_LIGHT_BOXES.find(item => item.id === 'ceiling-extractor-ring')!, opening = BATHROOM_LIGHT_BOXES.find(item => item.id === 'ceiling-extractor-opening')!
  assert.ok(ring.u[0] >= box.u[0] && ring.u[1] <= box.u[1] && ring.v[0] >= box.v[0], 'within the box')
  assert.ok(ring.v[0] - box.v[0] < .05, 'against the back wall')
  near(ring.y[1], box.y[0]); assert.ok(opening.y[0] < ring.y[0], 'the opening is lower than the ring, on the face that looks down')
  near((ring.u[0] + ring.u[1]) / 2, (box.u[0] + box.u[1]) / 2); near(ring.v[1] - ring.v[0], .16)
  const pieces = furnishingsOn('first')
  assert.ok(['ring', 'opening'].every(part => pieces.find(piece => piece.id === `bathroom-ceiling-extractor-${part}`)?.shape === 'ellipse'), 'round')
})

test('the bathroom has a light switch inside, beside the door, between its edge and the vanity, that starts on and is a device', () => {
  const pieces = furnishingsOn('first'), plate = pieces.find(piece => piece.id === BATHROOM_SWITCH_ID)!
  // On the door's wall, past its edge on the vanity's side, clear of the vanity's end, flat on the wall and facing the bathroom (lower v).
  assert.ok(plate.u[0] > BATHROOM_DOOR.u[1] && plate.u[1] < FIRST_FLOOR_BATHROOM.u[1] - BATHROOM_SIZES.vanityDepth, 'between the door and the vanity')
  near(plate.v[1], FIRST_FLOOR_BATHROOM.v[1]); assert.ok(plate.v[0] < plate.v[1])
  near((plate.y[0] + plate.y[1]) / 2, FLOOR_HEIGHT + 1.1)
  const device = furnishingDevices('first', 3.2).find(item => item.id === BATHROOM_SWITCH_ID) as { initialOpenness?: number } | undefined
  assert.ok(device && device.initialOpenness === 1)
  assert.ok(isOn({}, BATHROOM_SWITCH_ID) && !isOn({ [BATHROOM_SWITCH_ID]: 0 }, BATHROOM_SWITCH_ID))
})

test('the front light is a bar of three spots on the mirror\'s wall, centred along it, above the mirror, and is lit by the bathroom switch', () => {
  const plate = BATHROOM_FRONT_SPOT_BOXES.find(item => item.id === 'ceiling-spot-plate')!, lenses = BATHROOM_FRONT_SPOT_BOXES.filter(item => item.id.startsWith('ceiling-spot-lens-'))
  const middle = (FIRST_FLOOR_BATHROOM.v[0] + FIRST_FLOOR_BATHROOM.v[1]) / 2, centre = (box: { v: [number, number] }) => (box.v[0] + box.v[1]) / 2
  assert.ok(Math.abs(centre(plate) - middle) < 1e-9, 'centred along the wall')
  assert.equal(plate.u[1], FIRST_FLOOR_BATHROOM.u[1], 'on the mirror\'s wall')
  assert.equal(BATHROOM_FRONT_SPOT_AT.v, middle)
  assert.ok(plate.y[0] >= FLOOR_HEIGHT + MIRROR.top, 'above the mirror')
  assert.equal(lenses.length, 3); assert.ok(lenses.every(lens => lens.glow && lens.u[1] <= plate.u[0] + 1e-9), 'a glowing lens on each head, out of the plate')
  assert.ok(Math.abs(centre(lenses[1]) - middle) < 1e-9, 'the middle head is on the middle')
  assert.ok(Math.abs(centre(lenses[0]) + centre(lenses[2]) - 2 * middle) < 1e-9, 'the side heads are symmetric')
  assert.ok(lenses.every(lens => (lens.y[0] + lens.y[1]) / 2 < (plate.y[0] + plate.y[1]) / 2 - .05), 'the heads are tilted down: their lenses are under the plate\'s middle')
  const ids = furnishingsOn('first').map(piece => piece.id)
  assert.ok(ids.includes('bathroom-ceiling-spot-plate') && ids.includes('bathroom-ceiling-spot-lens-3'))
})

test('a warm LED strip runs under the floating vanity, lit by the bathroom switch', () => {
  const body = BATHROOM_BOXES.find(item => item.id === 'vanity-body')!
  assert.ok(VANITY_LED_BOX.glow && VANITY_LED_BOX.y[1] === body.y[0], 'on the vanity\'s underside')
  assert.ok(VANITY_LED_BOX.v[0] >= body.v[0] && VANITY_LED_BOX.v[1] <= body.v[1] && VANITY_LED_BOX.u[0] >= body.u[0] && VANITY_LED_BOX.u[1] <= body.u[1], 'within its footprint')
  assert.ok(furnishingsOn('first').some(piece => piece.id === 'bathroom-ceiling-vanity-led' && piece.glow))
})

test('the shower has a two-shelf niche cut into the wall that faces its taps, centred on the shower, 62 cm wide, 30 cm a shelf over a 1 cm porcelain board', () => {
  const n = BATHROOM_NICHE, showerMiddle = (BATHROOM_RUN.shower[0] + BATHROOM_RUN.shower[1]) / 2
  assert.ok(Math.abs((n.v[0] + n.v[1]) / 2 - showerMiddle) < 1e-9, 'centred on the shower')
  assert.ok(n.v[0] >= BATHROOM_RUN.shower[0] && n.v[1] <= BATHROOM_RUN.shower[1], 'within the shower')
  near(n.v[1] - n.v[0], .62); near(n.shelf, .3); near(n.y[1] - n.y[0], 2 * .31)
  assert.equal(n.face, FIRST_FLOOR_BATHROOM.u[0], 'on the wall opposite the taps')
  assert.ok(n.depth < .12, 'it leaves some of the partition behind it')
  const boxes = shellWallBoxes('first', 2 * FLOOR_HEIGHT - SLAB_THICKNESS)
  const mid = (n.v[0] + n.v[1]) / 2, shelfMid = n.y[0] + .01 + .15
  // No wall box fills the recess, and the thin back is there behind it.
  const covers = (box: { center: number[]; size: number[] }, u: number, y: number, v: number) => Math.abs(box.center[0] - u) <= box.size[0] / 2 && Math.abs(box.center[1] - y) <= box.size[1] / 2 && Math.abs(box.center[2] - v) <= box.size[2] / 2
  assert.ok(!boxes.some(box => covers(box, n.face - n.depth / 2, shelfMid, mid)), 'the recess is empty')
  assert.ok(boxes.some(box => covers(box, n.face - n.depth - .01, shelfMid, mid)), 'the back is left')
  assert.ok(boxes.some(box => covers(box, n.face - n.depth / 2, shelfMid, n.v[0] - .05)) && boxes.some(box => covers(box, n.face - n.depth / 2, shelfMid, n.v[1] + .05)), 'wall on each side')
  assert.ok(boxes.some(box => covers(box, n.face - n.depth / 2, n.y[0] - .05, mid)), 'wall under it')
  assert.ok(furnishingsOn('first').some(piece => piece.id === 'bathroom-niche-shelf'), 'the board between the shelves')
  assert.ok(furnishingsOn('first').some(piece => piece.id === 'bathroom-niche-sill'), 'the sill')
})

test('the walkthrough draws the niche: one wall carries it, and in the wall\'s frame it is where the recess is in the house', () => {
  const carriers = HOUSE_FLOORS.first.walls.filter(wall => wallNiches(wall).length > 0)
  assert.equal(carriers.length, 1)
  assert.equal(HOUSE_FLOORS.ground.walls.filter(wall => wallNiches(wall).length > 0).length, 0)
  const wall = carriers[0], [niche] = wallNiches(wall), n = BATHROOM_NICHE, angle = wallRotation(wall)
  const lx = niche.offset + niche.width / 2, lz = niche.side * (wall.thickness / 2 - niche.depth / 2)
  // The wall's frame turned to the house's: x = u, z = -v.
  near(wall.from[0] + lx * Math.cos(angle) + lz * Math.sin(angle), n.face - n.depth / 2)
  near(wall.from[1] - lx * Math.sin(angle) + lz * Math.cos(angle), -(n.v[0] + n.v[1]) / 2)
  near(niche.bottom + FLOOR_HEIGHT, n.y[0]); near(niche.depth, n.depth); near(niche.width, .62)
})

test('the niche has a dim warm LED strip at the top of each shelf, inside the recess, lit by the bathroom switch', () => {
  const n = BATHROOM_NICHE, strips = BATHROOM_NICHE_BOXES.filter(item => item.id.startsWith('ceiling-niche-led-'))
  assert.equal(strips.length, 2)
  const tops = strips.map(strip => strip.y[1]).sort((a, b) => a - b)
  near(tops[0], n.y[0] + .01 + .3); near(tops[1], n.y[1])
  for (const strip of strips) {
    assert.ok(strip.glow, 'glowing'); assert.equal(strip.color, VANITY_LED_BOX.color, 'the colour of the strip under the vanity')
    near(strip.y[1] - strip.y[0], VANITY_LED_BOX.y[1] - VANITY_LED_BOX.y[0]); near(strip.u[1] - strip.u[0], VANITY_LED_BOX.u[1] - VANITY_LED_BOX.u[0])
    assert.ok(strip.u[0] >= n.u[0] && strip.u[1] <= n.u[1] && strip.v[0] >= n.v[0] && strip.v[1] <= n.v[1] && strip.y[0] >= n.y[0] && strip.y[1] <= n.y[1], 'inside the recess')
  }
  const lit = furnishingsOn('first').filter(piece => piece.id.startsWith('bathroom-ceiling-niche-led-'))
  assert.equal(lit.length, 2); assert.ok(lit.every(piece => piece.glow))
})
