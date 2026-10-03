import type { CornerPart, Point } from './corner-front.ts'
import { BLACK_HOUSE, OPPOSITE_BLOCK, OPPOSITE_LOTS } from './opposite-block.ts'

/**
 * Paint and trim of the houses across the street, from Street View (August 2025): lot 23, the corner,
 * white with a beige base and a flat visor; lot 24, with a black front, red party walls and a black
 * fence and gate on the street line; lot 25, a brick front on the street line with stone panels and a
 * black garage gate under a sloped metal visor. Same house frame as the lot outlines: [u, v].
 */
const lot = (number: number) => OPPOSITE_LOTS.find(item => item.number === number)!

export const OPPOSITE_COLORS = {
  cornerWall: '#f0eeea', cornerRoof: '#d9d6cf', base: '#c8b48a',
  blackWall: '#2f2d2b', blackRoof: '#8f8f8b', roomWall: '#ecebe5', tank: '#e9e7df', grey: '#a3a39e', tan: '#c9a56a', red: '#c4472f', fence: '#1f1f21', slab: '#8d8d88',
} as const

const corner = lot(23).building
/** The three street faces of lot 23's building: on the cross street, the chamfer, and on the street. */
export const CORNER_23_FACES: readonly (readonly [Point, Point])[] = [[corner[0], corner[1]], [corner[1], corner[2]], [corner[2], corner[3]]]

const faceLength = ([a, b]: readonly [Point, Point]) => Math.hypot(b[0] - a[0], b[1] - a[1])
/** Beige base and a white visor along a face of lot 23. */
export const cornerTrim = (face: readonly [Point, Point]): CornerPart[] => [
  { s: [0, faceLength(face)], y: [0, .9], color: OPPOSITE_COLORS.base, depth: .06 },
  { s: [0, faceLength(face)], y: [3.05, 3.4], color: '#f4f2ee', depth: .3 },
]

export type Slab = { u: [number, number]; v: [number, number]; y: [number, number]; color: string }
const [, , , v1] = lot(24).polygon.map(point => point[1])
const v0 = lot(24).polygon[0][1]
const street = OPPOSITE_BLOCK.frontU
/** Walls and fences drawn as plain boxes. */
export const OPPOSITE_SLABS: Slab[] = [
  // Lot 24's front garden, on the street line (owner's photos): the garage gate under its dark visor,
  // the planter by the stairs, a low fence with the pedestrian gate, and the meter pillar.
  { u: [street - .15, street], v: [v0 + .1, v0 + 3.7], y: [0, 2.2], color: OPPOSITE_COLORS.fence },
  { u: [street - 1.1, street + .05], v: [v0, v0 + 3.8], y: [2.2, 2.55], color: '#26262a' },
  { u: [street - .5, street], v: [v0 + 3.8, v0 + 5.3], y: [0, .45], color: OPPOSITE_COLORS.fence },
  { u: [street - .12, street], v: [v0 + 5.3, v1 - .7], y: [0, 1.1], color: OPPOSITE_COLORS.fence },
  { u: [street - .4, street], v: [v1 - .7, v1 - .15], y: [0, 1.8], color: OPPOSITE_COLORS.fence },
  // The red party walls on either side of the garden, 3 m deep.
  { u: [street - 3, street], v: [v0 - .15, v0], y: [0, 3.5], color: OPPOSITE_COLORS.red },
  { u: [street - 3, street], v: [v1, v1 + .15], y: [0, 3.7], color: OPPOSITE_COLORS.red },
]

/** The black house's front wall and the room's front on the roof: faces with metres along them from the left party wall. */
export const BLACK_FRONT_FACE: readonly [Point, Point] = [[street - BLACK_HOUSE.setback, v0], [street - BLACK_HOUSE.setback, v1]]
export const BLACK_ROOM_FACE: readonly [Point, Point] = [[street - BLACK_HOUSE.setback - BLACK_HOUSE.roomSetback, v0], [street - BLACK_HOUSE.setback - BLACK_HOUSE.roomSetback, v1]]

const { tan, grey } = OPPOSITE_COLORS
const WHITE = '#efeee9'
/**
 * The black front, from the owner's photos (October 2025), scaled to the 3.2 m floors: wooden
 * roller shutters and a barred window on the ground floor, the grey slab bands, the first floor's
 * barred balcony with its two tan panels, the white air conditioners, and the white balcony rail.
 */
export const BLACK_FRONT_PARTS: CornerPart[] = [
  { s: [.6, 2.9], y: [1.1, 2.3], color: tan, depth: .08 }, // ground floor, left shutter
  { s: [.6, 3.9], y: [.4, .7], color: '#24242a', depth: .35 }, // flower planter
  { s: [.6, 3.9], y: [.7, 1], color: '#7a8f4a', depth: .3 },
  { s: [3.6, 4.6], y: [0, 2.1], color: '#18181a', depth: .1 }, // door
  { s: [4.6, 6.7], y: [.75, 1.65], color: WHITE, depth: .08 }, // ground floor, right window
  { s: [4.6, 6.7], y: [1.65, 2.2], color: tan, depth: .1 },
  { s: [-.3, 8.5], y: [3.05, 3.4], color: grey, depth: .35 }, // slab of the first floor
  { s: [.6, 2.9], y: [3.5, 4.6], color: tan, depth: .06 }, // first floor balcony panels
  { s: [.6, 2.9], y: [4.75, 5.9], color: tan, depth: .06 },
  { s: [4.7, 6.9], y: [3.65, 4.4], color: WHITE, depth: .08 }, // first floor window, shutter above
  { s: [4.7, 6.9], y: [4.4, 5.25], color: tan, depth: .1 },
  { s: [3.8, 4.3], y: [4.9, 5.3], color: WHITE, depth: .3 }, // window air conditioner
  { s: [2.2, 3, ], y: [5.5, 6.1], color: WHITE, depth: .3 }, // split air conditioner
  { s: [-.3, 8.5], y: [6.1, 6.5], color: grey, depth: .35 }, // slab of the second floor
  { s: [-.15, .25], y: [3.2, 6.4], color: OPPOSITE_COLORS.red, depth: .1 }, // painted side wall
  { s: [0, 3.5], y: [7.3, 7.4], color: WHITE, depth: .06 }, // balcony rail of the room
  { s: [0, 3.5], y: [6.85, 6.9], color: WHITE, depth: .06 },
  { s: [0, 3.5], y: [6.5, 6.6], color: WHITE, depth: .06 },
]

/** The white room on the roof: its sliding door, in the room's front face. */
export const BLACK_ROOM_PARTS: CornerPart[] = [
  { s: [1.8, 2.9], y: [6.5, 8.4], color: WHITE, depth: .08 },
  { s: [1.9, 2.8], y: [6.6, 8.3], color: '#9fb0b8', depth: .1 },
]

/** Lot 23, the corner: the window with its roller shutter on the street face. */
export const CORNER_STREET_PARTS: CornerPart[] = [
  { s: [2.9, 5.4], y: [1.1, 2], color: '#f2f1ec', depth: .08 },
  { s: [3, 5.3], y: [1.5, 1.95], color: '#cfcdc4', depth: .12 },
]

// Lot 25: a 3.4 m brick wall on the street line over its south-west 5.5 m (stone panels and a barred
// window in it), and the garage gate with its visor over the remaining 3.1 m.
const w0 = lot(25).polygon[0][1]
const BRICK = '#a2452c', STONE = '#cfc8b0'
OPPOSITE_SLABS.push(
  { u: [street - .25, street], v: [w0, w0 + 5.5], y: [0, 3.4], color: BRICK },
  { u: [street, street + .04], v: [w0 + .3, w0 + 1.6], y: [1.9, 3.0], color: STONE },
  { u: [street, street + .04], v: [w0 + 2.6, w0 + 3.6], y: [1.9, 3.0], color: STONE },
  { u: [street, street + .04], v: [w0 + .4, w0 + 2.4], y: [.5, 1.7], color: STONE },
  { u: [street, street + .04], v: [w0 + 3.7, w0 + 5.2], y: [1.05, 2.1], color: '#2a2725' },
  { u: [street - .1, street + .02], v: [w0 + 5.6, w0 + 8.6], y: [0, 2.5], color: OPPOSITE_COLORS.fence },
  { u: [street - .15, street + 1.1], v: [w0 + 5.5, w0 + 8.66], y: [2.55, 2.7], color: '#c9ccce' },
)
