import type { PlanPoint } from './frame.ts'

/**
 * The block across the street from the house, from its municipal block plan (a hand sketch, block
 * outer sides 86.28 m along the street and 140.16 m deep). Lots are digitised by eye as rectangles on
 * the plan image and converted to the house frame, good to a metre or two. Their buildings are not
 * known: each stands in the band nearest its street with a default height.
 *
 * On the plan the street runs down the right edge; the corner street at the bottom is the one the
 * house's corner lot faces (the lower house numbers are at the top, so the bottom is the south-west).
 */
export const OPPOSITE_BLOCK = {
  /** Its street line: the house's line (u = -5) plus the street's 17.32 m. */
  frontU: -5 - 17.32,
  depth: 140.16,
  frontLength: 86.28,
  /** The corner streets line up with the house block's (its south-west corner at v = -15.175). */
  startV: -15.175,
} as const

/** Plan image pixels: x from the left street (255) to the street line (935), y from the top edge to the bottom edge (632). */
const PLAN = { left: 255, right: 935, bottom: 632 }
const metersPerX = OPPOSITE_BLOCK.depth / (PLAN.right - PLAN.left)
const metersPerY = OPPOSITE_BLOCK.frontLength / (PLAN.bottom - 208)

const toPlan = (x: number, y: number): PlanPoint =>
  [OPPOSITE_BLOCK.frontU - (PLAN.right - x) * metersPerX, OPPOSITE_BLOCK.startV + (PLAN.bottom - y) * metersPerY]

/** The street the lot's building faces, which decides the band where it stands. */
type Front = 'E' | 'N' | 'S' | 'W'
/** [number, x0, x1, y0, y1, front]; y0 = 0 means the block's top edge, which slopes slightly on the plan. */
const RAW: [number, number, number, number, number, Front][] = [
  [31, 885, 935, 0, 278, 'E'], [32, 845, 885, 0, 278, 'N'], [33, 805, 845, 0, 320, 'N'], [34, 768, 805, 0, 362, 'N'],
  [35, 728, 768, 0, 403, 'N'], [36, 678, 728, 0, 380, 'N'], [37, 630, 678, 0, 380, 'N'], [38, 585, 630, 0, 383, 'N'],
  [39, 522, 585, 0, 383, 'N'], [40, 487, 522, 0, 385, 'N'], [41, 447, 487, 0, 388, 'N'], [42, 405, 447, 0, 388, 'N'],
  [43, 368, 405, 0, 388, 'N'], [44, 330, 368, 0, 315, 'N'], [1, 255, 330, 0, 272, 'W'], [2, 255, 330, 272, 314, 'W'],
  [3, 255, 370, 314, 354, 'W'], [4, 255, 370, 354, 388, 'W'], [5, 255, 525, 388, 430, 'W'], [6, 255, 525, 430, 473, 'W'],
  [7, 255, 440, 473, 518, 'W'], [8, 255, 440, 518, 558, 'W'], [9, 255, 360, 558, 602, 'W'],
  [101, 255, 290, 602, 632, 'S'], [102, 290, 325, 602, 632, 'S'], [103, 325, 360, 602, 632, 'S'],
  [11, 360, 402, 558, 632, 'S'], [12, 402, 442, 558, 632, 'S'], [13, 442, 485, 473, 632, 'S'], [14, 485, 525, 470, 632, 'S'],
  [15, 525, 565, 385, 632, 'S'], [16, 565, 607, 385, 632, 'S'], [17, 607, 648, 385, 632, 'S'], [18, 648, 738, 380, 632, 'S'],
  [20, 738, 777, 490, 632, 'S'], [21, 777, 820, 490, 632, 'S'], [22, 820, 862, 532, 632, 'S'], [23, 862, 935, 578, 632, 'S'],
  [24, 862, 935, 536.3, 578, 'E'], [25, 822, 935, 494.1, 536.3, 'E'], [26, 735, 935, 447, 494.1, 'E'], [27, 735, 935, 403, 447, 'E'],
  [28, 772, 935, 362, 403, 'E'], [29, 810, 935, 322, 362, 'E'], [30, 847, 935, 278, 322, 'E'],
]

/** The top edge of the block on the plan: it drops about 24 px from the right corner to the left one. */
const topEdge = (x: number) => 208 + (PLAN.right - x) * (24 / (PLAN.right - PLAN.left))

/** Depth of the band nearest the street in which a lot's building is assumed to stand. */
const BAND = 13.5
export const OPPOSITE_HEIGHT = 3.3

export type OppositeExtra = { suffix: string; label: string; ring: PlanPoint[]; base: number; height: number }
export type OppositeLot = { number: number; polygon: PlanPoint[]; building: PlanPoint[]; height: number; floors?: number; extras?: OppositeExtra[] }

function lotFrom([number, x0, x1, y0, y1, front]: typeof RAW[number]): OppositeLot {
  const top = (x: number) => y0 === 0 ? topEdge(x) : y0
  const polygon = [toPlan(x0, y1), toPlan(x1, y1), toPlan(x1, top(x1)), toPlan(x0, top(x0))]
  // Band: cut the lot to BAND metres from its front, when it is deeper than that.
  const bandX = BAND / metersPerX, bandY = BAND / metersPerY
  let [bx0, bx1, by0] = [x0, x1, y0]
  const by1 = y1
  if (front === 'E') bx0 = Math.max(x0, x1 - bandX)
  if (front === 'W') bx1 = Math.min(x1, x0 + bandX)
  if (front === 'S') by0 = Math.max(y0, y1 - bandY)
  const topBand = (x: number) => front === 'N' ? Math.min(y1, top(x) + bandY) : top(x)
  const building = front === 'N'
    ? [toPlan(bx0, topBand(bx0)), toPlan(bx1, topBand(bx1)), toPlan(bx1, top(bx1)), toPlan(bx0, top(bx0))]
    : [toPlan(bx0, by1), toPlan(bx1, by1), toPlan(bx1, by0 === 0 ? top(bx1) : by0), toPlan(bx0, by0 === 0 ? top(bx0) : by0)]
  return { number, polygon, building, height: OPPOSITE_HEIGHT }
}

/**
 * Lot 23, the corner, from its survey sketch: 9.74 m of front on the cross street (5.65 m plus the
 * ochava's 4.09 m), an ochava of 5.98 m (4.09 m by 4.25 m), 10.98 m on the street counted to the
 * corner's meeting line, 10.15 m at the rear and 11.09 m on the south-west side. The sketch is old:
 * Street View (August 2025) shows a one-floor house along the street, about 3.4 m tall, so its building
 * is taken as the first 9 m of the lot from the street.
 */
const CORNER_START_V = OPPOSITE_BLOCK.startV
/** Where lot 23's rear ends on the street: the ochava's top plus the straight 6.73 m. */
const CORNER_REAR_V = CORNER_START_V + 4.25 + (10.98 - 4.25)
const SURVEYED_23: OppositeLot = (() => {
  const u = OPPOSITE_BLOCK.frontU, v = CORNER_START_V, left = u - 9.74
  return {
    number: 23,
    polygon: [[left, v], [u - 4.09, v], [u, v + 4.25], [u, CORNER_REAR_V], [u - 10.15, CORNER_REAR_V + .11]],
    building: [[u - 9, v], [u - 4.09, v], [u, v + 4.25], [u, CORNER_REAR_V], [u - 9, CORNER_REAR_V + .01]],
    height: 3.4,
    // A small plastic tank on the roof, toward the cross street (about 1 m across and 1.2 m tall).
    extras: [{
      suffix: 'TANK', label: 'tanque de la azotea', base: 3.4, height: 4.6,
      ring: Array.from({ length: 12 }, (_, i) => [u - 6.5 + .5 * Math.cos(Math.PI * i / 6), v + 2.5 + .5 * Math.sin(Math.PI * i / 6)] as PlanPoint),
    }],
  }
})()

/**
 * Lot 25, from its survey sketch: 8.66 m of front, 23.95 m deep on the south-west side and 24.20 m on
 * the other. Its building keeps to the south-west side and reaches the rear: a 4.55 m wide body from
 * 4.4 m to 14.2 m, a 3.35 m wide one to 20.7 m, then the full 8.3 m across the last 3.5 m. Its height
 * is not known.
 */
const SURVEYED_25: OppositeLot = (() => {
  const u = OPPOSITE_BLOCK.frontU, v0 = CORNER_REAR_V + 8.5
  // [depth from the street, distance from the south-west edge] pairs.
  const outline: [number, number][] = [[4.4, 0], [24.2, 0], [24.2, 8.3], [20.7, 8.3], [20.7, 3.35], [14.2, 3.35], [14.2, 4.55], [4.4, 4.55]]
  return {
    number: 25,
    polygon: [[u, v0], [u - 23.95, v0], [u - 24.2, v0 + 8.66], [u, v0 + 8.66]],
    building: outline.map(([depth, side]) => [u - depth, v0 + side] as PlanPoint),
    height: OPPOSITE_HEIGHT,
  }
})()

/**
 * Lot 24, from its municipal survey sketch: 8.50 m of front, 15.41 m deep on the south-west side and
 * 15.61 m on the other. The building keeps to the south-west side: a 3.90 m wide body 13.35 m from the
 * street with a wider front room 5.40 m wide and 4.30 m deep. The rest is open, 3 to 3.5 m along the
 * north-east side. Its south-west edge is where the corner lot's rear ends, which puts it almost exactly
 * opposite the house's lot (v = -4.2 to 4.3).
 */
const SURVEYED_24: OppositeLot = (() => {
  const u = OPPOSITE_BLOCK.frontU, v0 = CORNER_REAR_V, v1 = v0 + 8.5
  // Street View (August 2025): a two-floor house with a black front, set back about 3 m behind a
  // fenced front garden, and a small room on the roof. The sketch's 5.40 m wide front part is kept
  // 4.30 m deep from that setback, and the 3.90 m wide body continues to 13.35 m.
  const SETBACK = 3
  return {
    number: 24,
    polygon: [[u, v0], [u - 15.41, v0], [u - 15.61, v1], [u, v1]],
    building: [[u - SETBACK, v0], [u - SETBACK, v0 + 5.4], [u - SETBACK - 4.3, v0 + 5.4], [u - SETBACK - 4.3, v0 + 3.9], [u - 13.35, v0 + 3.9], [u - 13.35, v0]],
    height: 6.4,
    floors: 2,
    extras: [{
      suffix: 'ROOM', label: 'cuarto de la azotea',
      ring: [[u - SETBACK - 1, v0 + 1.4], [u - SETBACK - 1, v0 + 5.4], [u - SETBACK - 4.3, v0 + 5.4], [u - SETBACK - 4.3, v0 + 1.4]],
      base: 6.4, height: 9,
    }],
  }
})()

export const OPPOSITE_LOTS: OppositeLot[] = RAW.map(item => item[0] === 24 ? SURVEYED_24 : item[0] === 23 ? SURVEYED_23 : item[0] === 25 ? SURVEYED_25 : lotFrom(item))

/** Where the block's back street runs: far side of the block, 17.32 m wide. */
export const OPPOSITE_BACK_U = OPPOSITE_BLOCK.frontU - OPPOSITE_BLOCK.depth
