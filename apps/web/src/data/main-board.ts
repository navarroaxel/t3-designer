import { GROUND_HALL } from './house-plan.ts'

/**
 * The main supply board (owner), flush-mounted in the hall's left wall, the north-east party wall, as one comes in from the street: a single-row, fourteen-module board whose frame and smoked
 * door stand 20 mm out of the wall, with the rest of the box inside it. Its 300 by 170 mm face and 1.5 m to its middle are assumed; its nearer edge 0.15 m from the street's wall (owner) are. The model
 * (`scripts/blender/jobs/main-board-job.json`) is 116 mm deep: its wall plane is 30 mm behind its middle. House frame [u, v], heights above the ground-floor level.
 */
export const MAIN_BOARD = { width: .3, height: .17, centreHeight: 1.5, fromStart: .15, depth: .116, frameOut: .02, behindMiddle: .03 }

const wall = GROUND_HALL.v[1]
const middleU = GROUND_HALL.u[0] + MAIN_BOARD.fromStart + MAIN_BOARD.width / 2
const middleV = wall + MAIN_BOARD.behindMiddle
export const MAIN_BOARD_BOX = {
  u: [middleU - MAIN_BOARD.width / 2, middleU + MAIN_BOARD.width / 2] as [number, number],
  v: [middleV - MAIN_BOARD.depth / 2, middleV + MAIN_BOARD.depth / 2] as [number, number],
  y: [MAIN_BOARD.centreHeight - MAIN_BOARD.height / 2, MAIN_BOARD.centreHeight + MAIN_BOARD.height / 2] as [number, number],
}
