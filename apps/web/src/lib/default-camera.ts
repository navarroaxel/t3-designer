import { houseToSite } from '../data/building-site.ts'

export type CameraMode = '3d' | 'top'
export type CameraPlacement = { position: [number, number, number]; target: [number, number, number] }

/** Compass bearing the street front of the house faces: north-west. */
export const FRONT_BEARING = 315
/**
 * The opening perspective: from the street side, turned 20 degrees toward the
 * north so that the front and the north-east flank both read, and raised so that
 * the azotea, where the panels will go, is visible. Bearings are compass bearings
 * of the camera as seen from the house.
 */
export const OPENING_VIEW = { bearing: FRONT_BEARING + 20, elevation: 38, distance: 62 }
const TOP_HEIGHT = 90
const TARGET_HEIGHT = 3

const radians = (degrees: number) => degrees * Math.PI / 180

/**
 * Where the camera starts, and returns to on "Reset view". `factor` widens the view
 * for tall, narrow screens. Site axes: x east, y up, z south.
 */
export function defaultCamera(mode: CameraMode, factor = 1): CameraPlacement {
  // The centre of the roof slab, which spans u = -6 to 4 in the house frame.
  const [cx, cz] = houseToSite(-1, 0)
  const target: [number, number, number] = [cx, TARGET_HEIGHT, cz]
  if (mode === 'top') return { position: [cx, TOP_HEIGHT * factor, cz + .01], target }
  const { bearing, elevation, distance } = OPENING_VIEW
  const flat = Math.cos(radians(elevation)) * distance * factor
  return {
    position: [
      cx + Math.sin(radians(bearing)) * flat,
      TARGET_HEIGHT + Math.sin(radians(elevation)) * distance * factor,
      cz - Math.cos(radians(bearing)) * flat,
    ],
    target,
  }
}

/** The compass bearing of the camera seen from its target, and its elevation in degrees. */
export function viewAngles({ position, target }: CameraPlacement) {
  const dx = position[0] - target[0], dy = position[1] - target[1], dz = position[2] - target[2]
  const flat = Math.hypot(dx, dz)
  return {
    bearing: (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360,
    elevation: Math.atan2(dy, flat) * 180 / Math.PI,
    distance: Math.hypot(dx, dy, dz),
  }
}
