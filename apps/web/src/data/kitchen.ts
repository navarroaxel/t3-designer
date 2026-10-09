import { FLOOR_HEIGHT } from './building-site.ts'
import { CUT_HEIGHT, KITCHEN_LIVING, LIVING_DOOR, SLAB_THICKNESS, WALL_PAINT, TOSCANA_VENA_COLOR, TOSCANA_VENA_SLAB, type TilePattern } from './house-plan.ts'

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
  // The island's top is 2.20 by 1.00 m and its cabinets 0.70 m deep (owner): the top stands 0.28 m out toward the stools, and 2 cm out on the aisle side and the end.
  counterDepth: .7, counterTopDepth: 1, counterLength: 2.2, aisle: 1.1, stoveFromHall: .45, ovenWidth: .55, cooktopWidth: .58, topOverhang: .02, plinthHeight: .1, plinthRecess: .05, stool: .4, stoolHeight: .85,
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
// The dishwasher stands near the wall, 2 cm off it for the cabinet's side (at least 1 cm, owner), 45 cm wide; the sink is as near to the wall as it can be without being over it, 6 cm past the dishwasher, and the tap is centred on the sink (owner), on its long side away from the oven.
const dishwasherEnd = counterU[0] + .02 + .45
const sinkU: [number, number] = [dishwasherEnd + .06, islandMiddleU + .03]
const sinkMiddleU = (sinkU[0] + sinkU[1]) / 2
// The island's top is 2.20 m long from the wall; its cabinets stop 2 cm short of its open end.
const cabinetU: [number, number] = [counterU[0], counterU[1] - S.topOverhang]
const stoolCentres = [0, 1, 2].map(index => counterU[0] + S.counterLength * (index + .5) / 3)

const PLINTH = '#2f3033', OAK = '#d8bf98', SILVER = '#c9cdd1', SIDE_GREY = '#8e9297', WHITE = '#e9e7e2', STOOL = '#cdb07a'

export const KITCHEN_BOXES: KitchenBox[] = [
  // The tall column stands on the same plinth, set back on its front (owner: the cabinets rest on it).
  { id: 'column', u: columnU, v: [wallV - S.columnDepth, wallV], y: [floor + S.plinthHeight, cut], color: OAK },
  { id: 'column-plinth', u: columnU, v: [wallV - S.columnDepth + S.plinthRecess, wallV], y: [floor, floor + S.plinthHeight], color: PLINTH },
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
  // The base cabinets stand on a plinth, the "banquina" (owner: the cabinets rest on it, at least 2 cm back): 10 cm tall and set 5 cm back from the fronts, so that a visitor's toes go under the cabinet.
  { id: 'base', u: baseU, v: baseV, y: [floor + S.plinthHeight, floor + S.baseHeight], color: OAK },
  { id: 'base-plinth', u: baseU, v: [baseV[0] + S.plinthRecess, baseV[1]], y: [floor, floor + S.plinthHeight], color: PLINTH },
  { id: 'worktop', u: baseU, v: [baseV[0] - S.topOverhang, baseV[1]], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The oven is built into the base, with its front on the aisle side, and the cooktop sits on the worktop above it: both start
  // 45 cm from the wall behind the bathroom (owner), which the hall shares.
  { id: 'oven', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.ovenWidth], v: [baseV[0] - .015, baseV[0]], y: [floor + .25, floor + .8], color: '#2b2c2e' },
  { id: 'cooktop', u: [frontU + S.stoveFromHall, frontU + S.stoveFromHall + S.cooktopWidth], v: [baseV[0] + .05, baseV[0] + .55], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .01], color: '#111213' },
  { id: 'counter', u: cabinetU, v: COUNTER_V, y: [floor + S.plinthHeight, floor + S.baseHeight], color: WHITE },
  // The island's plinth is set back on the three sides that are free: the front, the aisle side and the open end; the fourth is the wall.
  { id: 'counter-plinth', u: [counterU[0], cabinetU[1] - S.plinthRecess], v: [COUNTER_V[0] + S.plinthRecess, COUNTER_V[1] - S.plinthRecess], y: [floor, floor + S.plinthHeight], color: PLINTH },
  { id: 'counter-top', u: counterU, v: [COUNTER_V[1] + S.topOverhang - S.counterTopDepth, COUNTER_V[1] + S.topOverhang], y: [floor + S.baseHeight, floor + S.baseHeight + S.worktop], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB },
  // The sink is in the second counter (owner), a ceramic basin flush with the top, with a brass tap at its back edge.
  { id: 'sink', u: sinkU, v: [COUNTER_V[1] - .08 - .4, COUNTER_V[1] - .08], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .006], color: '#f4f1ea' },
  { id: 'tap', u: [sinkMiddleU - .02, sinkMiddleU + .02], v: [COUNTER_V[1] - .08 - .4 - .06, COUNTER_V[1] - .08 - .4 - .02], y: [floor + S.baseHeight + S.worktop, floor + S.baseHeight + S.worktop + .28], color: '#a67c3d' },
  ...stoolCentres.map((centre, index) => ({
    id: `stool-${index + 1}`, u: [centre - S.stool / 2, centre + S.stool / 2] as [number, number],
    v: [COUNTER_V[1] + S.topOverhang - S.counterTopDepth + .05 - S.stool, COUNTER_V[1] + S.topOverhang - S.counterTopDepth + .05] as [number, number],
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
 * The upper cabinets on the party wall (owner), one run of oak from the tall column to the hall wall and from 1.40 m up to the underside of the conduit box, which carries on over them along the wall (KITCHEN_CONDUIT_BOXES): over the base run
 * they hang 47 cm over the worktop, and over the fridge they start above it, at 1.90 m. The carcass is 0.42 m deep. The microwave (the 0.48 by 0.29
 * by 0.38 m replica of the workspace's catalogue) is in an open bay next to the fridge, with a door over it; over the cooktop there is no cabinet but the
 * extractor hood (owner's picture: a stainless steel chimney hood, a pyramid canopy under a square duct, which goes up into the conduit box), centred on it. The microwave stands
 * 4 cm off the wall, leaving room for the plug of the outlet behind it, whose centre is 1.5 m above the floor (owner).
 * Heights above the ground-floor level. They hang above the 1.5 m cut, so they are not in KITCHEN_BOXES.
 */
/** The conduit box's section (owner): 25 cm deep along the hall wall, 25 cm tall under the ceiling; along the party wall it is as deep as the cabinets, so it carries on their line. */
export const KITCHEN_CONDUIT_BOX = { depth: .25, height: .25 }
export const UPPER_CABINET = { depth: .42, bottom: 1.4, overFridge: 1.9, ceiling: FLOOR_HEIGHT - SLAB_THICKNESS, panel: .02, microwave: { width: .48, height: .29, depth: .38, gapToWall: .04 }, outletHeight: 1.5 }
/** The chimney hood: 54 cm wide (the most that fits between the hall side's cabinet and the microwave over the cooktop), 50 cm deep, its canopy's lower edge level with the cabinets' (owner), 1.40 m. */
export const HOOD = { width: .54, depth: .5, canopyBottom: UPPER_CABINET.bottom, canopyHeight: .2 }
const upperU: [number, number] = [frontU, columnU[0]]
const upperV: [number, number] = [wallV - UPPER_CABINET.depth, wallV]
const lowY = floor + UPPER_CABINET.bottom, overFridgeY = floor + UPPER_CABINET.overFridge, topY = floor + UPPER_CABINET.ceiling - KITCHEN_CONDUIT_BOX.height
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
/**
 * The hall side's cabinet, over the resting worktop, is the glass-door one of the owner's picture, for the glasses, so that guests see them without opening every door: a solid door over a
 * glass-fronted section that lifts up, with a handle at its foot, a shelf inside and the glasses on it. The cabinet is only 49 cm wide, so the solid door is one leaf (owner), not two. The
 * lower section is 55 cm tall and the shelf halves it; the glasses are 7.5 cm across and 12 cm tall.
 */
export const GLASS_CABINET = { swing: 1.75, lower: .55, glass: { diameter: .075, height: .12, count: 5, pitch: .085, taper: .85 }, frame: .05, pane: .006 }
const glassU: [number, number] = [upperU[0], hoodU[0]]
const glassInner: [number, number] = [glassU[0] + .005 + GLASS_CABINET.frame, glassU[1] - .005 - GLASS_CABINET.frame]
const glassRail = lowY + GLASS_CABINET.lower, glassShelf = lowY + GLASS_CABINET.lower / 2
const glassMiddleU = (glassU[0] + glassU[1]) / 2
/** The glass door lifts about the rail, along u, at the door's face: a visitor aims at its pane (a device of its own) and presses E; it swings up and out, 100 degrees. */
export const GLASS_HINGE = { y: glassRail, v: front[0] }
export const GLASS_DOOR_ID = 'kitchen-upper-glass-pane'
function glassCabinetBoxes(): IslandPiece[] {
  const cups: IslandPiece[] = []
  for (const [row, base] of [lowY + P, glassShelf + P].entries()) {
    const start = glassMiddleU - (GLASS_CABINET.glass.count - 1) * GLASS_CABINET.glass.pitch / 2
    for (let index = 0; index < GLASS_CABINET.glass.count; index++) {
      const u = start + index * GLASS_CABINET.glass.pitch, v = (upperV[0] + upperV[1]) / 2 - .02
      cups.push({ id: `upper-glass-cup-${row * GLASS_CABINET.glass.count + index + 1}`, u: [u - GLASS_CABINET.glass.diameter / 2, u + GLASS_CABINET.glass.diameter / 2], v: [v - GLASS_CABINET.glass.diameter / 2, v + GLASS_CABINET.glass.diameter / 2], y: [base, base + GLASS_CABINET.glass.height], color: '#dcecef', round: true, opacity: .45 })
    }
  }
  const bar = (id: string, u: [number, number], y: [number, number]): IslandPiece => ({ id, u, v: front, y, color: DOOR })
  return [
    // The rail between the two sections, the shelf inside the lower one and the side against the hood.
    { id: 'upper-glass-rail', u: glassU, v: upperV, y: [glassRail, glassRail + P], color: OAK },
    { id: 'upper-glass-shelf', u: glassU, v: upperV, y: [glassShelf, glassShelf + P], color: OAK },
    { id: 'upper-glass-side', u: [glassU[1] - P, glassU[1]], v: upperV, y: [lowY + P, topY - P], color: OAK },
    // The solid door over it: one leaf, with its handle at the foot.
    { id: 'upper-door', u: [glassU[0] + .005, glassU[1] - .005], v: front, y: [glassRail + P + .005, topY - .005], color: DOOR },
    { id: 'upper-door-handle', u: [glassMiddleU - .05, glassMiddleU + .05], v: [front[0] - .012, front[0]], y: [glassRail + P + .03, glassRail + P + .038], color: '#c9cdd1' },
    // The glass door that lifts: a frame all round, the pane in it and a handle at its foot.
    bar('upper-glass-frame-top', [glassU[0] + .005, glassU[1] - .005], [glassRail - GLASS_CABINET.frame, glassRail - .005]),
    bar('upper-glass-frame-bottom', [glassU[0] + .005, glassU[1] - .005], [lowY + .005, lowY + .005 + GLASS_CABINET.frame]),
    bar('upper-glass-frame-left', [glassU[0] + .005, glassInner[0]], [lowY + .005 + GLASS_CABINET.frame, glassRail - GLASS_CABINET.frame]),
    bar('upper-glass-frame-right', [glassInner[1], glassU[1] - .005], [lowY + .005 + GLASS_CABINET.frame, glassRail - GLASS_CABINET.frame]),
    { id: 'upper-glass-pane', u: glassInner, v: [front[0] + .007, front[0] + .007 + GLASS_CABINET.pane], y: [lowY + .005 + GLASS_CABINET.frame, glassRail - GLASS_CABINET.frame], color: '#c4dadf', opacity: .32 },
    { id: 'upper-glass-handle', u: [glassMiddleU - .05, glassMiddleU + .05], v: [front[0] - .012, front[0]], y: [lowY + .012, lowY + .02], color: '#c9cdd1' },
    ...cups,
  ]
}
export const KITCHEN_UPPER_BOXES: IslandPiece[] = [
  // The island's cover, a "tapa" of Toscana Vena on its open end (owner, to compare: X takes it away and puts it back): a 2 cm slab, the top's whole width (1 m), from the floor to the top, flush with the top's end, like a waterfall edge.
  { id: 'island-cheek', u: [cabinetU[1], counterU[1]], v: [COUNTER_V[1] + S.topOverhang - S.counterTopDepth, COUNTER_V[1] + S.topOverhang], y: [floor, floor + S.baseHeight], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB, wall: true },
  // The backsplash (owner): a slab of Toscana Vena on the wall, from the worktop to the underside of the cabinets and the hood, along the whole base run, 2 cm thick. Its pattern runs across its face.
  { id: 'backsplash', u: baseU, v: [wallV - .02, wallV], y: [floor + S.baseHeight + S.worktop, lowY], color: TOSCANA_VENA_COLOR, pattern: TOSCANA_VENA_SLAB, wall: true },
  // The hall side's cabinet, up to the hood: the glass-door one, for the glasses.
  { id: 'upper-bottom', u: [upperU[0], hoodU[0]], v: upperV, y: [lowY, lowY + P], color: OAK },
  { id: 'upper-top', u: [upperU[0], hoodU[0]], v: upperV, y: [topY - P, topY], color: OAK },
  ...glassCabinetBoxes(),
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
  // The hood: a Blender model (scripts/blender/jobs/kitchen-hood-job.json) standing in a box that is its size, from the canopy's lower edge, level with the cabinets', to the underside of the conduit box: its duct goes on inside the box.
  { id: 'hood', u: hoodU, v: [wallV - HOOD.depth, wallV], y: [canopyY, topY], color: INOX },
]

/**
 * The tall column at the rear (owner: not a broom closet but a breakfast nook, "rincón desayunador"), as tall as the cabinets, up to the underside of the conduit box: it opens with a single door on the aisle side, hinged on the rear wall's side, and holds
 * a Nespresso Vertuo Next on the shelf at the worktops' height and, behind it, an outlet at the same height as the one on the resting worktop (1.10 m); several more shelves above and below.
 * The whole nook is oak, like the cabinets (owner). The closed column is the plain box in KITCHEN_BOXES; these are what it shows when its door is open. Heights above the ground-floor level.
 */
export const NOOK = { panel: .02, shelf: .025, shelfHeights: [.45, S.baseHeight + S.worktop, 1.5, 1.85, 2.15, 2.45], top: UPPER_CABINET.ceiling - KITCHEN_CONDUIT_BOX.height, outletHeight: 1.1, doorSwing: Math.PI / 2, machine: { width: .142, height: .314, depth: .426, fromFront: .07 } }
const nookV: [number, number] = [wallV - S.columnDepth, wallV]
const nookInnerU: [number, number] = [columnU[0] + NOOK.panel, columnU[1] - NOOK.panel]
const nookTopY = floor + NOOK.top
export const NOOK_CENTRE_U = (columnU[0] + columnU[1]) / 2
const nookCounterTop = floor + NOOK.shelfHeights[1]
export const CUP = { diameter: .085, height: .08, handle: .02, pitchU: .12, rows: [.16, .32] as const, taper: .75 }
function cupBoxes(): IslandPiece[] {
  const shelfTop = floor + NOOK.shelfHeights[2], cups: IslandPiece[] = []
  for (const [row, offset] of CUP.rows.entries()) {
    for (const [column, across] of [-1, 0, 1].entries()) {
      const u = NOOK_CENTRE_U + across * CUP.pitchU, v = nookV[0] + NOOK.panel + offset, color = (row + column) % 3 === 2 ? '#c7d3d6' : '#f3f1ec'
      cups.push({ id: `nook-cup-${row * 3 + column + 1}`, u: [u - CUP.diameter / 2, u + CUP.diameter / 2], v: [v - CUP.diameter / 2, v + CUP.diameter / 2], y: [shelfTop, shelfTop + CUP.height], color, round: true })
      cups.push({ id: `nook-cup-handle-${row * 3 + column + 1}`, u: [u + CUP.diameter / 2 - .004, u + CUP.diameter / 2 + CUP.handle], v: [v - .004, v + .004], y: [shelfTop + CUP.height * .3, shelfTop + CUP.height * .8], color })
    }
  }
  return cups
}
export const KITCHEN_NOOK_BOXES: IslandPiece[] = [
  { id: 'nook-side-low', u: [columnU[0], columnU[0] + NOOK.panel], v: nookV, y: [floor + S.plinthHeight, nookTopY], color: OAK },
  { id: 'nook-side-high', u: [columnU[1] - NOOK.panel, columnU[1]], v: nookV, y: [floor + S.plinthHeight, nookTopY], color: OAK },
  { id: 'nook-top', u: nookInnerU, v: nookV, y: [nookTopY - NOOK.panel, nookTopY], color: OAK },
  { id: 'nook-plinth', u: nookInnerU, v: nookV, y: [floor + S.plinthHeight, floor + S.plinthHeight + NOOK.panel], color: OAK },
  ...NOOK.shelfHeights.map((height, index): KitchenBox => ({ id: `nook-shelf-${index + 1}`, u: nookInnerU, v: [nookV[0] + NOOK.panel, nookV[1]], y: [floor + height - NOOK.shelf, floor + height], color: OAK })),
  // The door, with its handle: both swing about the hinge, which is on the rear wall's side (the higher u edge).
  { id: 'nook-door', u: columnU, v: [nookV[0], nookV[0] + NOOK.panel], y: [floor + S.plinthHeight + .005, nookTopY - .005], color: OAK },
  { id: 'nook-handle', u: [columnU[0] + .03, columnU[0] + .045], v: [nookV[0] - .025, nookV[0]], y: [floor + 1.0, floor + 1.4], color: '#c9cdd1' },
  // The coffee and tea cups, on the shelf over the machine (owner): two rows of three, white, a little narrower at the foot, each with its handle.
  ...cupBoxes(),
  // The machine, on the worktops' shelf, in the middle, 7 cm from the door; the Blender model of scripts/blender/jobs/nespresso-job.json.
  { id: 'nook-machine', u: [NOOK_CENTRE_U - NOOK.machine.width / 2, NOOK_CENTRE_U + NOOK.machine.width / 2], v: [nookV[0] + NOOK.machine.fromFront, nookV[0] + NOOK.machine.fromFront + NOOK.machine.depth], y: [nookCounterTop, nookCounterTop + NOOK.machine.height], color: '#18191b' },
]

/**
 * The island's canopy: a lowered ceiling over the island, the "techito", all drywall now (owner: the wood, first a fluted oak and then a walnut-like board, is out): a slab 10 cm thick whose
 * underside is at the height of the conduit box's, 2.75 m (owner), 1.82 m over the worktop, and above it, set in 3 cm all round, the drywall box, the "cajón", up to the real ceiling at 3.00 m. The 3 cm of the slab left bare round the box carry the
 * light line, a warm LED strip (no painted wash up the box's faces: owner). Three pendant lamps (owner: instead of recessed downlights), black domes on cords hung from the slab's underside in a row along the island's middle, 0.95 m down, their rims 0.80 m over the worktop, light it. The island's two outlets and
 * its switch are on the wall, which is plain again. Heights above the ground-floor level. They hang above the 1.5 m cut, so they are not in KITCHEN_BOXES.
 */
export const ISLAND_CANOPY = { soffit: UPPER_CABINET.ceiling - KITCHEN_CONDUIT_BOX.height, slab: .1, ceiling: FLOOR_HEIGHT - SLAB_THICKNESS, light: { diameter: .3, count: 3, from: .4, to: 1.8, drop: .95 } }
/** What stood out of the wall behind the island: nothing, now that the wood is out; the outlets and the switch are on the wall itself. */
export const ISLAND_CANOPY_WALL = 0
export type IslandPiece = KitchenBox & { glow?: boolean; round?: boolean; opacity?: number; grain?: 'walnut'; model?: string }
const islandTop = KITCHEN_BOXES.find(box => box.id === 'counter-top')!
const canopyU: [number, number] = islandTop.u, canopyV: [number, number] = islandTop.v
/** The island's axis across its 1 m top (owner: the outlets, the switch and the lights are symmetric about it). */
export const ISLAND_AXIS_V = (canopyV[0] + canopyV[1]) / 2
const canopySoffit = floor + ISLAND_CANOPY.soffit, canopyTop = floor + ISLAND_CANOPY.ceiling
export const ISLAND_LIGHT_POSITIONS: { u: number; v: number }[] = Array.from({ length: ISLAND_CANOPY.light.count }, (_, index) => ({
  u: canopyU[0] + ISLAND_CANOPY.light.from + (ISLAND_CANOPY.light.to - ISLAND_CANOPY.light.from) * index / (ISLAND_CANOPY.light.count - 1),
  v: ISLAND_AXIS_V,
}))
const drywallU: [number, number] = [canopyU[0], canopyU[1] - .03], drywallV: [number, number] = [canopyV[0] + .03, canopyV[1] - .03]
const slabTop = canopySoffit + ISLAND_CANOPY.slab
const ledY: [number, number] = [slabTop, slabTop + .008]
const LED = '#ffcf8a'
function ledSides(): IslandPiece[] {
  const strip = .012, gap = .006
  return [
    { id: 'canopy-led-front', u: drywallU, v: [drywallV[0] - gap - strip, drywallV[0] - gap], y: ledY, color: LED, glow: true },
    { id: 'canopy-led-aisle', u: drywallU, v: [drywallV[1] + gap, drywallV[1] + gap + strip], y: ledY, color: LED, glow: true },
    { id: 'canopy-led-end', u: [drywallU[1] + gap, drywallU[1] + gap + strip], v: [drywallV[0] - gap - strip, drywallV[1] + gap + strip], y: ledY, color: LED, glow: true },
  ]
}
export const ISLAND_CANOPY_BOXES: IslandPiece[] = [
  // The slab of the lowered ceiling, white drywall, the whole of the island's top, and over it the box, set in 3 cm all round.
  { id: 'canopy-slab', u: canopyU, v: canopyV, y: [canopySoffit, slabTop], color: WALL_PAINT.partition },
  { id: 'canopy-drywall', u: drywallU, v: drywallV, y: [slabTop, canopyTop], color: WALL_PAINT.partition },
  // The light line: a warm LED strip on the 3 cm of the slab left bare round the drywall box, against its foot on the three open sides, and a faint wash of light up the white faces.
  ...ledSides(),
  // The pendant lamps: Blender models (scripts/blender/jobs/island-pendant-job.json, and `-off`), hung from the slab's underside on a cord, 0.30 m across the dome and 0.95 m from its rim to the ceiling.
  ...ISLAND_LIGHT_POSITIONS.map((at, index): IslandPiece => ({ id: `canopy-pendant-${index + 1}`, u: [at.u - ISLAND_CANOPY.light.diameter / 2, at.u + ISLAND_CANOPY.light.diameter / 2], v: [at.v - ISLAND_CANOPY.light.diameter / 2, at.v + ISLAND_CANOPY.light.diameter / 2], y: [canopySoffit - ISLAND_CANOPY.light.drop, canopySoffit], color: '#141517', model: '/models/house/island-pendant.glb' }))
]

/**
 * The island's light switch (owner's request): a single plate on the wall, between the two outlets, at the same height as them, with a rocker and a small light that shows when the lights are on. A visitor aims at
 * it and presses E to switch the three downlights and the light line off and on; they start on. It is a device of its own, `island-switch-plate`.
 */
export const ISLAND_SWITCH_ID = 'island-switch-plate'
const switchFace = canopyU[0] + ISLAND_CANOPY_WALL, switchV = ISLAND_AXIS_V, switchY = floor + 1.1
export const ISLAND_SWITCH_BOXES: IslandPiece[] = [
  { id: 'switch-plate', u: [switchFace, switchFace + .008], v: [switchV - .036, switchV + .036], y: [switchY - .036, switchY + .036], color: '#212326' },
  { id: 'switch-rocker', u: [switchFace + .008, switchFace + .011], v: [switchV - .014, switchV + .014], y: [switchY - .024, switchY + .024], color: '#e8e8e4' },
  { id: 'switch-dot', u: [switchFace + .008, switchFace + .0085], v: [switchV + .024, switchV + .029], y: [switchY + .024, switchY + .029], color: '#ffcf8a', glow: true },
]

/**
 * The kitchen's conduit box (owner): the electrical conduits travel in a drywall "cajón" that runs the whole length of the wall facing the window, the one behind the bathroom, under the ceiling, from
 * the TV wall to the party wall, and turns the corner to run along the party wall, over the kitchen, to the rear wall. It is 25 cm deep (as deep as the cabinets on the party wall) and 25 cm tall, white, and it crosses the island's box, which comes out of it at right angles. Heights above the ground-floor level. It hangs
 * above the 1.5 m cut, so it is not in KITCHEN_BOXES.
 */
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
  { id: 'conduit-box', u: conduitU, v: conduitV, y: conduitY, color: WALL_PAINT.partition },
  // It turns the corner and carries on over the cabinets, the fridge and the column, along the party wall to the rear wall, as deep as the cabinets: they end where it begins, and the hood's duct goes up inside it.
  { id: 'conduit-box-rear', u: [frontU, rearU], v: [wallV - UPPER_CABINET.depth, wallV], y: conduitY, color: WALL_PAINT.exterior },
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

/**
 * The dishwasher (owner): a Whirlpool slimline of 45 cm, stainless steel, 0.85 m tall and 0.59 m deep, in the island between the sink and the wall behind it (the hall wall), close to
 * the wall but not touching it (owner: at least 1 cm, for the carcass of the cabinet it stands in), with its door on the aisle side like the sink's, flush with the cabinets' fronts, and on the same plinth as they are (owner): its own 10 cm plinth is set 5 cm back, as theirs. It is a Blender model
 * (scripts/blender/jobs/dishwasher-job.json) standing inside the island's cabinet, of which only its door shows.
 */
export const DISHWASHER = { width: .45, height: .85, depth: .59, fromWall: .02, proud: .017, model: '/models/house/dishwasher.glb' }
export const DISHWASHER_BOX = {
  u: [counterU[0] + DISHWASHER.fromWall, counterU[0] + DISHWASHER.fromWall + DISHWASHER.width] as [number, number],
  // The model's front is the lip of its handle tray, 12 mm out of the door: its door stands 5 mm proud of the cabinets' fronts (owner: it showed no more than the tray when the door was flush),
  // so that the two do not draw on the same plane and flicker.
  v: [COUNTER_V[1] + DISHWASHER.proud - DISHWASHER.depth, COUNTER_V[1] + DISHWASHER.proud] as [number, number],
  y: [floor, floor + DISHWASHER.height] as [number, number],
}

/**
 * The fronts of the island's cabinets on the aisle side (owner), the dishwasher's side: from the wall, the dishwasher, a filler, the door under the sink, for the drain's access (one leaf, the sink's
 * width), and, to the left of the sink seen from the aisle (the open end's side), two large drawers one over the other, for the pans, the width of what is left. Each front is a 5 mm skin on
 * the cabinet's face, with a 3 mm joint round it; the doors and drawers have oak fronts like the run's and steel handles. House frame [u, v], absolute heights.
 */
export const ISLAND_FRONT = { skin: .005, joint: .003, handle: .012 }
const frontFace = COUNTER_V[1]
const frontBottom = floor + S.plinthHeight, frontTop = floor + S.baseHeight
const frontSpan = { dishwasherEnd, sinkDoor: [sinkU[0] - .005, sinkU[1] + .005] as [number, number] }
function islandFrontBoxes(): IslandPiece[] {
  const J = ISLAND_FRONT.joint, skin: [number, number] = [frontFace, frontFace + ISLAND_FRONT.skin], grip: [number, number] = [frontFace + ISLAND_FRONT.skin, frontFace + ISLAND_FRONT.skin + ISLAND_FRONT.handle]
  const drawersU: [number, number] = [frontSpan.sinkDoor[1] + J, cabinetU[1] - J]
  const middle = (frontBottom + frontTop) / 2
  const handle = (id: string, u: [number, number], y: number): IslandPiece => ({ id, u, v: grip, y: [y - .005, y + .005], color: '#c9cdd1' })
  const drawerMid = (drawersU[0] + drawersU[1]) / 2, sinkMid = (frontSpan.sinkDoor[0] + frontSpan.sinkDoor[1]) / 2
  return [
    // The filler between the dishwasher and the sink's door, and the door under the sink with its handle near the top.
    { id: 'island-filler', u: [frontSpan.dishwasherEnd + J, frontSpan.sinkDoor[0] - J], v: skin, y: [frontBottom + J, frontTop - J], color: OAK },
    { id: 'island-door-sink', u: frontSpan.sinkDoor, v: skin, y: [frontBottom + J, frontTop - J], color: OAK },
    handle('island-door-sink-handle', [sinkMid - .075, sinkMid + .075], frontTop - .06),
    // The two large drawers, one over the other, each with a long handle along its top edge.
    { id: 'island-drawer-1', u: drawersU, v: skin, y: [middle + J / 2, frontTop - J], color: OAK },
    { id: 'island-drawer-2', u: drawersU, v: skin, y: [frontBottom + J, middle - J / 2], color: OAK },
    handle('island-drawer-1-handle', [drawerMid - .2, drawerMid + .2], frontTop - .05),
    handle('island-drawer-2-handle', [drawerMid - .2, drawerMid + .2], middle - .05),
  ]
}
export const KITCHEN_ISLAND_FRONTS: IslandPiece[] = islandFrontBoxes()

/**
 * The fronts of the run's cabinets either side of the oven (owner). To its left, under the resting worktop on the hall side: three drawers one over the other, the cutlery's, a shallow one on top for the cutlery,
 * one for the utensils under it and a deep one at the foot, each 5 mm skin on the cabinet's face with a 3 mm joint and a steel handle along its top edge. The run's face is toward the lower v, so
 * the skin and the handles stand out toward the lower v. House frame [u, v], absolute heights.
 */
export const RUN_DRAWERS = { heights: [.15, .2, .37], rightHeights: [.17, .3, .3], joint: ISLAND_FRONT.joint, skin: ISLAND_FRONT.skin, handle: ISLAND_FRONT.handle }
function runDrawerBoxes(prefix: string, span: [number, number], heights: number[]): IslandPiece[] {
  const J = RUN_DRAWERS.joint, face = baseV[0], skin: [number, number] = [face - RUN_DRAWERS.skin, face], grip: [number, number] = [face - RUN_DRAWERS.skin - RUN_DRAWERS.handle, face - RUN_DRAWERS.skin]
  const u: [number, number] = [span[0] + J, span[1] - J], middle = (u[0] + u[1]) / 2, long = Math.min(.2, (u[1] - u[0]) / 2 - .05)
  const bottom = floor + S.plinthHeight, top = floor + S.baseHeight
  const total = heights.reduce((sum, height) => sum + height, 0), room = top - bottom - J * (heights.length + 1), scale = room / total
  const out: IslandPiece[] = []
  let upper = top - J
  for (const [index, height] of heights.entries()) {
    const tall = height * scale, y: [number, number] = [upper - tall, upper]
    out.push({ id: `${prefix}-${index + 1}`, u, v: skin, y, color: OAK })
    out.push({ id: `${prefix}-${index + 1}-handle`, u: [middle - long, middle + long], v: grip, y: [y[1] - .045, y[1] - .035], color: '#c9cdd1' })
    upper = y[0] - J
  }
  return out
}
// To the left of the oven (the hall side, the resting worktop's cabinet) and to the right of it (the oven's cabinet to the fridge).
const stoveEnd = frontU + S.stoveFromHall + S.cooktopWidth
export const KITCHEN_RUN_FRONTS: IslandPiece[] = [
  ...runDrawerBoxes('run-drawer', [baseU[0], frontU + S.stoveFromHall], RUN_DRAWERS.heights),
  ...runDrawerBoxes('run-right-drawer', [stoveEnd, baseU[1]], RUN_DRAWERS.rightHeights),
]

/**
 * The island's wood (owner: to compare, X takes it off and puts it on; the island starts with it): a smooth board of dark figured wood, a walnut-like one, up the wall behind the island from the
 * worktop to the lowered ceiling, and under the ceiling's slab a fluted oak, the "techito": slats 24 mm wide on a 30 mm pitch and 18 mm thick over a dark backing board that shows in the grooves,
 * running out from the wall so that each line is the board's; and the same fluted oak on the cabinets' stool side, as a panel, upright. The wood is 3 cm thick, so what is on the wall (the outlets and the switch) stands 3 cm out of it, and the pendant lamps hang from the wood's underside as from the slab's. It is a device of its own: the wall's board is what a visitor aims at.
 */
export const ISLAND_WOOD = { thickness: .03, slat: .024, pitch: .03, slatDepth: .018, backing: .012 }
export const ISLAND_WOOD_ID = 'island-canopy-wall-panel'
const slatCount = Math.floor((canopyV[1] - canopyV[0]) / ISLAND_WOOD.pitch)
const slatStart = canopyV[0] + ((canopyV[1] - canopyV[0]) - slatCount * ISLAND_WOOD.pitch) / 2 + (ISLAND_WOOD.pitch - ISLAND_WOOD.slat) / 2
const OAKS = ['#b98a5a', '#c4966a', '#ae7f50']
const woodU: [number, number] = [canopyU[0] + ISLAND_WOOD.thickness, canopyU[1]]
export const ISLAND_WOOD_BOXES: IslandPiece[] = [
  { id: 'canopy-wall-panel', u: [canopyU[0], woodU[0]], v: canopyV, y: [floor + S.baseHeight + S.worktop, canopySoffit], color: '#6b4527', grain: 'walnut' },
  { id: 'canopy-soffit-backing', u: woodU, v: canopyV, y: [canopySoffit - ISLAND_WOOD.backing, canopySoffit], color: '#2e2620' },
  ...Array.from({ length: slatCount }, (_, index): IslandPiece => {
    const v: [number, number] = [slatStart + index * ISLAND_WOOD.pitch, slatStart + index * ISLAND_WOOD.pitch + ISLAND_WOOD.slat]
    return { id: `canopy-soffit-slat-${index + 1}`, u: woodU, v, y: [canopySoffit - ISLAND_WOOD.backing - ISLAND_WOOD.slatDepth, canopySoffit - ISLAND_WOOD.backing], color: OAKS[index % OAKS.length] }
  }),
]

/**
 * The fluted oak panel on the island's stool side (owner: copied from the ceiling's, and fixed: it is not part of what X takes off): the same slats, 24 mm on a 30 mm pitch, 18 mm thick over a dark
 * backing board that shows in the grooves, upright.
 */
export const ISLAND_PANEL_BOXES: IslandPiece[] = [
  // Upright slats over a backing board on the cabinets' face, from the plinth to the top, the whole length of the cabinets.
  { id: 'panel-backing', u: cabinetU, v: [COUNTER_V[0] - ISLAND_WOOD.backing, COUNTER_V[0]], y: [floor + S.plinthHeight, floor + S.baseHeight], color: '#2e2620' },
  ...Array.from({ length: Math.floor((cabinetU[1] - cabinetU[0]) / ISLAND_WOOD.pitch) }, (_, index): IslandPiece => {
    const count = Math.floor((cabinetU[1] - cabinetU[0]) / ISLAND_WOOD.pitch), start = cabinetU[0] + ((cabinetU[1] - cabinetU[0]) - count * ISLAND_WOOD.pitch) / 2 + (ISLAND_WOOD.pitch - ISLAND_WOOD.slat) / 2
    const u: [number, number] = [start + index * ISLAND_WOOD.pitch, start + index * ISLAND_WOOD.pitch + ISLAND_WOOD.slat]
    return { id: `panel-slat-${index + 1}`, u, v: [COUNTER_V[0] - ISLAND_WOOD.backing - ISLAND_WOOD.slatDepth, COUNTER_V[0] - ISLAND_WOOD.backing], y: [floor + S.plinthHeight, floor + S.baseHeight], color: OAKS[index % OAKS.length] }
  }),
]
