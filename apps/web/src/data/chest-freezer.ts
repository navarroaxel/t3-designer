import { GROUND_PANTRY } from './house-plan.ts'

/**
 * The pantry's chest freezer (owner's picture, an Inelro): white, with a lid that lifts, a thermostat dial on its front and four castors. Its sizes, 0.56 m wide, 0.58 m deep and 0.85 m tall on its castors, are
 * assumed from the picture. It stands against the south-west party wall, under the rack, at the end of the wall nearest the garage, 5 cm from the back wall of the garage and the hall (also assumed), its front
 * toward +v. House frame [u, v], heights above the ground-floor level.
 */
export const CHEST_FREEZER = { width: .56, depth: .58, height: .85, fromBackWall: .05 }

export const CHEST_FREEZER_BOX = {
  u: [GROUND_PANTRY.u[0] + CHEST_FREEZER.fromBackWall, GROUND_PANTRY.u[0] + CHEST_FREEZER.fromBackWall + CHEST_FREEZER.width] as [number, number],
  v: [GROUND_PANTRY.v[0], GROUND_PANTRY.v[0] + CHEST_FREEZER.depth] as [number, number],
  y: [0, CHEST_FREEZER.height] as [number, number],
}
