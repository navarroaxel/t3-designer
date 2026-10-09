import { FLOOR_HEIGHT } from './building-site.ts'
import { SLAB_THICKNESS, STAIRWELL_HOLE } from './house-plan.ts'

/**
 * The Wi-Fi access point in the stair hall (owner's picture: a white ceiling disc with a blue ring of light round a lighter centre, a Ubiquiti U6 type): 0.18 m across and 32 mm thick,
 * flat on the first floor's ceiling, in the middle of the stairwell strip, so it serves both floors. Boxes in the house frame [u, v], absolute heights.
 */
export const ACCESS_POINT = { diameter: .18, thickness: .032, ring: .09, cap: .075, ringId: 'access-point-ring' }

const centreU = (STAIRWELL_HOLE[0] + STAIRWELL_HOLE[1]) / 2, centreV = (STAIRWELL_HOLE[2] + STAIRWELL_HOLE[3]) / 2
/** The underside of the first floor's ceiling, over the stair hall. */
export const ACCESS_POINT_CEILING = 2 * FLOOR_HEIGHT - SLAB_THICKNESS

const disc = (id: string, diameter: number, y: [number, number], color: string, glow?: true) => ({
  id, u: [centreU - diameter / 2, centreU + diameter / 2] as [number, number], v: [centreV - diameter / 2, centreV + diameter / 2] as [number, number], y, color, round: true, ...(glow ? { glow } : {}),
})
const base = ACCESS_POINT_CEILING - ACCESS_POINT.thickness
export const ACCESS_POINT_BOXES = [
  disc('access-point-body', ACCESS_POINT.diameter, [base, ACCESS_POINT_CEILING], '#f4f5f7'),
  // The ring of light, a hair proud of the body, and the lighter cap inside it.
  disc(ACCESS_POINT.ringId, ACCESS_POINT.ring, [base - .0006, base], '#5b6cff', true),
  disc('access-point-cap', ACCESS_POINT.cap, [base - .0012, base - .0006], '#f7f8fa'),
]
