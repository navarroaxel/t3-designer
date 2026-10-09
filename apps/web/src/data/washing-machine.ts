import { AZOTEA_REAR, FLOOR_HEIGHT, HOUSE_HALF_WIDTH, PARTY_WALL } from './building-site.ts'
import { LAUNDRY } from './laundry.ts'

/**
 * The washing machine in the laundry (owner asked for it; the model is not known): a graphite-grey front-loader (owner's photo, a Midea) of the usual size, 0.60 m wide, 0.60 m deep
 * and 0.85 m high, against the party wall with neighbour A at the kitchen end, 5 cm from the rear wall for its hoses. It faces the light well, so
 * its door looks across the laundry. The first flight of the stair is on the well's side and the second flight, above, is low at the far end, so
 * the machine stays at the near end, clear of the kitchen door (which stands against the wall on the well). House frame [u, v], absolute heights.
 */
export type WashingMachineBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number }

export const WASHING_MACHINE = { width: .6, depth: .6, height: .85, fromRearWall: .05 }
const { width, depth, height, fromRearWall } = WASHING_MACHINE
const wall = HOUSE_HALF_WIDTH - PARTY_WALL
const rearFace = AZOTEA_REAR
export const WASHING_MACHINE_U: [number, number] = [rearFace + fromRearWall, rearFace + fromRearWall + width]
export const WASHING_MACHINE_V: [number, number] = [wall - depth, wall]
const front = WASHING_MACHINE_V[0]
const middleU = (WASHING_MACHINE_U[0] + WASHING_MACHINE_U[1]) / 2
const floor = FLOOR_HEIGHT
export const LAUNDRY_INTERIOR = { u: [rearFace, rearFace + LAUNDRY.length] as [number, number], v: [wall - LAUNDRY.width, wall] as [number, number] }

export const WASHING_MACHINE_BOXES: WashingMachineBox[] = [
  // Graphite grey (owner's photo, a Midea front-loader): the body on four black feet, a slightly lighter lid, and the control strip across the top of the front.
  { id: 'washer-body', u: WASHING_MACHINE_U, v: WASHING_MACHINE_V, y: [floor + .02, floor + .83], color: '#74787c', metalness: .45 },
  { id: 'washer-lid', u: [WASHING_MACHINE_U[0] - .005, WASHING_MACHINE_U[1] + .005], v: [front - .01, WASHING_MACHINE_V[1]], y: [floor + .83, floor + height], color: '#a2a6aa', metalness: .5 },
  ...[[WASHING_MACHINE_U[0] + .03, front + .03], [WASHING_MACHINE_U[1] - .07, front + .03], [WASHING_MACHINE_U[0] + .03, WASHING_MACHINE_V[1] - .07], [WASHING_MACHINE_U[1] - .07, WASHING_MACHINE_V[1] - .07]]
    .map(([u, v], i): WashingMachineBox => ({ id: `washer-foot-${i + 1}`, u: [u, u + .04], v: [v, v + .04], y: [floor, floor + .02], color: '#17181a' })),
  { id: 'washer-panel', u: [WASHING_MACHINE_U[0] + .01, WASHING_MACHINE_U[1] - .01], v: [front - .02, front], y: [floor + .68, floor + .83], color: '#6a6e72', metalness: .45 },
  // The detergent drawer on the left, the dial with its display on the right, and the buttons beside it.
  { id: 'washer-drawer', u: [WASHING_MACHINE_U[0] + .03, WASHING_MACHINE_U[0] + .2], v: [front - .024, front - .02], y: [floor + .72, floor + .8], color: '#4a4e52', metalness: .4 },
  { id: 'washer-dial', u: [middleU + .02, middleU + .12], v: [front - .03, front - .02], y: [floor + .71, floor + .81], color: '#121315' },
  { id: 'washer-display', u: [middleU + .045, middleU + .095], v: [front - .032, front - .03], y: [floor + .745, floor + .775], color: '#7fd6ff' },
  { id: 'washer-buttons', u: [middleU + .15, middleU + .27], v: [front - .024, front - .02], y: [floor + .73, floor + .79], color: '#8b9094' },
  // The big round door: a thick black ring around dark glass.
  { id: 'washer-door-ring', u: [middleU - .24, middleU + .24], v: [front - .026, front], y: [floor + .11, floor + .59], color: '#0f1012' },
  { id: 'washer-door-glass', u: [middleU - .18, middleU + .18], v: [front - .03, front - .026], y: [floor + .17, floor + .53], color: '#17222c', metalness: .35 },
  // The drain filter's cover, a small round hatch at the bottom right.
  { id: 'washer-filter', u: [middleU + .15, middleU + .25], v: [front - .006, front], y: [floor + .04, floor + .1], color: '#8a8e92', metalness: .3 },
]
