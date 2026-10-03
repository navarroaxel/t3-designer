/**
 * The front of the lot behind the house (lot 10) on the cross street, from Street View
 * (August 2025). It is the one-floor house, 7.80 m wide, painted light yellow, that shares its
 * rear wall with the house, its north-east neighbour and the corner. House frame: u along the
 * street, v across it; the wall stands at the lot's south-west end.
 */
export type FrontPart = { u: [number, number]; y: [number, number]; color: string; depth: number }

/** Light yellow of the front wall. */
export const REAR_LOT_WALL_COLOR = '#ead9a0'

export const REAR_LOT_FRONT = {
  /** The v of the front wall's outer face. */
  v: -14.825,
  /** Where the wall stands along the street: the lot's 7.80 m. */
  span: [8.28, 16.08] as [number, number],
  height: 3.3,
  /** Openings and trim, positioned from the photo at about 82 px per metre (roughly +/-0.2 m). */
  parts: [
    { u: [8.9, 11.4], y: [0, 2.1], color: '#f4f2ea', depth: .08 }, // white garage door, two leaves
    { u: [12, 12.9], y: [0, 2], color: '#f4f2ea', depth: .08 }, // white side door
    { u: [8.28, 16.08], y: [3.2, 3.3], color: '#d8c47e', depth: .2 }, // cornice under the parapet
  ] satisfies FrontPart[],
}

/**
 * Lot 7 (A), the house next to ours, from the owner's photos (October 2025): a balcony on the first
 * floor, 2 m deep, in the setback beside our house, behind a cream parapet with a brick cap on the
 * street line, with a red floor; the house stands behind it, with a barred door and a wide barred
 * window in green frames under a white gutter. House frame: u along the street, v across.
 */
const LEVEL = 3.3
export const A_FRONT = {
  /** Where the house's front wall stands. */
  u: -3,
  v: [4.33, 7.975] as [number, number],
  floor: { color: '#a24a3b', y: [LEVEL - .05, LEVEL] as [number, number] },
  /** Courses of brick on the parapet's top and its cap. */
  cap: [
    { y: [LEVEL + .6, LEVEL + .75], color: '#8f4a35', depth: .24 },
    { y: [LEVEL + .75, LEVEL + 1], color: '#a5533b', depth: .3 },
  ],
  parts: [
    { v: [4.55, 5.85], y: [LEVEL, LEVEL + 2.2], color: '#2f5d4a', depth: .08 }, // door frame
    { v: [4.7, 5.7], y: [LEVEL + .1, LEVEL + 2.1], color: '#262b2a', depth: .1 }, // door, barred glass
    { v: [6.15, 7.75], y: [LEVEL + .9, LEVEL + 2.4], color: '#4f6f5a', depth: .08 }, // window frame
    { v: [6.25, 7.65], y: [LEVEL + 1, LEVEL + 2.3], color: '#262b2a', depth: .1 }, // window, barred glass
    { v: [4.33, 7.975], y: [LEVEL + 2.55, LEVEL + 2.65], color: '#f2f2ee', depth: .12 }, // gutter
  ],
}
