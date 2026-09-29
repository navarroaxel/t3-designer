import { ROOF_LEVEL } from './building-site.ts'

/**
 * The planned solar array on the azotea: 16 panels of 620 Wp in three rows, one
 * of 4 at the back and two of 6 toward the front. The panels are raised on
 * galvanized steel C-beams that rest on the azotea walls, nearly flat (5 degrees)
 * so the rain runs off, and connected in two series of 8 to a 10 kW Deye inverter.
 * The array sits toward the street, its front row cantilevered past the front wall.
 * The row of 4 is pushed to the left (north-east) and the two rows of 6 to the right
 * (south-west), seen from the street.
 *
 * House frame, as in building-site.ts: u toward the rear (south-east), v toward the
 * north-east, y up from the ground-floor level. The street front faces north-west.
 */
export type PlanRange = [number, number]
export type Vec3 = [number, number, number]
export type PanelRow = 'back' | 'middle' | 'front'

/** 620 Wp module, 2465 x 1134 mm, as the owner stated. Thickness is typical, not measured. */
export const PANEL_SPEC = { lengthM: 2.465, widthM: 1.134, thicknessM: .03, watts: 620 } as const

/** Row sizes: four at the back, two rows of six in front. */
export const ROW_COUNTS: Record<PanelRow, number> = { back: 4, middle: 6, front: 6 }
export const ROWS: PanelRow[] = ['back', 'middle', 'front']

export const TILT_DEGREES = 5
/** Compass bearing the panels face: the street front, north-west. The slope drains toward the street. */
export const FACING_BEARING = 315

// Assumptions, not yet confirmed by the owner. Change them here.
/** Height of the panels' lower edge above the azotea slab. It clears the 1.1 m parapets. */
export const LOW_EDGE_HEIGHT = 1.25
/** Gap between neighbouring panels in a row, and between rows, measured along the ground. */
export const PANEL_GAP = .01
export const ROW_GAP = .55
/**
 * How far the front row projects past the front wall (the street line, u = -5), toward
 * the front edge of the roof slab, which is a 1 m cantilever level with the balcony.
 * The owner says the panels are cantilevered from the wall; the amount is assumed:
 * their low edge stops at the inner face of the 0.15 m front parapet, 0.85 m out.
 */
export const FRONT_OVERHANG = .85
/** Outer faces of the walls the rows rest against. */
const STREET_LINE = -5
const NORTH_EAST_WALL_OUTER_FACE = 4.25
const SOUTH_WEST_WALL_OUTER_FACE = -4.25

export type Panel = {
  id: string
  row: PanelRow
  /** 1-based, counted from the north-east side. */
  index: number
  /** Horizontal extent of the panel in the house frame. */
  u: PlanRange
  v: PlanRange
  /** Height of the low (street-side) and high (rear) edges above the ground-floor level. */
  lowEdgeY: number
  highEdgeY: number
  /** Corners in [u, y, v]: low-left, low-right, high-right, high-left seen from the street. */
  corners: [Vec3, Vec3, Vec3, Vec3]
  /** Unit normal in [u, y, v]. */
  normal: Vec3
  watts: number
  areaM2: number
}

const radians = (degrees: number) => degrees * Math.PI / 180

/** Build the array. Pure: the same inputs always give the same panels. */
export function buildPanels(): Panel[] {
  const { lengthM, widthM, watts } = PANEL_SPEC
  const tilt = radians(TILT_DEGREES)
  const depth = lengthM * Math.cos(tilt)
  const rise = lengthM * Math.sin(tilt)
  const lowY = ROOF_LEVEL + LOW_EDGE_HEIGHT
  // The panels face the street (-u), so the low edge is at the front (small u).
  const normal: Vec3 = [-Math.sin(tilt), Math.cos(tilt), 0]
  const byRow = new Map<PanelRow, Panel[]>()
  // Rows are packed from the street: the front row first, cantilevered past the front wall.
  let uFront = STREET_LINE - FRONT_OVERHANG
  for (const row of [...ROWS].reverse()) {
    const count = ROW_COUNTS[row]
    const rowWidth = count * widthM + (count - 1) * PANEL_GAP
    // The row of 4 rests against the north-east wall (left); the two rows of 6 against the south-west wall (right).
    const vStart = row === 'back' ? NORTH_EAST_WALL_OUTER_FACE : SOUTH_WEST_WALL_OUTER_FACE + rowWidth
    const u: PlanRange = [uFront, uFront + depth]
    const panels: Panel[] = []
    for (let i = 0; i < count; i++) {
      const vHigh = vStart - i * (widthM + PANEL_GAP), vLow = vHigh - widthM
      panels.push({
        id: `${row}-${i + 1}`, row, index: i + 1, u, v: [vLow, vHigh],
        lowEdgeY: lowY, highEdgeY: lowY + rise,
        corners: [[u[0], lowY, vHigh], [u[0], lowY, vLow], [u[1], lowY + rise, vLow], [u[1], lowY + rise, vHigh]],
        normal, watts, areaM2: lengthM * widthM,
      })
    }
    byRow.set(row, panels)
    uFront = u[1] + ROW_GAP
  }
  return ROWS.flatMap(row => byRow.get(row)!)
}

export const PANELS = buildPanels()
export const ARRAY_WATTS = PANELS.reduce((sum, panel) => sum + panel.watts, 0)
