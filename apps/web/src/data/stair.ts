import { FLOOR_HEIGHT } from './building-site.ts'
import { GROUND_HALL, SLAB_THICKNESS } from './house-plan.ts'

/**
 * The stair from the hall to the first floor (owner), in three flights, with steps 1 m wide. House frame [u, v].
 *
 * - The base of the L, 3 steps, starts 2.13 m from the front window's wall and climbs to the left, toward the party wall with neighbour A.
 * - A landing of 1 m by 0.96 m, the 0.96 m perpendicular to that party wall, in the corner.
 * - There it turns right, facing the office: 2 steps toward the rear.
 * - Then it turns right again and the remaining steps climb back along the hall, toward the garage side, under the first floor's corridor.
 *
 * It is a floating concrete stair (owner): each step and each landing is a slab with nothing under it, so the floor under it stays clear. A small
 * closet stands underneath it (owner); where it is and how big is not known yet, so it is not drawn. The slab's thickness, 0.15 m, is assumed.
 *
 * The owner gave the shape, the step width, the start, the landing and the step counts. The rest follows from them or is assumed and typical:
 * 18 risers of 3.2 m / 18 = 17.8 cm, and the second turn with a landing as wide as the corridor above. The tread, 26 cm, follows from the
 * base of the L: 1.74 m with the 0.96 m landing (owner). The last flight then ends 4 cm short of the hall's wall on the garage side, and the
 * second flight ends within 1 cm of the corridor.
 */
export type StairBlock = { id: string; u: [number, number]; v: [number, number]; y: [number, number] }

export const STAIR = {
  width: 1,
  distanceFromFront: 2.13,
  landing: { along: .96, across: 1 },
  /** The base of the L, its 3 steps and the landing along the party wall's perpendicular: 1.74 m (owner). */
  baseLength: 1.74,
  risers: 18,
  /** Thickness of the concrete slabs of the steps and the landings: floating, with nothing beneath. */
  slab: .15,
  /** Treads before the first landing, between the landings, and after the second landing. */
  treads: [3, 2, 10] as const,
}
export const RISER = FLOOR_HEIGHT / STAIR.risers

/** The party wall's inner face, where the hall ends on the north-east. */
const NE_INNER_V = GROUND_HALL.v[1]
const u0 = GROUND_HALL.u[0] + STAIR.distanceFromFront
export const STAIR_LANDING = {
  u: [u0, u0 + STAIR.landing.across] as [number, number],
  v: [NE_INNER_V - STAIR.landing.along, NE_INNER_V] as [number, number],
}
const [first, second, third] = STAIR.treads
/** The base of the L is 1.74 m with its 3 steps and the 0.96 m landing (owner), so each tread is (1.74 - 0.96) / 3 = 26 cm. */
export const TREAD = (STAIR.baseLength - STAIR.landing.along) / first
/** The corridor above is bounded by the main room's back wall and the wall behind the bathroom. */
const CORRIDOR_U: [number, number] = [STAIR_LANDING.u[1] + second * TREAD, .93]

export const STAIR_LANDING_2 = { u: CORRIDOR_U, v: STAIR_LANDING.v }

/** A floating slab whose top is at `top`: its underside is one slab thickness lower, with nothing beneath. */
const slab = (id: string, u: [number, number], v: [number, number], top: number): StairBlock => ({ id, u, v, y: [top - STAIR.slab, top] })
const blocks: StairBlock[] = []
for (let step = 1; step <= first; step++) {
  blocks.push(slab(`flight-1-step-${step}`, [u0, u0 + STAIR.width], [STAIR_LANDING.v[0] - (first - step + 1) * TREAD, STAIR_LANDING.v[0] - (first - step) * TREAD], step * RISER))
}
const landing1 = first + 1
blocks.push(slab('landing-1', STAIR_LANDING.u, STAIR_LANDING.v, landing1 * RISER))
for (let step = 1; step <= second; step++) {
  blocks.push(slab(`flight-2-step-${step}`, [STAIR_LANDING.u[1] + (step - 1) * TREAD, STAIR_LANDING.u[1] + step * TREAD], STAIR_LANDING.v, (landing1 + step) * RISER))
}
const landing2 = landing1 + second + 1
blocks.push(slab('landing-2', STAIR_LANDING_2.u, STAIR_LANDING_2.v, landing2 * RISER))
for (let step = 1; step <= third; step++) {
  blocks.push(slab(`flight-3-step-${step}`, CORRIDOR_U, [STAIR_LANDING.v[0] - step * TREAD, STAIR_LANDING.v[0] - (step - 1) * TREAD], (landing2 + step) * RISER))
}
export const STAIR_BLOCKS: StairBlock[] = blocks

/** The stair is drawn up to the underside of the first-floor slab. */
export const STAIR_CEILING = FLOOR_HEIGHT - SLAB_THICKNESS
