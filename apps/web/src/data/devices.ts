import { BALCONY_SWITCH_ID } from './balcony-lights.ts'
import { BATHROOM_SWITCH_ID } from './bathroom.ts'
import { GLASS_DOOR_ID, ISLAND_SWITCH_ID, ISLAND_WOOD_ID, KITCHEN_SWITCH_ID } from './kitchen.ts'

/**
 * Everything a visitor of the walkthrough can work with, in one table. A visitor aims at a device and presses E (use it), X (take it away or put it back) or Q (the TV's arm). Each entry says what the
 * device is, where its state lives and how it reads, the words of its actions, and which pieces of the furnishings depend on it. What used to be spread over a dozen lists and chains of ids (what can be
 * aimed at, where each state starts, the label of each action, what is baked, what is hidden in the cutaway, what glows with which switch) is read from here.
 *
 * The state of a device is a number, a fraction of its opening, kept with the doors': 1 is open, on, in place; 0 is shut, off, away. A key that is not in the visit's states has the entry's initial value.
 */
export type States = Readonly<Record<string, number>>
/** The words of an action are keys of the walkthrough's copy: the one for when it is not yet done (to turn on, open, take away) and the one for when it is (to turn off, close, put back). */
type Labels = readonly [string, string]

export type Device = {
  /** What a visitor aims at: the id of a piece of the furnishings, or the id of a group of them (see `group`). */
  id: string
  /** E: opens or closes it, turns it on or off. The state is `key` (the device's id if not said), and starts at `initial`. */
  use?: { key?: string; initial: 0 | 1; labels: Labels; /** E works only while the device is in place: a TV on its mount, a fridge that is in. */ whileInPlace?: boolean }
  /** X: takes it away, and puts it back. Its state is `key`: 1 in place, 0 away; it starts away if `startsAway`. */
  detach?: { key: string; startsAway?: boolean; labels: Labels }
  /** Q: unfolds and folds the mount's arm. */
  extend?: { key: string; labels: Labels }
  /** The pieces of the furnishings that are the device's: they go with it when it is taken away, and they are drawn at each change. */
  pieces?: (pieceId: string) => boolean
  /** Pieces that are not the device's, but that react to its state (the outlets on the island's wall stand out of its wood): drawn at each change, and not taken away with it. */
  affects?: (pieceId: string) => boolean
  /** The device's pieces hang above the 1.5 m cut: the cutaway does not draw them. */
  hungHigh?: boolean
  /** A switch: what glows in its pieces lights with it. */
  lights?: boolean
  /** Its models have an `-off` twin, drawn while it is off. */
  offModels?: boolean
  /** A group: the pieces it holds; the aim volume is the box that holds them all. */
  group?: (pieceId: string) => boolean
  /** The aim volume starts this high over the floor: for a device that would otherwise swallow another one that is inside its volume (the island's wood over its switch). */
  aimFrom?: number
}

export const LIVING_SET_ID = 'living-table'
export const STOOLS_ID = 'kitchen-stools'
export const FRIDGE_ID = 'kitchen-fridge'
export const NOOK_ID = 'kitchen-column'
export const isStool = (id: string) => id.startsWith('kitchen-stool-')
export const isLivingSetPiece = (id: string) => id.startsWith('living-table-') || id === 'ps5' || id === 'ps5-controller'
/** A TV's id, 'tv-main' or 'tv-living', and what its mount's state is called. */
export const TV_IDS = ['tv-main', 'tv-living'] as const
export const tvName = (tvId: string) => tvId.replace(/^tv-/, '')
export const tvMountKey = (tvId: string) => `mount-${tvName(tvId)}`
export const armKey = (tvId: string) => `arm-${tvName(tvId)}`

/** What stands on the island's wall, out of the wood when the wood is on: the outlets and the switch. */
export const ISLAND_WALL_PIECES = /^(outlet-island-|island-switch-)/

/** A switch of lights: on by default, and the pieces it lights. */
const lightSwitch = (id: string, labels: Labels, pieces: Device['pieces'], extra: Partial<Device> = {}): Device => ({ id, use: { initial: 1, labels }, pieces, lights: true, hungHigh: true, ...extra })
const tv = (id: (typeof TV_IDS)[number]): Device => ({
  id,
  // E switches the screen on, and needs the TV on the wall; X takes it off its mount, or hangs it back; Q unfolds the mount's arm.
  use: { initial: 0, labels: ['tvOn', 'tvOff'], whileInPlace: true },
  detach: { key: tvMountKey(id), labels: ['tvRemove', 'tvMount'] },
  extend: { key: armKey(id), labels: ['armExtend', 'armFold'] },
  // The device's own piece is the TV, which goes when it is taken off its mount; the mount's pieces stay on the wall and move with the arm.
  pieces: pieceId => pieceId === id,
  affects: pieceId => pieceId.startsWith(`${id}-`),
})

export const DEVICES: readonly Device[] = [
  ...TV_IDS.map(tv),
  // The fridge: E opens its doors while it is in; X takes it out, to reach the outlet behind it.
  { id: FRIDGE_ID, use: { initial: 0, labels: ['fridgeOpen', 'fridgeClose'], whileInPlace: true }, detach: { key: 'away-fridge', labels: ['fridgeRemove', 'fridgeRestore'] }, pieces: id => id.startsWith('kitchen-fridge') },
  { id: 'kitchen-microwave', detach: { key: 'away-microwave', labels: ['microwaveRemove', 'microwaveRestore'] }, pieces: id => id === 'kitchen-microwave' },
  { id: 'kitchen-island-cheek', detach: { key: 'away-island-cheek', labels: ['cheekRemove', 'cheekRestore'] }, pieces: id => id === 'kitchen-island-cheek' },
  // The island's wood, to compare with and without (owner): the wall's board and the ceiling's slats; it starts off, and X puts it on. The outlets and the switch on that wall stand out of the board.
  { id: ISLAND_WOOD_ID, detach: { key: 'away-island-wood', startsAway: true, labels: ['woodRemove', 'woodRestore'] }, pieces: id => /^island-canopy-(wall-panel|soffit-)/.test(id), affects: id => ISLAND_WALL_PIECES.test(id), aimFrom: 1.45 },
  // Groups come out together: the living's table with the PS5 and its controller, and the three stools at the island.
  { id: LIVING_SET_ID, detach: { key: 'set-living', labels: ['setRemove', 'setRestore'] }, group: isLivingSetPiece, pieces: isLivingSetPiece },
  { id: STOOLS_ID, detach: { key: 'away-stools', labels: ['stoolRemove', 'stoolRestore'] }, group: isStool, pieces: isStool },
  // The breakfast nook, the tall column: its door opens, and the shelves, the cups and the coffee machine show.
  { id: NOOK_ID, use: { initial: 0, labels: ['nookOpen', 'nookClose'] }, pieces: id => id === NOOK_ID || id.startsWith('kitchen-nook-') },
  // The glass door of the glasses' cabinet lifts about its rail.
  { id: GLASS_DOOR_ID, use: { initial: 0, labels: ['glassDoorOpen', 'glassDoorClose'] }, pieces: id => id.startsWith('kitchen-upper-glass-') },
  // The lights: the island's lamps and light line, the bathroom's downlights, the conduit box's and the balcony's lanterns.
  lightSwitch(ISLAND_SWITCH_ID, ['islandLightsOn', 'islandLightsOff'], id => /^island-(canopy-(pendant|led|slab|drywall)|switch-)/.test(id), { offModels: true }),
  lightSwitch(BATHROOM_SWITCH_ID, ['bathroomLightsOn', 'bathroomLightsOff'], id => /^bathroom-(ceiling-|switch-)/.test(id)),
  lightSwitch(KITCHEN_SWITCH_ID, ['kitchenLightsOn', 'kitchenLightsOff'], id => /^kitchen-(conduit-|switch-)/.test(id)),
  lightSwitch(BALCONY_SWITCH_ID, ['balconyLightsOn', 'balconyLightsOff'], id => id.startsWith('balcony-'), { offModels: true }),
]

const BY_ID = new Map(DEVICES.map(device => [device.id, device]))
export const deviceOf = (id: string): Device | undefined => BY_ID.get(id)
export const isDevice = (id: string) => BY_ID.has(id)
/** The device a piece of the furnishings belongs to, if any. */
export const ownerOf = (pieceId: string): Device | undefined => DEVICES.find(device => device.pieces?.(pieceId))

const read = (states: States, key: string, initial: number) => (states[key] ?? initial) >= .5

/** Whether the device is open, on, or in whatever state E leaves it in (what its `use` state says). */
export const isOn = (states: States, id: string) => { const use = BY_ID.get(id)?.use; return use ? read(states, use.key ?? id, use.initial) : false }
/** Whether the device is where it belongs: not taken away with X. A device that cannot be taken away is always in place. */
export const isInPlace = (states: States, id: string) => { const detach = BY_ID.get(id)?.detach; return detach ? read(states, detach.key, detach.startsAway ? 0 : 1) : true }
export const isDetachable = (id: string) => !!BY_ID.get(id)?.detach
/** Whether a piece has been taken away with the device that owns it. */
export const isPieceAway = (states: States, pieceId: string) => DEVICES.some(device => device.detach && device.pieces?.(pieceId) && !isInPlace(states, device.id))
/** Whether the cutaway leaves the piece out, because it hangs above the cut. */
export const isHungHigh = (pieceId: string) => DEVICES.some(device => device.hungHigh && device.pieces?.(pieceId))
/** Whether what a piece looks like can change with a visit: it belongs to a device or reacts to one. Such pieces are drawn at each change, and never baked. */
export const dependsOnDevice = (pieceId: string) => DEVICES.some(device => device.pieces?.(pieceId) || device.affects?.(pieceId))
/** Whether a glowing piece is lit: it is, unless its switch is off. */
export const isLit = (states: States, pieceId: string) => { const owner = ownerOf(pieceId); return !owner?.lights || isOn(states, owner.id) }
/** Whether the model of a piece is drawn in its `-off` twin: its switch is off. */
export const isOffModel = (states: States, pieceId: string) => { const owner = ownerOf(pieceId); return !!owner?.offModels && !isOn(states, owner.id) }

/** The state that a TV's mount's arm has: 0 folded, 1 out. */
export const isArmExtended = (states: States, tvId: string) => read(states, armKey(tvId), 0)

export type Action = 'use' | 'detach' | 'extend'
/** What E, X and Q do to a device now, as a words key each: the action is missing if the device has none, or cannot be done while it is away. */
export function availableActions(id: string, states: States): Partial<Record<Action, string>> {
  const device = BY_ID.get(id)
  if (!device) return {}
  const out: Partial<Record<Action, string>> = {}
  if (device.use && !(device.use.whileInPlace && !isInPlace(states, id))) out.use = device.use.labels[isOn(states, id) ? 1 : 0]
  if (device.detach) out.detach = device.detach.labels[isInPlace(states, id) ? 0 : 1]
  if (device.extend) out.extend = device.extend.labels[read(states, device.extend.key, 0) ? 1 : 0]
  return out
}

/** What an action changes: the states to set, or null if the device cannot do it now. */
export function deviceAction(id: string, action: Action, states: States): Record<string, number> | null {
  const device = BY_ID.get(id)
  if (!device || !availableActions(id, states)[action]) return null
  if (action === 'use') return { [device.use!.key ?? id]: isOn(states, id) ? 0 : 1 }
  if (action === 'detach') return { [device.detach!.key]: isInPlace(states, id) ? 0 : 1 }
  return { [device.extend!.key]: read(states, device.extend!.key, 0) ? 0 : 1 }
}
