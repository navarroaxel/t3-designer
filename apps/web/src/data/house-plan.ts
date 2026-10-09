import { AZOTEA_REAR, GROUND_WELL_EDGE, ENTRY_RECESS, FLOOR_HEIGHT, GARAGE_WIDTH, PARTY_WALL, WELL_BACK_U, WELL_BACK_WALL, HOUSE_HALF_WIDTH, HOUSE_REAR, houseSouthWestEdge } from './building-site.ts'
import { LAUNDRY } from './laundry.ts'

/**
 * Floor plans of the house, for the cutaway views. Only the exterior walls are
 * modelled; interior walls, stairs and rooms are not known yet.
 * Coordinates are in the house frame: u toward the rear (south-east), v toward the
 * north-east, metres, y up from the ground-floor level. The street line is u = -5.
 */
export type PlanPoint = [number, number]
export type Floor = 'ground' | 'first'
export type Opening = { u: number; v: [number, number]; y: [number, number] }
/** An opening in a wall that runs along u, at a fixed v. */
export type SideOpening = { v: number; u: [number, number]; y: [number, number] }
export type PlanBox = { center: [number, number, number]; size: [number, number, number] }

/** Assumed thickness of the exterior brick walls; not yet measured. */
export const WALL_THICKNESS = .3
/** The office on the ground floor is 2.05 m wide inside (owner). */
export const OFFICE_WIDTH = 2.05
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
  [-5, SW], [HOUSE_REAR.southWest, SW], [HOUSE_REAR.southWest, -1], [WELL_BACK_U, -1], [WELL_BACK_U, GROUND_WELL_EDGE], [HOUSE_REAR.northEast, GROUND_WELL_EDGE],
  [HOUSE_REAR.northEast, HALF], [-5, HALF], [-5, outer], [-5 + setback, outer], [-5 + setback, inner], [-5, inner],
]
// First floor: the 9 m x 8.5 m block under the azotea (the roof adds a 1 m cantilever in front); the house fills the 8.95 m lot.
export const FIRST_OUTLINE: PlanPoint[] = [[-5, SW], [AZOTEA_REAR, SW], [AZOTEA_REAR, HALF], [-5, HALF]]

/**
 * The entrance recess is open at ground level, but the first floor is built over it (HOUSE-ENTRY), so
 * the first-floor slab covers it too: the ground outline plus this rectangle.
 */
export const ENTRY_RECESS_OUTLINE: PlanPoint[] = [[-5, inner], [-5 + setback, inner], [-5 + setback, outer], [-5, outer]]

export const OUTLINES: Record<Floor, PlanPoint[]> = { ground: GROUND_OUTLINE, first: FIRST_OUTLINE }
export const FLOOR_LEVEL: Record<Floor, number> = { ground: 0, first: FLOOR_HEIGHT }

const REAR_DOOR_WIDTH = 1.78, REAR_WINDOW_WIDTH = 2.3, REAR_WINDOW_HEIGHT = 1.64
/** The window's sill is assumed: the owner gave its size, not its height above the floor. */
const REAR_WINDOW_SILL = .9
const TERRACE_CENTRE = (SW + -1) / 2
/**
 * The laundry door (owner): 0.80 m wide, like the living door but with one leaf, on the rear wall, 1.30 m from the
 * party wall with neighbour A, taken from the wall's inner face to the door's nearer edge. The laundry itself is
 * taken to be the roof of the left ground-floor band, at first-floor level.
 */
export const LAUNDRY_DOOR_WIDTH = .8
export const LAUNDRY_DOOR_FROM_PARTY_WALL = LAUNDRY.width - LAUNDRY_DOOR_WIDTH
const LAUNDRY_DOOR_CENTRE = HALF - PARTY_WALL - LAUNDRY_DOOR_FROM_PARTY_WALL - LAUNDRY_DOOR_WIDTH / 2
const LIGHT_WELL_CENTRE = (-1 + GROUND_WELL_EDGE) / 2
/** The ground-floor balcony door onto the light well (owner). Its 2.10 m height is assumed, like the other doors'. */
export const LIGHT_WELL_DOOR_WIDTH = 1.8

/** Centre of the secondary room's window, from Street View; its width, 2.04 m, is the owner's. */
const SECONDARY_WINDOW_CENTRE = -2.415

// Openings in the walls, from Street View and the owner. Heights are absolute.
export const OPENINGS: Record<Floor, Opening[]> = {
  ground: [
    { u: -5, v: [-3.87, .14], y: [0, 2.4] }, // garage door, on the street line
    { u: -4, v: [2.21, 3.5], y: [.3, 1.85] }, // barred window, in the recess
    { u: -4, v: [1.07, 1.91], y: [0, 2.1] }, // entrance door, in the recess
    // The light well's balcony door (owner): 1.80 m wide, centred on the well (v = -1 to 1.5), on the wall that closes it, at the rear wall.
    { u: WELL_BACK_U, v: [LIGHT_WELL_CENTRE - LIGHT_WELL_DOOR_WIDTH / 2, LIGHT_WELL_CENTRE + LIGHT_WELL_DOOR_WIDTH / 2], y: [0, 2.1] },
  ],
  first: [
    { u: -5, v: [.1, 3.1], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] }, // 3 m balcony door
    { u: -5, v: [SECONDARY_WINDOW_CENTRE - 1.02, SECONDARY_WINDOW_CENTRE + 1.02], y: [FLOOR_HEIGHT + 1, FLOOR_HEIGHT + 1.9] }, // 2.04 m window of the secondary room; its 1 m sill is the owner's, the 0.9 m height assumed
    // Rear wall (owner): a 1.78 m balcony door centred on the terrace, which spans from the south-west
    // wall to v = -1, and a 2.3 m wide by 1.64 m high window centred on the ground-floor light well (v = -1 to 1.5).
    { u: AZOTEA_REAR, v: [TERRACE_CENTRE - REAR_DOOR_WIDTH / 2, TERRACE_CENTRE + REAR_DOOR_WIDTH / 2], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] },
    { u: AZOTEA_REAR, v: [LIGHT_WELL_CENTRE - REAR_WINDOW_WIDTH / 2, LIGHT_WELL_CENTRE + REAR_WINDOW_WIDTH / 2], y: [FLOOR_HEIGHT + REAR_WINDOW_SILL, FLOOR_HEIGHT + REAR_WINDOW_SILL + REAR_WINDOW_HEIGHT] },
    // The laundry door, on the rear wall at the end of the kitchen's aisle.
    { u: AZOTEA_REAR, v: [LAUNDRY_DOOR_CENTRE - LAUNDRY_DOOR_WIDTH / 2, LAUNDRY_DOOR_CENTRE + LAUNDRY_DOOR_WIDTH / 2], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] },
  ],
}

/**
 * The office's window onto the light well (owner): 1.5 m wide, centred on the office, in the wall that runs along the well (v = 1.5). Its
 * sill, 0.9 m, and its 1.2 m height are assumed. The office is what lies between the arm's walls, u = 4 to 8.2.
 */
export const OFFICE_WINDOW_WIDTH = 1.5
export const OFFICE_WINDOW_SILL = .9
export const OFFICE_WINDOW_HEIGHT = 1.2
const officeMiddleU = (WELL_BACK_U + (HOUSE_REAR.northEast - PARTY_WALL)) / 2
/**
 * The right arm of the well, on the south-west (the ground floor under the terrace), has a 1.8 m window onto the well (owner), in the wall at
 * v = -1. That it is centred on the room, and its sill and height, the same as the office window's, are assumed.
 */
export const RIGHT_ARM_WINDOW_WIDTH = 1.8
const rightArmMiddleU = (WELL_BACK_U + (HOUSE_REAR.southWest - PARTY_WALL)) / 2
export const SIDE_OPENINGS: Record<Floor, SideOpening[]> = {
  ground: [
    { v: GROUND_WELL_EDGE, u: [officeMiddleU - OFFICE_WINDOW_WIDTH / 2, officeMiddleU + OFFICE_WINDOW_WIDTH / 2], y: [OFFICE_WINDOW_SILL, OFFICE_WINDOW_SILL + OFFICE_WINDOW_HEIGHT] },
    { v: -1, u: [rightArmMiddleU - RIGHT_ARM_WINDOW_WIDTH / 2, rightArmMiddleU + RIGHT_ARM_WINDOW_WIDTH / 2], y: [OFFICE_WINDOW_SILL, OFFICE_WINDOW_SILL + OFFICE_WINDOW_HEIGHT] },
  ],
  first: [],
}

export function polygonArea(ring: PlanPoint[]) {
  return ring.reduce((sum, a, i) => {
    const b = ring[(i + 1) % ring.length]
    return sum + a[0] * b[1] - b[0] * a[1]
  }, 0) / 2
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/**
 * The thickness of an exterior wall along an outline edge. The party walls, the medianeras, are 30 cm and shared: 15 cm stand on this lot
 * (owner). That goes for the two side walls and the rear wall, which the lot behind shares. The other exterior walls, the street front, the
 * recess and the walls of the light well, are wholly this house's and are 30 cm (assumed).
 */
export function exteriorThickness(a: PlanPoint, b: PlanPoint): number {
  const sameV = (value: number) => Math.abs(a[1] - value) < 1e-9 && Math.abs(b[1] - value) < 1e-9
  const sameU = (value: number) => Math.abs(a[0] - value) < 1e-9 && Math.abs(b[0] - value) < 1e-9
  const onParty = sameV(SW) || sameV(HALF) || sameU(HOUSE_REAR.southWest) || sameU(HOUSE_REAR.northEast)
  // The wall that closes the light well on the ground floor is a thin interior-like wall, 0.18 m (from the owner's depths). The first floor's rear wall, which
  // stands level with it along the whole width of the house, is a 0.30 m one (assumed): that is what leaves the kitchen-living 3.11 m wide.
  if (sameU(WELL_BACK_U)) return Math.abs(a[1] - b[1]) < 3 ? WELL_BACK_WALL : WALL_THICKNESS
  // The wall along the well, on the left arm's side, is what the office's 2.05 m (owner) leaves between the well's edge and the party wall: 0.33 m.
  if (sameV(GROUND_WELL_EDGE)) return HALF - PARTY_WALL - OFFICE_WIDTH - GROUND_WELL_EDGE
  return onParty ? PARTY_WALL : WALL_THICKNESS
}

/**
 * Exterior wall solids for one floor: a strip of `thickness` inside every edge of
 * the outline, from `y0` to `y1`, with the openings cut out of the walls that run
 * along v. Outlines must be axis-aligned. Reflex corners extend their strips so
 * no gap opens at the inside corner.
 */
export function wallBoxes(outline: PlanPoint[], openings: Opening[], y0: number, y1: number, thickness?: number, sideOpenings: readonly SideOpening[] = []): PlanBox[] {
  const thicknessOf = (a: PlanPoint, b: PlanPoint) => thickness ?? exteriorThickness(a, b)
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
    const edgeThickness = thicknessOf(a, b)
    const previous = outline[(index + count - 1) % count], following = outline[(index + 2) % count]
    const start = reflex(index) ? -thicknessOf(previous, a) : 0, end = length + (reflex((index + 1) % count) ? thicknessOf(b, following) : 0)
    if (Math.abs(du) < 1e-9) {
      // Runs along v at a fixed u: the walls that carry openings.
      const uLow = Math.min(a[0], a[0] + inward[0] * edgeThickness), uHigh = Math.max(a[0], a[0] + inward[0] * edgeThickness)
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
      const vLow = Math.min(a[1], a[1] + inward[1] * edgeThickness), vHigh = Math.max(a[1], a[1] + inward[1] * edgeThickness)
      const along = (s: number) => a[0] + dir[0] * s
      const [uLow, uHigh] = [Math.min(along(start), along(end)), Math.max(along(start), along(end))]
      const edgeLow = Math.min(a[0], b[0]), edgeHigh = Math.max(a[0], b[0])
      const here = sideOpenings
        .filter(opening => Math.abs(opening.v - a[1]) < 1e-6 && opening.u[0] >= edgeLow - 1e-6 && opening.u[1] <= edgeHigh + 1e-6)
        .sort((p, q) => p.u[0] - q.u[0])
      let cursor = uLow
      for (const opening of here) {
        add(cursor, opening.u[0], y0, y1, vLow, vHigh)
        add(opening.u[0], opening.u[1], y0, clamp(opening.y[0], y0, y1), vLow, vHigh)
        add(opening.u[0], opening.u[1], clamp(opening.y[1], y0, y1), y1, vLow, vHigh)
        cursor = opening.u[1]
      }
      add(cursor, uHigh, y0, y1, vLow, vHigh)
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
const SECONDARY_ROOM = { width: 3.09, depth: 3.41 } // 3.09 m at the front; see FRONT_ROOMS for the drawn width
const NE_INNER = HALF - PARTY_WALL
/** The south-west party wall's inner face, at the plan's mean position. */
const SW_INNER = SW + PARTY_WALL
export const FRONT_ROOMS = {
  main: { u: [INNER_FRONT, INNER_FRONT + MAIN_ROOM.depth] as [number, number], v: [NE_INNER - MAIN_ROOM.width, NE_INNER] as [number, number] },
  secondary: {
    u: [INNER_FRONT, INNER_FRONT + SECONDARY_ROOM.depth] as [number, number],
    // On the south-west the room is bounded by the party wall as drawn, at its mean position: the lot leans,
    // so the room is about 0.1 m narrower than the 3.09 m taken at the front, and nothing may enter the wall.
    v: [SW_INNER, NE_INNER - MAIN_ROOM.width - PARTITION_THICKNESS] as [number, number],
  },
}
/**
 * The secondary room's built-in wardrobe (owner): 0.60 m deep and 2.16 m wide, recessed into the wall
 * behind the room's back face, facing the window, and flush with the party wall on the south-west. It
 * takes its depth from the bathroom behind it, so the room keeps its size.
 */
export const WARDROBE = { depth: .6, width: 2.16, height: 2.4 }
/** Three doors of two leaves each across the wardrobe's width: six leaves, each with a 5 mm reveal. */
export const WARDROBE_DOORS = { doors: 3, leavesPerDoor: 2, reveal: .005 }
export const SECONDARY_WARDROBE = {
  u: [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + WARDROBE.depth] as [number, number],
  v: [FRONT_ROOMS.secondary.v[0], FRONT_ROOMS.secondary.v[0] + WARDROBE.width] as [number, number],
}

/** Leaf spans along v, each [v0, v1], from the party wall outward. */
const LEAF_COUNT = WARDROBE_DOORS.doors * WARDROBE_DOORS.leavesPerDoor
export const WARDROBE_LEAVES: [number, number][] = Array.from({ length: LEAF_COUNT }, (_, index) => {
  const width = WARDROBE.width / LEAF_COUNT
  return [SECONDARY_WARDROBE.v[0] + index * width + WARDROBE_DOORS.reveal / 2, SECONDARY_WARDROBE.v[0] + (index + 1) * width - WARDROBE_DOORS.reveal / 2] as [number, number]
})

/**
 * The secondary room's door (owner): 0.70 m wide, wenge-textured, on the room's back wall to the north-east
 * (left, seen from the window) of the wardrobe, centred in the 0.81 m of wall left beside it.
 */
export const SECONDARY_DOOR_WIDTH = .7
export const SECONDARY_DOOR_COLOR = '#3d2b22'
const doorSpan: [number, number] = [SECONDARY_WARDROBE.v[1] + PARTITION_THICKNESS, FRONT_ROOMS.secondary.v[1]]
export const SECONDARY_DOOR = {
  u: [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS] as [number, number],
  v: [(doorSpan[0] + doorSpan[1]) / 2 - SECONDARY_DOOR_WIDTH / 2, (doorSpan[0] + doorSpan[1]) / 2 + SECONDARY_DOOR_WIDTH / 2] as [number, number],
  y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] as [number, number],
}

/**
 * A single bed in the secondary room (owner: one 1-plaza bed): 0.90 m by 1.90 m and 0.5 m high, with its
 * head against the party wall (south-west) and centred on that wall's length.
 */
export const SINGLE_BED = { width: .9, length: 1.9, height: .5 }
const roomMiddleU = (FRONT_ROOMS.secondary.u[0] + FRONT_ROOMS.secondary.u[1]) / 2
export const SECONDARY_BED = {
  u: [roomMiddleU - SINGLE_BED.width / 2, roomMiddleU + SINGLE_BED.width / 2] as [number, number],
  v: [FRONT_ROOMS.secondary.v[0], FRONT_ROOMS.secondary.v[0] + SINGLE_BED.length] as [number, number],
}

/**
 * The bathroom (owner): behind the wardrobe, against the party wall, 2.16 m along the front and
 * 1.50 m deep inside, after the wardrobe's 0.60 m that it gives up.
 */
export const BATHROOM = { width: 2.16, depth: 1.5 }
const bathroomU0 = SECONDARY_WARDROBE.u[1] + PARTITION_THICKNESS
export const FIRST_FLOOR_BATHROOM = {
  u: [bathroomU0, bathroomU0 + BATHROOM.depth] as [number, number],
  v: [FRONT_ROOMS.secondary.v[0], FRONT_ROOMS.secondary.v[0] + BATHROOM.width] as [number, number],
}
/** Floor tiles are a thin layer over the slab. */
export const TILE_THICKNESS = .012
/**
 * Purastone Toscana Vena (owner), the kitchen's worktop and island top: a sintered slab of 3.20 m by 1.60 m,
 * 1.2 cm thick, with a warm ivory base and golden ochre veins, inspired by Italian marble; the built-up edge
 * of the worktop makes it thicker where it shows.
 */
// The slab's own picture (the maker's, cropped to its 3.2 by 1.6 m); the drawn veins stand in until it loads, and wherever a canvas is all there is.
export const TOSCANA_VENA_SLAB: TilePattern = { length: 3.2, width: 1.6, rows: 1, stagger: 0, grout: 0, veins: true, veinColor: 'rgba(176, 130, 58, .38)', image: '/textures/toscana-vena.jpg' }
export const TOSCANA_VENA_COLOR = '#e5dac0'

/** The bathroom's floor (owner): Navona natural, a travertine-coloured porcelain tile, 80 by 80 cm. */
export const BATHROOM_FLOOR = { color: '#d5c6a6', thickness: TILE_THICKNESS }

/**
 * The bathroom's door (owner): 0.70 m wide, natural oak, on its north-east wall, toward the wardrobe end, looking
 * onto the hall that lies between the main room's back wall and the kitchen-living.
 */
export const BATHROOM_DOOR_WIDTH = .7
export const BATHROOM_DOOR_COLOR = '#c8a06a'
/** Distance from the wardrobe's back panel to the door (owner: 5 cm). */
export const BATHROOM_DOOR_OFFSET = .05
const bathroomDoorU0 = FIRST_FLOOR_BATHROOM.u[0] + BATHROOM_DOOR_OFFSET
export const BATHROOM_DOOR = {
  u: [bathroomDoorU0, bathroomDoorU0 + BATHROOM_DOOR_WIDTH] as [number, number],
  v: [FIRST_FLOOR_BATHROOM.v[1], FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS] as [number, number],
  y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] as [number, number],
}

/**
 * It opens inward with the right hand, seen from the hall: the hinges are on the right, which is the
 * wardrobe end (facing south-west, the right hand points north-west, toward lower u), and the leaf
 * swings into the bathroom.
 */
export const BATHROOM_DOOR_SWING = { hingeU: BATHROOM_DOOR.u[0], hingeV: BATHROOM_DOOR.v[0], radius: BATHROOM_DOOR_WIDTH }

/**
 * A drywall (durlock) wall that divides the main room in two (owner), parallel to the party wall with
 * neighbour A and 1.5 m from it, taken from the party wall's inner face to the drywall's near face. It is
 * 0.10 m thick and runs from the back wall toward the street, stopping 0.70 m short of the front wall,
 * next to the balcony door: that gap is the only way into the walk-in closet, which has no door.
 */
export const DRYWALL = { distanceFromPartyWall: 1.5, thickness: .1, passage: .7 }
export const MAIN_ROOM_DRYWALL: [number, number, number, number] = [
  FRONT_ROOMS.main.u[0] + DRYWALL.passage, FRONT_ROOMS.main.u[1],
  NE_INNER - DRYWALL.distanceFromPartyWall - DRYWALL.thickness, NE_INNER - DRYWALL.distanceFromPartyWall,
]
/** The main room's walk-in closet: the 1.5 m strip along the party wall, entered by the passage at the front. */
export const MAIN_ROOM_CLOSET = {
  u: [FRONT_ROOMS.main.u[0], FRONT_ROOMS.main.u[1]] as [number, number],
  v: [NE_INNER - DRYWALL.distanceFromPartyWall, NE_INNER] as [number, number],
}

/**
 * The closet's built-in wardrobe (owner): 0.60 m deep along the whole party wall with neighbour A, the room's
 * full depth. It leaves 0.90 m of the closet's 1.5 m free to walk along.
 */
export const CLOSET_WARDROBE = { depth: .6, height: 2.4 }
export const MAIN_ROOM_CLOSET_WARDROBE = {
  u: [MAIN_ROOM_CLOSET.u[0], MAIN_ROOM_CLOSET.u[1]] as [number, number],
  v: [MAIN_ROOM_CLOSET.v[1] - CLOSET_WARDROBE.depth, MAIN_ROOM_CLOSET.v[1]] as [number, number],
}

/**
 * The closet wardrobe has sliding doors (owner). The number of panels is assumed: five of about 0.91 m, which
 * overlap a little and run on two tracks, the odd ones on the track nearer the aisle. Spans are along u.
 */
export const CLOSET_SLIDING_DOORS = { panels: 5, overlap: .03, thickness: .02, trackGap: .025 }
export type SlidingPanel = { u: [number, number]; v: [number, number]; front: boolean }
export const CLOSET_SLIDING_PANELS: SlidingPanel[] = Array.from({ length: CLOSET_SLIDING_DOORS.panels }, (_, index) => {
  const [u0, u1] = MAIN_ROOM_CLOSET_WARDROBE.u
  const width = (u1 - u0) / CLOSET_SLIDING_DOORS.panels
  const front = index % 2 === 0
  // The wardrobe's face toward the aisle is at v[0]; the front track is the nearer one.
  const vFace = MAIN_ROOM_CLOSET_WARDROBE.v[0] - (front ? 0 : CLOSET_SLIDING_DOORS.thickness + CLOSET_SLIDING_DOORS.trackGap)
  return {
    u: [Math.max(u0, u0 + index * width - CLOSET_SLIDING_DOORS.overlap / 2), Math.min(u1, u0 + (index + 1) * width + CLOSET_SLIDING_DOORS.overlap / 2)] as [number, number],
    v: [vFace - CLOSET_SLIDING_DOORS.thickness, vFace] as [number, number],
    front,
  }
})

/**
 * The door between the hall and the living (owner's photo): white and glazed, one and a half leaves: a wide
 * leaf of 0.80 m with the handle and a narrow one of 0.40 m beside it, 1.20 m in all (owner). It stands 30 cm from the bathroom (owner), so it
 * only partly faces the secondary room's door across the hall; centred on that door it would cut into the bathroom. It opens with the right hand, into the living: the wide leaf is hinged on the south-west end.
 */
export const LIVING_DOOR_WIDTH = 1.2
export const LIVING_DOOR_LEAVES = { wide: .8, narrow: .4 }
export const LIVING_DOOR_COLOR = '#f3f2ee'
/** White-painted aluminium frame with glass, drawn as stiles, a bottom rail and a translucent pane (owner). */
export const LIVING_DOOR_FRAME = { material: 'aluminium', profile: .05, bottomRail: .12, glass: '#bcd6df', glassOpacity: .35 }
/** 30 cm from the bathroom's north-east wall, toward the north-east (left, coming in from the hall): the owner moved it there. */
export const LIVING_DOOR_FROM_BATHROOM = .3
const livingDoorV0 = FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS + LIVING_DOOR_FROM_BATHROOM
export const LIVING_DOOR = {
  u: [FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS] as [number, number],
  v: [livingDoorV0, livingDoorV0 + LIVING_DOOR_WIDTH] as [number, number],
  y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] as [number, number],
}

/** The main room's wall along the hall steps back this far (owner), so the hall is wider there. */
export const MAIN_ROOM_SETBACK = .2

/**
 * The main room's door (owner): 0.80 m wide, wenge, on the wall that steps back, centred on the stretch
 * of it past the joint with the secondary room's wall.
 */
export const MAIN_DOOR_WIDTH = .8
const mainDoorSpan: [number, number] = [FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.u[1]]
export const MAIN_DOOR = {
  u: [(mainDoorSpan[0] + mainDoorSpan[1]) / 2 - MAIN_DOOR_WIDTH / 2, (mainDoorSpan[0] + mainDoorSpan[1]) / 2 + MAIN_DOOR_WIDTH / 2] as [number, number],
  v: [FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK - PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK] as [number, number],
  y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] as [number, number],
}

/** Interior walls of the first floor as [u0, u1, v0, v1]. */
export const FIRST_FLOOR_PARTITIONS: [number, number, number, number][] = [
  // Between the two rooms, along the main room's depth.
  [FRONT_ROOMS.main.u[0], FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS, FRONT_ROOMS.main.v[0]],
  // Past the secondary room, along the hall, the main room's wall steps back 20 cm, widening the hall.
  [FRONT_ROOMS.secondary.u[1], MAIN_DOOR.u[0], FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS + MAIN_ROOM_SETBACK, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK],
  [MAIN_DOOR.u[1], FRONT_ROOMS.main.u[1], FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS + MAIN_ROOM_SETBACK, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK],
  [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK],
  // The drywall wall that divides the main room in two.
  MAIN_ROOM_DRYWALL,
  // The main room's back wall.
  [FRONT_ROOMS.main.u[1], FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK, FRONT_ROOMS.main.v[1]],
  // The secondary room's back wall, beside the wardrobe's recess.
  // Two short returns either side of the door.
  [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, SECONDARY_WARDROBE.v[1] + PARTITION_THICKNESS, SECONDARY_DOOR.v[0]],
  [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, SECONDARY_DOOR.v[1], FRONT_ROOMS.secondary.v[1]],
  // The north-east wall of the wardrobe and the bathroom, running from the room's back face to the bathroom's back wall.
  // Split around the bathroom's door, which opens onto the hall.
  [FRONT_ROOMS.secondary.u[1], BATHROOM_DOOR.u[0], SECONDARY_WARDROBE.v[1], SECONDARY_WARDROBE.v[1] + PARTITION_THICKNESS],
  [BATHROOM_DOOR.u[1], FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS, SECONDARY_WARDROBE.v[1], SECONDARY_WARDROBE.v[1] + PARTITION_THICKNESS],
  // The wardrobe's back panel, which is the bathroom's front wall.
  [SECONDARY_WARDROBE.u[1], SECONDARY_WARDROBE.u[1] + PARTITION_THICKNESS, SECONDARY_WARDROBE.v[0], SECONDARY_WARDROBE.v[1]],
  // The bathroom's back wall.
  // The bathroom's back wall continues from party wall to party wall: behind it is the kitchen-living.
  // Split around the door to the hall.
  [FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.v[0], LIVING_DOOR.v[0]],
  [FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS, LIVING_DOOR.v[1], NE_INNER],
]


/**
 * The kitchen-living (owner): one long room from party wall to party wall, between that wall and the
 * rear wall of the first floor. It holds the terrace door and the light-well window.
 */
export const KITCHEN_LIVING = {
  u: [FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS, AZOTEA_REAR - WALL_THICKNESS] as [number, number],
  v: [FIRST_FLOOR_BATHROOM.v[0], NE_INNER] as [number, number],
}

/**
 * The three doors open with the right hand, seen by someone coming in from the hall, and swing into the room.
 * A hinge point, the direction across the closed opening and the direction the open leaf points, all in [u, v].
 */
export type DoorSwing = { id: string; hinge: PlanPoint; closed: PlanPoint; open: PlanPoint; radius: number; color: string; glazed?: boolean }
export const MAIN_DOOR_COLOR = '#3d2b22'
export const FIRST_FLOOR_DOOR_SWINGS: DoorSwing[] = [
  // Main room: coming in facing north-east the right hand is south-east (higher u); the leaf swings into the room.
  { id: 'main', hinge: [MAIN_DOOR.u[1], MAIN_DOOR.v[1]], closed: [-1, 0], open: [0, 1], radius: MAIN_DOOR_WIDTH, color: MAIN_DOOR_COLOR },
  // Secondary room: facing north-west the right hand is north-east (higher v); the leaf swings toward the window.
  { id: 'secondary', hinge: [SECONDARY_DOOR.u[0], SECONDARY_DOOR.v[1]], closed: [0, -1], open: [-1, 0], radius: SECONDARY_DOOR_WIDTH, color: SECONDARY_DOOR_COLOR },
  // Bathroom: facing south-west the right hand is north-west (lower u); the leaf swings into the bathroom.
  // Living: coming in from the hall facing south-east the right hand is south-west (lower v); the wide leaf swings into the living.
  { id: 'living', hinge: [LIVING_DOOR.u[1], LIVING_DOOR.v[0]], closed: [0, 1], open: [1, 0], radius: LIVING_DOOR_LEAVES.wide, color: LIVING_DOOR_COLOR, glazed: true },
  // Laundry: coming in from the kitchen facing south-east the right hand is south-west (lower v); the leaf swings into the laundry.
  { id: 'laundry', hinge: [AZOTEA_REAR, LAUNDRY_DOOR_CENTRE - LAUNDRY_DOOR_WIDTH / 2], closed: [0, 1], open: [1, 0], radius: LAUNDRY_DOOR_WIDTH, color: LIVING_DOOR_COLOR, glazed: true },
  { id: 'bathroom', hinge: [BATHROOM_DOOR_SWING.hingeU, BATHROOM_DOOR_SWING.hingeV], closed: [1, 0], open: [0, -1], radius: BATHROOM_DOOR_WIDTH, color: BATHROOM_DOOR_COLOR },
]

/**
 * The main room's TV (owner): a Samsung OLED S90 of 55 inches, hung on a wall bracket, hung on the wall it shares with the secondary room, centred
 * between the front wall and the hall-side wall, and facing the main room. A 55 inch 16:9 screen is 1.218 m by 0.685 m
 * (the diagonal is 1.397 m); the body is about 0.03 m thick and the folded wall mount (TV_MOUNT) holds it 67 mm off the wall; its VESA pattern is 200 by 200 (assumed).
 * The height of its centre, 1.1 m, is assumed.
 */
/**
 * The wall mount of both TVs (owner's pick): an articulated, full-motion VESA bracket, 50 kg, black steel. A plate on the wall (440 by 135 mm), two
 * links, a head plate and two vertical rails 420 mm long that take the TV's VESA holes (100 to 400 mm apart). It folds to 67 mm from the wall and reaches
 * 355 mm; it tilts +3 to -15 degrees, swivels +-60 and levels +-3. The TVs hang with it folded.
 */
export const TV_MOUNT = {
  model: 'Articulated full-motion VESA wall mount', maxKg: 50, width: .44, railHeight: .42, plateHeight: .135, depthFolded: .067, depthExtended: .355,
  tiltDegrees: [-15, 3] as const, swivelDegrees: 60, levelDegrees: 3, vesaWidthRange: [.1, .4] as const,
}
export const MAIN_TV = { model: 'Samsung OLED S90', inches: 55, aspect: [16, 9] as const, thickness: .03, standoff: TV_MOUNT.depthFolded, centreHeight: 1.55, vesa: [.2, .2] as const }
const TV_DIAGONAL = MAIN_TV.inches * .0254
const TV_HYPOT = Math.hypot(MAIN_TV.aspect[0], MAIN_TV.aspect[1])
export const TV_SIZE = { width: TV_DIAGONAL * MAIN_TV.aspect[0] / TV_HYPOT, height: TV_DIAGONAL * MAIN_TV.aspect[1] / TV_HYPOT }
/** Plan footprint of the TV and its bracket, on the main room's face of the shared wall: [u0, u1, v0, v1]. */
// Centred between the front wall and the hall-side wall, across the room's whole depth (owner), not on the shorter
// stretch it shares with the secondary room; it still hangs on that shared stretch.
const sharedWallMiddleU = (FRONT_ROOMS.main.u[0] + FRONT_ROOMS.main.u[1]) / 2
export const MAIN_TV_PLACEMENT = {
  u: [sharedWallMiddleU - TV_SIZE.width / 2, sharedWallMiddleU + TV_SIZE.width / 2] as [number, number],
  /** The wall's face on the main room's side is at main.v[0]. */
  v: [FRONT_ROOMS.main.v[0] + MAIN_TV.standoff, FRONT_ROOMS.main.v[0] + MAIN_TV.standoff + MAIN_TV.thickness] as [number, number],
  bracket: { v: [FRONT_ROOMS.main.v[0], FRONT_ROOMS.main.v[0] + MAIN_TV.standoff] as [number, number], width: TV_MOUNT.width, height: TV_MOUNT.plateHeight },
  y: [FLOOR_HEIGHT + MAIN_TV.centreHeight - TV_SIZE.height / 2, FLOOR_HEIGHT + MAIN_TV.centreHeight + TV_SIZE.height / 2] as [number, number],
}

/**
 * A queen bed in the main room (owner): 1.60 m by 2.00 m and 0.5 m high, its head against the drywall wall,
 * on the side of the TV, and centred like the TV, between the front wall and the hall-side wall.
 */
export const QUEEN_BED = { width: 1.6, length: 2, height: .5 }
const mainRoomMiddleU = (FRONT_ROOMS.main.u[0] + FRONT_ROOMS.main.u[1]) / 2
export const MAIN_BED = {
  u: [mainRoomMiddleU - QUEEN_BED.width / 2, mainRoomMiddleU + QUEEN_BED.width / 2] as [number, number],
  /** The head is on the drywall's face toward the TV, at MAIN_ROOM_DRYWALL v[0]. */
  v: [MAIN_ROOM_DRYWALL[2] - QUEEN_BED.length, MAIN_ROOM_DRYWALL[2]] as [number, number],
}

/**
 * The living's TV (owner): a Samsung OLED of 65 inches (1.439 m by 0.809 m), hung on the party wall with the
 * corner, on the bathroom's side, and centred on the living's depth. The height of its centre is
 * 1.35 m (owner: 30 cm above the 1.05 m first assumed). The cutaway draws it whole, even where it reaches past its 1.5 m cut for the walls.
 */
export const LIVING_TV = { model: 'Samsung OLED', inches: 65, thickness: .03, standoff: TV_MOUNT.depthFolded, centreHeight: 1.35, vesa: [.4, .3] as const }
const LIVING_TV_DIAGONAL = LIVING_TV.inches * .0254
export const LIVING_TV_SIZE = { width: LIVING_TV_DIAGONAL * 16 / TV_HYPOT, height: LIVING_TV_DIAGONAL * 9 / TV_HYPOT }
const livingMiddleU = (KITCHEN_LIVING.u[0] + KITCHEN_LIVING.u[1]) / 2
export const LIVING_TV_PLACEMENT = {
  u: [livingMiddleU - LIVING_TV_SIZE.width / 2, livingMiddleU + LIVING_TV_SIZE.width / 2] as [number, number],
  /** The party wall's face inside the living is at KITCHEN_LIVING v[0]. */
  v: [KITCHEN_LIVING.v[0] + LIVING_TV.standoff, KITCHEN_LIVING.v[0] + LIVING_TV.standoff + LIVING_TV.thickness] as [number, number],
  bracket: { v: [KITCHEN_LIVING.v[0], KITCHEN_LIVING.v[0] + LIVING_TV.standoff] as [number, number], width: TV_MOUNT.width, height: TV_MOUNT.plateHeight },
  y: [FLOOR_HEIGHT + LIVING_TV.centreHeight - LIVING_TV_SIZE.height / 2, FLOOR_HEIGHT + LIVING_TV.centreHeight + LIVING_TV_SIZE.height / 2] as [number, number],
}

/**
 * Porcelain floors (owner): Saing almendra in the bedrooms and Saing miel in the living, both 20 by 120 cm
 * wood-look planks, and Navona natural (80 by 80 cm, travertine-look) in the bathroom. "The
 * room" was taken to mean both bedrooms, the main one with its closet. Each zone is a list of rectangles
 * [u0, u1, v0, v1] inside the walls; the hall is not tiled here because its floor was not specified.
 */
/** How a floor is laid: the piece's size, rows before the pattern repeats, the shift between rows and the joint. */
export type TilePattern = { length: number; width: number; rows: number; stagger: number; grout: number; veins: boolean; veinColor?: string; /** A picture of the whole slab (one repeat), used instead of the drawn pattern. */ image?: string }
/** `level` is the height of the floor's top; the first floor's, FLOOR_HEIGHT, when it is left out. */
export type FloorTiling = { id: string; color: string; rects: [number, number, number, number][]; pattern: TilePattern; level?: number }
/** Saing almendra and Saing miel (San Lorenzo Design): wood-look porcelain planks, 20 cm by 120 cm, satin. */
export const SAING_PLANKS: TilePattern = { length: 1.2, width: .2, rows: 3, stagger: 1 / 3, grout: .003, veins: false }
/** Navona natural (San Lorenzo Design): beige travertine-look porcelain, 80 cm by 80 cm, satin, rectified, so a fine joint. */
export const NAVONA_TILES: TilePattern = { length: .8, width: .8, rows: 1, stagger: 0, grout: .0015, veins: true }
/** The floor's tile stops where the stairwell starts (the hall's wall on the garage side, the recess's inner end). */
const GROUND_HALL_V0_FOR_TILES = inner
export const FLOOR_TILING: FloorTiling[] = [
  {
    id: 'bedrooms', color: '#cbb08b', pattern: SAING_PLANKS,
    rects: [
      // The main room, with its closet: the 20 cm setback of the wall along the hall narrows its last stretch.
      [FRONT_ROOMS.main.u[0], FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.main.v[0], FRONT_ROOMS.main.v[1]],
      [FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.main.u[1], FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK, FRONT_ROOMS.main.v[1]],
      [FRONT_ROOMS.secondary.u[0], FRONT_ROOMS.secondary.u[1], FRONT_ROOMS.secondary.v[0], FRONT_ROOMS.secondary.v[1]],
    ],
  },
  // The first-floor terrace, over the rear ground-floor band, has the bathroom's tile (owner): from the house's rear wall to
  // the rear boundary, between the party-wall wall and the railing wall.
  { id: 'terrace', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[AZOTEA_REAR, HOUSE_REAR.southWest, houseSouthWestEdge((AZOTEA_REAR + HOUSE_REAR.southWest) / 2) + .15, -1 - .15]] },
  // The hall has the living's floor (owner): the stretch beside the bathroom, and the wider one behind the main room and the closet.
  {
    id: 'hall', color: '#c69a5d', pattern: SAING_PLANKS,
    rects: [
      [FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK - PARTITION_THICKNESS],
      // Behind the main room and the closet: only up to the stairwell, which is open.
      [FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS, GROUND_HALL_V0_FOR_TILES],
    ],
  },
  // The laundry, continuous with the kitchen, has the bathroom's tile too (owner). It is taken to be the roof of the left
  // ground-floor band, at first-floor level, inset 0.15 m from its edges for the walls.
  { id: 'laundry', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[AZOTEA_REAR, HOUSE_REAR.northEast - PARTY_WALL, NE_INNER - LAUNDRY.width, NE_INNER]] },
  { id: 'living', color: '#c69a5d', pattern: SAING_PLANKS, rects: [[KITCHEN_LIVING.u[0], KITCHEN_LIVING.u[1], KITCHEN_LIVING.v[0], KITCHEN_LIVING.v[1]]] },
  { id: 'bathroom', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[FIRST_FLOOR_BATHROOM.u[0], FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.v[0], FIRST_FLOOR_BATHROOM.v[1]]] },
]

/**
 * The first-floor balcony (owner): 7.94 m wide along the front and 0.86 m deep in front of the street line. Its
 * position along the front, centred on the facade, and its 0.3 m slab edge are assumed. A 0.3 m kerb (owner) runs up round its three outer sides, and the railing stands on it, up to the ceiling.
 * It stays in the first-floor cutaway.
 */
export const BALCONY = { width: 7.94, depth: .86, edge: .3, curb: .3, curbThickness: .1 }
/** The balcony floor is Navona natural, the bathroom's tile (owner). */
FLOOR_TILING.push({ id: 'balcony', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[-5 - BALCONY.depth, -5, -BALCONY.width / 2, BALCONY.width / 2]] })

/**
 * The front block of the ground floor (owner). The garage, under the secondary room, is 5.69 m deep and 4.43 m wide inside,
 * against the party wall with the corner (south-west). To its left seen from the street, north-east, is the hall (the
 * "recibidor"), behind the entrance recess. Both end at the same back wall, the "contrafrente", which runs from party wall to
 * party wall; it is drawn at the depth that gives the garage its 5.69 m from the front wall's inner face. The wall on the garage's side of the entrance recess continues
 * back to the contrafrente wall and separates the garage from the hall. What lies behind the contrafrente wall is not modelled yet.
 */
export const GARAGE = { depth: 5.69, width: GARAGE_WIDTH }
const groundBackU = INNER_FRONT + GARAGE.depth
export const GROUND_BACK_WALL: [number, number, number, number] = [groundBackU, groundBackU + PARTITION_THICKNESS, SW_INNER, NE_INNER]
// The wall on the garage's side of the entrance recess continues to the back wall (owner), so it is the garage's side wall: 0.3 m thick
// like the exterior walls, on the recess wall's line. The recess's width was corrected so that this wall falls where the garage's width
// puts it: the garage is 4.5 m wide inside (owner).
export const GROUND_GARAGE = {
  u: [INNER_FRONT, groundBackU] as [number, number],
  v: [SW_INNER, SW_INNER + GARAGE.width] as [number, number],
}
/** The hall is behind the entrance recess, whose back wall stands at u = -4 and is as thick as the exterior walls. */
export const GROUND_HALL = {
  u: [-5 + ENTRY_RECESS.setback + WALL_THICKNESS, groundBackU] as [number, number],
  v: [inner, NE_INNER] as [number, number],
}
/**
 * The wall of the light well's balcony door continues to its left, toward the north-east party wall (owner; drawn from the corner the exterior walls already close), and behind it, in the
 * left ground-floor band, is the office. The wall is as thick as the exterior walls, like the wall at the well, and closes the office's
 * front (u = 3.7 to 4.0). The office is 2.05 m wide inside (owner) and about 4.2 m deep (assumed).
 */
// The office is 2.05 m wide inside (owner), so its wall starts 0.33 m past the well's edge (v = 1.8): the exterior walls already extend through that reflex corner, and a wall from the edge would overlap them.
export const GROUND_OFFICE_WALL: [number, number, number, number] = [WELL_BACK_U - WELL_BACK_WALL, WELL_BACK_U, NE_INNER - OFFICE_WIDTH, NE_INNER]
export const GROUND_OFFICE = {
  u: [WELL_BACK_U, HOUSE_REAR.northEast - PARTY_WALL] as [number, number],
  v: [NE_INNER - OFFICE_WIDTH, NE_INNER] as [number, number],
}

/**
 * The office's door (owner): wenge, right-handed, in the wall that closes the office, 5 cm from the wall on the patio's side, not centred. Its
 * width, 0.80 m, and its 2.10 m height are assumed. Coming in from the rooms in front of it, facing south-east, the right hand is south-west (lower v): the
 * leaf is hinged on that end and swings into the office.
 */
export const OFFICE_DOOR_WIDTH = .8
export const OFFICE_DOOR_COLOR = '#3d2b22'
/** 5 cm from the wall on the patio's side, the light well's (owner). */
export const OFFICE_DOOR_FROM_PATIO_WALL = .05
const officeDoorStart = GROUND_OFFICE_WALL[2] + OFFICE_DOOR_FROM_PATIO_WALL
export const OFFICE_DOOR = {
  u: [GROUND_OFFICE_WALL[0], GROUND_OFFICE_WALL[1]] as [number, number],
  v: [officeDoorStart, officeDoorStart + OFFICE_DOOR_WIDTH] as [number, number],
  y: [0, 2.1] as [number, number],
}

/**
 * The doorway from the garage to the hall (owner): 0.70 m wide, 35 cm from the back wall. It has no door for now, only the opening, a door
 * arch. Its 2.10 m height is assumed.
 */
export const GARAGE_DOOR_WIDTH = .7
/** The arch's nearer edge stands 35 cm from the back wall (owner). */
export const GARAGE_DOOR_FROM_BACK_WALL = .35
const garageDoorEnd = groundBackU - GARAGE_DOOR_FROM_BACK_WALL
export const GARAGE_DOOR = {
  u: [garageDoorEnd - GARAGE_DOOR_WIDTH, garageDoorEnd] as [number, number],
  v: [GROUND_GARAGE.v[1], inner] as [number, number],
  y: [0, 2.1] as [number, number],
}

/**
 * The hall's doorway (owner): 1.2 m wide, without a door leaf, only the opening, and 8 cm from the wall on the garage's side, not centred.
 * Which wall it is in is assumed, the back wall, the contrafrente, which leads from the hall to the rest of the ground floor; its 2.10 m height too.
 */
export const HALL_ARCH_WIDTH = 1.2
/** 8 cm from the wall on the garage's side (owner). */
export const HALL_ARCH_FROM_GARAGE_WALL = .08
const hallArchStart = GROUND_HALL.v[0] + HALL_ARCH_FROM_GARAGE_WALL
export const HALL_ARCH = {
  u: [GROUND_BACK_WALL[0], GROUND_BACK_WALL[1]] as [number, number],
  v: [hallArchStart, hallArchStart + HALL_ARCH_WIDTH] as [number, number],
  y: [0, 2.1] as [number, number],
}

/**
 * The ground floor's living, which is its distributor (owner): from it one goes into the kitchen, the hall and the rest. It lies behind the back
 * wall, the contrafrente, up to the wall that closes the rear (the well's and the office's), and it is 4.97 m wide inside. Measured from the
 * party wall with neighbour A it spans v = -0.80 to 4.175, which takes in the hall's doorway in the contrafrente and the well's balcony door;
 * measured from the other side it would cut through that door. A 0.12 m wall closes it on the right, the south-west, with a 0.80 m door, 20 cm from
 * the wall the living shares with the light well (owner), which is taken to lead to the hall beyond; the door's leaf, colour and hand are not known, so only the opening is drawn.
 */
export const GROUND_LIVING_WIDTH = 4.97
export const GROUND_LIVING = {
  u: [GROUND_BACK_WALL[1], WELL_BACK_U - WELL_BACK_WALL] as [number, number],
  v: [NE_INNER - GROUND_LIVING_WIDTH, NE_INNER] as [number, number],
}
export const GROUND_LIVING_WALL: [number, number, number, number] = [GROUND_LIVING.u[0], GROUND_LIVING.u[1], GROUND_LIVING.v[0] - PARTITION_THICKNESS, GROUND_LIVING.v[0]]
export const LIVING_KITCHEN_DOOR_WIDTH = .8
/** The door's nearer edge stands 20 cm from the wall the living shares with the light well, at the rear (owner). */
export const LIVING_KITCHEN_DOOR_FROM_REAR_WALL = .2
const livingDoorEnd = GROUND_LIVING.u[1] - LIVING_KITCHEN_DOOR_FROM_REAR_WALL
export const LIVING_KITCHEN_DOOR = {
  u: [livingDoorEnd - LIVING_KITCHEN_DOOR_WIDTH, livingDoorEnd] as [number, number],
  v: [GROUND_LIVING_WALL[2], GROUND_LIVING_WALL[3]] as [number, number],
  y: [0, 2.1] as [number, number],
}

/**
 * The pantry ("despensa", the owner's name) is one of the three rooms beyond the living's 0.80 m door, the one against the garage's wall, which is
 * the contrafrente (owner). It is 1.73 m deep from that wall toward the rear and 3.14 m wide (owner), which is all the width between the living's
 * wall and the south-west party wall. Its door to the hall is in the wall that runs along v, perpendicular to the living's wall (owner); the door's
 * 0.7 m width and its centring are assumed, and only the opening is drawn. The hall is on the other side of that wall. The hall and the other two
 * rooms are not drawn yet. The living's 0.80 m door is beyond the pantry, in the hall.
 */
export const PANTRY = { depth: 1.73, width: 3.14, doorWidth: .7 }
export const GROUND_PANTRY = {
  u: [GROUND_BACK_WALL[1], GROUND_BACK_WALL[1] + PANTRY.depth] as [number, number],
  v: [GROUND_GARAGE.v[0], GROUND_LIVING_WALL[2]] as [number, number],
}
/**
 * The ground floor's bathroom (owner): 1.75 m deep and 2.06 m wide, against the pantry's far wall and against the south-west party wall, the
 * "medianera". Its depth is taken along u, out from the pantry's wall, and its width along the party wall. Its door is not known yet, so none is
 * drawn. Because it takes the south-west end of the pantry's far wall, the pantry's door is in the rest of that wall, between the bathroom and the living's
 * wall, and it leads to the hall that runs there: a strip beside the bathroom onto which the living's 0.80 m door opens.
 */
export const GROUND_BATHROOM_SIZE = { depth: 1.75, width: 2.06 }
export const GROUND_BATHROOM = {
  u: [GROUND_PANTRY.u[1] + PARTITION_THICKNESS, GROUND_PANTRY.u[1] + PARTITION_THICKNESS + GROUND_BATHROOM_SIZE.depth] as [number, number],
  v: [GROUND_PANTRY.v[0], GROUND_PANTRY.v[0] + GROUND_BATHROOM_SIZE.width] as [number, number],
}
/**
 * The ground bathroom's door (owner): 0.70 m wide, to the hall, which runs along the bathroom's north-east side, so it is in that wall, 10 cm from the
 * bathroom's back wall. Its 2.10 m height is assumed; the leaf's colour and hand are not known, so only the opening is drawn.
 */
export const GROUND_BATHROOM_DOOR_WIDTH = .7
/** The door's nearer edge stands 10 cm from the bathroom's back wall, its contrafrente (owner). */
export const GROUND_BATHROOM_DOOR_FROM_BACK_WALL = .1
const groundBathroomDoorEnd = GROUND_BATHROOM.u[1] - GROUND_BATHROOM_DOOR_FROM_BACK_WALL
export const GROUND_BATHROOM_DOOR = {
  u: [groundBathroomDoorEnd - GROUND_BATHROOM_DOOR_WIDTH, groundBathroomDoorEnd] as [number, number],
  v: [GROUND_BATHROOM.v[1], GROUND_BATHROOM.v[1] + PARTITION_THICKNESS] as [number, number],
  y: [0, 2.1] as [number, number],
}
/** The pantry's door is centred on the part of its far wall the bathroom leaves free. */
const pantryDoorMiddleV = (GROUND_BATHROOM.v[1] + PARTITION_THICKNESS + GROUND_PANTRY.v[1]) / 2
export const PANTRY_DOOR = {
  u: [GROUND_PANTRY.u[1], GROUND_PANTRY.u[1] + PARTITION_THICKNESS] as [number, number],
  v: [pantryDoorMiddleV - PANTRY.doorWidth / 2, pantryDoorMiddleV + PANTRY.doorWidth / 2] as [number, number],
  y: [0, 2.1] as [number, number],
}

/** Interior walls of the ground floor as [u0, u1, v0, v1]: the wall between the garage and the hall, and the contrafrente. */
export const GROUND_PARTITIONS: [number, number, number, number][] = [
  // The recess wall continuing to the back wall, between the garage and the hall, split around the door between them.
  // It starts past the recess's back wall, whose strip already runs through that corner.
  [-5 + setback + WALL_THICKNESS, GARAGE_DOOR.u[0], GROUND_GARAGE.v[1], inner],
  [GARAGE_DOOR.u[1], groundBackU, GROUND_GARAGE.v[1], inner],
  // The back wall, split around the hall's doorway.
  [GROUND_BACK_WALL[0], GROUND_BACK_WALL[1], GROUND_BACK_WALL[2], HALL_ARCH.v[0]],
  [GROUND_BACK_WALL[0], GROUND_BACK_WALL[1], HALL_ARCH.v[1], GROUND_BACK_WALL[3]],
  // The wall that closes the living on the right (south-west), split around its 0.80 m door.
  [GROUND_LIVING_WALL[0], LIVING_KITCHEN_DOOR.u[0], GROUND_LIVING_WALL[2], GROUND_LIVING_WALL[3]],
  [LIVING_KITCHEN_DOOR.u[1], GROUND_LIVING_WALL[1], GROUND_LIVING_WALL[2], GROUND_LIVING_WALL[3]],
  // The ground bathroom's walls: on its north-east side and at its back.
  [GROUND_BATHROOM.u[0], GROUND_BATHROOM_DOOR.u[0], GROUND_BATHROOM.v[1], GROUND_BATHROOM.v[1] + PARTITION_THICKNESS],
  [GROUND_BATHROOM_DOOR.u[1], GROUND_BATHROOM.u[1] + PARTITION_THICKNESS, GROUND_BATHROOM.v[1], GROUND_BATHROOM.v[1] + PARTITION_THICKNESS],
  [GROUND_BATHROOM.u[1], GROUND_BATHROOM.u[1] + PARTITION_THICKNESS, GROUND_BATHROOM.v[0], GROUND_BATHROOM.v[1] + PARTITION_THICKNESS],
  // The pantry's wall toward the hall, split around its door.
  [PANTRY_DOOR.u[0], PANTRY_DOOR.u[1], GROUND_PANTRY.v[0], PANTRY_DOOR.v[0]],
  [PANTRY_DOOR.u[0], PANTRY_DOOR.u[1], PANTRY_DOOR.v[1], GROUND_PANTRY.v[1]],
  // The office wall is split around the office door.
  [GROUND_OFFICE_WALL[0], GROUND_OFFICE_WALL[1], GROUND_OFFICE_WALL[2], OFFICE_DOOR.v[0]],
  [GROUND_OFFICE_WALL[0], GROUND_OFFICE_WALL[1], OFFICE_DOOR.v[1], GROUND_OFFICE_WALL[3]],
]

/** The ground floor's doors, drawn open like the first floor's, at ground level. */
export const GROUND_DOOR_SWINGS: DoorSwing[] = [
  { id: 'office', hinge: [OFFICE_DOOR.u[1], OFFICE_DOOR.v[0]], closed: [0, 1], open: [1, 0], radius: OFFICE_DOOR_WIDTH, color: OFFICE_DOOR_COLOR },
]

/**
 * The stairwell in the first-floor slab (owner): it coincides with the first floor's corridor, the strip between the main room's back wall
 * and the wall behind the bathroom, from the hall's wall on the garage side to the party wall with neighbour A. The last flight and the
 * second landing of the stair climb under it.
 */
export const STAIRWELL_HOLE: [number, number, number, number] = [
  FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.u[1], GROUND_HALL.v[0], NE_INNER,
]

/**
 * The ground floor's tiles, at ground level (owner): the bathroom has the first floor's bathroom tile, Navona natural, the living has the
 * first floor's living floor, Saing miel, the office the first floor's bedroom floor, Saing almendra, and the light well, the pulmón, the bathroom's
 * tile too. The other rooms' floors are not specified.
 */
/**
 * The ground floor's finished level, a few centimetres above the site: the lot's ground is drawn at 2.2 cm, and a floor below that would
 * be hidden under it.
 */
export const GROUND_FLOOR_LEVEL = .03
export const GROUND_FLOOR_TILING: FloorTiling[] = [
  { id: 'ground-bathroom', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, level: GROUND_FLOOR_LEVEL, rects: [[GROUND_BATHROOM.u[0], GROUND_BATHROOM.u[1], GROUND_BATHROOM.v[0], GROUND_BATHROOM.v[1]]] },
  // The light well, between the wall that closes it and the rear wall, and between its two side walls: the bathroom's tile, Navona natural.
  { id: 'ground-well', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, level: GROUND_FLOOR_LEVEL, rects: [[WELL_BACK_U, HOUSE_REAR.northEast - PARTY_WALL, -1, GROUND_WELL_EDGE]] },
  { id: 'ground-office', color: FLOOR_TILING.find(zone => zone.id === 'bedrooms')!.color, pattern: SAING_PLANKS, level: GROUND_FLOOR_LEVEL, rects: [[GROUND_OFFICE.u[0], GROUND_OFFICE.u[1], GROUND_OFFICE.v[0], GROUND_OFFICE.v[1]]] },
  { id: 'ground-living', color: FLOOR_TILING.find(zone => zone.id === 'living')!.color, pattern: SAING_PLANKS, level: GROUND_FLOOR_LEVEL, rects: [[GROUND_LIVING.u[0], GROUND_LIVING.u[1], GROUND_LIVING.v[0], GROUND_LIVING.v[1]]] },
]

/** The paint of the walls: the exterior walls' beige, which the party walls and the rear wall have inside, and the interior partitions' white. The drywall boxes under the ceiling are painted as the wall they run along. */
export const WALL_PAINT = { exterior: '#d9cdb2', partition: '#f3f1ec' } as const
