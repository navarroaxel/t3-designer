import { clipRing, type PlanPoint } from './frame.ts'
import { OPPOSITE_BACK_U } from './opposite-block.ts'

/**
 * The 24 lots of the block, in the house frame (see frame.ts).
 *
 * Four lots have their municipal survey sketch and are exact: the house, its
 * neighbour on the north-east (A), the corner lot on the south-west and the lot behind
 * that all three share the rear wall with. Their sides agree with each other to the
 * centimetre: the house's 13.50 m side is A's 13.50 m side, its 13.70 m side is the
 * corner's, and the rear lot's 28.40 m is the sum of the three rear boundaries.
 *
 * The other 20 lots come from the block plan, a hand sketch drawn to about 5.6 pixels per
 * metre, with the block's outer dimensions. They are digitised by eye, good to a metre or
 * two. Their buildings are not known: each stands in the band nearest its street and has
 * a default height.
 */
export type LotSource = 'survey' | 'block-plan'
export type Lot = {
  number: number
  source: LotSource
  polygon: PlanPoint[]
  /** Footprint of the building, when it is not detailed elsewhere. Defaults to the front band of the lot. */
  building: PlanPoint[] | null
  floors: number
  height: number
}

/** Street widths between municipal lines, from the block plan. */
export const STREET_WIDTHS = { front: 17.32, southWest: 17.32, northEast: 17.32, back: 12 } as const
/** Length of the block's street fronts and sides, from the block plan. */
export const BLOCK_DIMENSIONS = { frontLength: 86.62, backLength: 86.4, northEastSide: 48.2, southWestSide: 51.46 } as const

export const STREET_LINE = -5
/** The front street line ends at the south-west corner and at the north-east corner. */
export const CORNER_SW = -15.175
export const CORNER_NE = CORNER_SW + BLOCK_DIMENSIONS.frontLength
/** The back street line is slightly inclined: 51.46 m deep on the south-west side, 48.20 m on the other. */
const backLine = (v: number) =>
  STREET_LINE + BLOCK_DIMENSIONS.southWestSide
  - (v - CORNER_SW) * (BLOCK_DIMENSIONS.southWestSide - BLOCK_DIMENSIONS.northEastSide) / BLOCK_DIMENSIONS.frontLength

/** Depth of the band nearest the street in which a lot's building is assumed to stand. */
const BAND = 13.5
const DEFAULT_HEIGHT = 3.3
const MIDDLE = 19.5

const rect = (u0: number, u1: number, v0: number, v1: number): PlanPoint[] => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]
/** A lot on the back street: a flat inner edge and the inclined street line. */
const backLot = (v0: number, v1: number, uInner: number): PlanPoint[] =>
  [[uInner, v0], [backLine(v0), v0], [backLine(v1), v1], [uInner, v1]]

// Widths along the front street, from the south-west corner (lot 9) to the north-east one.
const F = { nine: CORNER_SW, eight: -4.33, seven: 4.33, six: 13.475, five: 22.675, four: 30.275, three: 39.075, two: 48.475, one: 56.275, end: CORNER_NE }
// Widths along the back street, from the south-west corner (lot 13) to the north-east one (lot 21).
const B = [CORNER_SW, -3.645, 5.195, 13.835, 22.875, 31.215, 40.055, 48.475, 56.445, CORNER_NE]

const front = (polygon: PlanPoint[]) => clipRing(polygon, 0, 'below', STREET_LINE + BAND)
const rightStrip = (polygon: PlanPoint[]) => clipRing(polygon, 1, 'below', CORNER_SW + BAND)
const leftStrip = (polygon: PlanPoint[]) => clipRing(polygon, 1, 'above', CORNER_NE - BAND)
const backBand = (polygon: PlanPoint[]) => clipRing(polygon, 0, 'above', backLine((polygon[1][1] + polygon[2][1]) / 2) - BAND)

const lot = (number: number, source: LotSource, polygon: PlanPoint[], building: PlanPoint[] | null, floors = 1, height = DEFAULT_HEIGHT): Lot =>
  ({ number, source, polygon, building, floors, height })

// The four surveyed lots. Numbers are 1 to 24 as on the block plan.
// The house lot has 8.66 m of front (owner). Its rear boundaries are the surveyed ones, so the neighbours' fronts, not their rears, take the difference.
const HOUSE_LOT: PlanPoint[] = [[-5, -4.33], [8.7, -4.225], [8.5, 4.475], [-5, 4.33]]
const NEIGHBOUR_A_LOT: PlanPoint[] = [[-5, 4.33], [8.5, 4.475], [8.3, 13.57], [-5, 13.475]]
// Corner lot: 10.70 m of front, an ochava of 5.95 m, 13.70 m and 13.28 m sides, 10.60 m at the rear.
const CORNER_LOT: PlanPoint[] = [[-5, -4.33], [-5, -10.965], [-0.79, CORNER_SW], [8.28, -14.825], [8.7, -4.225]]
// The lot behind: 7.80 m wide and 28.40 m long, its front edge following the rear boundaries of lots 7, 8 and 9.
const REAR_LOT: PlanPoint[] = [[8.28, -14.825], [8.7, -4.225], [8.5, 4.475], [8.3, 13.57], [16.1, 13.57], [16.3, 4.475], [16.5, -4.225], [16.08, -14.825]]

export const LOTS: Lot[] = [
  // Surveyed lots; their buildings are detailed in building-site.ts.
  lot(7, 'survey', NEIGHBOUR_A_LOT, null),
  lot(8, 'survey', HOUSE_LOT, null, 2, 6.4),
  lot(9, 'survey', CORNER_LOT, null, 2, 6.6),
  lot(10, 'survey', REAR_LOT, REAR_LOT),
  // Along the front street.
  lot(6, 'block-plan', [[-5, F.six], [MIDDLE, F.six + .18], [MIDDLE, F.five], [-5, F.five]], null),
  lot(5, 'block-plan', rect(-5, MIDDLE, F.five, F.four), null),
  lot(4, 'block-plan', rect(-5, MIDDLE, F.four, F.three), null),
  lot(3, 'block-plan', rect(-5, MIDDLE, F.three, F.two), null),
  lot(2, 'block-plan', rect(-5, 16.7, F.two, F.one), null),
  lot(1, 'block-plan', rect(-5, 8.7, F.one, F.end), null),
  // Along the south-west street.
  lot(11, 'block-plan', rect(16.5, 24.9, CORNER_SW, 12.5), null, 2, 6.4),
  lot(12, 'block-plan', rect(24.9, 33.2, CORNER_SW, 4.4), null),
  // Along the back street.
  lot(13, 'block-plan', backLot(B[0], B[1], 33.2), null),
  lot(14, 'block-plan', backLot(B[1], B[2], 33.2), null),
  lot(15, 'block-plan', backLot(B[2], B[3], 33.2), null),
  lot(16, 'block-plan', backLot(B[3], B[4], MIDDLE), null),
  lot(17, 'block-plan', backLot(B[4], B[5], MIDDLE), null),
  lot(18, 'block-plan', backLot(B[5], B[6], MIDDLE), null),
  lot(19, 'block-plan', backLot(B[6], B[7], MIDDLE), null),
  lot(20, 'block-plan', backLot(B[7], B[8], 33.9), null),
  lot(21, 'block-plan', backLot(B[8], B[9], 33.9), null),
  // Along the north-east street.
  lot(22, 'block-plan', rect(25.3, 33.9, B[7], CORNER_NE), null),
  lot(23, 'block-plan', rect(16.7, 25.3, B[7], CORNER_NE), null),
  lot(24, 'block-plan', rect(8.7, 16.7, F.one, CORNER_NE), null),
]

const BANDS: Record<number, (polygon: PlanPoint[]) => PlanPoint[]> = {
  1: front, 2: front, 3: front, 4: front, 5: front, 6: front,
  11: rightStrip, 12: rightStrip,
  16: backBand, 17: backBand, 18: backBand, 19: backBand,
  22: leftStrip, 23: leftStrip, 24: leftStrip,
}

/** The lots whose building is a plain prism, with the footprint that stands in the lot. */
export function genericBuildings(): { lot: Lot; footprint: PlanPoint[] }[] {
  return LOTS.filter(item => item.source === 'block-plan').map(item => ({
    lot: item,
    footprint: item.building ?? (BANDS[item.number] ?? (polygon => polygon))(item.polygon),
  }))
}

/** How far each street runs past the corners of the block. */
const STREET_EXTENSION = 20

/** The outer street lines of the block as centre lines with their widths, in the house frame. */
export function blockStreets() {
  const half = (width: number) => width / 2
  return [
    { id: 'front', width: STREET_WIDTHS.front, points: [[STREET_LINE - half(STREET_WIDTHS.front), CORNER_SW - STREET_EXTENSION], [STREET_LINE - half(STREET_WIDTHS.front), CORNER_NE + STREET_EXTENSION]] as PlanPoint[] },
    { id: 'south-west', width: STREET_WIDTHS.southWest, points: [[OPPOSITE_BACK_U - STREET_EXTENSION, CORNER_SW - half(STREET_WIDTHS.southWest)], [backLine(CORNER_SW) + STREET_EXTENSION, CORNER_SW - half(STREET_WIDTHS.southWest)]] as PlanPoint[] },
    { id: 'north-east', width: STREET_WIDTHS.northEast, points: [[OPPOSITE_BACK_U - STREET_EXTENSION, CORNER_NE + half(STREET_WIDTHS.northEast)], [backLine(CORNER_NE) + STREET_EXTENSION, CORNER_NE + half(STREET_WIDTHS.northEast)]] as PlanPoint[] },
    { id: 'opposite-back', width: STREET_WIDTHS.front, points: [[OPPOSITE_BACK_U - half(STREET_WIDTHS.front), CORNER_SW - STREET_EXTENSION], [OPPOSITE_BACK_U - half(STREET_WIDTHS.front), CORNER_NE + STREET_EXTENSION]] as PlanPoint[] },
    { id: 'back', width: STREET_WIDTHS.back, points: [[backLine(CORNER_SW) + half(STREET_WIDTHS.back), CORNER_SW - STREET_EXTENSION], [backLine(CORNER_NE) + half(STREET_WIDTHS.back), CORNER_NE + STREET_EXTENSION]] as PlanPoint[] },
  ]
}
