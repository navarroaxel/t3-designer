import { FLOOR_HEIGHT } from './building-site.ts'
import { BALCONY, FRONT_ROOMS, OPENINGS, SLAB_THICKNESS } from './house-plan.ts'

/**
 * The first-floor balcony's lights (owner): three recessed LED downlights in the underside of the roof over it, one in the middle and one each side, evenly spaced, in the middle of its depth. The
 * switch is inside the main room, on the wall of the balcony door, a hand's width past the door's edge on the side away from the bedroom's centre (toward the closet), 1.10 m up, facing the room.
 * Like the kitchen's, it is a device of its own, `balcony-switch-plate`; the lights start on. House frame [u, v], absolute heights.
 */
export type BalconyPiece = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; glow?: boolean; round?: boolean }

export const BALCONY_LIGHT = { diameter: .09, count: 3, spacing: BALCONY.width / 3 }
const ceiling = FLOOR_HEIGHT + FLOOR_HEIGHT - SLAB_THICKNESS
const depthMiddle = -5 - BALCONY.depth / 2
export const BALCONY_LIGHT_POSITIONS: { u: number; v: number }[] = Array.from({ length: BALCONY_LIGHT.count }, (_, index) => ({ u: depthMiddle, v: (index - (BALCONY_LIGHT.count - 1) / 2) * BALCONY_LIGHT.spacing }))

export const BALCONY_SWITCH_ID = 'balcony-switch-plate'
const balconyDoor = OPENINGS.first.find(opening => opening.u === -5 && Math.abs(opening.v[1] - opening.v[0] - 3) < 1e-9)!
const wallFace = FRONT_ROOMS.main.u[0], switchV = balconyDoor.v[1] + .14, switchY = FLOOR_HEIGHT + 1.1
export const BALCONY_BOXES: BalconyPiece[] = [
  ...BALCONY_LIGHT_POSITIONS.map((at, index): BalconyPiece => ({ id: `balcony-light-${index + 1}`, u: [at.u - BALCONY_LIGHT.diameter / 2, at.u + BALCONY_LIGHT.diameter / 2], v: [at.v - BALCONY_LIGHT.diameter / 2, at.v + BALCONY_LIGHT.diameter / 2], y: [ceiling - .004, ceiling + .002], color: '#fff2d9', glow: true, round: true })),
  { id: 'balcony-switch-plate', u: [wallFace, wallFace + .008], v: [switchV - .036, switchV + .036], y: [switchY - .036, switchY + .036], color: '#f3f2ee' },
  { id: 'balcony-switch-rocker', u: [wallFace + .008, wallFace + .011], v: [switchV - .014, switchV + .014], y: [switchY - .024, switchY + .024], color: '#d9d8d3' },
  { id: 'balcony-switch-dot', u: [wallFace + .008, wallFace + .0085], v: [switchV + .024, switchV + .029], y: [switchY + .024, switchY + .029], color: '#ffcf8a', glow: true },
]
/** The balcony's lights are on unless a visit has switched them off: the switch's own openness, 1 on and 0 off. */
export const balconyLightsOn = (states: Readonly<Record<string, number>>) => (states[BALCONY_SWITCH_ID] ?? 1) >= .5
export const BALCONY_CEILING = ceiling
