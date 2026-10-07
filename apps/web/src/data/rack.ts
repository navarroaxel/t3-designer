import { GROUND_PANTRY } from './house-plan.ts'

/**
 * The network rack in the pantry beside the garage (owner): a wall-mounted 6U rack, high on the south-west party wall, the medianera, with a
 * UniFi Dream Machine Pro and a 24-port patch panel. House frame [u, v], absolute heights; the rack stands out from the wall, toward +v, by its depth, and is as wide as the wall runs along u.
 * The UDM Pro is a 1U unit, 442 mm wide and 285 mm deep; the 19-inch frame, its 30 cm depth and the 1.55 m bottom are assumed.
 */
export type RackBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number; emissive?: string }

const UNIT = .0445
export const RACK = { depth: .3, inner: .442, side: .02, units: 6, bottom: 1.55 }
const top = RACK.bottom + RACK.units * UNIT + .02
/** The medianera's inner face, where the pantry meets the south-west party wall. */
const wall = GROUND_PANTRY.v[0]
/** Centred on the pantry's depth, along the wall. */
const centre = (GROUND_PANTRY.u[0] + GROUND_PANTRY.u[1]) / 2
const half = RACK.inner / 2 + RACK.side
const front = RACK.depth
/** A box by its span along the wall (from the rack's centre) and how far it stands out from the wall. */
const box = (id: string, along: [number, number], out: [number, number], y: [number, number], color: string, extra: { metalness?: number; emissive?: string } = {}): RackBox =>
  ({ id, u: [centre + along[0], centre + along[1]], v: [wall + out[0], wall + out[1]], y, color, ...extra })
const slotY = (slot: number): [number, number] => [top - .01 - slot * UNIT, top - .01 - (slot - 1) * UNIT]

const FRAME = '#2b2d30', PANEL = '#1d1f22', SILVER = '#c9ccd0', PORT = '#08090a', BLUE = '#2f6ef2'
const pitch = (RACK.inner - .05) / 24
const portAt = (index: number) => -RACK.inner / 2 + .025 + index * pitch

export const RACK_BOXES: RackBox[] = [
  // The frame: the back plate on the wall, two side plates and the top and bottom.
  box('back', [-half, half], [0, .015], [RACK.bottom, top], FRAME),
  box('side-left', [-half, -half + RACK.side], [0, front], [RACK.bottom, top], FRAME),
  box('side-right', [half - RACK.side, half], [0, front], [RACK.bottom, top], FRAME),
  box('top', [-half, half], [0, front], [top - .01, top], FRAME),
  box('bottom', [-half, half], [0, front], [RACK.bottom, RACK.bottom + .01], FRAME),
  // The 19-inch front rails the units screw to.
  box('rail-left', [-RACK.inner / 2 - .005, -RACK.inner / 2 + .015], [front - .02, front], [RACK.bottom + .01, top - .01], '#5b5f64', { metalness: .5 }),
  box('rail-right', [RACK.inner / 2 - .015, RACK.inner / 2 + .005], [front - .02, front], [RACK.bottom + .01, top - .01], '#5b5f64', { metalness: .5 }),
  // Slot 1, at the top: the 24-port patch panel, with its ports in a row and a few blue patch cables hanging from it.
  box('patch-panel', [-RACK.inner / 2, RACK.inner / 2], [front - .035, front], slotY(1), PANEL),
  ...Array.from({ length: 24 }, (_, index) => box(`port-${index + 1}`, [portAt(index) + .002, portAt(index) + pitch - .002], [front, front + .004], [slotY(1)[0] + .012, slotY(1)[1] - .012], PORT)),
  ...[3, 8, 14, 19].map(index => box(`cable-${index}`, [portAt(index - 1) + .006, portAt(index - 1) + pitch - .006], [front + .004, front + .03], [slotY(1)[0] - .17, slotY(1)[1] - .01], BLUE)),
  // Slot 2: the UniFi Dream Machine Pro, a 1U gateway with a silver front, its little screen on the right and the lit port row.
  box('udm-pro', [-RACK.inner / 2, RACK.inner / 2], [front - .285, front], slotY(2), SILVER, { metalness: .55 }),
  box('udm-screen', [RACK.inner / 2 - .09, RACK.inner / 2 - .03], [front, front + .003], [slotY(2)[0] + .012, slotY(2)[1] - .012], '#0b1020', { emissive: '#3b8cff' }),
  box('udm-ports', [-RACK.inner / 2 + .02, -RACK.inner / 2 + .3], [front, front + .003], [slotY(2)[0] + .014, slotY(2)[1] - .014], '#3a3d42'),
  // Slots 3 to 5: blank panels, with room to grow.
  ...[3, 4, 5].map(slot => box(`blank-${slot}`, [-RACK.inner / 2, RACK.inner / 2], [front - .004, front], slotY(slot), FRAME)),
]

/** The whole rack's box, for the Blender model that stands in for the boxes above: its black cabinet, glass door included, which stands 18 mm out past the rails' front. */
export const RACK_MODEL_DEPTH = RACK.depth + .018
export const RACK_BOX = { u: [centre - half, centre + half] as [number, number], v: [wall, wall + RACK_MODEL_DEPTH] as [number, number], y: [RACK.bottom, top] as [number, number] }
