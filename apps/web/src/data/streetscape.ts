import { CORNER_NE, CORNER_SW, STREET_LINE, STREET_WIDTHS } from './block.ts'
import { houseToSite, type SitePoint } from './frame.ts'

/**
 * The street in front of the house, from the owner's Street View photo (Tapalqué, looking along the street): grey cement sidewalks of square tiles, 3.2 m between the building line and the curb,
 * a granite curb, a strip of grass by the curb with a plane tree in it every 9 m and a light pole every 27 m, and, on the road side of the curb, a gutter paved in stones. The road is 17.32 m between
 * lot lines, so 10.92 m of roadway between the sidewalks. The sidewalks run along the house's block and the block across the street, on the front street, and along the block's two side streets. They
 * are drawn in the house frame [u, v] and turned into site boxes. Heights are above the road's surface, which is 0.05 m.
 */
export const SIDEWALK = { width: 3.2, height: .12, curb: .2, grass: .6, tile: .4, gutter: .5, roadTop: .05 }
export const SIDEWALK_TOP = SIDEWALK.roadTop + SIDEWALK.height
export const STREET_TREE = { pitch: 9, trunk: .13, height: 4.2, crown: 2 }
export const STREET_POLE = { pitch: 27, height: 7 }

export type StreetRect = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; tiles?: boolean }

const frontEdge = STREET_LINE, frontFar = STREET_LINE - STREET_WIDTHS.front
const v0 = CORNER_SW - SIDEWALK.width, v1 = CORNER_NE + SIDEWALK.width
/** How far the side streets' sidewalks run along the block, from its front (the back of the block is not drawn). */
const SIDE_LENGTH = 40

const SLAB = '#bdbcb4', CURB = '#8d8d88', GRASS = '#8c9c66', GUTTER = '#85827a'
const band = (id: string, from: number, to: number, toward: 1 | -1, v: [number, number], color: string, y: [number, number], tiles = false): StreetRect =>
  ({ id, u: toward === 1 ? [from, to] : [to, from], v, y, color, tiles })

/**
 * One side of the front street: `edge` is the building line, `toward` the way to the curb (-1 for the house's side, whose curb is at lower u; +1 for the block across the street).
 */
function frontSide(name: string, edge: number, toward: 1 | -1): StreetRect[] {
  const curbAt = edge + toward * SIDEWALK.width
  const span: [number, number] = [v0, v1]
  const top = SIDEWALK_TOP, rect = (id: string, a: number, b: number, color: string, y: [number, number], tiles = false) => band(id, Math.min(a, b), Math.max(a, b), 1, span, color, y, tiles)
  return [
    // The tiled sidewalk, from the building line to the grass strip.
    rect(`${name}-sidewalk`, edge, curbAt - toward * (SIDEWALK.curb + SIDEWALK.grass), SLAB, [SIDEWALK.roadTop, top], true),
    // The grass strip, by the curb, and the granite curb.
    rect(`${name}-grass`, curbAt - toward * SIDEWALK.curb, curbAt - toward * (SIDEWALK.curb + SIDEWALK.grass), GRASS, [SIDEWALK.roadTop, top + .02]),
    rect(`${name}-curb`, curbAt, curbAt - toward * SIDEWALK.curb, CURB, [SIDEWALK.roadTop, top]),
    // The gutter, on the road: stones along the foot of the curb.
    rect(`${name}-gutter`, curbAt, curbAt + toward * SIDEWALK.gutter, GUTTER, [SIDEWALK.roadTop, SIDEWALK.roadTop + .004]),
  ]
}

export const STREET_RECTS: StreetRect[] = [
  ...frontSide('near', frontEdge, -1),
  ...frontSide('far', frontFar, 1),
  // The side streets, on the house's block only: a tiled sidewalk and its curb, from the corner to a way along the block.
  ...[['south-west', CORNER_SW - SIDEWALK.width, CORNER_SW] as const, ['north-east', CORNER_NE, CORNER_NE + SIDEWALK.width] as const].flatMap(([name, a, b]) => [
    { id: `${name}-sidewalk`, u: [STREET_LINE, STREET_LINE + SIDE_LENGTH] as [number, number], v: [a, b] as [number, number], y: [SIDEWALK.roadTop, SIDEWALK_TOP] as [number, number], color: SLAB, tiles: true },
  ]),
]

/** Where the trees stand: on the grass strip of each side of the front street, every 9 m along it. */
export function streetTrees(): { u: number; v: number }[] {
  const nearU = frontEdge - SIDEWALK.width + SIDEWALK.curb + SIDEWALK.grass / 2, farU = frontFar + SIDEWALK.width - SIDEWALK.curb - SIDEWALK.grass / 2
  const trees: { u: number; v: number }[] = []
  for (let v = CORNER_SW + 1.5; v < CORNER_NE - 1; v += STREET_TREE.pitch) for (const u of [nearU, farU]) trees.push({ u, v })
  return trees
}
/** The light poles, on the curb's line of both sides, every 27 m, between the trees. */
export function streetPoles(): { u: number; v: number }[] {
  const nearU = frontEdge - SIDEWALK.width + SIDEWALK.curb + SIDEWALK.grass / 2, farU = frontFar + SIDEWALK.width - SIDEWALK.curb - SIDEWALK.grass / 2
  const poles: { u: number; v: number }[] = []
  for (let v = CORNER_SW + 6; v < CORNER_NE - 1; v += STREET_POLE.pitch) for (const u of [nearU, farU]) poles.push({ u, v })
  return poles
}

/** A box in the house frame as a site box: its centre, its size (x along v, z along u) and its turn about the vertical. */
export function siteBox(u: [number, number], v: [number, number], y: [number, number]) {
  const centre: SitePoint = houseToSite((u[0] + u[1]) / 2, (v[0] + v[1]) / 2)
  const origin = houseToSite(0, 0), along = houseToSite(1, 0)
  return {
    position: [centre[0], (y[0] + y[1]) / 2, centre[1]] as [number, number, number],
    scale: [v[1] - v[0], y[1] - y[0], u[1] - u[0]] as [number, number, number],
    angle: Math.atan2(along[0] - origin[0], along[1] - origin[1]),
  }
}
