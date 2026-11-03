import { BOARD } from './garage-equipment.ts'
import { GROUND_PANTRY } from './house-plan.ts'

/**
 * The pantry's board, the TSPB (owner): the same 48-module surface-mounted unit as the TSPA (0.45 m by 0.55 m and 0.12 m deep, assumed), on the south-west party wall, the medianera, between the wall that
 * the garage and the pantry share and the network rack, to the rack's right seen facing the wall (toward the front of the house, toward lower u). It stands 0.10 m from the shared wall, as the TSPA does
 * on the other side of it, and at the same height. The rack is moved along the wall to make room for it. House frame [u, v], heights above the ground-floor level.
 */
export const PANTRY_BOARD = { fromWall: BOARD.fromBackWall, width: BOARD.width, height: BOARD.height, depth: BOARD.depth, bottom: BOARD.bottom }

export const PANTRY_BOARD_BOX = {
  u: [GROUND_PANTRY.u[0] + PANTRY_BOARD.fromWall, GROUND_PANTRY.u[0] + PANTRY_BOARD.fromWall + PANTRY_BOARD.width] as [number, number],
  v: [GROUND_PANTRY.v[0], GROUND_PANTRY.v[0] + PANTRY_BOARD.depth] as [number, number],
  y: [PANTRY_BOARD.bottom, PANTRY_BOARD.bottom + PANTRY_BOARD.height] as [number, number],
}
