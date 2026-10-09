import { FLOOR_HEIGHT } from './building-site.ts'
import { CUT_HEIGHT, KITCHEN_LIVING, LIVING_DOOR, SLAB_THICKNESS, TOSCANA_VENA_COLOR, TOSCANA_VENA_SLAB, type TilePattern } from './house-plan.ts'

/**
 * The kitchen of the living (owner's render; the worktops are Purastone Toscana Vena): a parallel kitchen, with a run of
 * cabinets along the party wall with neighbour A, facing the 65 inch TV wall, and a second counter in front of it, 2.20 m
 * by 1.00 m, against the wall behind the bathroom, with three stools on the living's side. The render has no dimensions, so
 * every size here is read from it and assumed, scaled to the living, whose depth is 3.11 m: from the
 * rear wall, a tall dark column, the fridge, then base cabinets with the oven and the cooktop, and the second counter 1.1 m in front. Upper cabinets are left out: they hang above the 1.5 m cut.
 * House frame [u, v], heights above the ground-floor level.
 */
export type KitchenBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; pattern?: TilePattern; wall?: true }

const wallV = KITCHEN_LIVING.v[1]
const rearU = KITCHEN_LIVING.u[1]
const frontU = KITCHEN_LIVING.u[0]
const cut = FLOOR_HEIGHT + CUT_HEIGHT

export const KITCHEN_SIZES = {
  baseDepth: .6, baseHeight: .9, worktop: .03, columnWidth: .45, columnDepth: .6, fridgeWidth: .675, fridgeDepth: .668, fridgeHeight: 1.785, fridgeFreezerFrom: 0, fridgeDoor: .03,
  counterDepth: 1, counterLength: 2.2, aisle: 1.1, stoveFromHall: .45, ovenWidth: .55, cooktopWidth: .58, overhang: .3, topOverhang: .02, stool: .36, stoolHeight: .65,
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
// The tap is in the middle of the island (owner). The sink is used while cooking, so the basin is at the edge on the oven's side, and the tap stands on its long side away from the oven, in line with the island's middle.
const islandMiddleU = counterU[0] + S.counterLength / 2
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
  // The cabinets are set back 2 cm under the Toscana Vena (owner): the tops stand out of the fronts and the open end of the island, never flush with them.
  { id: 'base', u: baseU, v: baseV, y: [floor, floor + S.baseHeight], color: OAK },
  { id: 'worktop', u: baseU, v: [baseV[0] - S.topOverhang, baseV[1]], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The oven is built into the base, with its front on the aisle side, and the cooktop sits on the worktop above it: both start
  // 45 cm from the wall behind the bathroom (owner), which the hall shares.
  { id: 'oven', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.ovenWidth], v: [baseV[0] - .015, baseV[0]], y: [floor + .25, floor + .8], color: '#2b2c2e' },
  { id: 'cooktop', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.cooktopWidth], v: [baseV[0] + .05, baseV[0] + .55], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .01], color: '#111213' },
  { id: 'counter', u: counterU, v: COUNTER_V, y: [floor, floor + S.baseHeight], color: WHITE },
  { id: 'counter-top', u: [counterU[0], counterU[1] + S.topOverhang], v: [COUNTER_V[0] - S.overhang, COUNTER_V[1] + S.topOverhang], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The sink is in the second counter (owner), a ceramic basin flush with the top, with a brass tap at its back edge.
  { id: 'sink', u: [islandMiddleU - .3, islandMiddleU + .3], v: [COUNTER_V[1] - .08 - .4, COUNTER_V[1] - .08], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .006], color: '#f4f1ea' },
  { id: 'tap', u: [islandMiddleU - .02, islandMiddleU + .02], v: [COUNTER_V[1] - .08 - .4 - .06, COUNTER_V[1] - .08 - .4 - .02], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .28], color: '#a67c3d' },
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
 * The upper cabinets on the party wall (owner), one run of oak from the tall column to the hall wall and from 1.40 m up to the ceiling: over the base run
 * they hang 47 cm over the worktop, and over the fridge they start above it, at 1.90 m. The carcass is 0.42 m deep. The microwave (the 0.48 by 0.29
 * by 0.38 m replica of the workspace's catalogue) is in an open bay next to the fridge, with a door over it; over the cooktop there is no cabinet but the
 * extractor hood (owner's picture: a stainless steel chimney hood, a pyramid canopy under a square duct to the ceiling), centred on it. The microwave stands
 * 4 cm off the wall, leaving room for the plug of the outlet behind it, whose centre is 1.5 m above the floor (owner).
 * Heights above the ground-floor level. They hang above the 1.5 m cut, so they are not in KITCHEN_BOXES.
 */
export const UPPER_CABINET = { depth: .42, bottom: 1.4, overFridge: 1.9, ceiling: FLOOR_HEIGHT - SLAB_THICKNESS, panel: .02, microwave: { width: .48, height: .29, depth: .38, gapToWall: .04 }, outletHeight: 1.5 }
/** The chimney hood: 54 cm wide (the most that fits between the hall side's cabinet and the microwave over the cooktop), 50 cm deep, its canopy's lower edge level with the cabinets' (owner), 1.40 m. */
export const HOOD = { width: .54, depth: .5, canopyBottom: UPPER_CABINET.bottom, canopyHeight: .2 }
const upperU: [number, number] = [frontU, columnU[0]]
const upperV: [number, number] = [wallV - UPPER_CABINET.depth, wallV]
const lowY = floor + UPPER_CABINET.bottom, overFridgeY = floor + UPPER_CABINET.overFridge, topY = floor + UPPER_CABINET.ceiling
const P = UPPER_CABINET.panel
const microwaveU: [number, number] = [fridgeU[0] - .01 - UPPER_CABINET.microwave.width, fridgeU[0] - .01]
const microwaveY: [number, number] = [lowY + P + .01, lowY + P + .01 + UPPER_CABINET.microwave.height]
const microwaveV: [number, number] = [wallV - UPPER_CABINET.microwave.gapToWall - UPPER_CABINET.microwave.depth, wallV - UPPER_CABINET.microwave.gapToWall]
const shelfY = microwaveY[1] + .04
const front: [number, number] = [upperV[0], upperV[0] + P]
const hoodCentre = frontU + S.stoveFromHall + S.cooktopWidth / 2
const hoodU: [number, number] = [hoodCentre - HOOD.width / 2, hoodCentre + HOOD.width / 2]
const bayU: [number, number] = [hoodU[1], fridgeU[0]]
const INOX = '#b9bdc2', DOOR = '#e2cba5'
export const MICROWAVE_CENTRE_U = (microwaveU[0] + microwaveU[1]) / 2
const canopyY = floor + HOOD.canopyBottom
export const KITCHEN_UPPER_BOXES: KitchenBox[] = [
  // The backsplash (owner): a slab of Toscana Vena on the wall, from the worktop to the underside of the cabinets and the hood, along the whole base run, 2 cm thick. Its pattern runs across its face.
  { id: 'backsplash', u: baseU, v: [wallV - .02, wallV], y: [floor + S.baseHeight + S.worktop, lowY], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB, wall: true },
  // The hall side's cabinet, up to the hood.
  { id: 'upper-bottom', u: [upperU[0], hoodU[0]], v: upperV, y: [lowY, lowY + P], color: OAK },
  { id: 'upper-top', u: [upperU[0], hoodU[0]], v: upperV, y: [topY - P, topY], color: OAK },
  { id: 'upper-door', u: [upperU[0] + .005, hoodU[0] - .005], v: front, y: [lowY + .005, topY - .005], color: DOOR },
  // The microwave's bay, between the hood and the fridge: a closed part beside the hood, a divider, and the open niche next to the fridge with the shelf and the door over it.
  { id: 'upper-bay-bottom', u: bayU, v: upperV, y: [lowY, lowY + P], color: OAK },
  { id: 'upper-bay-top', u: bayU, v: upperV, y: [topY - P, topY], color: OAK },
  { id: 'upper-door-beside-microwave', u: [bayU[0] + .005, microwaveU[0] - .01 - P - .005], v: front, y: [lowY + .005, topY - .005], color: DOOR },
  { id: 'upper-divider', u: [microwaveU[0] - .01 - P, microwaveU[0] - .01], v: upperV, y: [lowY + P, topY - P], color: OAK },
  { id: 'upper-shelf', u: [microwaveU[0] - .01, bayU[1]], v: upperV, y: [shelfY, shelfY + P], color: OAK },
  { id: 'upper-door-over-microwave', u: [microwaveU[0] - .01 + .005, bayU[1] - .005], v: front, y: [shelfY + P + .005, topY - .005], color: DOOR },
  // Over the fridge, starting above it.
  { id: 'upper-bridge-bottom', u: [fridgeU[0], upperU[1]], v: upperV, y: [overFridgeY, overFridgeY + P], color: OAK },
  { id: 'upper-bridge-top', u: [fridgeU[0], upperU[1]], v: upperV, y: [topY - P, topY], color: OAK },
  { id: 'upper-door-over-fridge', u: [fridgeU[0] + .005, upperU[1] - .005], v: front, y: [overFridgeY + P + .005, topY - .005], color: DOOR },
  // The microwave is a Blender model too (scripts/blender/jobs/microwave-job.json): a black Samsung with its glass door on the left and the controls on the right.
  { id: 'microwave', u: microwaveU, v: microwaveV, y: microwaveY, color: '#0c0d0f' },
  // The hood: a Blender model (scripts/blender/jobs/kitchen-hood-job.json) standing in a box that is its size, from the canopy's lower edge, level with the cabinets', to the ceiling.
  { id: 'hood', u: hoodU, v: [wallV - HOOD.depth, wallV], y: [canopyY, topY], color: INOX },
]

/**
 * The tall column at the rear (owner: not a broom closet but a breakfast nook, "rincón desayunador"): it opens with a single door on the aisle side, hinged on the rear wall's side, and holds
 * a Nespresso Vertuo Next on the shelf at the worktops' height and, behind it, an outlet at the same height as the one on the resting worktop (1.10 m); several more shelves above and below.
 * The closed column is the plain box in KITCHEN_BOXES; these are what it shows when its door is open. Heights above the ground-floor level.
 */
export const NOOK = { panel: .02, shelf: .025, shelfHeights: [.45, S.baseHeight + S.worktop, 1.5, 1.85, 2.15], top: 2.4, outletHeight: 1.1, doorSwing: Math.PI / 2, machine: { width: .142, height: .314, depth: .426, fromFront: .07 } }
const nookV: [number, number] = [wallV - S.columnDepth, wallV]
const nookInnerU: [number, number] = [columnU[0] + NOOK.panel, columnU[1] - NOOK.panel]
const nookTopY = floor + NOOK.top
export const NOOK_CENTRE_U = (columnU[0] + columnU[1]) / 2
const nookCounterTop = floor + NOOK.shelfHeights[1]
export const KITCHEN_NOOK_BOXES: KitchenBox[] = [
  { id: 'nook-side-low', u: [columnU[0], columnU[0] + NOOK.panel], v: nookV, y: [floor, nookTopY], color: '#4b4d50' },
  { id: 'nook-side-high', u: [columnU[1] - NOOK.panel, columnU[1]], v: nookV, y: [floor, nookTopY], color: '#4b4d50' },
  { id: 'nook-top', u: nookInnerU, v: nookV, y: [nookTopY - NOOK.panel, nookTopY], color: '#4b4d50' },
  { id: 'nook-plinth', u: nookInnerU, v: nookV, y: [floor, floor + .08], color: '#4b4d50' },
  ...NOOK.shelfHeights.map((height, index): KitchenBox => ({ id: `nook-shelf-${index + 1}`, u: nookInnerU, v: [nookV[0] + NOOK.panel, nookV[1]], y: [floor + height - NOOK.shelf, floor + height], color: index === 1 ? '#a98456' : '#6a6d71' })),
  // The door, with its handle: both swing about the hinge, which is on the rear wall's side (the higher u edge).
  { id: 'nook-door', u: columnU, v: [nookV[0], nookV[0] + NOOK.panel], y: [floor + .005, nookTopY - .005], color: '#4b4d50' },
  { id: 'nook-handle', u: [columnU[0] + .03, columnU[0] + .045], v: [nookV[0] - .025, nookV[0]], y: [floor + 1.0, floor + 1.4], color: '#c9cdd1' },
  // The machine, on the worktops' shelf, in the middle, 7 cm from the door; the Blender model of scripts/blender/jobs/nespresso-job.json.
  { id: 'nook-machine', u: [NOOK_CENTRE_U - NOOK.machine.width / 2, NOOK_CENTRE_U + NOOK.machine.width / 2], v: [nookV[0] + NOOK.machine.fromFront, nookV[0] + NOOK.machine.fromFront + NOOK.machine.depth], y: [nookCounterTop, nookCounterTop + NOOK.machine.height], color: '#18191b' },
]

/**
 * The island's canopy (owner's idea): a fluted oak, in an L, that climbs the wall behind the island and turns over it as a lowered ceiling, the "techito". The slats are 24 mm wide on a 30 mm pitch and
 * 18 mm thick, over a dark backing board that shows in the grooves; on the wall they run up and under the canopy they run out from the wall, so the line of each one goes round the corner. The ceiling
 * over the island drops to 2.40 m, 1.47 m over the worktop, and above it stands a drywall box, the "cajón", white, up to the real ceiling at 3.00 m. Three recessed downlights in the wood, in
 * a row along the island's middle, light the worktop; the island's two outlets sit on the wood. Heights above the ground-floor level. They hang above the 1.5 m cut, so they are not in KITCHEN_BOXES.
 */
export const ISLAND_CANOPY = { soffit: 2.4, ceiling: FLOOR_HEIGHT - SLAB_THICKNESS, slat: .024, pitch: .03, slatDepth: .018, backing: .012, light: { diameter: .09, count: 3, from: .4, to: 1.8 } }
export const ISLAND_CANOPY_WALL = ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing
export type IslandPiece = KitchenBox & { glow?: boolean; round?: boolean; opacity?: number }
const islandTop = KITCHEN_BOXES.find(box => box.id === 'counter-top')!
const canopyU: [number, number] = islandTop.u, canopyV: [number, number] = islandTop.v
const canopySoffit = floor + ISLAND_CANOPY.soffit, canopyTop = floor + ISLAND_CANOPY.ceiling
const slatCount = Math.floor((canopyV[1] - canopyV[0]) / ISLAND_CANOPY.pitch)
const slatStart = canopyV[0] + ((canopyV[1] - canopyV[0]) - slatCount * ISLAND_CANOPY.pitch) / 2 + (ISLAND_CANOPY.pitch - ISLAND_CANOPY.slat) / 2
const OAKS = ['#b98a5a', '#c4966a', '#ae7f50']
const wallFaceU = canopyU[0] + ISLAND_CANOPY_WALL
export const ISLAND_LIGHT_POSITIONS: { u: number; v: number }[] = Array.from({ length: ISLAND_CANOPY.light.count }, (_, index) => ({
  u: canopyU[0] + ISLAND_CANOPY.light.from + (ISLAND_CANOPY.light.to - ISLAND_CANOPY.light.from) * index / (ISLAND_CANOPY.light.count - 1),
  v: (COUNTER_V[0] + COUNTER_V[1]) / 2,
}))
const drywallU: [number, number] = [canopyU[0], canopyU[1] - .03], drywallV: [number, number] = [canopyV[0] + .03, canopyV[1] - .03]
const ledY: [number, number] = [canopySoffit + ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing, canopySoffit + ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing + .008]
const LED = '#ffcf8a'
function ledSides(): IslandPiece[] {
  const strip = .012, gap = .006, wash = .002, reach = .26
  return [
    { id: 'canopy-led-front', u: drywallU, v: [drywallV[0] - gap - strip, drywallV[0] - gap], y: ledY, color: LED, glow: true },
    { id: 'canopy-led-aisle', u: drywallU, v: [drywallV[1] + gap, drywallV[1] + gap + strip], y: ledY, color: LED, glow: true },
    { id: 'canopy-led-end', u: [drywallU[1] + gap, drywallU[1] + gap + strip], v: [drywallV[0] - gap - strip, drywallV[1] + gap + strip], y: ledY, color: LED, glow: true },
    // The wash: a warm, see-through skin over each of the three white faces, from the strip up.
    { id: 'canopy-wash-front', u: drywallU, v: [drywallV[0] - wash, drywallV[0]], y: [ledY[1], ledY[1] + reach], color: LED, glow: true, opacity: .22 },
    { id: 'canopy-wash-aisle', u: drywallU, v: [drywallV[1], drywallV[1] + wash], y: [ledY[1], ledY[1] + reach], color: LED, glow: true, opacity: .22 },
    { id: 'canopy-wash-end', u: [drywallU[1], drywallU[1] + wash], v: drywallV, y: [ledY[1], ledY[1] + reach], color: LED, glow: true, opacity: .22 },
  ]
}
export const ISLAND_CANOPY_BOXES: IslandPiece[] = [
  // The backing boards: on the wall, from the worktop up to the lowered ceiling; and over the island, above the slats.
  { id: 'canopy-wall-backing', u: [canopyU[0], canopyU[0] + ISLAND_CANOPY.backing], v: canopyV, y: [floor + S.baseHeight + S.worktop, canopySoffit + ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing], color: '#2e2620' },
  { id: 'canopy-soffit-backing', u: canopyU, v: canopyV, y: [canopySoffit + ISLAND_CANOPY.slatDepth, canopySoffit + ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing], color: '#2e2620' },
  ...Array.from({ length: slatCount }, (_, index): IslandPiece[] => {
    const v: [number, number] = [slatStart + index * ISLAND_CANOPY.pitch, slatStart + index * ISLAND_CANOPY.pitch + ISLAND_CANOPY.slat], color = OAKS[index % OAKS.length]
    return [
      // On the wall the slats run up, from the worktop to the soffit's underside; under the canopy they run out from the wall to the island's far end.
      { id: `canopy-wall-slat-${index + 1}`, u: [canopyU[0] + ISLAND_CANOPY.backing, wallFaceU], v, y: [floor + S.baseHeight + S.worktop, canopySoffit + ISLAND_CANOPY.slatDepth], color },
      { id: `canopy-soffit-slat-${index + 1}`, u: [wallFaceU, canopyU[1]], v, y: [canopySoffit, canopySoffit + ISLAND_CANOPY.slatDepth], color },
    ]
  }).flat(),
  // The drywall box over the wood, painted white, up to the ceiling: set in 3 cm all round so the wood's edge shows.
  { id: 'canopy-drywall', u: drywallU, v: drywallV, y: [canopySoffit + ISLAND_CANOPY.slatDepth + ISLAND_CANOPY.backing, canopyTop], color: '#f1efe9' },
  // The light line: a warm LED strip on the 3 cm of wood left bare round the drywall box, against its foot on the three open sides, and a faint wash of light up the white faces.
  ...ledSides(),
  // The downlights, recessed in the wood and lit.
  ...ISLAND_LIGHT_POSITIONS.map((at, index): IslandPiece => ({ id: `canopy-light-${index + 1}`, u: [at.u - ISLAND_CANOPY.light.diameter / 2, at.u + ISLAND_CANOPY.light.diameter / 2], v: [at.v - ISLAND_CANOPY.light.diameter / 2, at.v + ISLAND_CANOPY.light.diameter / 2], y: [canopySoffit - .004, canopySoffit + .002], color: '#fff2d9', glow: true, round: true })),
]

/**
 * The island's light switch (owner's request): a single plate on the oak, between the two outlets, at the same height as them, with a rocker and a small light that shows when the lights are on. A visitor aims at
 * it and presses E to switch the three downlights and the light line off and on; they start on. It is a device of its own, `island-switch-plate`.
 */
export const ISLAND_SWITCH_ID = 'island-switch-plate'
const switchFace = canopyU[0] + ISLAND_CANOPY_WALL, switchV = (COUNTER_V[0] + COUNTER_V[1]) / 2, switchY = floor + 1.1
export const ISLAND_SWITCH_BOXES: IslandPiece[] = [
  { id: 'switch-plate', u: [switchFace, switchFace + .008], v: [switchV - .036, switchV + .036], y: [switchY - .036, switchY + .036], color: '#212326' },
  { id: 'switch-rocker', u: [switchFace + .008, switchFace + .011], v: [switchV - .014, switchV + .014], y: [switchY - .024, switchY + .024], color: '#e8e8e4' },
  { id: 'switch-dot', u: [switchFace + .008, switchFace + .0085], v: [switchV + .024, switchV + .029], y: [switchY + .024, switchY + .029], color: '#ffcf8a', glow: true },
]

/**
 * The kitchen's conduit box (owner): the electrical conduits travel in a drywall "cajón" that runs the whole length of the wall facing the window, the one behind the bathroom, under the ceiling, from
 * the TV wall to the upper cabinets. It is 25 cm deep and 25 cm tall, white, and it crosses the island's box, which comes out of it at right angles. Heights above the ground-floor level. It hangs
 * above the 1.5 m cut, so it is not in KITCHEN_BOXES.
 */
export const KITCHEN_CONDUIT_BOX = { depth: .25, height: .25 }
const conduitU: [number, number] = [frontU, frontU + KITCHEN_CONDUIT_BOX.depth]
const conduitV: [number, number] = [KITCHEN_LIVING.v[0], upperV[0]]
const conduitY: [number, number] = [floor + ISLAND_CANOPY.ceiling - KITCHEN_CONDUIT_BOX.height, floor + ISLAND_CANOPY.ceiling]
/**
 * Recessed LED downlights in the underside of the conduit box (owner), one every metre along it, in the middle of its depth. Where the island's box crosses it there is no underside to light, so there
 * are none there; each side of the crossing is spaced on its own.
 */
export const CONDUIT_LIGHT = { diameter: .09, pitch: 1 }
export const CONDUIT_LIGHT_POSITIONS: { u: number; v: number }[] = (() => {
  const island: [number, number] = [canopyV[0] - .1, canopyV[1] + .1], found: { u: number; v: number }[] = []
  for (const [from, to] of [[conduitV[0], island[0]], [island[1], conduitV[1]]] as [number, number][]) {
    const length = to - from, count = Math.max(1, Math.round(length / CONDUIT_LIGHT.pitch))
    for (let index = 0; index < count; index++) found.push({ u: (conduitU[0] + conduitU[1]) / 2, v: from + length * (index + .5) / count })
  }
  return found
})()
export const KITCHEN_CONDUIT_BOXES: IslandPiece[] = [
  { id: 'conduit-box', u: conduitU, v: conduitV, y: conduitY, color: '#f1efe9' },
  ...CONDUIT_LIGHT_POSITIONS.map((at, index): IslandPiece => ({ id: `conduit-light-${index + 1}`, u: [at.u - CONDUIT_LIGHT.diameter / 2, at.u + CONDUIT_LIGHT.diameter / 2], v: [at.v - CONDUIT_LIGHT.diameter / 2, at.v + CONDUIT_LIGHT.diameter / 2], y: [conduitY[0] - .004, conduitY[0] + .002], color: '#fff2d9', glow: true, round: true })),
]

/**
 * The switch of the conduit box's lights (owner), beside the door that comes into the kitchen from the stair's hall: on the kitchen's side of the wall, a hand's width past the door's edge on the
 * latch side (away from the hinge), 1.10 m up, facing the kitchen (higher u). Like the island's, it is a device of its own, `kitchen-switch-plate`; the lights start on.
 */
export const KITCHEN_SWITCH_ID = 'kitchen-switch-plate'
const kitchenSwitchV = LIVING_DOOR.v[1] + .14, kitchenSwitchY = floor + 1.1
export const KITCHEN_SWITCH_BOXES: IslandPiece[] = [
  { id: 'switch-plate', u: [frontU, frontU + .008], v: [kitchenSwitchV - .036, kitchenSwitchV + .036], y: [kitchenSwitchY - .036, kitchenSwitchY + .036], color: '#f3f2ee' },
  { id: 'switch-rocker', u: [frontU + .008, frontU + .011], v: [kitchenSwitchV - .014, kitchenSwitchV + .014], y: [kitchenSwitchY - .024, kitchenSwitchY + .024], color: '#d9d8d3' },
  { id: 'switch-dot', u: [frontU + .008, frontU + .0085], v: [kitchenSwitchV + .024, kitchenSwitchV + .029], y: [kitchenSwitchY + .024, kitchenSwitchY + .029], color: '#ffcf8a', glow: true },
]
/** The conduit box's lights are on unless a visit has switched them off: the switch's own openness, 1 on and 0 off. */
export const conduitLightsOn = (states: Readonly<Record<string, number>>) => (states[KITCHEN_SWITCH_ID] ?? 1) >= .5
