/**
 * The two street faces of the corner lot (lot 9) that the house does not see: the chamfer (the
 * ochava) and the face on the cross street, from Street View (August 2025). Positions are metres
 * along each face, read from the photo and scaled to the doors (about 2.1 m), so expect roughly
 * +/-0.3 m. House frame: [u, v], the same one as the lot outlines.
 */
export type Point = [number, number]
export type CornerPart = { s: [number, number]; y: [number, number]; color: string; depth: number }

/** Where the chamfer starts on the house's street line, where it meets the cross street, and the cross-street end. */
export const OCHAVA_START: Point = [-5, -10.965]
export const OCHAVA_END: Point = [-0.79, -15.175]
export const CROSS_STREET_END: Point = [8.28, -14.825]

export const CORNER_FACES = { ochava: [OCHAVA_START, OCHAVA_END], crossStreet: [OCHAVA_END, CROSS_STREET_END] } as const

const BRICK = '#a85a3d'
const CREAM_DARK = '#d9d3b8'
const GREY_BARS = '#8a949a'
const WHITE_DOOR = '#eef0ec'

/** The cream chamfer: brick panels either side of the ochre door, and the downpipe. */
export const OCHAVA_PARTS: CornerPart[] = [
  { s: [.14, 1.96], y: [.9, 2.15], color: BRICK, depth: .06 },
  { s: [2.3, 3.04], y: [0, 2.1], color: '#c79a3a', depth: .08 },
  { s: [3.2, 5.76], y: [.9, 2.15], color: BRICK, depth: .06 },
  { s: [4.82, 4.94], y: [0, 3.4], color: '#9aa0a0', depth: .1 }, // downpipe
  { s: [0, 5.95], y: [2.85, 3], color: CREAM_DARK, depth: .25 }, // ground-floor cornice
]

/** The white cross-street face: dark door, brick panels, wooden window, barred window and the side door. */
export const CROSS_STREET_PARTS: CornerPart[] = [
  { s: [.07, 1.34], y: [0, 2.1], color: '#4a1f24', depth: .08 },
  { s: [1.5, 2.7], y: [1, 2.2], color: BRICK, depth: .06 },
  { s: [2.85, 4.47], y: [1.2, 2.2], color: '#6b4f35', depth: .1 },
  { s: [4.64, 5.67], y: [1, 2.2], color: BRICK, depth: .06 },
  { s: [5.8, 7.1], y: [1.05, 2.2], color: GREY_BARS, depth: .1 },
  { s: [7.24, 8.08], y: [1, 2.2], color: BRICK, depth: .06 },
  { s: [8.2, 8.7], y: [0, 2.1], color: WHITE_DOOR, depth: .08 },
  { s: [0, 9.07], y: [2.85, 3], color: CREAM_DARK, depth: .25 }, // ground-floor cornice
  // Air conditioners on the wall above the dark door.
  { s: [.4, 1.5], y: [3.15, 3.65], color: '#f2f2f0', depth: .3 },
  { s: [1.8, 2.75], y: [2.2, 2.6], color: '#f2f2f0', depth: .3 },
  // Roller-shutter window of the upper room.
  { s: [1.6, 2.8], y: [3.7, 4.7], color: '#f1efe8', depth: .06 },
]

/** Volumes above the ground floor (heights from the photo): the terrace's parapet, the upper room and the white wall of the rear terrace. */
export const CORNER_UPPER = {
  /** The terrace over the chamfer runs back to the two-floor block, at v = -8.9. */
  terraceBackV: -8.9,
  terraceHeight: 4.3,
  roomHeight: 5.4,
  roomEndU: 4.4,
  /** The white wall along the cross street over the rear terrace: 1.5 m over the terrace's floor at 3 m. */
  parapetHeight: 4.5,
  parapetThickness: .15,
}

/** A point along a face and its outward normal (toward the street), in [u, v]. */
export function facePoint([a, b]: readonly [Point, Point], s: number) {
  const du = b[0] - a[0], dv = b[1] - a[1], length = Math.hypot(du, dv)
  return { u: a[0] + du / length * s, v: a[1] + dv / length * s, normal: [dv / length, -du / length] as Point, angle: Math.atan2(dv, du), length }
}

/**
 * The water tank on the corner's terrace (Street View): an fibre-cement cylinder of about 1 m across and
 * 1.2 m tall on a plastered room 1.6 m square that rises to 6.2 m. Its centre is 2 m along the chamfer
 * and 2.4 m in from its face.
 */
export const CORNER_TANK = { alongChamfer: 2, setback: 2.4, roomSide: 1.6, roomTop: 6.2, diameter: 1, top: 7.4, sides: 14 }

export function cornerTankCentre(): Point {
  const { u, v, normal } = facePoint(CORNER_FACES.ochava, CORNER_TANK.alongChamfer)
  return [u - normal[0] * CORNER_TANK.setback, v - normal[1] * CORNER_TANK.setback]
}

/**
 * The rear terrace of the corner (the roof of its ground floor, 3 m, between the PH's white entrance door and
 * our terrace), from the owner's photo: red floor, a white wall along the cross street, and on the rear side,
 * toward lot 10, a low white wall under a black railing. The rail follows the lot's rear boundary.
 */
export const CORNER_REAR_RAIL = { floor: 3, base: .45, top: 1.1, v: [-14.675, -9.4] as [number, number], bars: .12, color: '#1d1d1f', baseColor: '#ecebe5' }

/** The u of the lot's rear boundary at a given v (it leans from 8.28 on the cross street to 8.7 on the house's side). */
export const cornerRearU = (v: number) => CROSS_STREET_END[0] + (v - CROSS_STREET_END[1]) / (-4.225 - CROSS_STREET_END[1]) * (8.7 - CROSS_STREET_END[0])
