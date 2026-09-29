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
