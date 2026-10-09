import assert from 'node:assert/strict'
import test from 'node:test'
import { DEVICES, FRIDGE_ID, ISLAND_WALL_PIECES, LIVING_SET_ID, NOOK_ID, STOOLS_ID, armKey, availableActions, deviceAction, deviceOf, dependsOnDevice, isDevice, isHungHigh, isInPlace, isLit, isOffModel, isOn, isPieceAway, ownerOf, tvMountKey } from '../src/data/devices.ts'
import { BALCONY_SWITCH_ID } from '../src/data/balcony-lights.ts'
import { BATHROOM_SWITCH_ID } from '../src/data/bathroom.ts'
import { GLASS_DOOR_ID, ISLAND_SWITCH_ID, ISLAND_WOOD_ID, KITCHEN_SWITCH_ID } from '../src/data/kitchen.ts'
import { furnishingDevices, furnishingsOn } from '../src/data/house-furnishings.ts'
import { walkCopy } from '../src/walkthrough/copy.ts'

const words = (language: 'es' | 'en') => walkCopy[language] as Record<string, string>

test('the table of devices is well formed: ids are unique, each device does something, and every action has its words in both languages', () => {
  const ids = DEVICES.map(device => device.id)
  assert.equal(new Set(ids).size, ids.length, 'unique ids')
  for (const device of DEVICES) {
    assert.ok(device.use || device.detach || device.extend, `${device.id} does something`)
    const labels = [...(device.use?.labels ?? []), ...(device.detach?.labels ?? []), ...(device.extend?.labels ?? [])]
    for (const label of labels) for (const language of ['es', 'en'] as const) assert.ok(words(language)[label]?.length > 3, `${device.id}: "${label}" has words in ${language}`)
    assert.ok(device.pieces, `${device.id} says which pieces are its own`)
    if (device.detach) assert.ok(device.detach.key !== device.id || device.use === undefined, `${device.id}: X and E do not share a state`)
  }
})

test('every device can be aimed at: the first floor gives each an aim volume, and a switch that is on by default says so', () => {
  const aimed = furnishingDevices('first', 3.2)
  for (const device of DEVICES) assert.ok(aimed.some(item => item.id === device.id), `${device.id} has an aim volume`)
  for (const device of DEVICES) {
    const volume = aimed.find(item => item.id === device.id) as { initialOpenness?: number }
    assert.equal(volume.initialOpenness, device.use?.initial === 1 ? 1 : undefined, `${device.id}'s initial state reaches the walk`)
  }
  // A group's volume holds every piece of it.
  for (const device of DEVICES.filter(item => item.group)) {
    const volume = aimed.find(item => item.id === device.id)!, members = furnishingsOn('first').filter(piece => device.group!(piece.id))
    assert.ok(members.length >= 2 && members.every(piece => piece.u[0] >= volume.center[0] - volume.halfWidth - 1e-9 && piece.u[1] <= volume.center[0] + volume.halfWidth + 1e-9), `${device.id}'s volume holds its pieces`)
  }
})

test('a piece belongs to at most one device, and what it depends on is the table\'s word', () => {
  for (const piece of furnishingsOn('first')) {
    const owners = DEVICES.filter(device => device.pieces?.(piece.id))
    assert.ok(owners.length <= 1, `${piece.id} belongs to ${owners.map(device => device.id).join(' and ')}`)
    assert.equal(dependsOnDevice(piece.id), owners.length > 0 || DEVICES.some(device => device.affects?.(piece.id)), piece.id)
  }
  assert.equal(ownerOf('tv-main')?.id, 'tv-main'); assert.equal(ownerOf('tv-main-mount-head'), undefined, 'the mount is not the TV: it stays on the wall')
  assert.equal(ownerOf('kitchen-fridge-door')?.id, FRIDGE_ID); assert.equal(ownerOf('kitchen-nook-shelf-1')?.id, NOOK_ID)
  assert.ok(dependsOnDevice('tv-main-mount-head') && dependsOnDevice('outlet-island-1-plate') && !dependsOnDevice('kitchen-base'), 'the mount and the island\'s outlets react; the cabinets do not')
  assert.ok(ISLAND_WALL_PIECES.test('outlet-island-2-plate') && ISLAND_WALL_PIECES.test('island-switch-plate') && !ISLAND_WALL_PIECES.test('outlet-left-plate'))
})

test('E, X and Q do what the table says, only while they can, and never what they cannot: an unmounted TV and a fridge that is out have no E', () => {
  // A TV: on its mount it turns on, comes off the mount, and its arm unfolds; off the mount it has no E, which would do nothing.
  assert.deepEqual(availableActions('tv-main', {}), { use: 'tvOn', detach: 'tvRemove', extend: 'armExtend' })
  assert.deepEqual(deviceAction('tv-main', 'use', {}), { 'tv-main': 1 })
  assert.deepEqual(deviceAction('tv-main', 'use', { 'tv-main': 1 }), { 'tv-main': 0 }); assert.equal(availableActions('tv-main', { 'tv-main': 1 }).use, 'tvOff')
  assert.deepEqual(deviceAction('tv-main', 'detach', {}), { [tvMountKey('tv-main')]: 0 })
  const off = { [tvMountKey('tv-main')]: 0 }
  assert.deepEqual(availableActions('tv-main', off), { detach: 'tvMount', extend: 'armExtend' }, 'no E for a TV that is off its mount')
  assert.equal(deviceAction('tv-main', 'use', off), null)
  assert.deepEqual(deviceAction('tv-main', 'detach', off), { [tvMountKey('tv-main')]: 1 }, 'X hangs it back')
  assert.deepEqual(deviceAction('tv-living', 'extend', {}), { [armKey('tv-living')]: 1 }); assert.equal(availableActions('tv-living', { [armKey('tv-living')]: 1 }).extend, 'armFold')
  // The fridge: E opens it while it is in; out, it has only X.
  assert.deepEqual(availableActions(FRIDGE_ID, {}), { use: 'fridgeOpen', detach: 'fridgeRemove' })
  assert.deepEqual(availableActions(FRIDGE_ID, { 'away-fridge': 0 }), { detach: 'fridgeRestore' })
  assert.equal(deviceAction(FRIDGE_ID, 'extend', {}), null, 'a fridge has no arm')
  // What can only be taken away has only X; a door of the house is not a device.
  assert.deepEqual(availableActions('kitchen-microwave', {}), { detach: 'microwaveRemove' })
  assert.deepEqual(availableActions(ISLAND_WOOD_ID, {}), { detach: 'woodRestore' }, 'the island\'s wood starts off: X puts it on')
  assert.deepEqual(deviceAction(ISLAND_WOOD_ID, 'detach', {}), { 'away-island-wood': 1 })
  assert.equal(isDevice('living-door'), false); assert.deepEqual(availableActions('living-door', {}), {})
})

test('the switches start on, and flip: the words follow what the switch is now', () => {
  for (const [id, on, off] of [[ISLAND_SWITCH_ID, 'islandLightsOn', 'islandLightsOff'], [BATHROOM_SWITCH_ID, 'bathroomLightsOn', 'bathroomLightsOff'], [KITCHEN_SWITCH_ID, 'kitchenLightsOn', 'kitchenLightsOff'], [BALCONY_SWITCH_ID, 'balconyLightsOn', 'balconyLightsOff']] as const) {
    assert.ok(isOn({}, id), `${id} starts on`)
    assert.deepEqual(availableActions(id, {}), { use: off }, 'on: it offers to turn them off')
    assert.deepEqual(deviceAction(id, 'use', {}), { [id]: 0 })
    assert.deepEqual(availableActions(id, { [id]: 0 }), { use: on }); assert.deepEqual(deviceAction(id, 'use', { [id]: 0 }), { [id]: 1 })
    assert.ok(deviceOf(id)?.lights && deviceOf(id)?.hungHigh, `${id} lights what it owns, which hangs high`)
  }
  // Doors that open start shut.
  for (const id of [NOOK_ID, GLASS_DOOR_ID]) { assert.ok(!isOn({}, id), `${id} starts shut`); assert.ok(isOn({ [id]: 1 }, id)) }
})

test('what a switch owns follows it: a glowing piece is lit unless its switch is off, and a lamp\'s model has its off twin while off', () => {
  assert.ok(isLit({}, 'island-canopy-led-front') && !isLit({ [ISLAND_SWITCH_ID]: 0 }, 'island-canopy-led-front'))
  assert.ok(!isLit({ [KITCHEN_SWITCH_ID]: 0 }, 'kitchen-conduit-light-1') && isLit({ [ISLAND_SWITCH_ID]: 0 }, 'kitchen-conduit-light-1'), 'each switch its own lights')
  assert.ok(!isLit({ [BATHROOM_SWITCH_ID]: 0 }, 'bathroom-switch-dot') && !isLit({ [BALCONY_SWITCH_ID]: 0 }, 'balcony-switch-dot'))
  assert.ok(isLit({ [ISLAND_SWITCH_ID]: 0 }, 'ps5'), 'what no switch owns is lit as it is')
  assert.ok(isOffModel({ [ISLAND_SWITCH_ID]: 0 }, 'island-canopy-pendant-2') && !isOffModel({}, 'island-canopy-pendant-2'))
  assert.ok(isOffModel({ [BALCONY_SWITCH_ID]: 0 }, 'balcony-lantern-1') && !isOffModel({ [BALCONY_SWITCH_ID]: 0 }, 'island-canopy-pendant-1'))
  assert.ok(!isOffModel({ [BATHROOM_SWITCH_ID]: 0 }, 'bathroom-ceiling-light-1'), 'no off twin for a plain disc')
})

test('what is taken away goes with its device, the cutaway leaves what hangs high, and the groups come out together', () => {
  assert.ok(isPieceAway({ 'away-fridge': 0 }, 'kitchen-fridge-door') && !isPieceAway({ 'away-fridge': 0 }, 'outlet-fridge-plate'), 'the fridge goes, its outlet stays')
  assert.ok(isPieceAway({ 'mount-main': 0 }, 'tv-main') && !isPieceAway({ 'mount-main': 0 }, 'tv-main-mount-wall-plate'), 'a TV off its mount goes, the mount stays')
  assert.ok(isPieceAway({ 'away-stools': 0 }, 'kitchen-stool-1') && isPieceAway({ 'away-stools': 0 }, 'kitchen-stool-3') && !isPieceAway({ 'away-stools': 0 }, 'island-panel-slat-1'), 'the stools together, not the panel')
  assert.ok(isPieceAway({ 'set-living': 0 }, 'ps5-controller') && isInPlace({}, LIVING_SET_ID) && !isInPlace({ 'set-living': 0 }, LIVING_SET_ID))
  assert.ok(isPieceAway({}, 'island-canopy-wall-panel') && !isPieceAway({ 'away-island-wood': 1 }, 'island-canopy-soffit-slat-3'), 'the island\'s wood starts away')
  assert.ok(!isPieceAway({ 'away-island-wood': 0 }, 'island-canopy-slab') && !isPieceAway({ 'away-island-wood': 0 }, 'outlet-island-1-plate'), 'the slab and the outlets stay when the wood goes')
  for (const id of ['island-canopy-slab', 'island-switch-plate', 'bathroom-ceiling-box', 'kitchen-conduit-box', 'kitchen-switch-plate', 'balcony-lantern-2']) assert.ok(isHungHigh(id), `${id} hangs high`)
  for (const id of ['kitchen-base', 'tv-main', 'kitchen-fridge', 'island-panel-backing', 'kitchen-stool-1']) assert.ok(!isHungHigh(id), `${id} does not`)
  assert.ok(isInPlace({}, 'kitchen-island-cheek') && isInPlace({}, STOOLS_ID) && isInPlace({}, 'tv-living') && isInPlace({}, 'some-door'), 'in place unless taken away; a thing that cannot be is always in place')
})
