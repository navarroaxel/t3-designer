import { GROUND_PANTRY } from './house-plan.ts'

/**
 * The network rack in the pantry beside the garage (owner): a wall-mounted 6U rack, high on the wall against the contrafrente, with a
 * UniFi Dream Machine Pro and a 24-port patch panel. House frame [u, v], absolute heights; the rack stands out from the wall by its depth.
 * The UDM Pro is a 1U unit, 442 mm wide and 285 mm deep; the 19-inch frame, its 30 cm depth and the 1.55 m bottom are assumed.
 */
export type RackBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number; emissive?: string }

const UNIT = .0445
export const RACK = { depth: .3, inner: .442, side: .02, units: 6, bottom: 1.55 }
const top = RACK.bottom + RACK.units * UNIT + .02
const wall = GROUND_PANTRY.u[0]
/** Centred on the pantry's width, along the wall. */
const centre = (GROUND_PANTRY.v[0] + GROUND_PANTRY.v[1]) / 2
const half = RACK.inner / 2 + RACK.side
const frontU = wall + RACK.depth
const u = (from: number, to: number): [number, number] => [wall + from, wall + to]
const slotY = (slot: number): [number, number] => [top - .01 - slot * UNIT, top - .01 - (slot - 1) * UNIT]

const FRAME = '#2b2d30', PANEL = '#1d1f22', SILVER = '#c9ccd0', PORT = '#08090a', BLUE = '#2f6ef2'

export const RACK_BOXES: RackBox[] = [
  // The frame: the back plate on the wall, two side plates and the top and bottom.
  { id: 'back', u: u(0, .015), v: [centre - half, centre + half], y: [RACK.bottom, top], color: FRAME },
  { id: 'side-left', u: u(0, RACK.depth), v: [centre - half, centre - half + RACK.side], y: [RACK.bottom, top], color: FRAME },
  { id: 'side-right', u: u(0, RACK.depth), v: [centre + half - RACK.side, centre + half], y: [RACK.bottom, top], color: FRAME },
  { id: 'top', u: u(0, RACK.depth), v: [centre - half, centre + half], y: [top - .01, top], color: FRAME },
  { id: 'bottom', u: u(0, RACK.depth), v: [centre - half, centre + half], y: [RACK.bottom, RACK.bottom + .01], color: FRAME },
  // The 19-inch front rails the units screw to.
  ...[-1, 1].map(side => ({ id: `rail-${side}`, u: [frontU - .02, frontU] as [number, number], v: (side < 0 ? [centre - RACK.inner / 2 - .005, centre - RACK.inner / 2 + .015] : [centre + RACK.inner / 2 - .015, centre + RACK.inner / 2 + .005]) as [number, number], y: [RACK.bottom + .01, top - .01] as [number, number], color: '#5b5f64', metalness: .5 })),
  // Slot 1, at the top: the 24-port patch panel, with its ports in a row and a few blue patch cables hanging from it.
  { id: 'patch-panel', u: [frontU - .035, frontU], v: [centre - RACK.inner / 2, centre + RACK.inner / 2], y: slotY(1), color: PANEL },
  ...Array.from({ length: 24 }, (_, index) => {
    const pitch = (RACK.inner - .05) / 24, v0 = centre - RACK.inner / 2 + .025 + index * pitch
    return { id: `port-${index + 1}`, u: [frontU, frontU + .004] as [number, number], v: [v0 + .002, v0 + pitch - .002] as [number, number], y: [slotY(1)[0] + .012, slotY(1)[1] - .012] as [number, number], color: PORT }
  }),
  ...[3, 8, 14, 19].map(index => {
    const pitch = (RACK.inner - .05) / 24, v0 = centre - RACK.inner / 2 + .025 + (index - 1) * pitch
    return { id: `cable-${index}`, u: [frontU + .004, frontU + .03] as [number, number], v: [v0 + .006, v0 + pitch - .006] as [number, number], y: [slotY(1)[0] - .17, slotY(1)[1] - .01] as [number, number], color: BLUE }
  }),
  // Slot 2: the UniFi Dream Machine Pro, a 1U gateway with a silver front, its little screen on the right and the lit port row.
  { id: 'udm-pro', u: [frontU - .285, frontU], v: [centre - RACK.inner / 2, centre + RACK.inner / 2], y: slotY(2), color: SILVER, metalness: .55 },
  { id: 'udm-screen', u: [frontU, frontU + .003], v: [centre + RACK.inner / 2 - .09, centre + RACK.inner / 2 - .03], y: [slotY(2)[0] + .012, slotY(2)[1] - .012], color: '#0b1020', emissive: '#3b8cff' },
  { id: 'udm-ports', u: [frontU, frontU + .003], v: [centre - RACK.inner / 2 + .02, centre - RACK.inner / 2 + .3], y: [slotY(2)[0] + .014, slotY(2)[1] - .014], color: '#3a3d42' },
  // Slots 3 to 5: blank panels, with room to grow.
  ...[3, 4, 5].map(slot => ({ id: `blank-${slot}`, u: [frontU - .004, frontU] as [number, number], v: [centre - RACK.inner / 2, centre + RACK.inner / 2] as [number, number], y: slotY(slot), color: FRAME })),
]
