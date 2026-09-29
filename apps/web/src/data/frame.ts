/**
 * The house frame and its link to site coordinates.
 *
 * House frame: u runs toward the rear (south-east, away from the street), v toward the
 * north-east (the left side seen from the street), y is up. The street line, where the
 * facade and the neighbours' fronts stand, is u = -5. The roof slab spans u from -6 (its
 * front edge, 1 m past the street line) to 4, so its centre is u = -1 and the origin is
 * 1 m behind it.
 *
 * Site coordinates are metres: x east, z south, y up. The origin is the centre of the
 * Google Earth view that frames the house.
 */
export type SitePoint = [number, number]
export type PlanPoint = [number, number]

const S = Math.SQRT1_2
/** Site coordinates of the house frame's origin. */
export const HOUSE_CENTER: SitePoint = [-0.74 + S, -1.0 + S]
/** Three.js yaw that maps a group's local +x to the house's rear axis (u) and +z to -v. */
export const HOUSE_YAW = -Math.PI / 4

/** A point of the house frame in site coordinates. */
export const houseToSite = (u: number, v: number): SitePoint => [
  HOUSE_CENTER[0] + S * (u + v),
  HOUSE_CENTER[1] + S * (u - v),
]

/** A site point in the house frame, as [u, v]. */
export const siteToHouse = ([x, z]: SitePoint): PlanPoint => {
  const dx = x - HOUSE_CENTER[0], dz = z - HOUSE_CENTER[1]
  return [S * (dx + dz), S * (dx - dz)]
}

export const planToSite = (points: PlanPoint[]): SitePoint[] => points.map(([u, v]) => houseToSite(u, v))

/** Signed area of a ring, positive when counter-clockwise in its own axes. */
export function polygonArea(ring: readonly (readonly [number, number])[]): number {
  return ring.reduce((sum, a, i) => {
    const b = ring[(i + 1) % ring.length]
    return sum + a[0] * b[1] - b[0] * a[1]
  }, 0) / 2
}

/** Keep the part of a convex-or-not ring on one side of an axis-aligned line (Sutherland-Hodgman). */
export function clipRing(ring: PlanPoint[], axis: 0 | 1, keep: 'below' | 'above', value: number): PlanPoint[] {
  const inside = (point: PlanPoint) => keep === 'below' ? point[axis] <= value : point[axis] >= value
  const out: PlanPoint[] = []
  ring.forEach((current, index) => {
    const previous = ring[(index + ring.length - 1) % ring.length]
    const currentIn = inside(current), previousIn = inside(previous)
    if (currentIn !== previousIn) {
      const t = (value - previous[axis]) / (current[axis] - previous[axis])
      out.push([previous[0] + (current[0] - previous[0]) * t, previous[1] + (current[1] - previous[1]) * t])
    }
    if (currentIn) out.push(current)
  })
  return out
}
