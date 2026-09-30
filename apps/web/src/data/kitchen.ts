import { FLOOR_HEIGHT } from './building-site.ts'
import { CUT_HEIGHT, KITCHEN_LIVING, TOSCANA_VENA_COLOR, TOSCANA_VENA_SLAB, type TilePattern } from './house-plan.ts'

/**
 * The kitchen of the living (owner's render; the worktops are Purastone Toscana Vena): a parallel kitchen, with a run of
 * cabinets along the party wall with neighbour A, facing the 65 inch TV wall, and a second counter in front of it, 2.20 m
 * by 1.00 m, against the wall behind the bathroom, with three stools on the living's side. The render has no dimensions, so
 * every size here is read from it and assumed, scaled to the living, whose depth is only 2.65 m: from the
 * rear wall, a tall dark column, the fridge, then base cabinets with the oven and the cooktop, and the second counter 1.1 m in front. Upper cabinets are left out: they hang above the 1.5 m cut.
 * House frame [u, v], heights above the ground-floor level.
 */
export type KitchenBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; pattern?: TilePattern }

const wallV = KITCHEN_LIVING.v[1]
const rearU = KITCHEN_LIVING.u[1]
const frontU = KITCHEN_LIVING.u[0]
const cut = FLOOR_HEIGHT + CUT_HEIGHT

export const KITCHEN_SIZES = {
  baseDepth: .6, baseHeight: .9, worktop: .03, columnWidth: .45, columnDepth: .6, fridgeWidth: .6, fridgeDepth: .672, fridgeHeight: 1.635, fridgeFreezerFrom: 1.03, fridgeDoor: .03,
  counterDepth: 1, counterLength: 2.2, aisle: 1.1, stoveFromHall: .45, ovenWidth: .55, cooktopWidth: .58, overhang: .3, stool: .36, stoolHeight: .65,
}
const S = KITCHEN_SIZES
const floor = FLOOR_HEIGHT

const columnU: [number, number] = [rearU - S.columnWidth, rearU]
const fridgeU: [number, number] = [columnU[0] - S.fridgeWidth, columnU[0]]
const baseU: [number, number] = [frontU, fridgeU[0]]
const baseV: [number, number] = [wallV - S.baseDepth, wallV]
export const COUNTER_V: [number, number] = [baseV[0] - S.aisle - S.counterDepth, baseV[0] - S.aisle]
// Against the wall behind the bathroom, like the render's second counter against its side wall.
const counterU: [number, number] = [frontU, frontU + S.counterLength]
const stoolCentres = [0, 1, 2].map(index => counterU[0] + S.counterLength * (index + .5) / 3)

const OAK = '#d8bf98', SILVER = '#c9cdd1', SIDE_GREY = '#8e9297', WHITE = '#e9e7e2', STOOL = '#cdb07a'

export const KITCHEN_BOXES: KitchenBox[] = [
  { id: 'column', u: columnU, v: [wallV - S.columnDepth, wallV], y: [floor, cut], color: '#4b4d50' },
  // The fridge is the owner's Samsung RT29K577JS8, a top-freezer of 299 L with a water dispenser: 0.60 m wide, 0.672 m deep and
  // 1.635 m high (the makers' figures), silver stainless steel at the front and grey sides (not black: owner). Its doors face the aisle, toward lower v.
  // It is drawn up to the 1.5 m cut like the other tall pieces. The body, then the two doors, the black handle slot over the lower
  // door and the dispenser's dark recess.
  { id: 'fridge', u: fridgeU, v: [wallV - S.fridgeDepth + S.fridgeDoor, wallV], y: [floor + .04, cut], color: SIDE_GREY },
  { id: 'fridge-door', u: [fridgeU[0] + .004, fridgeU[1] - .004], v: [wallV - S.fridgeDepth, wallV - S.fridgeDepth + S.fridgeDoor], y: [floor + .05, floor + S.fridgeFreezerFrom - .006], color: SILVER },
  { id: 'fridge-freezer-door', u: [fridgeU[0] + .004, fridgeU[1] - .004], v: [wallV - S.fridgeDepth, wallV - S.fridgeDepth + S.fridgeDoor], y: [floor + S.fridgeFreezerFrom, cut], color: SILVER },
  { id: 'fridge-handle', u: [fridgeU[0] + .06, fridgeU[1] - .06], v: [wallV - S.fridgeDepth - .004, wallV - S.fridgeDepth], y: [floor + S.fridgeFreezerFrom - .09, floor + S.fridgeFreezerFrom - .015], color: '#16171a' },
  { id: 'fridge-dispenser', u: [(fridgeU[0] + fridgeU[1]) / 2 - .085, (fridgeU[0] + fridgeU[1]) / 2 + .085], v: [wallV - S.fridgeDepth - .004, wallV - S.fridgeDepth], y: [floor + .61, floor + .89], color: '#1b1d20' },
  { id: 'base', u: baseU, v: baseV, y: [floor, floor + S.baseHeight], color: OAK },
  { id: 'worktop', u: baseU, v: [baseV[0] - .02, baseV[1]], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The oven is built into the base, with its front on the aisle side, and the cooktop sits on the worktop above it: both start
  // 45 cm from the wall behind the bathroom (owner), which the hall shares.
  { id: 'oven', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.ovenWidth], v: [baseV[0] - .015, baseV[0]], y: [floor + .25, floor + .8], color: '#2b2c2e' },
  { id: 'cooktop', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.cooktopWidth], v: [baseV[0] + .05, baseV[0] + .55], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .01], color: '#111213' },
  { id: 'counter', u: counterU, v: COUNTER_V, y: [floor, floor + S.baseHeight], color: WHITE },
  { id: 'counter-top', u: counterU, v: [COUNTER_V[0] - S.overhang, COUNTER_V[1]], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The sink is in the second counter (owner), a ceramic basin flush with the top, with a brass tap at its back edge.
  { id: 'sink', u: [counterU[0] + .5, counterU[0] + 1.1], v: [(COUNTER_V[0] + COUNTER_V[1]) / 2 - .2, (COUNTER_V[0] + COUNTER_V[1]) / 2 + .2], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .006], color: '#f4f1ea' },
  { id: 'tap', u: [counterU[0] + .78, counterU[0] + .82], v: [(COUNTER_V[0] + COUNTER_V[1]) / 2 + .22, (COUNTER_V[0] + COUNTER_V[1]) / 2 + .26], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .28], color: '#a67c3d' },
  ...stoolCentres.map((centre, index) => ({
    id: `stool-${index + 1}`, u: [centre - S.stool / 2, centre + S.stool / 2] as [number, number],
    v: [COUNTER_V[0] - S.overhang + .05 - S.stool, COUNTER_V[0] - S.overhang + .05] as [number, number],
    y: [floor, floor + S.stoolHeight] as [number, number], color: STOOL,
  })),
]
