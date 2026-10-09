import { AZOTEA_REAR, FLOOR_HEIGHT, HOUSE_HALF_WIDTH, PARTY_WALL, ROOF_LEVEL, SITE_BUILDINGS, houseSouthWestEdge } from './building-site.ts'
import { siteToHouse } from './frame.ts'
import { LAUNDRY } from './laundry.ts'
import { buildPanels } from './solar-array.ts'

/**
 * The azotea and the way up to it, for the walkthrough. The way is the owner's stair outside the laundry: a first flight inside it, on the light-well
 * side, climbing 1 m to a landing past its back wall; then a second flight back over its north-east half, up to the roof. Everything here is
 * in the viewer's frame (x = u, z = -v) with absolute heights, built from the same volumes the exterior view draws, so the two cannot drift apart.
 */
export type Point2 = [number, number]
export type Obstacle = { id: string; polygon: Point2[]; bottom: number; top: number; climb?: true }

const local = ([x, z]: Point2): Point2 => { const [u, v] = siteToHouse([x, z]); return [u, -v] }
const NE_INNER = HOUSE_HALF_WIDTH - PARTY_WALL
const LAUNDRY_V0 = NE_INNER - LAUNDRY.width
const LAUNDRY_BACK = AZOTEA_REAR + LAUNDRY.length + LAUNDRY.wallThickness
const LANDING_END = LAUNDRY_BACK + LAUNDRY.landing.depth
export const LANDING_LEVEL = FLOOR_HEIGHT + LAUNDRY.landing.rise
export const AZOTEA_LEVEL = ROOF_LEVEL
const flat = (u: number, v: number): Point2 => [u, -v]

/**
 * Where a visitor may stand with the feet at the landing's height: the first flight inside the laundry, the landing outside it and the second
 * flight over the laundry's north-east half. A U in the plan.
 */
export const LANDING_OUTLINE: Point2[] = [
  flat(AZOTEA_REAR, LAUNDRY_V0), flat(LANDING_END, LAUNDRY_V0), flat(LANDING_END, NE_INNER), flat(AZOTEA_REAR, NE_INNER), flat(AZOTEA_REAR, NE_INNER - LAUNDRY.flight.width),
  flat(LAUNDRY_BACK, NE_INNER - LAUNDRY.flight.width), flat(LAUNDRY_BACK, LAUNDRY_V0 + LAUNDRY.flight.width), flat(AZOTEA_REAR, LAUNDRY_V0 + LAUNDRY.flight.width),
]

/** The roof: the 9.46 m block with the 1 m cantilever in front, and the second flight's foot over the laundry's north-east half. */
export const AZOTEA_OUTLINE: Point2[] = [
  flat(-6, houseSouthWestEdge(-1)), flat(AZOTEA_REAR, houseSouthWestEdge(AZOTEA_REAR)), flat(AZOTEA_REAR, NE_INNER - LAUNDRY.flight.width), flat(LAUNDRY_BACK, NE_INNER - LAUNDRY.flight.width),
  flat(LAUNDRY_BACK, HOUSE_HALF_WIDTH), flat(-6, HOUSE_HALF_WIDTH),
]

/** The parts of the house the stair and the roof are made of, from the exterior's own volumes. */
const PARTS = /^HOUSE-(PARAPET|TANK|LAUNDRY-(LANDING|PARTY|STEP-[12]|GUARD))/
const CLIMBABLE = /^HOUSE-LAUNDRY-(LANDING$|STEP-)/

export const AZOTEA_OBSTACLES: Obstacle[] = [
  ...SITE_BUILDINGS.filter(building => PARTS.test(building.id) && building.id !== 'HOUSE-TANK-STEEL').map(building => ({
    id: building.id, polygon: building.footprint.map(point => local(point as Point2)), bottom: building.base ?? 0, top: building.height,
    ...(CLIMBABLE.test(building.id) ? { climb: true as const } : {}),
  })),
  // The solar panels, raised 1.25 m on their beams: a visitor ducks under them, and does not walk through.
  ...buildPanels().map(panel => ({
    id: panel.id,
    polygon: [flat(panel.u[0], panel.v[0]), flat(panel.u[1], panel.v[0]), flat(panel.u[1], panel.v[1]), flat(panel.u[0], panel.v[1])],
    bottom: panel.lowEdgeY, top: panel.highEdgeY + .05,
  })),
]

/** The synthetic room the roof is, for the name on the screen and for starting the visit there. */
export const AZOTEA_ROOM = { id: 'azotea', name: 'Roof terrace', polygon: AZOTEA_OUTLINE, reportedArea: 1, color: '#c8c2b0' }
