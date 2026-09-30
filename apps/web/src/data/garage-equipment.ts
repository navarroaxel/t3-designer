import { GROUND_GARAGE } from './house-plan.ts'

/**
 * The solar equipment on the garage's wall (owner): a three-phase 10 kW Deye inverter hung on the south-west party wall, its nearer edge 1 m
 * from the garage's back wall (the wall the pantry is behind), and to its right, seen facing the wall, the electrical board. Facing that wall
 * the right hand is toward the front of the house, toward lower u.
 *
 * The inverter's sizes are those of the Deye SUN-10K-G05, 0.33 m wide, 0.457 m high and 0.185 m deep, which is an assumption: the owner did not
 * name the model. The board is the surface-mounted, three-row unit of the owner's photo, white with a smoked black door: 0.45 m by 0.55 m and 0.12 m
 * deep, and its 0.10 m gap from the inverter are assumed. Both hang 0.9 m off the floor (assumed) so they show whole under the 1.5 m cut.
 * House frame [u, v], heights above the ground-floor level.
 */
export type EquipmentBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number }

export const INVERTER = { width: .33, height: .457, depth: .185, fromBackWall: 1, bottom: .9 }
export const BOARD = { width: .45, height: .55, depth: .12, gap: .1, bottom: .9 }

const backFace = GROUND_GARAGE.u[1]
const wall = GROUND_GARAGE.v[0]
export const INVERTER_U: [number, number] = [backFace - INVERTER.fromBackWall - INVERTER.width, backFace - INVERTER.fromBackWall]
export const BOARD_U: [number, number] = [INVERTER_U[0] - BOARD.gap - BOARD.width, INVERTER_U[0] - BOARD.gap]
const ibottom = INVERTER.bottom, itop = INVERTER.bottom + INVERTER.height
const bbottom = BOARD.bottom, btop = BOARD.bottom + BOARD.height
const inverterMiddleU = (INVERTER_U[0] + INVERTER_U[1]) / 2
const boardV: [number, number] = [wall, wall + BOARD.depth]
const inverterV: [number, number] = [wall, wall + INVERTER.depth]

export const GARAGE_EQUIPMENT: EquipmentBox[] = [
  // The inverter: a white body, its dark display panel on the front, the DC connectors and the cable gland underneath.
  { id: 'inverter', u: INVERTER_U, v: inverterV, y: [ibottom, itop], color: '#f1f2f3' },
  { id: 'inverter-display', u: [inverterMiddleU - .09, inverterMiddleU + .09], v: [inverterV[1], inverterV[1] + .004], y: [ibottom + .24, ibottom + .34], color: '#17181a' },
  { id: 'inverter-connector-1', u: [inverterMiddleU - .12, inverterMiddleU - .09], v: [wall + .06, wall + .1], y: [ibottom - .05, ibottom], color: '#1a1a1c' },
  { id: 'inverter-connector-2', u: [inverterMiddleU - .06, inverterMiddleU - .03], v: [wall + .06, wall + .1], y: [ibottom - .05, ibottom], color: '#1a1a1c' },
  { id: 'inverter-gland', u: [inverterMiddleU + .03, inverterMiddleU + .06], v: [wall + .07, wall + .1], y: [ibottom - .06, ibottom], color: '#232325' },
  // The board: a white frame and lid, with the smoked black door over its front.
  { id: 'board', u: BOARD_U, v: boardV, y: [bbottom, btop], color: '#ececec' },
  { id: 'board-door', u: [BOARD_U[0] + .02, BOARD_U[1] - .03], v: [boardV[1], boardV[1] + .012], y: [bbottom + .03, btop - .06], color: '#1e1f21' },
]
