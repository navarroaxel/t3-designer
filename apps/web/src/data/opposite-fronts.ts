import type { CornerPart, Point } from './corner-front.ts'
import { OPPOSITE_BLOCK, OPPOSITE_LOTS } from './opposite-block.ts'

/**
 * Paint and trim of the houses across the street, from Street View (August 2025): lot 23, the corner,
 * white with a beige base and a flat visor; lot 24, with a black front, red party walls and a black
 * fence and gate on the street line. Same house frame as the lot outlines: [u, v].
 */
const lot = (number: number) => OPPOSITE_LOTS.find(item => item.number === number)!

export const OPPOSITE_COLORS = {
  cornerWall: '#f0eeea', cornerRoof: '#d9d6cf', base: '#c8b48a',
  blackWall: '#2f2d2b', blackRoof: '#8f8f8b', roomWall: '#3a3835', red: '#c4472f', fence: '#1f1f21', slab: '#8d8d88',
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
  // The black fence and gate of lot 24's front garden, on the street line.
  { u: [street - .12, street], v: [v0 + .15, v1 - .15], y: [0, 1.7], color: OPPOSITE_COLORS.fence },
  // The red party walls on either side of the garden, 3 m deep.
  { u: [street - 3, street], v: [v0 - .15, v0], y: [0, 3.5], color: OPPOSITE_COLORS.red },
  { u: [street - 3, street], v: [v1, v1 + .15], y: [0, 3.7], color: OPPOSITE_COLORS.red },
  // The grey slab of the first floor, over the front garden's setback.
  { u: [street - 3.2, street - 2.8], v: [v0 + .1, v0 + 5.5], y: [3.1, 3.5], color: OPPOSITE_COLORS.slab },
]
