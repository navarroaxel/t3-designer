import { GROUND_OFFICE } from './house-plan.ts'

/**
 * The office's standing desk (owner's picture): 1.40 by 0.70 m, 0.75 m high at its lowest, with a light wood top on white legs. It stands against the office's south-west wall, the one opposite the north-east party wall (owner), its long side
 * along the wall, with the sitter facing the room, 0.65 m from the rear wall. The sizes and the place are assumed. House frame [u, v], heights above the ground-floor level.
 */
export const OFFICE_DESK = { length: 1.4, depth: .7, height: .75, fromRearWall: .65 }

const wall = GROUND_OFFICE.v[0]
const rear = GROUND_OFFICE.u[1]
export const OFFICE_DESK_BOX = {
  u: [rear - OFFICE_DESK.fromRearWall - OFFICE_DESK.length, rear - OFFICE_DESK.fromRearWall] as [number, number],
  v: [wall, wall + OFFICE_DESK.depth] as [number, number],
  y: [0, OFFICE_DESK.height] as [number, number],
}
