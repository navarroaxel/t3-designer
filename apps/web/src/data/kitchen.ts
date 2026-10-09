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
  baseDepth: .6, baseHeight: .9, worktop: .03, columnWidth: .45, columnDepth: .6, fridgeWidth: .675, fridgeDepth: .668, fridgeHeight: 1.785, fridgeFreezerFrom: 0, fridgeDoor: .03,
  counterDepth: 1, counterLength: 2.2, aisle: 1.1, stoveFromHall: .45, ovenWidth: .55, cooktopWidth: .58, overhang: .3, stool: .36, stoolHeight: .65,
}
/**
 * The freezer's height from its capacity (owner: 89 L net, 101 L gross). The gross volume is the liner: inner width times inner depth times
 * inner height. The walls (the insulation) are assumed 4 cm at the sides and the top, the door 4.5 cm with its insulation, the back 4.5 cm,
 * the handle 3 cm of the 0.668 m depth, and the partition under the freezer 5 cm. That leaves about a 0.595 m by 0.55 m section, so the liner
 * is about 0.31 m high and the freezer, with its top wall and the partition, about 0.40 m: a quarter of the cabinet, as in the maker's picture.
 */
export const FREEZER = { grossLitres: 101, netLitres: 89, wall: .04, door: .045, back: .045, handle: .03, partition: .05 }
const freezerSection = (KITCHEN_SIZES.fridgeWidth - 2 * FREEZER.wall) * (KITCHEN_SIZES.fridgeDepth - FREEZER.handle - FREEZER.door - FREEZER.back)
export const FREEZER_LINER_HEIGHT = FREEZER.grossLitres / 1000 / freezerSection
export const FREEZER_HEIGHT = FREEZER_LINER_HEIGHT + FREEZER.wall + FREEZER.partition
// The cabinet stands on its feet, 4 cm up; the freezer door starts where the freezer begins, counted from the floor.
KITCHEN_SIZES.fridgeFreezerFrom = .04 + KITCHEN_SIZES.fridgeHeight - FREEZER_HEIGHT
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
  // The fridge is the owner's Samsung RT29K577JS8, a top-freezer of 299 L with a water dispenser: 0.675 m wide, 0.668 m deep (handle
  // included) and 1.785 m high (the owner's measurements), silver stainless steel at the front and grey sides (not black: owner). Its doors face the aisle, toward lower v.
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

/**
 * The sink's opening in the second counter's top and where the tap stands, for the renderer (the boxes above keep the sink and the tap as sizes): the opening is the
 * sink box, 0.60 by 0.40 m, and the top is drawn around it; the tap is at the middle of its box, on the worktop at the basin's back edge.
 */
const sinkBox = KITCHEN_BOXES.find(box => box.id === 'sink')!, tapBox = KITCHEN_BOXES.find(box => box.id === 'tap')!
export const KITCHEN_SINK = { u: sinkBox.u, v: sinkBox.v, top: sinkBox.y[0], depth: .202 }
export const KITCHEN_TAP = { u: (tapBox.u[0] + tapBox.u[1]) / 2, v: (tapBox.v[0] + tapBox.v[1]) / 2, base: tapBox.y[0] }

/**
 * The upper cabinet on the party wall, over the base run and next to the fridge (owner): an oak carcass 0.90 m wide and 0.42 m deep, its underside at 1.40 m,
 * with the microwave (the 0.48 by 0.29 by 0.38 m replica of the workspace's catalogue) in the open bay nearest the fridge and a door on the other bay. The
 * microwave stands 4 cm off the wall, leaving room for the plug of the outlet behind it, whose centre is 1.5 m above the floor (owner).
 * Heights above the ground-floor level. They hang above the 1.5 m cut, so they are not in KITCHEN_BOXES.
 */
export const UPPER_CABINET = { width: .9, depth: .42, bottom: 1.4, height: .7, panel: .02, microwave: { width: .48, height: .29, depth: .38, gapToWall: .04 }, outletHeight: 1.5 }
const upperU: [number, number] = [fridgeU[0] - UPPER_CABINET.width, fridgeU[0]]
const upperV: [number, number] = [wallV - UPPER_CABINET.depth, wallV]
const upperY: [number, number] = [floor + UPPER_CABINET.bottom, floor + UPPER_CABINET.bottom + UPPER_CABINET.height]
const microwaveU: [number, number] = [upperU[1] - UPPER_CABINET.panel - .01 - UPPER_CABINET.microwave.width, upperU[1] - UPPER_CABINET.panel - .01]
const microwaveY: [number, number] = [upperY[0] + UPPER_CABINET.panel + .01, upperY[0] + UPPER_CABINET.panel + .01 + UPPER_CABINET.microwave.height]
const microwaveV: [number, number] = [wallV - UPPER_CABINET.microwave.gapToWall - UPPER_CABINET.microwave.depth, wallV - UPPER_CABINET.microwave.gapToWall]
export const MICROWAVE_CENTRE_U = (microwaveU[0] + microwaveU[1]) / 2
export const KITCHEN_UPPER_BOXES: KitchenBox[] = [
  { id: 'upper-side-low', u: [upperU[0], upperU[0] + UPPER_CABINET.panel], v: upperV, y: upperY, color: OAK },
  { id: 'upper-side-high', u: [upperU[1] - UPPER_CABINET.panel, upperU[1]], v: upperV, y: upperY, color: OAK },
  { id: 'upper-bottom', u: upperU, v: upperV, y: [upperY[0], upperY[0] + UPPER_CABINET.panel], color: OAK },
  { id: 'upper-top', u: upperU, v: upperV, y: [upperY[1] - UPPER_CABINET.panel, upperY[1]], color: OAK },
  // The door of the closed bay, with the front of the carcass.
  { id: 'upper-door', u: [upperU[0] + UPPER_CABINET.panel, microwaveU[0] - .01], v: [upperV[0], upperV[0] + UPPER_CABINET.panel], y: [upperY[0] + UPPER_CABINET.panel, upperY[1] - UPPER_CABINET.panel], color: '#e2cba5' },
  { id: 'microwave', u: microwaveU, v: microwaveV, y: microwaveY, color: SILVER },
  // Its window and its control strip, on the front.
  { id: 'microwave-window', u: [microwaveU[0] + .03, microwaveU[1] - .13], v: [microwaveV[0] - .003, microwaveV[0]], y: [microwaveY[0] + .035, microwaveY[1] - .035], color: '#15171a' },
  { id: 'microwave-controls', u: [microwaveU[1] - .1, microwaveU[1] - .02], v: [microwaveV[0] - .003, microwaveV[0]], y: [microwaveY[0] + .035, microwaveY[1] - .035], color: '#2b2c2e' },
]
