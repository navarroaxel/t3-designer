import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { CUT_HEIGHT, KITCHEN_LIVING, LIVING_DOOR, SLAB_THICKNESS, WALL_PAINT, LIVING_TV_PLACEMENT, OPENINGS } from '../src/data/house-plan.ts'
import { TOSCANA_VENA_SLAB } from '../src/data/house-plan.ts'
import { COUNTER_V, FREEZER, FREEZER_HEIGHT, FREEZER_LINER_HEIGHT, KITCHEN_BOXES, ISLAND_AXIS_V, ISLAND_CANOPY, ISLAND_CANOPY_BOXES, ISLAND_WOOD, ISLAND_WOOD_BOXES, ISLAND_WOOD_ID, ISLAND_CANOPY_WALL, ISLAND_LIGHT_POSITIONS, ISLAND_SWITCH_ID, DISHWASHER, GLASS_CABINET, GLASS_DOOR_ID, GLASS_HINGE, CONDUIT_LIGHT_POSITIONS, KITCHEN_CONDUIT_BOX, KITCHEN_CONDUIT_BOXES, KITCHEN_ISLAND_FRONTS, KITCHEN_RUN_FRONTS, KITCHEN_SWITCH_ID, conduitLightsOn, KITCHEN_SIZES, KITCHEN_UPPER_BOXES } from '../src/data/kitchen.ts'

import { furnishingDevices, furnishingsOn, isInPlace, isPieceAway, isRemovable, islandLightsOn, isStool, STOOLS_ID } from '../src/data/house-furnishings.ts'
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

test('the island\'s top is 2.20 by 1.00 m and its cabinets 0.70 m deep, against the wall behind the bathroom, with an overhang and three stools', () => {
  const stools = KITCHEN_BOXES.filter(item => item.id.startsWith('stool'))
  assert.equal(stools.length, 3)
  const counter = box('counter')
  const top = box('counter-top')
  assert.ok(Math.abs(top.u[1] - top.u[0] - 2.2) < 1e-9 && Math.abs(top.v[1] - top.v[0] - 1) < 1e-9, 'the top is 2.20 by 1.00 m (owner)')
  assert.ok(Math.abs(counter.v[1] - counter.v[0] - .7) < 1e-9 && Math.abs(counter.u[1] - counter.u[0] - 2.18) < 1e-9, 'the cabinets are 0.70 m deep, 2 cm short of the top\'s end')
  assert.ok(Math.abs(counter.u[0] - KITCHEN_LIVING.u[0]) < 1e-9, 'its end is against the wall behind the bathroom')
  assert.ok(box('counter').v[0] - box('counter-top').v[0] > .25 && box('counter').v[0] - box('counter-top').v[0] < .3, 'overhang toward the stools: 28 cm')
  for (const stool of stools) {
    assert.ok(stool.v[1] <= box('counter').v[0] + 1e-9, 'stools on the side away from the cabinets')
    assert.ok(stool.y[1] < box('counter-top').y[0], 'and tucked under the top')
  }
})

test('kitchen pieces do not overlap, except a top over its cabinet and stools under the overhang', () => {
  const allowed = new Set(['fridge-handle:fridge-door', 'fridge-handle:fridge-freezer-door', 'fridge-dispenser:fridge-door', 'worktop:base', 'oven:base', 'cooktop:worktop', 'counter-top:counter'])
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
  assert.ok(box('counter-top').v[0] - KITCHEN_SIZES.stool > LIVING_TV_PLACEMENT.v[1] + 2, 'the stools stay well away from the TV')
})

test('the worktop and the counter top are Purastone Toscana Vena: an ivory slab with ochre veins', () => {
  for (const id of ['worktop', 'counter-top']) assert.equal(box(id).pattern, TOSCANA_VENA_SLAB)
  assert.ok(TOSCANA_VENA_SLAB.veins && /176, 130, 58/.test(TOSCANA_VENA_SLAB.veinColor ?? ''), 'golden ochre veins')
  assert.ok(Math.abs(TOSCANA_VENA_SLAB.length - 3.2) < 1e-9 && Math.abs(TOSCANA_VENA_SLAB.width - 1.6) < 1e-9)
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(box('worktop').color.slice(index, index + 2), 16))
  assert.ok(red > green && green > blue && blue > 170, 'a warm ivory base')
})

test('the sink is in the second counter, inside its top, with a tap centred on it, beside the basin', () => {
  const sink = box('sink'), top = box('counter-top'), tap = box('tap')
  assert.ok(sink.u[0] >= top.u[0] && sink.u[1] <= top.u[1] && sink.v[0] >= top.v[0] && sink.v[1] <= top.v[1], 'the sink is within the counter top')
  // On the counter with the stools, not on the run along the wall.
  assert.ok(overlap(sink.v, box('base').v) < 1e-6)
  // Flush with the top.
  assert.ok(Math.abs(sink.y[0] - top.y[1]) < 1e-9)
  // The tap is centred on the basin (owner), on the counter, on its long side away from the oven; the basin is at the edge on the oven's side.
  assert.ok(tap.u[0] >= sink.u[0] && tap.u[1] <= sink.u[1] && tap.v[1] <= sink.v[0] && tap.v[0] >= top.v[0], 'the tap is on the long side of the basin away from the oven')
  assert.ok(COUNTER_V[1] - sink.v[1] <= .1, 'the basin is at the edge on the oven side')
  assert.ok(overlap(sink.u, box('oven').u) > .15, 'partly across from the oven')
})

test('the oven and the cooktop start 45 cm from the wall on the hall side, on the run along the party wall', () => {
  for (const id of ['oven', 'cooktop']) assert.ok(Math.abs(box(id).u[0] - KITCHEN_LIVING.u[0] - .45) < 1e-9, `${id} is 45 cm from the wall`)
  // The oven is in the base and the cooktop above it, between that wall and the fridge.
  assert.ok(box('oven').u[1] < box('fridge').u[0] && box('cooktop').u[1] < box('fridge').u[0])
  assert.ok(overlap(box('oven').u, box('base').u) > .5 && Math.abs(box('oven').v[1] - box('base').v[0]) < 1e-9)
})

test('the fridge is the Samsung RT29K577JS8: silver doors, grey sides, two doors, a handle slot and a dispenser', () => {
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(box('fridge-door').color.slice(index, index + 2), 16))
  assert.ok(red > 150 && Math.abs(red - green) < 12 && Math.abs(green - blue) < 12, 'silver: a light grey with no strong tint')
  // The sides are grey, not black: a middle grey, a little darker than the doors.
  const side = [1, 3, 5].map(index => parseInt(box('fridge').color.slice(index, index + 2), 16))
  assert.ok(side.every(channel => channel > 110 && channel < 175) && side[0] < red, 'grey sides, darker than the doors')
  const body = box('fridge'), door = box('fridge-door'), freezer = box('fridge-freezer-door')
  // 0.675 m wide and 0.668 m deep (handle included); 1.785 m high (owner), drawn up to the cut.
  assert.ok(Math.abs(body.u[1] - body.u[0] - .675) < 1e-9)
  assert.ok(Math.abs(body.v[1] - door.v[0] - .668) < 1e-9)
  assert.ok(freezer.y[1] <= FLOOR_HEIGHT + CUT_HEIGHT + 1e-9 && KITCHEN_SIZES.fridgeHeight > CUT_HEIGHT)
  // The freezer door is above the fridge door, and the handle slot is at their meeting.
  assert.ok(freezer.y[0] >= door.y[1] && box('fridge-handle').y[1] < freezer.y[0] + .05)
  // The dispenser is on the lower door, at about arm height, centred on it.
  assert.ok(box('fridge-dispenser').y[1] < door.y[1] && box('fridge-dispenser').y[0] > FLOOR_HEIGHT + .5)
  assert.ok(Math.abs((box('fridge-dispenser').u[0] + box('fridge-dispenser').u[1]) / 2 - (body.u[0] + body.u[1]) / 2) < 1e-9)
  // The doors face the aisle (lower v), not the party wall.
  assert.ok(door.v[0] < body.v[0] && Math.abs(body.v[1] - KITCHEN_LIVING.v[1]) < 1e-9)
})

test('the freezer is as tall as its 101 L gross capacity needs: about 0.31 m of liner, 0.40 m of cabinet', () => {
  const section = (KITCHEN_SIZES.fridgeWidth - 2 * FREEZER.wall) * (KITCHEN_SIZES.fridgeDepth - FREEZER.handle - FREEZER.door - FREEZER.back)
  assert.ok(Math.abs(FREEZER_LINER_HEIGHT * section * 1000 - 101) < 1e-9, 'the liner holds the gross litres')
  assert.ok(FREEZER_LINER_HEIGHT > .30 && FREEZER_LINER_HEIGHT < .32)
  assert.ok(FREEZER_HEIGHT > .39 && FREEZER_HEIGHT < .41)
  // The 89 L net volume is what the shelves and bins leave: 88% of the gross, the right order for a fitted freezer.
  assert.ok(Math.abs(FREEZER.netLitres / FREEZER.grossLitres - .88) < .01)
  // The freezer door is its height from the top of the cabinet.
  assert.ok(Math.abs(KITCHEN_SIZES.fridgeFreezerFrom + FREEZER_HEIGHT - .04 - KITCHEN_SIZES.fridgeHeight) < 1e-9)
})

test('the upper cabinets run from the tall column to the hall wall, up to the conduit box, with the microwave beside the fridge and its outlet behind at 1.5 m', () => {
  const cabinet = (id: string) => KITCHEN_UPPER_BOXES.find(item => item.id === id)!
  const microwave = cabinet('microwave'), fridge = box('fridge'), bay = cabinet('upper-bay-bottom'), bridge = cabinet('upper-bridge-bottom')
  const floor = FLOOR_HEIGHT, carcass = KITCHEN_UPPER_BOXES.filter(item => item.id.startsWith('upper-'))
  // From the column to the hall wall, and as high as the underside of the conduit box that carries on over them along the party wall.
  assert.ok(Math.abs(Math.max(...carcass.map(item => item.u[1])) - box('column').u[0]) < 1e-9 && Math.abs(Math.min(...carcass.map(item => item.u[0])) - KITCHEN_LIVING.u[0]) < 1e-9)
  const rear = KITCHEN_CONDUIT_BOXES.find(item => item.id === 'conduit-box-rear')!
  assert.ok(Math.abs(Math.max(...carcass.map(item => item.y[1])) - rear.y[0]) < 1e-9, 'the cabinets end where the conduit box begins')
  assert.ok(Math.abs(rear.y[1] - floor - (FLOOR_HEIGHT - SLAB_THICKNESS)) < 1e-9, 'the box goes up to the ceiling')
  // Over the worktop with clearance; over the fridge it starts above the fridge's top.
  assert.ok(bay.y[0] - box('worktop').y[1] >= .4)
  assert.ok(bridge.y[0] > fridge.y[1] && bridge.u[0] >= fridge.u[0] - 1e-9 && bridge.u[1] <= box('column').u[0] + 1e-9)
  // The microwave is next to the fridge, inside its bay, under the shelf.
  assert.ok(microwave.u[1] <= fridge.u[0] && fridge.u[0] - microwave.u[1] < .05)
  assert.ok(microwave.u[0] >= bay.u[0] && microwave.y[0] >= bay.y[1] && microwave.y[1] <= cabinet('upper-shelf').y[0], 'the microwave is inside the carcass')
  assert.ok(microwave.v[1] <= box('base').v[1] - .03, 'off the wall, for the plug')
  const pieces = furnishingsOn('first'), plate = pieces.find(piece => piece.id === 'outlet-microwave-plate')!
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (floor + 1.5)) < 1e-9, 'the outlet is centred 1.5 m above the floor')
  assert.ok(plate.u[0] >= microwave.u[0] && plate.u[1] <= microwave.u[1] && plate.y[0] >= microwave.y[0] && plate.y[1] <= microwave.y[1], 'the outlet is hidden behind the microwave')
  assert.ok(plate.v[1] <= box('base').v[1] + 1e-9 && plate.v[0] < box('base').v[1], 'flat on the wall')
})

test('the chimney hood is centred over the cooktop, clear of the cabinets and the microwave, with its duct going up into the conduit box', () => {
  const cooktop = box('cooktop'), canopy = KITCHEN_UPPER_BOXES.find(item => item.id === 'hood')!, duct = canopy, microwave = KITCHEN_UPPER_BOXES.find(item => item.id === 'microwave')!
  const centre = (item: { u: [number, number] }) => (item.u[0] + item.u[1]) / 2
  assert.ok(Math.abs(centre(canopy) - centre(cooktop)) < 1e-9 && Math.abs(centre(duct) - centre(cooktop)) < 1e-9)
  assert.ok(Math.abs(canopy.y[0] - KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-bottom')!.y[0]) < 1e-9, 'level with the cabinets')
  assert.ok(canopy.y[0] - cooktop.y[1] >= .45, 'room to cook under it')
  assert.ok(Math.abs((canopy.u[1] - canopy.u[0]) - .54) < 1e-9 && Math.abs(canopy.y[1] - canopy.y[0] - 1.35) < 1e-9, 'the size of its Blender job')
  assert.ok(canopy.u[1] <= microwave.u[0] && canopy.u[0] >= KITCHEN_LIVING.u[0] + KITCHEN_SIZES.stoveFromHall - 1e-9)
  assert.ok(Math.abs(duct.y[1] - KITCHEN_CONDUIT_BOXES.find(item => item.id === 'conduit-box-rear')!.y[0]) < 1e-9, 'the duct goes up into the conduit box')
  const door = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-door')!
  assert.ok(door.u[1] <= canopy.u[0], 'no cabinet over the cooktop')
})

test('the resting worktop is 45 cm wide on the hall side of the cooktop, and the kitchen is 3.1 to 3.15 m wide', () => {
  const cooktop = box('cooktop'), base = box('base')
  assert.ok(Math.abs(cooktop.u[0] - base.u[0] - .45) < 1e-9)
  const width = KITCHEN_LIVING.u[1] - KITCHEN_LIVING.u[0]
  assert.ok(width >= 3.1 && width <= 3.15, `${width}`)
})

test('the backsplash is a slab of Toscana Vena on the wall, from the worktop to the cabinets, along the whole base run', () => {
  const splash = KITCHEN_UPPER_BOXES.find(item => item.id === 'backsplash')!, worktop = box('worktop'), cabinet = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-bottom')!
  assert.equal(splash.pattern, TOSCANA_VENA_SLAB)
  assert.ok(splash.wall)
  assert.ok(Math.abs(splash.y[0] - worktop.y[1]) < 1e-9 && Math.abs(splash.y[1] - cabinet.y[0]) < 1e-9, 'between the worktop and the cabinets')
  assert.ok(Math.abs(splash.u[0] - box('base').u[0]) < 1e-9 && Math.abs(splash.u[1] - box('base').u[1]) < 1e-9, 'along the base run')
  assert.ok(Math.abs(splash.v[1] - box('base').v[1]) < 1e-9 && splash.v[1] - splash.v[0] <= .03, 'flat on the wall')
  const piece = furnishingsOn('first').find(item => item.id === 'kitchen-backsplash')!
  assert.ok(piece.kitchen?.pattern === TOSCANA_VENA_SLAB && !piece.solid)
})

test('the cabinets are set back 1 to 2 cm under the Toscana Vena: the tops stand out of the fronts and the island\'s open end', () => {
  const [base, worktop, counter, top] = [box('base'), box('worktop'), box('counter'), box('counter-top')]
  const back = (outer: number, inner: number) => { assert.ok(outer - inner >= .01 - 1e-9 && outer - inner <= .02 + 1e-9, `${outer - inner}`) }
  back(base.v[0], worktop.v[0])
  back(top.u[1], counter.u[1])
  back(top.v[1], counter.v[1])
})

test('the resting worktop beside the oven has an outlet on the side wall, over the worktop and under the cabinets, not on the backsplash', () => {
  const plate = furnishingsOn('first').find(piece => piece.id === 'outlet-kitchen-rest-plate')!
  const base = box('base'), worktop = box('worktop'), cabinet = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-bottom')!
  // Flat on the wall at the hall end of the run (the kitchen's face of the wall behind the bathroom), facing the kitchen.
  assert.ok(Math.abs(plate.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && plate.u[1] > plate.u[0])
  assert.ok(plate.v[0] > base.v[0] && plate.v[1] < base.v[1], 'over the worktop, away from the backsplash wall')
  assert.ok(plate.y[0] > worktop.y[1] + .1 && plate.y[1] < cabinet.y[0] - .1, 'between the worktop and the cabinets')
  assert.ok(plate.v[1] < base.v[1] - .02, 'not on the backsplash')
})

test('the fridge has an outlet behind it, 5 cm under the worktop\'s line, and the two outlets on the island\'s wall are at the same height as the one beside the oven', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const fridge = box('fridge'), plate = find('outlet-fridge-plate'), worktop = box('worktop')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (worktop.y[1] - .05)) < 1e-9, 'its centre is 5 cm under the worktop')
  assert.ok(plate.u[0] >= fridge.u[0] && plate.u[1] <= fridge.u[1], 'behind the fridge')
  assert.ok(Math.abs(plate.v[1] - KITCHEN_LIVING.v[1]) < 1e-9 && plate.v[0] < plate.v[1], 'flat on the party wall, facing the kitchen')
  const rest = find('outlet-kitchen-rest-plate'), middleY = (rest.y[0] + rest.y[1]) / 2
  for (const index of [1, 2]) {
    const island = find(`outlet-island-${index}-plate`), top = box('counter-top')
    assert.ok(Math.abs((island.y[0] + island.y[1]) / 2 - middleY) < 1e-9, 'the same height as the one beside the oven')
    assert.ok(Math.abs(island.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && island.v[0] > top.v[0] && island.v[1] < top.v[1], 'on the wall behind the island')
  }
})

test('the fridge, the microwave and the living\'s table can be taken away: the pieces go with their device, and the spot stays free to walk through', () => {
  const states = { 'away-fridge': 0, 'away-microwave': 0, 'set-living': 0 }
  assert.ok(isPieceAway(states, 'kitchen-fridge') && isPieceAway(states, 'kitchen-fridge-door') && isPieceAway(states, 'kitchen-microwave') && isPieceAway(states, 'ps5'))
  assert.ok(!isPieceAway(states, 'outlet-fridge-plate') && !isPieceAway(states, 'outlet-microwave-plate') && !isPieceAway(states, 'kitchen-base'), 'what is behind them stays')
  assert.ok(!isPieceAway({}, 'kitchen-fridge') && isInPlace({}, 'kitchen-microwave'))
  const devices = furnishingDevices('first', 3.2).map(device => device.id)
  for (const id of ['kitchen-fridge', 'kitchen-microwave', 'living-table']) assert.ok(devices.includes(id) && isRemovable(id), id)
})

test('the tall column is a breakfast nook: its door opens (E), with a Nespresso on the worktops\' shelf, an outlet behind it at 1.10 m and several shelves', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const column = box('column'), shelves = pieces.filter(piece => piece.id.startsWith('kitchen-nook-shelf-')), machine = find('kitchen-nook-machine'), counterShelf = find('kitchen-nook-shelf-2')
  assert.ok(furnishingDevices('first', 3.2).some(device => device.id === 'kitchen-column'), 'the door can be aimed at')
  assert.ok(shelves.length >= 4, 'several shelves')
  // The shelf at the worktops' height holds the machine, in the column, with 7 cm in front of it.
  assert.ok(Math.abs(counterShelf.y[1] - box('worktop').y[1]) < 1e-9, 'the shelf is at the worktops\' height')
  assert.ok(machine.model === '/models/house/nespresso.glb' && machine.turn === 0 && Math.abs(machine.y[0] - counterShelf.y[1]) < 1e-9)
  assert.ok(machine.u[0] >= column.u[0] && machine.u[1] <= column.u[1] && machine.v[0] >= column.v[0] && machine.v[1] <= column.v[1], 'inside the column')
  assert.ok(Math.abs((machine.y[1] - machine.y[0]) - .314) < 1e-9 && machine.y[1] < find('kitchen-nook-shelf-3').y[0], 'under the next shelf')
  // The outlet behind it, on the party wall, at the same height as the one on the resting worktop, to one side of the machine so it can be seen.
  const plate = find('outlet-nook-plate'), rest = find('outlet-kitchen-rest-plate')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (rest.y[0] + rest.y[1]) / 2) < 1e-9, 'the same height as the one beside the oven')
  assert.ok(plate.u[0] >= column.u[0] + .02 && plate.u[1] <= column.u[1] - .02 && Math.abs(plate.v[1] - KITCHEN_LIVING.v[1]) < 1e-9 && plate.v[0] < plate.v[1])
  // The models on the party wall face the room (toward lower v), no half turn.
  assert.ok(find('kitchen-microwave').turn === 0 && find('kitchen-hood').turn === 0)
})

test('the island\'s canopy is a drywall slab and box over the island, with no wood, and its underside is at the height of the conduit box\'s', () => {
  const top = box('counter-top'), pieces = ISLAND_CANOPY_BOXES, find = (id: string) => pieces.find(piece => piece.id === id)!
  // No wood: neither the wall's board nor the ceiling's slats; the slab is white drywall, the whole of the top, with its underside at the height of the conduit box's.
  assert.ok(!pieces.some(piece => piece.grain || /slat|panel|backing/.test(piece.id)), 'no wood in the canopy')
  const slab = find('canopy-slab'), drywall = find('canopy-drywall')
  assert.ok(Math.abs(slab.u[0] - top.u[0]) < 1e-9 && Math.abs(slab.u[1] - top.u[1]) < 1e-9 && Math.abs(slab.v[0] - top.v[0]) < 1e-9 && Math.abs(slab.v[1] - top.v[1]) < 1e-9, 'the slab is the size of the top')
  assert.ok(slab.y[0] - top.y[1] >= 1.4 && Math.abs(slab.y[1] - slab.y[0] - ISLAND_CANOPY.slab) < 1e-9, 'a lowered ceiling, 10 cm thick')
  // At the same height as the conduit box (owner): their undersides are level, 25 cm under the ceiling.
  assert.ok(Math.abs(slab.y[0] - KITCHEN_CONDUIT_BOXES[0].y[0]) < 1e-9, 'level with the conduit box')
  // The box over it, set in 3 cm all round, up to the real ceiling.
  assert.ok(Math.abs(drywall.y[0] - slab.y[1]) < 1e-9 && Math.abs(drywall.y[1] - (top.y[1] - .93 + ISLAND_CANOPY.ceiling)) < 1e-9, 'the box up to the ceiling')
  assert.ok(drywall.u[0] >= top.u[0] && drywall.u[1] <= top.u[1] - .029 && drywall.v[0] >= top.v[0] + .029 && drywall.v[1] <= top.v[1] - .029, 'set in 3 cm')
  // Three downlights in a row along the island's middle, recessed in the slab's underside, lit.
  const lights = pieces.filter(piece => piece.id.startsWith('canopy-light-'))
  assert.equal(lights.length, 3); assert.equal(ISLAND_LIGHT_POSITIONS.length, 3)
  for (const light of lights) assert.ok(light.glow && light.round && light.u[0] >= top.u[0] && light.u[1] <= top.u[1] && light.v[0] >= top.v[0] && light.v[1] <= top.v[1], light.id)
  assert.ok(new Set(ISLAND_LIGHT_POSITIONS.map(at => at.v)).size === 1, 'in a row')
  assert.equal(ISLAND_CANOPY_WALL, 0, "nothing stands out of the wall: the wood is out")
})

test('the island has a light switch on the wall and a light line round the drywall box; the lights start on and the switch is a device', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!
  const plate = find(ISLAND_SWITCH_ID), outlet1 = find('outlet-island-1-plate'), outlet2 = find('outlet-island-2-plate'), top = box('counter-top')
  // On the wall, between the two outlets, at the same height.
  const middle = (item: { v: [number, number] }) => (item.v[0] + item.v[1]) / 2
  assert.ok(Math.abs(plate.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && plate.v[0] >= top.v[0] && plate.v[1] <= top.v[1])
  assert.ok(middle(plate) > Math.min(middle(outlet1), middle(outlet2)) && middle(plate) < Math.max(middle(outlet1), middle(outlet2)), 'between the outlets')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (outlet1.y[0] + outlet1.y[1]) / 2) < 1e-9, 'the same height as the outlets')
  const device = furnishingDevices('first', 3.2).find(item => item.id === ISLAND_SWITCH_ID) as { initialOpenness?: number } | undefined
  assert.ok(device && device.initialOpenness === 1, 'a device that starts on')
  assert.ok(islandLightsOn({}) && !islandLightsOn({ [ISLAND_SWITCH_ID]: 0 }))
  // The light line: three warm strips on the bare slab round the box, and no wash up its white faces.
  const led = ISLAND_CANOPY_BOXES.filter(piece => piece.id.startsWith('canopy-led-')), drywall = ISLAND_CANOPY_BOXES.find(piece => piece.id === 'canopy-drywall')!
  assert.equal(led.length, 3); assert.ok(!ISLAND_CANOPY_BOXES.some(piece => piece.id.startsWith('canopy-wash-')), 'no painted wash up the box: only the strip')
  for (const strip of led) assert.ok(strip.glow && Math.abs(strip.y[0] - drywall.y[0]) < 1e-9, `${strip.id} on the slab's ledge, at the box's foot`)
})

test('the conduit box runs the whole length of the wall facing the window, under the ceiling, and the island\'s box crosses it', () => {
  const conduit = KITCHEN_CONDUIT_BOXES[0], drywall = ISLAND_CANOPY_BOXES.find(piece => piece.id === 'canopy-drywall')!
  // On the wall behind the bathroom (the one facing the rear wall's window), from the TV wall to the upper cabinets, up to the ceiling.
  assert.ok(Math.abs(conduit.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && conduit.u[1] - conduit.u[0] === KITCHEN_CONDUIT_BOX.depth)
  assert.ok(Math.abs(conduit.v[0] - KITCHEN_LIVING.v[0]) < 1e-9, 'from the TV wall')
  assert.ok(Math.abs(conduit.v[1] - KITCHEN_UPPER_BOXES.find(piece => piece.id === 'upper-bottom')!.v[0]) < 1e-9, 'to the upper cabinets')
  assert.ok(Math.abs(conduit.y[1] - drywall.y[1]) < 1e-9, 'up to the ceiling')
  // The island's box comes out of it at right angles and meets it: they overlap in u, v and height.
  const meets = (a: [number, number], b: [number, number]) => overlap(a, b) > 0
  assert.ok(meets(conduit.u, drywall.u) && meets(conduit.v, drywall.v) && meets(conduit.y, drywall.y), 'the island\'s box crosses it')
  assert.ok(Math.abs(conduit.y[0] - ISLAND_CANOPY_BOXES.find(piece => piece.id === 'canopy-slab')!.y[0]) < 1e-9, 'level with the island\'s slab: they are one volume where they cross')
})

test('the conduit box has recessed lights along its underside, none where the island\'s box crosses it, and a switch beside the hall door on the kitchen side', () => {
  const pieces = KITCHEN_CONDUIT_BOXES, conduit = pieces[0], lights = pieces.filter(piece => piece.id.startsWith('conduit-light-')), drywall = ISLAND_CANOPY_BOXES.find(piece => piece.id === 'canopy-drywall')!
  assert.ok(lights.length >= 6 && lights.length === CONDUIT_LIGHT_POSITIONS.length)
  for (const light of lights) {
    assert.ok(light.glow && light.round && light.u[0] >= conduit.u[0] && light.u[1] <= conduit.u[1] && light.v[0] >= conduit.v[0] && light.v[1] <= conduit.v[1] && light.y[0] < conduit.y[0] + 1e-9, light.id)
    assert.ok(overlap(light.v, drywall.v) <= 0, `${light.id} is not inside the island's box`)
  }
  // About a metre apart.
  const spots = CONDUIT_LIGHT_POSITIONS.map(at => at.v).sort((a, b) => a - b), gaps = spots.slice(1).map((v, index) => v - spots[index])
  assert.ok(gaps.filter(gap => gap < 1.5).every(gap => gap > .7 && gap < 1.3), 'about a metre apart')
  // The switch: on the kitchen's face of the wall, past the hall door's latch edge (the higher v), 1.10 m up, facing the kitchen (higher u); a device that starts on.
  const plate = furnishingsOn('first').find(piece => piece.id === KITCHEN_SWITCH_ID)!
  assert.ok(Math.abs(plate.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && plate.u[1] > plate.u[0])
  assert.ok(plate.v[0] > LIVING_DOOR.v[1] && plate.v[0] - LIVING_DOOR.v[1] < .3, 'beside the door, on the latch side')
  assert.ok(Math.abs((plate.y[0] + plate.y[1]) / 2 - (box('worktop').y[0] - .9 + 1.1)) < 1e-9)
  const device = furnishingDevices('first', 3.2).find(item => item.id === KITCHEN_SWITCH_ID) as { initialOpenness?: number } | undefined
  assert.ok(device && device.initialOpenness === 1 && conduitLightsOn({}) && !conduitLightsOn({ [KITCHEN_SWITCH_ID]: 0 }))
})

test('the conduit box turns the corner and carries on along the party wall, over the whole kitchen run, as deep as the cabinets and flush with them, to the rear wall', () => {
  const hall = KITCHEN_CONDUIT_BOXES.find(item => item.id === 'conduit-box')!, rear = KITCHEN_CONDUIT_BOXES.find(item => item.id === 'conduit-box-rear')!, cabinet = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-bottom')!
  // Along the party wall from the hall wall to the rear wall, as deep as the cabinets (the same front), the same height under the ceiling as the one on the hall wall.
  assert.ok(Math.abs(rear.u[0] - KITCHEN_LIVING.u[0]) < 1e-9 && Math.abs(rear.u[1] - KITCHEN_LIVING.u[1]) < 1e-9, 'the whole length of the run')
  assert.ok(Math.abs(rear.v[1] - KITCHEN_LIVING.v[1]) < 1e-9 && Math.abs(rear.v[0] - cabinet.v[0]) < 1e-9, 'flush with the cabinets')
  assert.ok(Math.abs(rear.y[0] - hall.y[0]) < 1e-9 && Math.abs(rear.y[1] - hall.y[1]) < 1e-9, 'the same height as the one on the hall wall')
  // They meet at the corner, and the cabinets end under it.
  assert.ok(Math.abs(hall.v[1] - rear.v[0]) < 1e-9 && hall.u[0] === rear.u[0], 'the two boxes meet at the corner')
  const tops = KITCHEN_UPPER_BOXES.filter(item => item.id.startsWith('upper-')).map(item => item.y[1])
  assert.ok(Math.max(...tops) <= rear.y[0] + 1e-9, 'the cabinets end where the box begins')
  // The hood's duct goes on inside it, which is deep enough to hold it (26 cm).
  assert.ok(rear.v[1] - rear.v[0] >= .26 + 1e-9)
})

test('the breakfast nook is as tall as the upper cabinets: it ends under the conduit box, and its shelves stay inside', () => {
  const column = furnishingsOn('first').find(piece => piece.id === 'kitchen-column')!, rear = KITCHEN_CONDUIT_BOXES.find(item => item.id === 'conduit-box-rear')!
  const cabinet = Math.max(...KITCHEN_UPPER_BOXES.filter(item => item.id.startsWith('upper-')).map(item => item.y[1]))
  assert.ok(Math.abs(column.y[1] - rear.y[0]) < 1e-9 && Math.abs(column.y[1] - cabinet) < 1e-9, 'the column ends where the box begins, like the cabinets')
  const nook = furnishingsOn('first').filter(piece => piece.id.startsWith('kitchen-nook-'))
  assert.ok(nook.every(piece => piece.y[1] <= column.y[1] + 1e-9), 'nothing of the nook goes past the column')
  const shelves = nook.filter(piece => piece.id.startsWith('kitchen-nook-shelf-')), door = nook.find(piece => piece.id === 'kitchen-nook-door')!
  assert.ok(Math.max(...shelves.map(piece => piece.y[1])) < door.y[1], 'a shelf near the top')
  assert.ok(door.y[1] > column.y[1] - .01 && door.y[1] < column.y[1], 'the door goes all the way up')
})

test('the dishwasher (45 by 85 by 59 cm) is in the island between the sink and the wall, its door toward the aisle', () => {
  const dishwasher = furnishingsOn('first').find(piece => piece.id === 'kitchen-dishwasher')!, sink = box('sink'), counter = box('counter'), top = box('counter-top')
  assert.ok(dishwasher.model === DISHWASHER.model && Math.abs(dishwasher.turn! - Math.PI) < 1e-9, 'a Blender model with its door toward higher v')
  assert.ok(Math.abs(dishwasher.u[1] - dishwasher.u[0] - .45) < 1e-9 && Math.abs(dishwasher.y[1] - dishwasher.y[0] - .85) < 1e-9 && Math.abs(dishwasher.v[1] - dishwasher.v[0] - .59) < 1e-9, '45 by 85 by 59 cm')
  assert.ok(dishwasher.u[1] <= sink.u[0] - .05, 'on the wall\'s side of the sink, with the sink not over it')
  assert.ok(dishwasher.u[0] - counter.u[0] >= .01 && dishwasher.u[0] - counter.u[0] <= .03, 'close to the wall behind the island, but at least 1 cm off it for the cabinet\'s side')
  assert.ok(dishwasher.v[1] - counter.v[1] > .012 && dishwasher.v[1] - counter.v[1] <= .02, 'the model\'s front is the handle tray, 12 mm out of the door, which is then 5 mm proud of the cabinet\'s front')
  // Its plinth is the island\'s: 10 cm tall and set 5 cm back from the front, so its kick plate lines up with the banquina\'s (the model\'s own is set 5 cm back).
  assert.ok(Math.abs(box('counter-plinth').v[1] - (dishwasher.v[1] - .05)) < .02 && Math.abs(box('counter').y[0] - FLOOR_HEIGHT - .1) < 1e-9, 'the same banquina')
  assert.ok(dishwasher.v[0] > counter.v[0] && dishwasher.y[1] <= top.y[0] + 1e-9, 'inside the island, under the top')
})

test('the shelf over the coffee machine holds the coffee and tea cups', () => {
  const pieces = furnishingsOn('first'), shelf = pieces.find(piece => piece.id === 'kitchen-nook-shelf-3')!, machine = pieces.find(piece => piece.id === 'kitchen-nook-machine')!
  const cups = pieces.filter(piece => /^kitchen-nook-cup-\d+$/.test(piece.id)), handles = pieces.filter(piece => piece.id.startsWith('kitchen-nook-cup-handle-'))
  assert.equal(cups.length, 6); assert.equal(handles.length, 6)
  assert.ok(shelf.y[0] > machine.y[1], 'the shelf is over the machine')
  for (const cup of cups) {
    assert.ok(Math.abs(cup.y[0] - shelf.y[1]) < 1e-9 && cup.shape === 'ellipse' && cup.taper! < 1, `${cup.id} stands on the shelf, round and narrower at the foot`)
    assert.ok(cup.u[0] >= shelf.u[0] && cup.u[1] <= shelf.u[1] && cup.v[0] >= shelf.v[0] && cup.v[1] <= shelf.v[1], `${cup.id} is on the shelf`)
  }
  assert.ok(Math.max(...cups.map(cup => cup.y[1])) < pieces.find(piece => piece.id === 'kitchen-nook-shelf-4')!.y[0], 'room above them')
})

test('the breakfast nook is oak, like the cabinets', () => {
  const nook = furnishingsOn('first').filter(piece => piece.id.startsWith('kitchen-nook-') && !/cup|machine|handle/.test(piece.id))
  assert.ok(nook.length >= 10 && nook.every(piece => piece.color.toLowerCase() === '#d8bf98'), 'every panel, shelf and the door')
  assert.equal(box('column').color.toLowerCase(), '#d8bf98')
})

test('the narrow cabinet by the hall has one solid door over a glass door that lifts, and glasses on its shelves, as the owner\'s picture', () => {
  const upper = KITCHEN_UPPER_BOXES, find = (id: string) => upper.find(item => item.id === id)!, cabinet = find('upper-bottom')
  // The cabinet is 49 cm wide, so the solid part is a single leaf, not two.
  assert.ok(cabinet.u[1] - cabinet.u[0] < .5)
  assert.ok(upper.filter(item => /^upper-door(-\d+)?$/.test(item.id)).length === 1 && !upper.some(item => item.id === 'upper-door-2'), 'one leaf')
  const door = find('upper-door'), glass = find('upper-glass-pane'), rail = find('upper-glass-rail')
  assert.ok(door.u[0] - cabinet.u[0] < .01 && cabinet.u[1] - door.u[1] < .01, 'the leaf takes the whole width')
  // The glass door is under it, with a transparent pane and a handle at its foot; the rail between them.
  assert.ok(glass.opacity! < .5 && glass.y[1] <= rail.y[0] && door.y[0] >= rail.y[1], 'glass under, solid over')
  assert.ok(find('upper-glass-handle').y[1] < glass.y[0] + .03, 'the handle is at the glass door\'s foot')
  // Glasses stand on the bottom and on the shelf, seen through the pane.
  const cups = upper.filter(item => item.id.startsWith('upper-glass-cup-')), shelf = find('upper-glass-shelf')
  assert.equal(cups.length, 10)
  assert.ok(cups.every(cup => cup.round && cup.opacity! < .6 && cup.u[0] >= cabinet.u[0] && cup.u[1] <= cabinet.u[1] && (Math.abs(cup.y[0] - cabinet.y[1]) < 1e-9 || Math.abs(cup.y[0] - shelf.y[1]) < 1e-9)), 'on the base or the shelf')
  assert.ok(cups.every(cup => cup.y[1] < rail.y[0]), 'under the rail')
})

test('the glass door of the glasses cabinet is a device that lifts about the rail: aimed at through its pane, E opens it up and out', () => {
  const pane = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-glass-pane')!, rail = KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-glass-rail')!
  assert.equal(GLASS_DOOR_ID, `kitchen-${pane.id}`)
  const device = furnishingDevices('first', 3.2).find(item => item.id === GLASS_DOOR_ID)
  assert.ok(device, 'the pane can be aimed at')
  // The hinge is at the rail, along u, on the door's face; it swings about 100 degrees, a little past the vertical, up and out.
  assert.ok(Math.abs(GLASS_HINGE.y - rail.y[0]) < 1e-9 && GLASS_HINGE.v >= KITCHEN_UPPER_BOXES.find(item => item.id === 'upper-bottom')!.v[0] - 1e-9 && GLASS_HINGE.v < pane.v[1])
  assert.ok(GLASS_CABINET.swing > Math.PI / 2 && GLASS_CABINET.swing < Math.PI * .65)
  // What turns with it is the frame, the pane and the handle, the glass door's own pieces: all of them hang under the rail.
  const door = KITCHEN_UPPER_BOXES.filter(item => /^upper-glass-(frame|pane|handle)/.test(item.id))
  assert.ok(door.length === 6 && door.every(item => item.y[1] <= GLASS_HINGE.y + 1e-9), 'the six pieces of the door are under the hinge')
})

test('the sink is as near the wall as it can be without being over the dishwasher, and the tap is centred on it, on its long side', () => {
  const sink = box('sink'), tap = box('tap'), dishwasher = furnishingsOn('first').find(piece => piece.id === 'kitchen-dishwasher')!, counter = box('counter')
  assert.ok(sink.u[0] >= dishwasher.u[1] + .05 && sink.u[0] - dishwasher.u[1] < .1, 'just past the dishwasher')
  assert.ok(sink.u[0] < (counter.u[0] + counter.u[1]) / 2 - .5, 'nearer the wall than the middle of the island')
  assert.ok(Math.abs((tap.u[0] + tap.u[1]) / 2 - (sink.u[0] + sink.u[1]) / 2) < 1e-9, 'the tap is centred on the sink')
  assert.ok(tap.v[1] <= sink.v[0], 'on its long side')
})

test('the cabinets rest on a plinth, the banquina: the run, the island and the tall column, 10 cm tall and set 5 cm back from the fronts, at least 2 cm', () => {
  for (const [body, plinth, frontSides] of [['base', 'base-plinth', [['v', 0]]], ['column', 'column-plinth', [['v', 0]]], ['counter', 'counter-plinth', [['v', 0], ['v', 1], ['u', 1]]]] as const) {
    const cabinet = box(body), foot = box(plinth)
    assert.ok(Math.abs(foot.y[0] - FLOOR_HEIGHT) < 1e-9 && Math.abs(foot.y[1] - cabinet.y[0]) < 1e-9, `${plinth} under ${body}, from the floor`)
    assert.ok(foot.y[1] - foot.y[0] >= .02 && Math.abs(foot.y[1] - foot.y[0] - .1) < 1e-9, '10 cm tall')
    for (const [axis, side] of frontSides) {
      const recess = axis === 'v' ? (side === 0 ? foot.v[0] - cabinet.v[0] : cabinet.v[1] - foot.v[1]) : cabinet.u[1] - foot.u[1]
      assert.ok(recess >= .02 && Math.abs(recess - .05) < 1e-9, `${plinth} is set back at least 2 cm (${recess})`)
    }
  }
  // Against the wall the plinth is flush with the cabinet: the island's, at the wall, and the run's, at the wall behind it.
  assert.ok(Math.abs(box('counter-plinth').u[0] - box('counter').u[0]) < 1e-9 && Math.abs(box('base-plinth').v[1] - box('base').v[1]) < 1e-9)
  // Nothing in the cabinets starts below the plinth's top but the plinth, and the oven is not in it.
  assert.ok(box('oven').y[0] >= box('base').y[0])
})

test('the breakfast nook rests on the plinth too: its sides, bottom and door start at the plinth\'s top', () => {
  const pieces = furnishingsOn('first'), top = FLOOR_HEIGHT + .1
  for (const id of ['kitchen-nook-side-low', 'kitchen-nook-side-high', 'kitchen-nook-plinth']) assert.ok(Math.abs(pieces.find(piece => piece.id === id)!.y[0] - top) < 1e-9, id)
  assert.ok(pieces.find(piece => piece.id === 'kitchen-nook-door')!.y[0] > top && pieces.find(piece => piece.id === 'kitchen-nook-door')!.y[0] < top + .01)
})

test('the island has a Toscana Vena cover on its open end, 1 m wide, and the cover and the three stools (together) can be taken away with X', () => {
  const cheek = KITCHEN_UPPER_BOXES.find(item => item.id === 'island-cheek')!, counter = box('counter'), top = box('counter-top')
  // A slab of Toscana Vena on the end, the top's whole width (1 m), from the floor to the top, flush with the top's end.
  assert.equal(cheek.pattern, TOSCANA_VENA_SLAB); assert.ok(cheek.wall)
  assert.ok(Math.abs((cheek.v[1] - cheek.v[0]) - 1) < 1e-9 && Math.abs(cheek.v[0] - top.v[0]) < 1e-9 && Math.abs(cheek.v[1] - top.v[1]) < 1e-9, 'the top\'s whole width, 1 m')
  assert.ok(Math.abs(cheek.u[0] - counter.u[1]) < 1e-9 && Math.abs(cheek.u[1] - top.u[1]) < 1e-9, 'on the open end, flush with the top')
  assert.ok(Math.abs(cheek.y[0] - FLOOR_HEIGHT) < 1e-9 && Math.abs(cheek.y[1] - counter.y[1]) < 1e-9, 'from the floor to the top')
  // Removable with X, and so are the three stools, together, as one device whose aim volume holds all of them; once away they no longer stop anyone.
  const all = furnishingDevices('first', 3.2), stools = furnishingsOn('first').filter(piece => isStool(piece.id)), group = all.find(device => device.id === STOOLS_ID)!
  assert.ok(all.some(device => device.id === 'kitchen-island-cheek') && isRemovable('kitchen-island-cheek') && isRemovable(STOOLS_ID))
  assert.equal(stools.length, 3)
  assert.ok(group && stools.every(piece => piece.u[0] >= group.center[0] - group.halfWidth - 1e-9 && piece.u[1] <= group.center[0] + group.halfWidth + 1e-9 && -piece.v[1] >= group.center[1] - group.halfDepth - 1e-9 && -piece.v[0] <= group.center[1] + group.halfDepth + 1e-9), 'the device holds the three')
  assert.ok(stools.every(piece => isPieceAway({ 'away-stools': 0 }, piece.id)) && !isPieceAway({ 'away-stools': 0 }, 'kitchen-island-cheek'), 'together, and nothing else')
  assert.ok(isPieceAway({ 'away-island-cheek': 0 }, 'kitchen-island-cheek') && !isPieceAway({}, 'kitchen-stool-2'))
})

test('the island\'s cabinets, on the aisle side, have the door under the sink and, to its left seen from the aisle (the open end\'s side), two large drawers for the pans', () => {
  const fronts = KITCHEN_ISLAND_FRONTS, find = (id: string) => fronts.find(item => item.id === id)!, sink = box('sink'), counter = box('counter')
  const door = find('island-door-sink'), one = find('island-drawer-1'), two = find('island-drawer-2')
  // The door is under the sink, one leaf as wide as the sink (a few mm more), up the cabinet's height from the plinth to the top.
  assert.ok(door.u[0] <= sink.u[0] && door.u[1] >= sink.u[1] && door.u[1] - door.u[0] - (sink.u[1] - sink.u[0]) < .02, 'the door is the sink\'s width, under it')
  assert.ok(Math.abs(door.y[0] - counter.y[0]) < .01 && Math.abs(door.y[1] - counter.y[1]) < .01, 'from the plinth to the top')
  // The drawers: to the left of the sink seen from the aisle, which is the higher u, up to the cabinet's end; two, one over the other, big (a metre wide, 39 cm tall), joined by a joint.
  assert.ok(one.u[0] >= door.u[1] && Math.abs(one.u[1] - counter.u[1]) < .01 && one.u[0] === two.u[0] && one.u[1] === two.u[1], 'beyond the sink, to the cabinet\'s end, one over the other')
  assert.ok(one.u[1] - one.u[0] > .9 && one.y[1] - one.y[0] > .35 && two.y[1] < one.y[0] && one.y[0] - two.y[1] < .01, 'large drawers with a joint between them')
  // On the aisle side, between the dishwasher and the sink: the filler; the fronts are skins on the cabinet's face and their handles stand out of them.
  const dishwasher = furnishingsOn('first').find(piece => piece.id === 'kitchen-dishwasher')!, filler = find('island-filler')
  assert.ok(filler.u[0] >= dishwasher.u[1] && filler.u[1] <= door.u[0], 'the filler is between the dishwasher and the door')
  for (const front of [door, one, two, filler]) assert.ok(Math.abs(front.v[0] - counter.v[1]) < 1e-9 && front.v[1] - front.v[0] < .01, `${front.id} is a skin on the cabinet's face`)
  for (const id of ['island-door-sink-handle', 'island-drawer-1-handle', 'island-drawer-2-handle']) assert.ok(find(id).v[1] - find(id).v[0] >= .01 && find(id).v[0] >= door.v[1] - 1e-9, `${id} stands out`)
  assert.ok(sink.u[0] > dishwasher.u[1] && one.u[0] > sink.u[1], 'from the wall: the dishwasher, the sink, the drawers')
})

test('the run has the cutlery\'s three drawers under the resting worktop, to the left of the oven: a shallow one on top, one for the utensils and a deep one', () => {
  const drawers = KITCHEN_RUN_FRONTS.filter(item => /^run-drawer-\d$/.test(item.id)), base = box('base'), oven = box('oven'), worktop = box('worktop')
  assert.equal(drawers.length, 3)
  // On the hall side of the oven, the width of the resting worktop (45 cm), on the run's face (toward lower v), from the plinth to the top.
  for (const drawer of drawers) {
    assert.ok(drawer.u[0] >= base.u[0] && drawer.u[1] <= oven.u[0] && oven.u[0] - drawer.u[1] < .01, `${drawer.id} is under the resting worktop`)
    assert.ok(Math.abs(drawer.v[1] - base.v[0]) < 1e-9 && drawer.v[1] - drawer.v[0] < .01, `${drawer.id} is a skin on the run's face`)
  }
  assert.ok(Math.abs(Math.max(...drawers.map(item => item.y[1])) - worktop.y[0]) < .005 && Math.abs(Math.min(...drawers.map(item => item.y[0])) - base.y[0]) < .005, 'the whole cabinet, from the plinth to the worktop')
  // One over the other, the top the shallowest (the cutlery's), the bottom the deepest; a joint between each.
  const [one, two, three] = drawers, height = (item: typeof one) => item.y[1] - item.y[0]
  assert.ok(height(one) < height(two) && height(two) < height(three), 'shallow on top, deep at the foot')
  assert.ok(one.y[0] > two.y[1] && two.y[0] > three.y[1] && one.y[0] - two.y[1] < .01 && two.y[0] - three.y[1] < .01, 'with a joint between them')
  for (const index of [1, 2, 3]) {
    const handle = KITCHEN_RUN_FRONTS.find(item => item.id === `run-drawer-${index}-handle`)!
    assert.ok(handle.v[1] - handle.v[0] >= .01 && handle.v[1] <= base.v[0] - drawers[0].v[1] + base.v[0] + 1e-9 && handle.y[1] <= drawers[index - 1].y[1], `handle ${index} stands out of its drawer, on its top edge`)
  }
})

test('the run has three drawers to the right of the oven too, from the cooktop\'s end to the fridge, one over the other', () => {
  const right = KITCHEN_RUN_FRONTS.filter(item => /^run-right-drawer-\d$/.test(item.id)), base = box('base'), cooktop = box('cooktop'), worktop = box('worktop')
  assert.equal(right.length, 3)
  for (const drawer of right) {
    assert.ok(drawer.u[0] >= cooktop.u[1] && drawer.u[0] - cooktop.u[1] < .01 && drawer.u[1] <= base.u[1] && base.u[1] - drawer.u[1] < .01, `${drawer.id} runs from the cooktop's end to the fridge`)
    assert.ok(Math.abs(drawer.v[1] - base.v[0]) < 1e-9 && drawer.v[1] - drawer.v[0] < .01, `${drawer.id} is a skin on the run's face`)
  }
  assert.ok(Math.abs(Math.max(...right.map(item => item.y[1])) - worktop.y[0]) < .005 && Math.abs(Math.min(...right.map(item => item.y[0])) - base.y[0]) < .005, 'from the plinth to the worktop')
  const [one, two, three] = right
  assert.ok(one.y[0] > two.y[1] && two.y[0] > three.y[1], 'one over the other')
  assert.ok(right[0].u[1] - right[0].u[0] > .8, 'wide drawers')
  // They do not meet the oven's cabinet or the left drawers: the oven stands between them.
  const left = KITCHEN_RUN_FRONTS.filter(item => /^run-drawer-\d$/.test(item.id))
  assert.ok(Math.max(...left.map(item => item.u[1])) <= box('oven').u[0] + .01 && right[0].u[0] >= box('oven').u[1], 'the oven between the two sets')
})

test('the island\'s outlets and switch are symmetric about the axis of its 1 m top: the outlets a quarter and three quarters across, the switch and the lights on the axis', () => {
  const pieces = furnishingsOn('first'), find = (id: string) => pieces.find(piece => piece.id === id)!, top = box('counter-top')
  const middle = (item: { v: [number, number] }) => (item.v[0] + item.v[1]) / 2, axis = (top.v[0] + top.v[1]) / 2
  assert.ok(Math.abs(axis - ISLAND_AXIS_V) < 1e-9)
  const [one, two, plate] = [find('outlet-island-1-plate'), find('outlet-island-2-plate'), find(ISLAND_SWITCH_ID)]
  assert.ok(Math.abs(middle(one) + middle(two) - 2 * axis) < 1e-9, 'the two outlets are symmetric about the axis')
  assert.ok(Math.abs(Math.abs(middle(one) - axis) - .25) < 1e-9 && Math.abs(Math.abs(middle(two) - axis) - .25) < 1e-9, 'a quarter of the metre either side')
  assert.ok(Math.abs(middle(plate) - axis) < 1e-9, 'the switch on the axis, between them')
  assert.ok(ISLAND_LIGHT_POSITIONS.every(at => Math.abs(at.v - axis) < 1e-9), 'the lights on the axis')
})

test('the drywall boxes are painted as the wall they run along: the island\'s and the hall wall\'s in the partitions\' white, the one over the party wall in the exterior walls\' beige', () => {
  const colour = (id: string) => (ISLAND_CANOPY_BOXES.find(piece => piece.id === id) ?? KITCHEN_CONDUIT_BOXES.find(piece => piece.id === id))!.color
  for (const id of ['canopy-slab', 'canopy-drywall', 'conduit-box']) assert.equal(colour(id), WALL_PAINT.partition, id)
  assert.equal(colour('conduit-box-rear'), WALL_PAINT.exterior, 'the one over the party wall')
})

test('the island\'s wood (a walnut-like board on the wall and a fluted oak under the ceiling) comes on and off with X, and starts off', () => {
  const wood = ISLAND_WOOD_BOXES, find = (id: string) => wood.find(item => item.id === id)!, top = box('counter-top'), slab = ISLAND_CANOPY_BOXES.find(item => item.id === 'canopy-slab')!
  const panel = find('canopy-wall-panel'), slats = wood.filter(item => item.id.startsWith('canopy-soffit-slat-')), light = wood.filter(item => item.id.startsWith('canopy-light-wood-'))
  assert.ok(panel.grain === 'walnut' && Math.abs(panel.y[0] - top.y[1]) < 1e-9 && Math.abs(panel.y[1] - slab.y[0]) < 1e-9, 'the board goes from the worktop up to the slab')
  assert.ok(Math.abs(panel.u[1] - panel.u[0] - ISLAND_WOOD.thickness) < 1e-9, '3 cm thick')
  // The slats run out from the wall's board, 24 mm wide on a 30 mm pitch, hanging under the slab; the lights are lowered with them.
  assert.ok(slats.length >= 30 && Math.abs(slats[1].v[0] - slats[0].v[0] - ISLAND_WOOD.pitch) < 1e-9 && Math.abs(slats[0].v[1] - slats[0].v[0] - ISLAND_WOOD.slat) < 1e-9)
  assert.ok(slats.every(slat => slat.y[1] <= slab.y[0] + 1e-9) && light.length === 3 && light.every(item => item.y[1] <= slab.y[0] - .02), 'under the slab')
  // A device that starts off, on and off with X; the wood's pieces go with it, and the slab's own lights do not.
  const pieces = furnishingsOn('first')
  assert.ok(isRemovable(ISLAND_WOOD_ID) && !isInPlace({}, ISLAND_WOOD_ID) && isInPlace({ 'away-island-wood': 1 }, ISLAND_WOOD_ID))
  assert.ok(furnishingDevices('first', 3.2).some(device => device.id === ISLAND_WOOD_ID))
  assert.ok(pieces.filter(piece => /^island-canopy-(wall-panel|soffit-|light-wood-)/.test(piece.id)).every(piece => isPieceAway({}, piece.id) && !isPieceAway({ 'away-island-wood': 1 }, piece.id)), 'the wood is away until it is put on')
  assert.ok(!isPieceAway({}, 'island-canopy-light-1') && !isPieceAway({}, 'island-canopy-slab'), 'the slab and its lights stay')
})
