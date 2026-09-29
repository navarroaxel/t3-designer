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
 * The laundry door (owner): 0.70 m wide, like the living door but with one leaf, on the rear wall, 1.15 m from the
 * party wall with neighbour A, taken from the wall's inner face to the door's nearer edge. The laundry itself is
 * taken to be the roof of the left ground-floor band, at first-floor level.
 */
export const LAUNDRY_DOOR_WIDTH = .7
export const LAUNDRY_DOOR_FROM_PARTY_WALL = 1.15
const LAUNDRY_DOOR_CENTRE = HALF - WALL_THICKNESS - LAUNDRY_DOOR_FROM_PARTY_WALL - LAUNDRY_DOOR_WIDTH / 2
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
    // wall to v = -1, and a 2.3 m wide by 1.64 m high window centred on the ground-floor light well (v = -1 to 1.5).
    { u: 4, v: [TERRACE_CENTRE - REAR_DOOR_WIDTH / 2, TERRACE_CENTRE + REAR_DOOR_WIDTH / 2], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] },
    { u: 4, v: [LIGHT_WELL_CENTRE - REAR_WINDOW_WIDTH / 2, LIGHT_WELL_CENTRE + REAR_WINDOW_WIDTH / 2], y: [FLOOR_HEIGHT + REAR_WINDOW_SILL, FLOOR_HEIGHT + REAR_WINDOW_SILL + REAR_WINDOW_HEIGHT] },
    // The laundry door, on the rear wall at the end of the kitchen's aisle.
    { u: 4, v: [LAUNDRY_DOOR_CENTRE - LAUNDRY_DOOR_WIDTH / 2, LAUNDRY_DOOR_CENTRE + LAUNDRY_DOOR_WIDTH / 2], y: [FLOOR_HEIGHT, FLOOR_HEIGHT + 2.1] },
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
const SECONDARY_ROOM = { width: 3.09, depth: 3.41 } // 3.09 m at the front; see FRONT_ROOMS for the drawn width
const NE_INNER = HALF - WALL_THICKNESS
export const FRONT_ROOMS = {
  main: { u: [INNER_FRONT, INNER_FRONT + MAIN_ROOM.depth] as [number, number], v: [NE_INNER - MAIN_ROOM.width, NE_INNER] as [number, number] },
  secondary: {
    u: [INNER_FRONT, INNER_FRONT + SECONDARY_ROOM.depth] as [number, number],
    // On the south-west the room is bounded by the party wall as drawn, at its mean position: the lot leans,
    // so the room is about 0.1 m narrower than the 3.09 m taken at the front, and nothing may enter the wall.
    v: [SW + WALL_THICKNESS, NE_INNER - MAIN_ROOM.width - PARTITION_THICKNESS] as [number, number],
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
export const TOSCANA_VENA_SLAB: TilePattern = { length: 3.2, width: 1.6, rows: 1, stagger: 0, grout: 0, veins: true, veinColor: 'rgba(176, 130, 58, .38)' }
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
 * leaf of 0.80 m with the handle and a narrow one of 0.40 m beside it, 1.20 m in all (owner). It faces the secondary room's door across the hall, so it
 * lies on the same span of v; it starts at the bathroom's north-east wall, because centred on that door it would
 * cut into the bathroom. It opens with the right hand, into the living: the wide leaf is hinged on the south-west end.
 */
export const LIVING_DOOR_WIDTH = 1.2
export const LIVING_DOOR_LEAVES = { wide: .8, narrow: .4 }
export const LIVING_DOOR_COLOR = '#f3f2ee'
/** White-painted aluminium frame with glass, drawn as stiles, a bottom rail and a translucent pane (owner). */
export const LIVING_DOOR_FRAME = { material: 'aluminium', profile: .05, bottomRail: .12, glass: '#bcd6df', glassOpacity: .35 }
const livingDoorV0 = FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS
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
  u: [FIRST_FLOOR_BATHROOM.u[1] + PARTITION_THICKNESS, 4 - WALL_THICKNESS] as [number, number],
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
  { id: 'laundry', hinge: [4, LAUNDRY_DOOR_CENTRE - LAUNDRY_DOOR_WIDTH / 2], closed: [0, 1], open: [1, 0], radius: LAUNDRY_DOOR_WIDTH, color: LIVING_DOOR_COLOR, glazed: true },
  { id: 'bathroom', hinge: [BATHROOM_DOOR_SWING.hingeU, BATHROOM_DOOR_SWING.hingeV], closed: [1, 0], open: [0, -1], radius: BATHROOM_DOOR_WIDTH, color: BATHROOM_DOOR_COLOR },
]

/**
 * The main room's TV (owner): a Samsung OLED S90 of 55 inches, hung on a wall bracket, hung on the wall it shares with the secondary room, centred
 * between the front wall and the hall-side wall, and facing the main room. A 55 inch 16:9 screen is 1.218 m by 0.685 m
 * (the diagonal is 1.397 m); the body is about 0.03 m thick and the bracket holds it about 0.03 m off the wall.
 * The height of its centre, 1.1 m, is assumed.
 */
export const MAIN_TV = { model: 'Samsung OLED S90', inches: 55, aspect: [16, 9] as const, thickness: .03, standoff: .03, centreHeight: 1.1 }
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
  bracket: { v: [FRONT_ROOMS.main.v[0], FRONT_ROOMS.main.v[0] + MAIN_TV.standoff] as [number, number], width: .4, height: .3 },
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
 * corner, on the bathroom's side, and centred on the living's depth. The height of its centre, 1.05 m, is
 * assumed; it keeps the TV under the 1.5 m cut.
 */
export const LIVING_TV = { model: 'Samsung OLED', inches: 65, thickness: .03, standoff: .03, centreHeight: 1.05 }
const LIVING_TV_DIAGONAL = LIVING_TV.inches * .0254
export const LIVING_TV_SIZE = { width: LIVING_TV_DIAGONAL * 16 / TV_HYPOT, height: LIVING_TV_DIAGONAL * 9 / TV_HYPOT }
const livingMiddleU = (KITCHEN_LIVING.u[0] + KITCHEN_LIVING.u[1]) / 2
export const LIVING_TV_PLACEMENT = {
  u: [livingMiddleU - LIVING_TV_SIZE.width / 2, livingMiddleU + LIVING_TV_SIZE.width / 2] as [number, number],
  /** The party wall's face inside the living is at KITCHEN_LIVING v[0]. */
  v: [KITCHEN_LIVING.v[0] + LIVING_TV.standoff, KITCHEN_LIVING.v[0] + LIVING_TV.standoff + LIVING_TV.thickness] as [number, number],
  bracket: { v: [KITCHEN_LIVING.v[0], KITCHEN_LIVING.v[0] + LIVING_TV.standoff] as [number, number], width: .4, height: .3 },
  y: [FLOOR_HEIGHT + LIVING_TV.centreHeight - LIVING_TV_SIZE.height / 2, FLOOR_HEIGHT + LIVING_TV.centreHeight + LIVING_TV_SIZE.height / 2] as [number, number],
}

/**
 * Porcelain floors (owner): Saing almendra in the bedrooms and Saing miel in the living, both 20 by 120 cm
 * wood-look planks, and Navona natural (80 by 80 cm, travertine-look) in the bathroom. "The
 * room" was taken to mean both bedrooms, the main one with its closet. Each zone is a list of rectangles
 * [u0, u1, v0, v1] inside the walls; the hall is not tiled here because its floor was not specified.
 */
/** How a floor is laid: the piece's size, rows before the pattern repeats, the shift between rows and the joint. */
export type TilePattern = { length: number; width: number; rows: number; stagger: number; grout: number; veins: boolean; veinColor?: string }
export type FloorTiling = { id: string; color: string; rects: [number, number, number, number][]; pattern: TilePattern }
/** Saing almendra and Saing miel (San Lorenzo Design): wood-look porcelain planks, 20 cm by 120 cm, satin. */
export const SAING_PLANKS: TilePattern = { length: 1.2, width: .2, rows: 3, stagger: 1 / 3, grout: .003, veins: false }
/** Navona natural (San Lorenzo Design): beige travertine-look porcelain, 80 cm by 80 cm, satin, rectified, so a fine joint. */
export const NAVONA_TILES: TilePattern = { length: .8, width: .8, rows: 1, stagger: 0, grout: .0015, veins: true }
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
  { id: 'terrace', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[4, HOUSE_REAR.southWest, houseSouthWestEdge((4 + HOUSE_REAR.southWest) / 2) + .15, -1 - .15]] },
  // The hall has the living's floor (owner): the stretch beside the bathroom, and the wider one behind the main room and the closet.
  {
    id: 'hall', color: '#c69a5d', pattern: SAING_PLANKS,
    rects: [
      [FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] + MAIN_ROOM_SETBACK - PARTITION_THICKNESS],
      [FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS, FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.v[1] + PARTITION_THICKNESS, NE_INNER],
    ],
  },
  { id: 'living', color: '#c69a5d', pattern: SAING_PLANKS, rects: [[KITCHEN_LIVING.u[0], KITCHEN_LIVING.u[1], KITCHEN_LIVING.v[0], KITCHEN_LIVING.v[1]]] },
  { id: 'bathroom', color: BATHROOM_FLOOR.color, pattern: NAVONA_TILES, rects: [[FIRST_FLOOR_BATHROOM.u[0], FIRST_FLOOR_BATHROOM.u[1], FIRST_FLOOR_BATHROOM.v[0], FIRST_FLOOR_BATHROOM.v[1]]] },
]
