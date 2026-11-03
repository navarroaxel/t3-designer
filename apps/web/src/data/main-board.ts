import { GROUND_HALL } from './house-plan.ts'

/**
 * The main supply board, the TP (owner), flush-mounted in the hall's left wall, the north-east party wall, as one comes in from the street: a single-row, sixteen-module box for flush mounting, 350 by 200 mm
 * and 115 mm deep (the owner's figures), of which only the front shows: its frame and smoked door stand 20 mm out of the wall and the rest of the box is inside it. The 1.5 m to its middle is assumed; its nearer edge
 * 0.15 m from the street's wall is the owner's. The model (`scripts/blender/jobs/main-board-job.json`): its wall plane is 20 mm behind its front, so 37.5 mm in front of its middle. House frame [u, v], heights above
 * the ground-floor level.
 */
export const MAIN_BOARD = { width: .35, height: .2, centreHeight: 1.5, fromStart: .15, depth: .115, frameOut: .02, behindMiddle: .115 / 2 - .02 }

const wall = GROUND_HALL.v[1]
const middleU = GROUND_HALL.u[0] + MAIN_BOARD.fromStart + MAIN_BOARD.width / 2
const middleV = wall + MAIN_BOARD.behindMiddle
export const MAIN_BOARD_BOX = {
  u: [middleU - MAIN_BOARD.width / 2, middleU + MAIN_BOARD.width / 2] as [number, number],
  v: [middleV - MAIN_BOARD.depth / 2, middleV + MAIN_BOARD.depth / 2] as [number, number],
  y: [MAIN_BOARD.centreHeight - MAIN_BOARD.height / 2, MAIN_BOARD.centreHeight + MAIN_BOARD.height / 2] as [number, number],
}
