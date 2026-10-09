import { FLOOR_HEIGHT } from './building-site.ts'
import { BALCONY, FRONT_ROOMS, OPENINGS, SLAB_THICKNESS } from './house-plan.ts'

/**
 * The first-floor balcony's lights (owner): three wall lanterns, "farolitos", on the house's front wall facing the balcony (black, with frosted glass, as in the owner's picture), one in the middle and one each side, evenly spaced, 2.30 m up, over the balcony door and the window. The
 * switch is inside the main room, on the wall of the balcony door, a hand's width past the door's edge on its other side, away from the closet (owner), 1.10 m up, facing the room.
 * Like the kitchen's, it is a device of its own, `balcony-switch-plate`; the lights start on. House frame [u, v], absolute heights.
 */
export type BalconyPiece = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; glow?: boolean; round?: boolean; model?: string; turn?: number }

/** A Blender model (scripts/blender/jobs/balcony-lantern-job.json, and `-off` with the dull glass of a lamp that is off): 0.20 m wide, 0.28 m tall and 0.15 m deep, its back flat on the wall. */
export const BALCONY_LANTERN = { width: .2, height: .28, depth: .15, centreHeight: 2.3, count: 3, spacing: BALCONY.width / 3 }
const ceiling = FLOOR_HEIGHT + FLOOR_HEIGHT - SLAB_THICKNESS
export const BALCONY_LANTERN_Y = FLOOR_HEIGHT + BALCONY_LANTERN.centreHeight
export const BALCONY_LIGHT_POSITIONS: { u: number; v: number }[] = Array.from({ length: BALCONY_LANTERN.count }, (_, index) => ({ u: -5 - BALCONY_LANTERN.depth, v: (index - (BALCONY_LANTERN.count - 1) / 2) * BALCONY_LANTERN.spacing }))

export const BALCONY_SWITCH_ID = 'balcony-switch-plate'
const balconyDoor = OPENINGS.first.find(opening => opening.u === -5 && Math.abs(opening.v[1] - opening.v[0] - 3) < 1e-9)!
const wallFace = FRONT_ROOMS.main.u[0], switchV = balconyDoor.v[0] - .14, switchY = FLOOR_HEIGHT + 1.1
export const BALCONY_BOXES: BalconyPiece[] = [
  // The lanterns face the balcony (toward lower u): the model's front is +Z, so it turns a quarter.
  ...BALCONY_LIGHT_POSITIONS.map((at, index): BalconyPiece => ({ id: `balcony-lantern-${index + 1}`, u: [-5 - BALCONY_LANTERN.depth, -5], v: [at.v - BALCONY_LANTERN.width / 2, at.v + BALCONY_LANTERN.width / 2], y: [BALCONY_LANTERN_Y - BALCONY_LANTERN.height / 2, BALCONY_LANTERN_Y + BALCONY_LANTERN.height / 2], color: '#1b1c1e', model: '/models/house/balcony-lantern.glb', turn: -Math.PI / 2 })),
  { id: 'balcony-switch-plate', u: [wallFace, wallFace + .008], v: [switchV - .036, switchV + .036], y: [switchY - .036, switchY + .036], color: '#f3f2ee' },
  { id: 'balcony-switch-rocker', u: [wallFace + .008, wallFace + .011], v: [switchV - .014, switchV + .014], y: [switchY - .024, switchY + .024], color: '#d9d8d3' },
  { id: 'balcony-switch-dot', u: [wallFace + .008, wallFace + .0085], v: [switchV + .024, switchV + .029], y: [switchY + .024, switchY + .029], color: '#ffcf8a', glow: true },
]
/** The balcony's lights are on unless a visit has switched them off: the switch's own openness, 1 on and 0 off. */
export const balconyLightsOn = (states: Readonly<Record<string, number>>) => (states[BALCONY_SWITCH_ID] ?? 1) >= .5
export const BALCONY_CEILING = ceiling
