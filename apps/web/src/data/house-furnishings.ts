import { BATHROOM_BOXES } from './bathroom.ts'
import { DOORBELL_BOXES } from './doorbell.ts'
import { FIREPLACE_BOXES } from './fireplace.ts'
import { GARAGE_EQUIPMENT } from './garage-equipment.ts'
import { FLOOR_HEIGHT } from './building-site.ts'
import { KITCHEN_BOXES, type KitchenBox } from './kitchen.ts'
import {
  CLOSET_SLIDING_PANELS, CLOSET_WARDROBE, CUT_HEIGHT, LIVING_TV_PLACEMENT, MAIN_BED, MAIN_ROOM_CLOSET_WARDROBE, MAIN_TV_PLACEMENT, QUEEN_BED,
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
    add({ id: `tv-${name}-bracket`, u: [centre(tv.u) - tv.bracket.width / 2, centre(tv.u) + tv.bracket.width / 2], v: tv.bracket.v, y: [centre(tv.y) - tv.bracket.height / 2, centre(tv.y) + tv.bracket.height / 2], color: '#3b3d40', roughness: .5, metalness: .6, solid: false })
  }
  for (const box of BATHROOM_BOXES) {
    // The mirror and the glass panel are sawn off at the cut; give them their height back.
    const top = box.y[1] === cut ? F + (box.id === 'mirror' || box.id === 'mirror-shelf' ? 1.9 : 2) : box.y[1]
    add({ ...box, y: [box.y[0], top], roughness: box.metalness ? .35 : box.id.startsWith('toilet') ? .25 : .6, solid: box.opacity === undefined && box.y[0] - F < 1 && !box.id.startsWith('mirror') })
  }
  for (const box of KITCHEN_BOXES) {
    const tall = box.y[1] === cut
    const top = !tall ? box.y[1] : box.id === 'column' ? F + 2.4 : box.id.startsWith('fridge') ? F + 1.675 : box.y[1]
    add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: [box.y[0], top], color: box.color, kitchen: { ...box, y: [box.y[0], top] }, roughness: .6, solid: box.y[0] - F < 1 && !box.id.endsWith('tap') && !box.id.startsWith('fridge-') })
  }
  return pieces
}

function groundFloor(): Furnishing[] {
  return [
    ...DOORBELL_BOXES.map(box => ({ id: `doorbell-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: .4, solid: false })),
    ...GARAGE_EQUIPMENT.map(box => ({ id: `garage-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: .5, metalness: box.metalness, solid: false })),
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
