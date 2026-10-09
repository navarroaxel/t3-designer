import { FLOOR_HEIGHT } from './building-site.ts'
import { GROUND_GARAGE, GROUND_OFFICE, SLAB_THICKNESS, STAIRWELL_HOLE } from './house-plan.ts'

/**
 * The Wi-Fi access points (owner's picture: a white ceiling disc with a blue ring of light round a lighter centre, a Ubiquiti U6 type): 0.18 m across and 32 mm thick, flat on a ceiling.
 * One in the stair hall, in the middle of the stairwell strip, so it serves both floors; one in the living-kitchen over the PS5's corner (its place is set by `house-furnishings.ts`, where the table is);
 * one in the ground floor's office and one in the garage, each in the middle of its room. Boxes in the house frame [u, v], absolute heights.
 */
export const ACCESS_POINT = { diameter: .18, thickness: .032, ring: .09, cap: .075 }

/** The underside of a floor's ceiling: the first floor's is the roof slab's, the ground floor's is the first floor's slab's. */
export const CEILING_UNDERSIDE = { ground: FLOOR_HEIGHT - SLAB_THICKNESS, first: 2 * FLOOR_HEIGHT - SLAB_THICKNESS }

const middle = ([a, b]: [number, number]) => (a + b) / 2
/** Where the access points are in the middle of a room or a strip, as [u, v]. */
export const ACCESS_POINT_SPOTS = {
  hall: { floor: 'first', at: [middle([STAIRWELL_HOLE[0], STAIRWELL_HOLE[1]]), middle([STAIRWELL_HOLE[2], STAIRWELL_HOLE[3]])] },
  office: { floor: 'ground', at: [middle(GROUND_OFFICE.u), middle(GROUND_OFFICE.v)] },
  garage: { floor: 'ground', at: [middle(GROUND_GARAGE.u), middle(GROUND_GARAGE.v)] },
} as const

/** An access point's three round boxes, named `access-point-<name>-body|ring|cap`: the body flat on the ceiling, the ring of light a hair proud of it, and the lighter cap inside the ring. */
export function accessPointBoxes(name: string, at: readonly [number, number], ceiling: number) {
  const disc = (part: string, diameter: number, y: [number, number], color: string, glow?: true) => ({
    id: `access-point-${name}-${part}`, u: [at[0] - diameter / 2, at[0] + diameter / 2] as [number, number], v: [at[1] - diameter / 2, at[1] + diameter / 2] as [number, number], y, color, round: true, ...(glow ? { glow } : {}),
  })
  const base = ceiling - ACCESS_POINT.thickness
  return [
    disc('body', ACCESS_POINT.diameter, [base, ceiling], '#f4f5f7'),
    disc('ring', ACCESS_POINT.ring, [base - .0006, base], '#5b6cff', true),
    disc('cap', ACCESS_POINT.cap, [base - .0012, base - .0006], '#f7f8fa'),
  ]
}
