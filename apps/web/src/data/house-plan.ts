import { ENTRY_RECESS, FLOOR_HEIGHT, HOUSE_HALF_WIDTH, HOUSE_REAR, houseSouthWestEdge } from './building-site.ts'

/**
 * Floor plans of the house, for the cutaway views. Only the exterior walls are
 * modelled; interior walls, stairs and rooms are not known yet.
 * Coordinates are in the house frame: u toward the rear (south-east), v toward the
 * north-east, metres, y up from the ground-floor level. The street line is u = -5.
 */
export type PlanPoint = [number, number]
export type Floor = 'ground' | 'first'
export type Opening = { u: number; v: [number, number]; y: [number, number] }
export type PlanBox = { center: [number, number, number]; size: [number, number, number] }

/** Assumed thickness of the exterior brick walls; not yet measured. */
export const WALL_THICKNESS = .3
export const SLAB_THICKNESS = .2
/** The cutaway shows each floor as if sectioned this high above its floor. */
export const CUT_HEIGHT = 1.5

// Ground floor: garage and rooms, with the entrance recess at the front (1 m deep,
// between a 0.5 m wall and a 0.7 m pier) and the 2.5 m light well open at the rear.
const HALF = HOUSE_HALF_WIDTH
// The wall on the south-west boundary leans by 0.25 m over the house's depth. The plans have
// orthogonal walls, so that side is drawn at its mean position.
const SW = houseSouthWestEdge((-5 + HOUSE_REAR.southWest) / 2)
const { setback, outer, inner } = ENTRY_RECESS
export const GROUND_OUTLINE: PlanPoint[] = [
  [-5, SW], [HOUSE_REAR.southWest, SW], [HOUSE_REAR.southWest, -1], [4, -1], [4, 1.5], [HOUSE_REAR.northEast, 1.5],
  [HOUSE_REAR.northEast, HALF], [-5, HALF], [-5, outer], [-5 + setback, outer], [-5 + setback, inner], [-5, inner],
]
// First floor: the 9 m x 8.5 m block under the azotea (the roof adds a 1 m cantilever in front); the house fills the 8.95 m lot.
export const FIRST_OUTLINE: PlanPoint[] = [[-5, SW], [4, SW], [4, HALF], [-5, HALF]]

export const OUTLINES: Record<Floor, PlanPoint[]> = { ground: GROUND_OUTLINE, first: FIRST_OUTLINE }
export const FLOOR_LEVEL: Record<Floor, number> = { ground: 0, first: FLOOR_HEIGHT }

const REAR_DOOR_WIDTH = 1.78, REAR_WINDOW_WIDTH = 1.64, REAR_WINDOW_HEIGHT = 2.3
/** The window's sill is assumed: the owner gave its size, not its height above the floor. */
const REAR_WINDOW_SILL = .3
const TERRACE_CENTRE = (SW + -1) / 2
const LIGHT_WELL_CENTRE = (-1 + 1.5) / 2

/** Centre of the secondary room's window, from Street View; its width, 2.04 m, is the owner's. */
const SECONDARY_WINDOW_CENTRE = -2.415

// Openings in the walls, from Street View and the owner. Heights are absolute.
export const OPENINGS: Record<Floor, Opening[]> = {
  ground: [
    { u: -5, v: [-3.87, .14], y: [0, 2.4] }, // garage door, on the street line
    { u: -4, v: [2.21, 3.5], y: [.3, 1.85] }, // barred window, in the recess
    { u: -4, v: [1.07, 1.91], y: [0, 2.1] }, // entrance door, in the recess
  ],
  first: [
    { u: -5, v: [.1, 3.1], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] }, // 3 m balcony door
    { u: -5, v: [SECONDARY_WINDOW_CENTRE - 1.02, SECONDARY_WINDOW_CENTRE + 1.02], y: [FLOOR_HEIGHT + .7, FLOOR_HEIGHT + 1.6] }, // 2.04 m window of the secondary room
    // Rear wall, u = 4 (owner): a 1.78 m balcony door centred on the terrace, which spans from the south-west
    // wall to v = -1, and a 1.64 m by 2.3 m window centred on the ground-floor light well (v = -1 to 1.5).
    { u: 4, v: [TERRACE_CENTRE - REAR_DOOR_WIDTH / 2, TERRACE_CENTRE + REAR_DOOR_WIDTH / 2], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] },
    { u: 4, v: [LIGHT_WELL_CENTRE - REAR_WINDOW_WIDTH / 2, LIGHT_WELL_CENTRE + REAR_WINDOW_WIDTH / 2], y: [FLOOR_HEIGHT + REAR_WINDOW_SILL, FLOOR_HEIGHT + REAR_WINDOW_SILL + REAR_WINDOW_HEIGHT] },
  ],
}

export function polygonArea(ring: PlanPoint[]) {
  return ring.reduce((sum, a, i) => {
    const b = ring[(i + 1) % ring.length]
    return sum + a[0] * b[1] - b[0] * a[1]
  }, 0) / 2
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/**
 * Exterior wall solids for one floor: a strip of `thickness` inside every edge of
 * the outline, from `y0` to `y1`, with the openings cut out of the walls that run
 * along v. Outlines must be axis-aligned. Reflex corners extend their strips so
 * no gap opens at the inside corner.
 */
export function wallBoxes(outline: PlanPoint[], openings: Opening[], y0: number, y1: number, thickness = WALL_THICKNESS): PlanBox[] {
  const orientation = Math.sign(polygonArea(outline))
  const count = outline.length
  const boxes: PlanBox[] = []
  const add = (u0: number, u1: number, ya: number, yb: number, v0: number, v1: number) => {
    if (u1 - u0 < 1e-6 || yb - ya < 1e-6 || v1 - v0 < 1e-6) return
    boxes.push({ center: [(u0 + u1) / 2, (ya + yb) / 2, (v0 + v1) / 2], size: [u1 - u0, yb - ya, v1 - v0] })
  }
  const reflex = (index: number) => {
    const prev = outline[(index + count - 1) % count], at = outline[index], next = outline[(index + 1) % count]
    const cross = (at[0] - prev[0]) * (next[1] - at[1]) - (at[1] - prev[1]) * (next[0] - at[0])
    return cross * orientation < 0
  }
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % count]
    const du = b[0] - a[0], dv = b[1] - a[1], length = Math.hypot(du, dv)
    if (Math.min(Math.abs(du), Math.abs(dv)) > 1e-9) throw new Error('Wall outlines must be axis-aligned')
    const dir: PlanPoint = [du / length, dv / length]
    const inward: PlanPoint = orientation > 0 ? [-dir[1], dir[0]] : [dir[1], -dir[0]]
    const start = reflex(index) ? -thickness : 0, end = length + (reflex((index + 1) % count) ? thickness : 0)
    if (Math.abs(du) < 1e-9) {
      // Runs along v at a fixed u: the walls that carry openings.
      const uLow = Math.min(a[0], a[0] + inward[0] * thickness), uHigh = Math.max(a[0], a[0] + inward[0] * thickness)
      const along = (s: number) => a[1] + dir[1] * s
      const [vLow, vHigh] = [Math.min(along(start), along(end)), Math.max(along(start), along(end))]
      const edgeLow = Math.min(a[1], b[1]), edgeHigh = Math.max(a[1], b[1])
      const here = openings
        .filter(opening => Math.abs(opening.u - a[0]) < 1e-6 && opening.v[0] >= edgeLow - 1e-6 && opening.v[1] <= edgeHigh + 1e-6)
        .sort((p, q) => p.v[0] - q.v[0])
      let cursor = vLow
      for (const opening of here) {
        add(uLow, uHigh, y0, y1, cursor, opening.v[0])
        add(uLow, uHigh, y0, clamp(opening.y[0], y0, y1), opening.v[0], opening.v[1])
        add(uLow, uHigh, clamp(opening.y[1], y0, y1), y1, opening.v[0], opening.v[1])
        cursor = opening.v[1]
      }
      add(uLow, uHigh, y0, y1, cursor, vHigh)
    } else {
      const vLow = Math.min(a[1], a[1] + inward[1] * thickness), vHigh = Math.max(a[1], a[1] + inward[1] * thickness)
      const along = (s: number) => a[0] + dir[0] * s
      add(Math.min(along(start), along(end)), Math.max(along(start), along(end)), y0, y1, vLow, vHigh)
    }
  })
  return boxes
}

/**
 * The two rooms at the front of the first floor (owner), seen from the street: the main bedroom on the
 * left (north-east, with the 3 m balcony door), 5.12 m wide and 4.54 m deep, and the secondary room on
 * the right, 3.09 m wide and 3.41 m deep. Sizes are inside faces. The walls are 0.3 m outside and 0.12 m
 * between the rooms, which adds up to the 8.95 m front. What lies behind them is not modelled yet.
 */
export const PARTITION_THICKNESS = .12
const INNER_FRONT = -5 + WALL_THICKNESS
const MAIN_ROOM = { width: 5.12, depth: 4.54 }
const SECONDARY_ROOM = { width: 3.09, depth: 3.41 }
const NE_INNER = HALF - WALL_THICKNESS
export const FRONT_ROOMS = {
  main: { u: [INNER_FRONT, INNER_FRONT + MAIN_ROOM.depth] as [number, number], v: [NE_INNER - MAIN_ROOM.width, NE_INNER] as [number, number] },
  secondary: {
    u: [INNER_FRONT, INNER_FRONT + SECONDARY_ROOM.depth] as [number, number],
    v: [NE_INNER - MAIN_ROOM.width - PARTITION_THICKNESS - SECONDARY_ROOM.width, NE_INNER - MAIN_ROOM.width - PARTITION_THICKNESS] as [number, number],
  },
}
/** Interior walls of the first floor as [u0, u1, v0, v1]. */
export const FIRST_FLOOR_PARTITIONS: [number, number, number, number][] = [
  // Between the two rooms, along the main room's depth.
  [FRONT_ROOMS.main.u[0], FRONT_ROOMS.main.u[1], FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS, FRONT_ROOMS.main.v[0]],
  // The main room's back wall.
  [FRONT_ROOMS.main.u[1], FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0], FRONT_ROOMS.main.v[1]],
  // The secondary room's back wall.
  [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.secondary.v[0], FRONT_ROOMS.secondary.v[1]],
]
