import { ENTRY_RECESS } from './building-site.ts'
import { OPENINGS } from './house-plan.ts'

/**
 * The UniFi doorbell, model UVC-Doorbell-B, beside the entrance door (owner's photo): a slim black unit with the camera lens at the top, a textured button pad in the
 * middle and the logo at the bottom. The entrance door is in the back wall of the recess, which faces the street, so the doorbell stands out from
 * that wall. Its sizes are the model's, 5.4 by 1.6 by 1 inches (owner): 0.137 m high, 0.041 m wide and 0.025 m deep. Its place on the wall's south-west
 * side (the right, seen from the street), 15 cm from the door, and its height, 1.4 m to its middle, are assumed: the owner did not give them. House frame [u, v].
 */
export type DoorbellBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string }

/** 5.4 x 1.6 x 1 inches, in metres. */
export const DOORBELL = { width: 1.6 * .0254, height: 5.4 * .0254, depth: 1 * .0254, fromDoor: .15, middleHeight: 1.4 }
const D = DOORBELL

const wallU = -5 + ENTRY_RECESS.setback
const door = OPENINGS.ground.find(opening => opening.u === wallU && opening.y[0] === 0 && opening.y[1] - opening.y[0] < 2.2 && opening.v[1] - opening.v[0] < 1)!
export const DOORBELL_V: [number, number] = [door.v[0] - D.fromDoor - D.width, door.v[0] - D.fromDoor]
export const DOORBELL_U: [number, number] = [wallU - D.depth, wallU]
const bottom = D.middleHeight - D.height / 2, top = D.middleHeight + D.height / 2
const middleV = (DOORBELL_V[0] + DOORBELL_V[1]) / 2

export const DOORBELL_BOXES: DoorbellBox[] = [
  { id: 'doorbell', u: DOORBELL_U, v: DOORBELL_V, y: [bottom, top], color: '#1b1c1e' },
  // The lens near the top, a little proud of the front, dark blue.
  { id: 'doorbell-lens', u: [DOORBELL_U[0] - .006, DOORBELL_U[0]], v: [middleV - .011, middleV + .011], y: [top - .038, top - .016], color: '#1d2a44' },
  // The textured button pad, in the middle.
  { id: 'doorbell-button', u: [DOORBELL_U[0] - .004, DOORBELL_U[0]], v: [middleV - .017, middleV + .017], y: [bottom + .04, top - .055], color: '#2b2c2f' },
]
