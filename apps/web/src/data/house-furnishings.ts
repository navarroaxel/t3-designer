import { DOG, DOG_BOX } from './dog.ts'
import { BALCONY_BOXES, BALCONY_LIGHT_POSITIONS, BALCONY_SWITCH_ID } from './balcony-lights.ts'
import { BATHROOM_BOXES, BATHROOM_LIGHT_BOXES, BATHROOM_OUTLET, BATHROOM_SWITCH_BOXES, BATHROOM_SWITCH_ID, MIRROR_LIGHT_BOXES } from './bathroom.ts'
import { DOORBELL_BOXES } from './doorbell.ts'
import { FIREPLACE, FIREPLACE_U, FIREPLACE_V } from './fireplace.ts'
import { CHEST_FREEZER_BOX } from './chest-freezer.ts'
import { TOOL_CABINET_BOX } from './tool-cabinet.ts'
import { MAIN_BOARD_BOX } from './main-board.ts'
import { OFFICE_DESK_BOX } from './office-desk.ts'
import { BOARD, BOARD_U, GARAGE_EQUIPMENT, INVERTER, INVERTER_U } from './garage-equipment.ts'
import { FLOOR_HEIGHT } from './building-site.ts'
import { RACK_BOX } from './rack.ts'
import { tvMountBoxes } from './tv-mount.ts'
import { dataSocketBoxes, outletBoxes } from './outlets.ts'
import { mediaBoxBoxes, passThroughBoxes } from './wall-fittings.ts'
import { SPIN_DRYER_PARTS } from './spin-dryer.ts'
import { STAIR_BLOCKS } from './stair.ts'
import { WASHING_MACHINE_BOXES } from './washing-machine.ts'
import { HOUSE_REAR, TERRACE_CENTRE_V, TERRACE_GRILL, TERRACE_INNER, TERRACE_REAR_WALL, TERRACE_SHELF, TERRACE_WALL_THICKNESS } from './building-site.ts'
import { ISLAND_CANOPY_BOXES, ISLAND_CANOPY_WALL, KITCHEN_CONDUIT_BOXES, KITCHEN_SWITCH_BOXES, KITCHEN_SWITCH_ID, ISLAND_SWITCH_BOXES, ISLAND_SWITCH_ID, CUP, DISHWASHER, DISHWASHER_BOX, GLASS_CABINET, GLASS_DOOR_ID, KITCHEN_BOXES, KITCHEN_ISLAND_FRONTS, KITCHEN_NOOK_BOXES, KITCHEN_SIZES, KITCHEN_UPPER_BOXES, MICROWAVE_CENTRE_U, NOOK, NOOK_CENTRE_U, UPPER_CABINET, type KitchenBox } from './kitchen.ts'
import {
  CLOSET_SLIDING_PANELS, CLOSET_WARDROBE, CUT_HEIGHT, KITCHEN_LIVING, LIVING_TV, LIVING_TV_PLACEMENT, MAIN_BED, MAIN_ROOM_CLOSET_WARDROBE, MAIN_TV, MAIN_TV_PLACEMENT, QUEEN_BED, TV_MOUNT,
  SECONDARY_BED, SECONDARY_WARDROBE, SINGLE_BED, WARDROBE, WARDROBE_LEAVES, type Floor,
  GROUND_GARAGE, OPENINGS, WALL_THICKNESS,
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
  /** A turn of the model about the vertical, in radians, where its front is not toward the wall's normal (the default is a half turn). */
  turn?: number
  /** A round plate on a wall: a cylinder along v, its radius half the width. */
  disc?: true
  /** A turn about the normal of the wall it is on, for the slots of an outlet. */
  roll?: number
  /** `roll` turns about the u axis instead of the v axis: for a plate on a wall that faces along u. */
  rollAboutU?: boolean
  /** A board of figured wood: the grain texture drawn on it, running along v. */
  grain?: 'walnut'
  /** A piece that lights itself, like the LED strip around the bathroom's mirror. */
  glow?: boolean
  /** Whether a visitor bumps into it. Hung and thin things (mirrors, TVs, pillows) do not. */
  solid: boolean
}

const BED = '#d9d2c4', HEADBOARD = '#8b6b4a', PILLOW = '#f4f1ea', WARDROBE_COLOR = '#b58b5a', LEAF_COLORS = ['#c39a64', '#b58b5a']
const F = FLOOR_HEIGHT
/** The kitchen's outlets over the worktops, on the walls at the ends of the run and of the island (owner): 1.10 m up, over the worktop and under the cabinets. */
const KITCHEN_WORKTOP_OUTLET_HEIGHT = NOOK.outletHeight
/** The rear wall's thickness, from the kitchen-living's inner face to the outline at the house's rear. */
const KITCHEN_REAR_WALL = WALL_THICKNESS
/** The in-wall media box's centre above the floor: its lower edge is just over 5 cm above the network socket's plate (centred 0.30 m up, 72 mm tall), so it stands at 0.525 m. */
const MEDIA_BOX_CENTRE_HEIGHT = .525
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
    add({ id: `living-table-leg-${index + 1}`, u: [uEdge, uEdge + table.leg], v: [vEdge, vEdge + table.leg], y: [F, F + table.height - table.top], color: '#8e6a40', roughness: .7, solid: false })
  }
  // The PS5 stands upright on its base: 104 mm thick, 260 mm deep and 390 mm tall with its stand. It is the model scripts/blender builds (jobs/ps5-job.json).
  const ps5U = tvU - .25, ps5V: [number, number] = [tableV[0] + .1, tableV[0] + .1 + .26], base = F + table.height
  add({ id: 'ps5', u: [ps5U - .052, ps5U + .052], v: ps5V, y: [base, base + .39], color: '#f4f5f8', roughness: .35, solid: false, model: '/models/house/ps5.glb' })
  // Two double outlets on the wall, one each side of the table, 25 cm clear of it: the Argentine plug, shaped like the Australian one.
  for (const [side, offset] of [['left', -(table.width / 2 + .25)], ['right', table.width / 2 + .25]] as const) {
    for (const part of outletBoxes(`outlet-${side}`, wall, tvU + offset, F)) add({ ...part, roughness: .6, solid: false })
  }
  // Behind the PS5's table, a network socket (RJ45) for its cable, centred on the wall, at the height of the power outlets on this wall.
  for (const part of dataSocketBoxes('data-ps5', wall, tvU, F)) add({ ...part, roughness: .6, solid: false })
  // The TV wall's fittings: the in-wall media box, raised to sit over the network socket, for the console's cables; and, beside the mount, the pass-through for the TV's cable and a plug at the TV's height.
  for (const part of mediaBoxBoxes('wallbox', wall, tvU, F + MEDIA_BOX_CENTRE_HEIGHT)) add({ ...part, roughness: .5, solid: false })
  const tvCentreY = centre(LIVING_TV_PLACEMENT.y), mountHalf = TV_MOUNT.width / 2
  for (const part of passThroughBoxes('cable-hole', wall, tvU - mountHalf - .2, tvCentreY)) add({ ...part, roughness: .5, solid: false })
  for (const part of outletBoxes('outlet-tv', wall, tvU + mountHalf + .13, F, tvCentreY - F)) add({ ...part, roughness: .6, solid: false })
  // The main room's TV wall has the same scheme (owner): the network socket centred on the wall at the height of the outlets, an outlet each side of the bed, 25 cm clear of it, the in-wall media box
  // over the socket, and, beside the mount, the pass-through for the TV's cable and a plug at the TV's height. The bed hides the socket and the box, as the table hides the living's.
  const mainWall = MAIN_TV_PLACEMENT.bracket.v[0], mainU = centre(MAIN_TV_PLACEMENT.u), mainTvY = centre(MAIN_TV_PLACEMENT.y)
  for (const part of dataSocketBoxes('main-data', mainWall, mainU, F)) add({ ...part, roughness: .6, solid: false })
  for (const [side, offset] of [['left', -(QUEEN_BED.width / 2 + .25)], ['right', QUEEN_BED.width / 2 + .25]] as const) {
    for (const part of outletBoxes(`main-outlet-${side}`, mainWall, mainU + offset, F)) add({ ...part, roughness: .6, solid: false })
  }
  for (const part of mediaBoxBoxes('main-wallbox', mainWall, mainU, F + MEDIA_BOX_CENTRE_HEIGHT)) add({ ...part, roughness: .5, solid: false })
  for (const part of passThroughBoxes('main-cable-hole', mainWall, mainU - TV_MOUNT.width / 2 - .2, mainTvY)) add({ ...part, roughness: .5, solid: false })
  for (const part of outletBoxes('main-outlet-tv', mainWall, mainU + TV_MOUNT.width / 2 + .13, F, mainTvY - F)) add({ ...part, roughness: .6, solid: false })
  // Its DualSense lies on the table beside it, the triggers toward the wall: 160 by 106 mm, 66 mm tall (a Blender model).
  const padU = tvU + .22, padV = tableV[0] + .24
  add({ id: 'ps5-controller', u: [padU - .08, padU + .08], v: [padV - .053, padV + .053], y: [base, base + .066], color: '#f4f5f8', roughness: .4, solid: false, model: '/models/house/dualsense.glb' })
  // The bathroom's outlet between the toilet and the vanity, on the wall shared with the living: the plate faces the bathroom, toward lower u (the outlet is drawn facing +v, turned a quarter).
  for (const part of outletBoxes('outlet-bathroom', 0, 0, F, BATHROOM_OUTLET.height)) {
    add({ ...part, u: [BATHROOM_OUTLET.u - part.v[1], BATHROOM_OUTLET.u - part.v[0]], v: [BATHROOM_OUTLET.v + part.u[0], BATHROOM_OUTLET.v + part.u[1]], roughness: .6, solid: false, rollAboutU: true })
  }
  // And on the other side of that wall, in the kitchen-living, an outlet 0.30 m up, at the same place along the wall (owner): the plate faces the kitchen, toward higher u.
  for (const part of outletBoxes('outlet-kitchen-hall', 0, 0, F)) {
    add({ ...part, u: [KITCHEN_LIVING.u[0] + part.v[0], KITCHEN_LIVING.u[0] + part.v[1]], v: [BATHROOM_OUTLET.v - part.u[1], BATHROOM_OUTLET.v - part.u[0]], roll: part.roll ? -part.roll : undefined, roughness: .6, solid: false, rollAboutU: true })
  }
  // Beside the oven, on the 45 cm resting worktop: an outlet on the side wall at the hall end of the run (owner), not on the backsplash, 1.10 m up (assumed: over the worktop, under the cabinets).
  // The plate faces the kitchen, toward higher u, in the middle of the worktop's depth.
  const restV = (KITCHEN_BOXES.find(box => box.id === 'base')!.v[0] + KITCHEN_BOXES.find(box => box.id === 'base')!.v[1]) / 2
  for (const part of outletBoxes('outlet-kitchen-rest', 0, 0, F, KITCHEN_WORKTOP_OUTLET_HEIGHT)) {
    add({ ...part, u: [KITCHEN_LIVING.u[0] + part.v[0], KITCHEN_LIVING.u[0] + part.v[1]], v: [restV - part.u[1], restV - part.u[0]], roll: part.roll ? -part.roll : undefined, roughness: .6, solid: false, rollAboutU: true })
  }
  // The breakfast nook inside the tall column: its carcass, shelves, door and the Nespresso, drawn only while the door is open, and the outlet behind the machine, at the same height as the one beside the oven.
  for (const box of KITCHEN_NOOK_BOXES) add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.id.startsWith('nook-cup') ? .3 : .6, solid: false, ...(box.round ? { shape: 'ellipse' as const, taper: CUP.taper } : {}), ...(box.id === 'nook-machine' ? { model: '/models/house/nespresso.glb', turn: 0, roughness: .35 } : {}) })
  // The fronts of the island's cabinets on the aisle side: the door under the sink and the two large drawers for the pans.
  for (const box of KITCHEN_ISLAND_FRONTS) add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.id.includes('handle') ? .3 : .6, solid: false })
  // The dishwasher in the island, between the sink and the wall behind it, its door toward the aisle (higher v): the model's front is +Z, so it turns half a turn.
  add({ id: 'kitchen-dishwasher', u: DISHWASHER_BOX.u, v: DISHWASHER_BOX.v, y: DISHWASHER_BOX.y, color: '#b9bcc0', roughness: .4, model: DISHWASHER.model, turn: Math.PI, solid: false })
  for (const part of outletBoxes('outlet-nook', KITCHEN_LIVING.v[1], NOOK_CENTRE_U - .13, F, NOOK.outletHeight)) {
    add({ ...part, u: [2 * (NOOK_CENTRE_U - .13) - part.u[1], 2 * (NOOK_CENTRE_U - .13) - part.u[0]], v: [2 * KITCHEN_LIVING.v[1] - part.v[1], 2 * KITCHEN_LIVING.v[1] - part.v[0]], roughness: .6, solid: false })
  }
  // An outlet behind the fridge, on the party wall, high enough to be easy to unplug when it is pulled out (owner): its centre is 5 cm under the line of the worktop. The plate faces the
  // kitchen, toward lower v, so it is drawn turned half a turn about the vertical, like the microwave's.
  const fridgeBox = KITCHEN_BOXES.find(box => box.id === 'fridge')!, fridgeMiddleU = (fridgeBox.u[0] + fridgeBox.u[1]) / 2, wallFace = KITCHEN_LIVING.v[1]
  for (const part of outletBoxes('outlet-fridge', wallFace, fridgeMiddleU, F, KITCHEN_SIZES.baseHeight + KITCHEN_SIZES.worktop - .05)) {
    add({ ...part, u: [2 * fridgeMiddleU - part.u[1], 2 * fridgeMiddleU - part.u[0]], v: [2 * wallFace - part.v[1], 2 * wallFace - part.v[0]], roughness: .6, solid: false })
  }
  // Two outlets on the wall behind the island, at the same height as the one beside the oven (owner): a quarter and three quarters across its width, facing the kitchen, toward higher u.
  const islandV = KITCHEN_BOXES.find(box => box.id === 'counter')!.v
  for (const [index, at] of [.25, .75].entries()) {
    for (const part of outletBoxes(`outlet-island-${index + 1}`, 0, 0, F, KITCHEN_WORKTOP_OUTLET_HEIGHT)) {
      const v = islandV[0] + (islandV[1] - islandV[0]) * at
      add({ ...part, u: [KITCHEN_LIVING.u[0] + ISLAND_CANOPY_WALL + part.v[0], KITCHEN_LIVING.u[0] + ISLAND_CANOPY_WALL + part.v[1]], v: [v - part.u[1], v - part.u[0]], roll: part.roll ? -part.roll : undefined, roughness: .6, solid: false, rollAboutU: true })
    }
  }
  // The island's canopy: the fluted oak up the wall and over the island, the drywall box above it and the three downlights; drawn only in the walkthrough (it hangs above the cut).
  // The dog, lying on the balcony in front of the secondary room's window; it blocks the way like a piece of furniture, a quarter of the balcony's depth.
  add({ id: 'dog', u: DOG_BOX.u, v: DOG_BOX.v, y: DOG_BOX.y, color: '#161719', roughness: .95, model: DOG.model, turn: 0 })
  // The balcony's three wall lanterns, and the switch in the main room.
  for (const box of BALCONY_BOXES) add({ id: box.id, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.glow ? .4 : .9, solid: false, ...(box.glow ? { glow: true } : {}), ...(box.round ? { shape: 'ellipse' as const } : {}), ...(box.model ? { model: box.model, turn: box.turn } : {}) })
  // An outlet under the balcony's middle light (owner), on the house's front wall, 0.30 m up like the other low ones: the plate faces the balcony, toward lower u, on the wall's outer face at u = -5.
  const balconyMiddle = BALCONY_LIGHT_POSITIONS[Math.floor(BALCONY_LIGHT_POSITIONS.length / 2)].v
  for (const part of outletBoxes('outlet-balcony', 0, 0, F)) {
    add({ ...part, u: [-5 - part.v[1], -5 - part.v[0]], v: [balconyMiddle + part.u[0], balconyMiddle + part.u[1]], roughness: .6, solid: false, rollAboutU: true })
  }
  // The conduit box along the wall behind the island, which the island's box crosses.
  for (const box of [...KITCHEN_CONDUIT_BOXES, ...KITCHEN_SWITCH_BOXES]) add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.glow ? .4 : .9, solid: false, ...(box.glow ? { glow: true } : {}), ...(box.round ? { shape: 'ellipse' as const } : {}) })
  for (const box of [...ISLAND_CANOPY_BOXES, ...ISLAND_SWITCH_BOXES]) add({ id: `island-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.glow ? .4 : box.id === 'canopy-drywall' ? .9 : .55, solid: false, ...(box.glow ? { glow: true } : {}), ...(box.round ? { shape: 'ellipse' as const } : {}), ...(box.opacity !== undefined ? { opacity: box.opacity } : {}), ...(box.grain ? { grain: box.grain } : {}) })
  // On the kitchen's rear wall, between the light well's window and the terrace's balcony door, an outlet 0.30 m up (owner), centred between them: the plate faces the kitchen, toward lower u.
  const rearOpenings = OPENINGS.first.filter(opening => Math.abs(opening.u - (KITCHEN_LIVING.u[1] + KITCHEN_REAR_WALL)) < 1e-9).sort((a, b) => a.v[0] - b.v[0])
  const [balconyDoor, wellWindow] = [rearOpenings[0], rearOpenings[1]]
  const rearOutletV = (balconyDoor.v[1] + wellWindow.v[0]) / 2
  for (const part of outletBoxes('outlet-kitchen-rear', 0, 0, F)) {
    add({ ...part, u: [KITCHEN_LIVING.u[1] - part.v[1], KITCHEN_LIVING.u[1] - part.v[0]], v: [rearOutletV + part.u[0], rearOutletV + part.u[1]], roughness: .6, solid: false, rollAboutU: true })
  }
  // The bathroom's light box on the wall facing the mirror, with its three recessed LED downlights; drawn only in the walkthrough (it hangs above the cut).
  for (const box of [...BATHROOM_LIGHT_BOXES, ...BATHROOM_SWITCH_BOXES]) add({ id: `bathroom-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: box.glow ? .4 : .9, solid: false, ...(box.glow ? { glow: true } : {}), ...(box.round ? { shape: 'ellipse' as const } : {}) })
  for (const box of MIRROR_LIGHT_BOXES) add({ ...box, roughness: .4, solid: false })
  for (const box of BATHROOM_BOXES) {
    // The toilet is one Blender model, its back to the wall and its front toward -u; the lid, the panel and the light are part of it.
    if (box.id === 'toilet-lid' || box.id === 'toilet-panel' || box.id === 'toilet-light') continue
    if (box.id === 'toilet-body') { add({ ...box, y: [box.y[0], box.y[1] + .025], roughness: .25, model: '/models/house/toilet.glb', turn: -Math.PI / 2 }); continue }
    // The mirror and the glass panel are sawn off at the cut; give them their height back.
    const top = box.y[1] === cut ? F + (box.id === 'mirror' || box.id === 'mirror-shelf' ? 1.9 : 2) : box.y[1]
    add({ ...box, y: [box.y[0], top], roughness: box.metalness ? .35 : box.id.startsWith('toilet') ? .25 : .6, solid: box.opacity === undefined && box.y[0] - F < 1 && !box.id.startsWith('mirror') })
  }
  for (const box of KITCHEN_BOXES) {
    const tall = box.y[1] === cut
    const top = !tall ? box.y[1] : box.id === 'column' ? F + NOOK.top : box.id.startsWith('fridge') ? F + .04 + KITCHEN_SIZES.fridgeHeight : box.y[1]
    add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: [box.y[0], top], color: box.color, ...(box.id.startsWith('stool-') ? { model: '/models/house/stool.glb' } : { kitchen: { ...box, y: [box.y[0], top] } }), roughness: .6, solid: box.y[0] - F < 1 && !box.id.endsWith('tap') && !box.id.startsWith('fridge') && !box.id.startsWith('stool-') })
  }
  // The upper cabinet with the microwave, over the run next to the fridge; hung high, so it is not stopped on.
  for (const box of KITCHEN_UPPER_BOXES) add({ id: `kitchen-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, ...(box.opacity !== undefined ? { opacity: box.opacity } : {}), ...(box.round ? { shape: 'ellipse' as const, taper: GLASS_CABINET.glass.taper } : {}), ...(box.pattern ? { kitchen: box } : {}), roughness: box.id === 'microwave' ? .35 : .6, solid: false, ...(box.id === 'microwave' || box.id === 'hood' ? { model: `/models/house/${box.id === 'hood' ? 'kitchen-hood' : 'microwave'}.glb`, turn: 0 } : {}) })
  // The outlet behind the microwave, 1.5 m above the floor, on the party wall: turned to face the room, which is toward lower v.
  for (const part of outletBoxes('outlet-microwave', KITCHEN_LIVING.v[1], MICROWAVE_CENTRE_U, F, UPPER_CABINET.outletHeight)) {
    add({ ...part, u: [2 * MICROWAVE_CENTRE_U - part.u[1], 2 * MICROWAVE_CENTRE_U - part.u[0]], v: [2 * KITCHEN_LIVING.v[1] - part.v[1], 2 * KITCHEN_LIVING.v[1] - part.v[0]], roughness: .6, solid: false })
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
    // The hall's main supply board, flush in the left wall, and the office's standing desk: both Blender models.
    { id: 'main-board', ...MAIN_BOARD_BOX, color: '#f3f4f3', roughness: .4, solid: false, model: '/models/house/main-board.glb', turn: 0 },
    { id: 'office-desk', ...OFFICE_DESK_BOX, color: '#dcb67f', roughness: .55, solid: true, model: '/models/house/desk.glb' },
    { id: 'chest-freezer', ...CHEST_FREEZER_BOX, color: '#f6f7f7', roughness: .3, solid: true, model: '/models/house/chest-freezer.glb' },
    { id: 'tool-cabinet', ...TOOL_CABINET_BOX, color: '#1c1d20', roughness: .65, solid: true, model: '/models/house/tool-cabinet.glb' },
    // The inverter is a Blender model (its 60 mm of connectors hang under the box, which is the body); the board stays boxes.
    { id: 'garage-inverter', u: INVERTER_U, v: [GROUND_GARAGE.v[0], GROUND_GARAGE.v[0] + INVERTER.depth], y: [INVERTER.bottom - .06, INVERTER.bottom + INVERTER.height], color: '#f1f2f3', roughness: .42, solid: false, model: '/models/house/inverter.glb' },
    { id: 'garage-board', u: BOARD_U, v: [GROUND_GARAGE.v[0], GROUND_GARAGE.v[0] + BOARD.depth], y: [BOARD.bottom, BOARD.bottom + BOARD.height], color: '#ececec', roughness: .4, solid: false, model: '/models/house/board.glb' },
    ...GARAGE_EQUIPMENT.filter(box => !box.id.startsWith('inverter') && !box.id.startsWith('board')).map(box => ({ id: `garage-${box.id}`, u: box.u, v: box.v, y: box.y, color: box.color, roughness: .5, metalness: box.metalness, solid: false })),
    ...STAIR_BLOCKS.map(block => ({ id: `stair-${block.id}`, u: block.u, v: block.v, y: block.y, color: '#b9b6ae', roughness: .95, solid: false })),
    // The network rack on the pantry's wall, at head height: a visitor does not walk into it.
    { id: 'rack', ...RACK_BOX, color: '#16171a', roughness: .55, solid: true, model: '/models/house/rack.glb' },
    // The fireplace is one Blender model: 0.99 m at its cedar top, 0.40 m deep with the top's front overhang, against the wall, its open front toward the room.
    { id: 'fireplace', u: [FIREPLACE_U[0] - .02, FIREPLACE_U[1] + .02], v: [FIREPLACE_V[0] - .02, FIREPLACE_V[1]], y: [0, FIREPLACE.height], color: '#17171a', roughness: .55, solid: true, model: '/models/house/fireplace.glb', turn: 0 },
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

/** What a visitor can work with `E`: the TVs, which switch on, and the fridge, whose doors open; and with `X`, what can be taken away (REMOVABLE): the fridge and the microwave too. */
export const TV_IDS = ['tv-main', 'tv-living', 'kitchen-fridge', 'kitchen-microwave', 'kitchen-island-cheek', 'kitchen-column', ISLAND_SWITCH_ID, BATHROOM_SWITCH_ID, KITCHEN_SWITCH_ID, BALCONY_SWITCH_ID, GLASS_DOOR_ID] as const
export function furnishingDevices(floor: Floor, level: number) {
  const pieces = furnishingsOn(floor)
  // A group is one device whose aim volume holds all of its pieces: the living's table with the PS5 and its controller, as tall as the console, and the three stools at the island (X takes the group away, or sets it back).
  const group = (id: string, members: Furnishing[]) => members.length ? [{
    id,
    center: [(Math.min(...members.map(piece => piece.u[0])) + Math.max(...members.map(piece => piece.u[1]))) / 2, -(Math.min(...members.map(piece => piece.v[0])) + Math.max(...members.map(piece => piece.v[1]))) / 2] as [number, number],
    halfWidth: (Math.max(...members.map(piece => piece.u[1])) - Math.min(...members.map(piece => piece.u[0]))) / 2, halfDepth: (Math.max(...members.map(piece => piece.v[1])) - Math.min(...members.map(piece => piece.v[0]))) / 2, cos: 1, sin: 0,
    bottom: Math.min(...members.map(piece => piece.y[0])) - level, top: Math.max(...members.map(piece => piece.y[1])) - level,
  }] : []
  const setDevices = [...group(LIVING_SET_ID, pieces.filter(piece => isLivingSetPiece(piece.id))), ...group(STOOLS_ID, pieces.filter(piece => isStool(piece.id)))]
  return [...setDevices, ...pieces.filter(piece => (TV_IDS as readonly string[]).includes(piece.id)).map(piece => {
    // The aim volume of a TV reaches as far as its mount's arm does, so a TV brought out into the room can still be looked at.
    const reach = piece.id.startsWith('tv-') ? TV_MOUNT.depthExtended - TV_MOUNT.depthFolded : 0
    return {
      id: piece.id,
      // The lights start on: a switch's openness is 1 until a visitor flips it.
      ...(piece.id === ISLAND_SWITCH_ID || piece.id === BATHROOM_SWITCH_ID || piece.id === KITCHEN_SWITCH_ID || piece.id === BALCONY_SWITCH_ID ? { initialOpenness: 1 } : {}),
      center: [(piece.u[0] + piece.u[1]) / 2, -(piece.v[0] + piece.v[1] + reach) / 2] as [number, number],
      halfWidth: (piece.u[1] - piece.u[0]) / 2, halfDepth: (piece.v[1] - piece.v[0] + reach) / 2, cos: 1, sin: 0,
      bottom: piece.y[0] - level, top: piece.y[1] - level,
    }
  })]
}

/** The living's table, the PS5 and its controller come and go together (X): `set-living`, 1 in place and 0 taken away. */
export const LIVING_SET_ID = 'living-table'
export const STOOLS_ID = 'kitchen-stools'
export const isStool = (id: string) => id.startsWith('kitchen-stool-')
export const livingSetKey = 'set-living'
export const isLivingSetPiece = (id: string) => id.startsWith('living-table-') || id === 'ps5' || id === 'ps5-controller'
export const isLivingSetPresent = (states: Readonly<Record<string, number>>) => (states[livingSetKey] ?? 1) >= .5

/**
 * What X takes away and puts back, by the id of the device a visitor aims at: the living's table with the PS5 and its controller, the fridge (to reach the outlet behind it) and the microwave
 * (for its outlet). `key` is where the state lives, with the doors', 1 in place and 0 taken away; `owns` says which pieces of the furnishings go with it.
 */
export const REMOVABLE: Record<string, { key: string; owns: (pieceId: string) => boolean }> = {
  [LIVING_SET_ID]: { key: livingSetKey, owns: isLivingSetPiece },
  'kitchen-fridge': { key: 'away-fridge', owns: id => id.startsWith('kitchen-fridge') },
  'kitchen-microwave': { key: 'away-microwave', owns: id => id === 'kitchen-microwave' },
  'kitchen-island-cheek': { key: 'away-island-cheek', owns: id => id === 'kitchen-island-cheek' },
  // The three stools at the island come out together, so that the island can be seen with them or without.
  [STOOLS_ID]: { key: 'away-stools', owns: isStool },
}
export const isRemovable = (deviceId: string) => deviceId in REMOVABLE
export const isInPlace = (states: Readonly<Record<string, number>>, deviceId: string) => (states[REMOVABLE[deviceId].key] ?? 1) >= .5
/** Whether a piece of the furnishings has been taken away with the device that owns it. */
export const isPieceAway = (states: Readonly<Record<string, number>>, pieceId: string) =>
  Object.entries(REMOVABLE).some(([deviceId, removable]) => removable.owns(pieceId) && !isInPlace(states, deviceId))

/** A TV is on its wall mount unless the visit has taken it off (X): the state lives with the doors', under `mount-<name>`. */
export const tvMountKey = (tvId: string) => `mount-${tvId.replace(/^tv-/, '')}`
export const isTvMounted = (states: Readonly<Record<string, number>>, tvId: string) => (states[tvMountKey(tvId)] ?? 1) >= .5
/** The mount's arm is folded unless the visit has unfolded it (Q): `arm-<name>`, 0 folded and 1 reaching its full 355 mm. */
export const armKey = (tvId: string) => `arm-${tvId.replace(/^tv-/, '')}`
export const isArmExtended = (states: Readonly<Record<string, number>>, tvId: string) => (states[armKey(tvId)] ?? 0) >= .5
/** How far the mount's head has come out of its folded place, in metres: the TV with it, if it is on the mount. */
export const armReach = (states: Readonly<Record<string, number>>, tvId: string) => isArmExtended(states, tvId) ? TV_MOUNT.depthExtended - TV_MOUNT.depthFolded : 0

/** The island's lights are on unless a visit has switched them off: the switch's own openness, 1 on and 0 off. */
export const islandLightsOn = (states: Readonly<Record<string, number>>) => (states[ISLAND_SWITCH_ID] ?? 1) >= .5
