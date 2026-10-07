import { BATHROOM_BOXES } from './bathroom.ts'
import { DOORBELL_BOXES } from './doorbell.ts'
import { FIREPLACE_BOXES } from './fireplace.ts'
import { GARAGE_EQUIPMENT } from './garage-equipment.ts'
import { FLOOR_HEIGHT } from './building-site.ts'
import { RACK_BOXES } from './rack.ts'
import { tvMountBoxes } from './tv-mount.ts'
import { dualsenseBoxes } from './dualsense.ts'
import { outletBoxes } from './outlets.ts'
import { mediaBoxBoxes, passThroughBoxes } from './wall-fittings.ts'
import { SPIN_DRYER_PARTS } from './spin-dryer.ts'
import { STAIR_BLOCKS } from './stair.ts'
import { WASHING_MACHINE_BOXES } from './washing-machine.ts'
import { HOUSE_REAR, TERRACE_CENTRE_V, TERRACE_GRILL, TERRACE_INNER, TERRACE_REAR_WALL, TERRACE_SHELF, TERRACE_WALL_THICKNESS } from './building-site.ts'
import { KITCHEN_BOXES, KITCHEN_SIZES, type KitchenBox } from './kitchen.ts'
import {
  CLOSET_SLIDING_PANELS, CLOSET_WARDROBE, CUT_HEIGHT, KITCHEN_LIVING, LIVING_TV, LIVING_TV_PLACEMENT, MAIN_BED, MAIN_ROOM_CLOSET_WARDROBE, MAIN_TV, MAIN_TV_PLACEMENT, QUEEN_BED, TV_MOUNT,
  SECONDARY_BED, SECONDARY_WARDROBE, SINGLE_BED, WARDROBE, WARDROBE_LEAVES, type Floor,
} from './house-plan.ts'

/**
 * The furniture and equipment the house cutaway draws, as plain boxes in the house frame (u, v) with absolute heights, for the views that
 * stand inside the house. The cutaway saws every tall piece off at CUT_HEIGHT; here those pieces get their real height again.
 */
export type Furnishing = {
  id: string
  u: [number, number]
  v: [number, number]
  /** Absolute heights, like the plan's. */
  y: [number, number]
  color: string
  roughness?: number
  metalness?: number
  opacity?: number
  /** An ellipse inscribed in the box, narrowing toward the floor by `taper`. */
  shape?: 'ellipse'
  taper?: number
  /** The kitchen's worktops carry a pattern: those pieces are drawn by the kitchen's own component. */
  kitchen?: KitchenBox
  /** A model made in Blender (scripts/blender), standing on the floor at the centre of this box, its front toward the room: drawn instead of the box, which stays as its size and as a fallback. */
  model?: string
  /** A round plate on a wall: a cylinder along v, its radius half the width. */
  disc?: true
  /** A turn about the normal of the wall it is on, for the slots of an outlet. */
  roll?: number
  /** Whether a visitor bumps into it. Hung and thin things (mirrors, TVs, pillows) do not. */
  solid: boolean
}

const BED = '#d9d2c4', HEADBOARD = '#8b6b4a', PILLOW = '#f4f1ea', WARDROBE_COLOR = '#b58b5a', LEAF_COLORS = ['#c39a64', '#b58b5a']
const F = FLOOR_HEIGHT
const cut = F + CUT_HEIGHT
const centre = ([a, b]: [number, number]) => (a + b) / 2

function firstFloor(): Furnishing[] {
  const pieces: Furnishing[] = []
  const add = (piece: Omit<Furnishing, 'solid'> & { solid?: boolean }) => pieces.push({ solid: true, ...piece })
  add({ id: 'wardrobe-secondary', u: SECONDARY_WARDROBE.u, v: SECONDARY_WARDROBE.v, y: [F, F + WARDROBE.height], color: WARDROBE_COLOR, roughness: .85 })
  WARDROBE_LEAVES.forEach(([v0, v1], index) => add({ id: `wardrobe-leaf-${index}`, u: [SECONDARY_WARDROBE.u[0] - .02, SECONDARY_WARDROBE.u[0]], v: [v0, v1], y: [F, F + WARDROBE.height], color: LEAF_COLORS[index % 2], roughness: .75, solid: false }))
  add({ id: 'wardrobe-closet', u: MAIN_ROOM_CLOSET_WARDROBE.u, v: MAIN_ROOM_CLOSET_WARDROBE.v, y: [F, F + CLOSET_WARDROBE.height], color: WARDROBE_COLOR, roughness: .85 })
  CLOSET_SLIDING_PANELS.forEach((panel, index) => add({ id: `closet-panel-${index}`, u: panel.u, v: panel.v, y: [F, F + CLOSET_WARDROBE.height], color: panel.front ? '#d8d1c2' : '#c9c0ae', roughness: .7, solid: false }))
  // The queen bed: head against the drywall, with a headboard and two pillows.
  add({ id: 'bed-main', u: MAIN_BED.u, v: MAIN_BED.v, y: [F, F + QUEEN_BED.height], color: BED, roughness: .9 })
  add({ id: 'bed-main-headboard', u: MAIN_BED.u, v: [MAIN_BED.v[1] - .06, MAIN_BED.v[1]], y: [F, F + 1.1], color: HEADBOARD, roughness: .8, solid: false })
  for (const offset of [-.4, .4]) add({ id: `bed-main-pillow-${offset}`, u: [centre(MAIN_BED.u) + offset - .3, centre(MAIN_BED.u) + offset + .3], v: [MAIN_BED.v[1] - .5, MAIN_BED.v[1] - .1], y: [F + QUEEN_BED.height, F + QUEEN_BED.height + .12], color: PILLOW, roughness: .95, solid: false })
  add({ id: 'bed-secondary', u: SECONDARY_BED.u, v: SECONDARY_BED.v, y: [F, F + SINGLE_BED.height], color: BED, roughness: .9 })
  add({ id: 'bed-secondary-headboard', u: SECONDARY_BED.u, v: [SECONDARY_BED.v[0], SECONDARY_BED.v[0] + .06], y: [F, F + .9], color: HEADBOARD, roughness: .8, solid: false })
  add({ id: 'bed-secondary-pillow', u: [centre(SECONDARY_BED.u) - .3, centre(SECONDARY_BED.u) + .3], v: [SECONDARY_BED.v[0] + .15, SECONDARY_BED.v[0] + .55], y: [F + SINGLE_BED.height, F + SINGLE_BED.height + .12], color: PILLOW, roughness: .95, solid: false })
  for (const [name, tv] of [['main', MAIN_TV_PLACEMENT], ['living', LIVING_TV_PLACEMENT]] as const) {
    add({ id: `tv-${name}`, u: tv.u, v: tv.v, y: tv.y, color: '#0d0e10', roughness: .15, metalness: .4, solid: false })
    // The mount: an articulated VESA bracket, folded; the TV's back stands where its rails end.
    for (const part of tvMountBoxes(name, tv.bracket.v[0], centre(tv.u), centre(tv.y), name === 'main' ? MAIN_TV.vesa : LIVING_TV.vesa)) add({ ...part, roughness: .5, solid: false })
  }
  // Under the living's TV: a low table against the party wall, with a PlayStation 5 standing on it and its controller beside.
  const tvU = centre(LIVING_TV_PLACEMENT.u), wall = KITCHEN_LIVING.v[0]
  const table = { width: 1, depth: .45, height: .42, top: .04, leg: .05 }, tableV: [number, number] = [wall + .03, wall + .03 + table.depth]
  const tableU: [number, number] = [tvU - table.width / 2, tvU + table.width / 2]
  add({ id: 'living-table-top', u: tableU, v: tableV, y: [F + table.height - table.top, F + table.height], color: '#a98456', roughness: .6 })
  for (const [index, [uEdge, vEdge]] of [[tableU[0], tableV[0]], [tableU[1] - table.leg, tableV[0]], [tableU[0], tableV[1] - table.leg], [tableU[1] - table.leg, tableV[1] - table.leg]].entries()) {
    add({ id: `living-table-leg-${index + 1}`, u: [uEdge, uEdge + table.leg], v: [vEdge, vEdge + table.leg], y: [F, F + table.height - table.top], color: '#8e6a40', roughness: .7, solid: index === 0 })
  }
  // The PS5 stands upright on its base: 104 mm thick, 260 mm deep and 390 mm tall with its stand. It is the model scripts/blender builds (jobs/ps5-job.json).
  const ps5U = tvU - .25, ps5V: [number, number] = [tableV[0] + .1, tableV[0] + .1 + .26], base = F + table.height
  add({ id: 'ps5', u: [ps5U - .052, ps5U + .052], v: ps5V, y: [base, base + .39], color: '#f4f5f8', roughness: .35, solid: false, model: '/models/house/ps5.glb' })
  // Two double outlets on the wall, one each side of the table, 25 cm clear of it: the Argentine plug, shaped like the Australian one.
  for (const [side, offset] of [['left', -(table.width / 2 + .25)], ['right', table.width / 2 + .25]] as const) {
    for (const part of outletBoxes(`outlet-${side}`, wall, tvU + offset, F)) add({ ...part, roughness: .6, solid: false })
  }
  // The TV wall's fittings: the in-wall media box at the table's height, for the console's cables; and, beside the mount, the pass-through for the TV's cable and a plug at the TV's height.
  for (const part of mediaBoxBoxes('wallbox', wall, tvU, F + table.height)) add({ ...part, roughness: .5, solid: false })
  const tvCentreY = centre(LIVING_TV_PLACEMENT.y), mountHalf = TV_MOUNT.width / 2
  for (const part of passThroughBoxes('cable-hole', wall, tvU - mountHalf - .2, tvCentreY)) add({ ...part, roughness: .5, solid: false })
  for (const part of outletBoxes('outlet-tv', wall, tvU + mountHalf + .13, F, tvCentreY - F)) add({ ...part, roughness: .6, solid: false })
  // Its DualSense lies on the table beside it, the triggers toward the wall.
  for (const part of dualsenseBoxes(tvU + .22, tableV[0] + .24, base)) add({ ...part, id: `ps5-controller-${part.id}`, roughness: .45, solid: false })
  for (const box of BATHROOM_BOXES) {
    // The mirror and the glass panel are sawn off at the cut; give them their height back.
    const top = box.y[1] === cut ? F + (box.id === 'mirror' || box.id === 'mirror-shelf' ? 1.9 : 2) : box.y[1]
    add({ ...box, y: [box.y[0], top], roughness: box.metalness ? .35 : box.id.startsWith('toilet') ? .25 : .6, solid: box.opacity === undefined && box.y[0] - F < 1 && !box.id.startsWith('mirror') })
  }
  for (const box of KITCHEN_BOXES) {
    const tall = box.y[1] === cut
    const top = !tall ? box.y[1] : box.id === 'column' ? F + 2.4 : box.id.startsWith('fridge') ? F + .04 + KITCHEN_SIZES.fridgeHeight : box.y[1]
    add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: [box.y[0], top], color: box.color, kitchen: { ...box, y: [box.y[0], top] }, roughness: .6, solid: box.y[0] - F < 1 && !box.id.endsWith('tap') && !box.id.startsWith('fridge-') })
  }
  // The laundry: the washing machine and the spin dryer against the party wall, and the stair's first flight on the light-well side.
  for (const box of WASHING_MACHINE_BOXES) add({ ...box, roughness: .35, solid: box.y[0] - F < 1 })
  for (const part of SPIN_DRYER_PARTS) add({ id: `dryer-${part.id}`, u: part.u, v: part.v, y: part.y, color: part.color, metalness: part.metalness, roughness: .3, shape: part.shape === 'cylinder' ? 'ellipse' : undefined, solid: true })
  // The laundry's first flight is a stair, climbed on foot: its steps are in the azotea's obstacles, not here.
  // The terrace's grill, with its grate, and the shelf with the sink beside it, against the wall at the back.
  const back = HOUSE_REAR.southWest - TERRACE_REAR_WALL - .05
  add({ id: 'terrace-grill', u: [back - TERRACE_GRILL.depth, back], v: [TERRACE_CENTRE_V - TERRACE_GRILL.width / 2, TERRACE_CENTRE_V + TERRACE_GRILL.width / 2], y: [F, F + TERRACE_GRILL.height], color: '#8c4a33', roughness: .9 })
  add({ id: 'terrace-grill-grate', u: [back - TERRACE_GRILL.depth, back], v: [TERRACE_CENTRE_V - TERRACE_GRILL.width / 2, TERRACE_CENTRE_V + TERRACE_GRILL.width / 2], y: [F + TERRACE_GRILL.height, F + TERRACE_GRILL.height + TERRACE_GRILL.grate], color: '#2a2b2d', metalness: .4, solid: false })
  const shelfV: [number, number] = [TERRACE_CENTRE_V + TERRACE_GRILL.width / 2, TERRACE_INNER - TERRACE_WALL_THICKNESS]
  const shelfMiddle = (shelfV[0] + shelfV[1]) / 2
  add({ id: 'terrace-shelf', u: [back - TERRACE_SHELF.depth, back], v: shelfV, y: [F + TERRACE_SHELF.height - TERRACE_SHELF.thickness, F + TERRACE_SHELF.height], color: '#b9b3a5', roughness: .8, solid: false })
  add({ id: 'terrace-sink', u: [back - TERRACE_SHELF.depth / 2 - TERRACE_SHELF.basinDepth / 2, back - TERRACE_SHELF.depth / 2 + TERRACE_SHELF.basinDepth / 2], v: [shelfMiddle - TERRACE_SHELF.basinWidth / 2, shelfMiddle + TERRACE_SHELF.basinWidth / 2], y: [F + TERRACE_SHELF.height, F + TERRACE_SHELF.height + TERRACE_SHELF.basin], color: '#7d8185', metalness: .5, solid: false })
  return pieces
}

function groundFloor(): Furnishing[] {
  return [
    ...DOORBELL_BOXES.map(box => ({ id: `doorbell-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: .4, solid: false })),
    ...GARAGE_EQUIPMENT.map(box => ({ id: `garage-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: .5, metalness: box.metalness, solid: false })),
    ...STAIR_BLOCKS.map(block => ({ id: `stair-${block.id}`, u: block.u, v: block.v, y: block.y, color: '#b9b6ae', roughness: .95, solid: false })),
    // The network rack on the pantry's wall, at head height: a visitor does not walk into it.
    ...RACK_BOXES.map(box => ({ id: `rack-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, metalness: box.metalness, roughness: .5, solid: box.id === 'back' || box.id.startsWith('side') })),
    ...FIREPLACE_BOXES.map(box => ({ id: `fireplace-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.id === 'top' ? .8 : box.shape === 'log' ? .95 : .5, solid: true })),
  ]
}

const FURNISHINGS: Record<Floor, Furnishing[]> = { ground: groundFloor(), first: firstFloor() }
export const furnishingsOn = (floor: Floor): readonly Furnishing[] => FURNISHINGS[floor]

/** What a visitor bumps into, as the walkthrough's oriented boxes in the viewer's frame (x = u, z = -v, y from the floor). */
export function furnishingBlockers(floor: Floor, level: number) {
  return furnishingsOn(floor).filter(piece => piece.solid && Math.min(piece.u[1] - piece.u[0], piece.v[1] - piece.v[0]) >= .05).map(piece => ({
    center: [(piece.u[0] + piece.u[1]) / 2, -(piece.v[0] + piece.v[1]) / 2] as [number, number],
    halfWidth: (piece.u[1] - piece.u[0]) / 2, halfDepth: (piece.v[1] - piece.v[0]) / 2, cos: 1, sin: 0,
    bottom: piece.y[0] - level, top: piece.y[1] - level,
  }))
}

/** What a visitor can work with `E`: the TVs, which switch on, and the fridge, whose doors open. */
export const TV_IDS = ['tv-main', 'tv-living', 'kitchen-fridge'] as const
export function furnishingDevices(floor: Floor, level: number) {
  return furnishingsOn(floor).filter(piece => (TV_IDS as readonly string[]).includes(piece.id)).map(piece => {
    // The aim volume of a TV reaches as far as its mount's arm does, so a TV brought out into the room can still be looked at.
    const reach = piece.id.startsWith('tv-') ? TV_MOUNT.depthExtended - TV_MOUNT.depthFolded : 0
    return {
      id: piece.id,
      center: [(piece.u[0] + piece.u[1]) / 2, -(piece.v[0] + piece.v[1] + reach) / 2] as [number, number],
      halfWidth: (piece.u[1] - piece.u[0]) / 2, halfDepth: (piece.v[1] - piece.v[0] + reach) / 2, cos: 1, sin: 0,
      bottom: piece.y[0] - level, top: piece.y[1] - level,
    }
  })
}

/** A TV is on its wall mount unless the visit has taken it off (X): the state lives with the doors', under `mount-<name>`. */
export const tvMountKey = (tvId: string) => `mount-${tvId.replace(/^tv-/, '')}`
export const isTvMounted = (states: Readonly<Record<string, number>>, tvId: string) => (states[tvMountKey(tvId)] ?? 1) >= .5
/** The mount's arm is folded unless the visit has unfolded it (Q): `arm-<name>`, 0 folded and 1 reaching its full 355 mm. */
export const armKey = (tvId: string) => `arm-${tvId.replace(/^tv-/, '')}`
export const isArmExtended = (states: Readonly<Record<string, number>>, tvId: string) => (states[armKey(tvId)] ?? 0) >= .5
/** How far the mount's head has come out of its folded place, in metres: the TV with it, if it is on the mount. */
export const armReach = (states: Readonly<Record<string, number>>, tvId: string) => isArmExtended(states, tvId) ? TV_MOUNT.depthExtended - TV_MOUNT.depthFolded : 0
