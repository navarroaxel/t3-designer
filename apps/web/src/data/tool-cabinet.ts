import { BOARD_U } from './garage-equipment.ts'
import { GROUND_GARAGE } from './house-plan.ts'

/**
 * The garage's tool cabinet set (owner's pictures): two tall two-door cabinets with a workbench unit between them, 2.70 m wide, 0.472 m deep and 1.92 m tall (owner's figures). It stands on the floor
 * against the south-west party wall, to the right of the electrical board, seen facing the wall, which is toward the front of the house, toward lower u; the 10 cm gap from the board, as between the
 * board and the inverter, is assumed. Its doors face the garage, toward +v. House frame [u, v], heights above the ground-floor level.
 */
export const TOOL_CABINET = { width: 2.7, depth: .472, height: 1.92, fromBoard: .1 }

export const TOOL_CABINET_BOX = {
  u: [BOARD_U[0] - TOOL_CABINET.fromBoard - TOOL_CABINET.width, BOARD_U[0] - TOOL_CABINET.fromBoard] as [number, number],
  v: [GROUND_GARAGE.v[0], GROUND_GARAGE.v[0] + TOOL_CABINET.depth] as [number, number],
  y: [0, TOOL_CABINET.height] as [number, number],
}
