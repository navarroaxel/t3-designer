import { HOUSE_CENTER, HOUSE_YAW, houseToSite } from './frame.ts'
import { FLOOR_HEIGHT } from './building-site.ts'
import { HOUSE_FLOORS, WALL_HEIGHT } from './house-interior.ts'
import type { Floor } from './house-plan.ts'
import { apartmentBounds } from '@t3-designer/geometry'

export type Point3 = [number, number, number]
type ReadonlyPoint3 = readonly [number, number, number]

/**
 * The viewer's local frame is the house frame turned to its axes: x = u (toward the rear, south-east), z = -v (v runs north-east), y up
 * from the floor's own level. Site to local is one rotation about y, by -HOUSE_YAW (a quarter of a turn), and a
 * translation to the house's origin at the floor's level. The same rotation, without the translation, turns the sun's direction.
 */
export const HOUSE_ROTATION_Y = HOUSE_YAW
const cos = Math.cos(HOUSE_ROTATION_Y), sin = Math.sin(HOUSE_ROTATION_Y)
const azimuth = ([x, , z]: ReadonlyPoint3) => (Math.atan2(x, -z) * 180 / Math.PI + 360) % 360

/** The persisted local-to-site rigid transform of one floor, in the shape the project snapshot stores it. */
export function housePlacement(floor: Floor) {
  const apartment = HOUSE_FLOORS[floor]
  const bounds = apartmentBounds(apartment)
  const elevation = floor === 'ground' ? 0 : FLOOR_HEIGHT
  const [originX, originZ] = HOUSE_CENTER
  // Local +x runs toward the rear; the street front faces local -x.
  const rear = siteDirectionFromApartment([1, 0, 0])
  return {
    buildingId: 'HOUSE',
    confidence: 'estimated' as const,
    position: [originX, elevation, originZ] as Point3,
    rotationY: HOUSE_ROTATION_Y,
    floorIndex: floor === 'ground' ? 0 : 1,
    storeyHeight: FLOOR_HEIGHT,
    floorElevation: elevation,
    facadeOffset: 0,
    exteriorInset: 0,
    wallHeight: WALL_HEIGHT,
    bounds: { minX: bounds.min[0], maxX: bounds.max[0], minZ: bounds.min[1], maxZ: bounds.max[1], width: bounds.width, depth: bounds.depth },
    frontFacadeAzimuth: azimuth([-rear[0], 0, -rear[2]]),
    rearFacadeAzimuth: azimuth(rear),
    label: floor === 'ground' ? 'Planta baja' : 'Primer piso',
    assumption: 'The floors are built from the owner\'s measurements; heights of walls and doors are assumed.',
  }
}
export type HousePlacement = ReturnType<typeof housePlacement>

/** Transform a direction without translating it; preserves vector length. */
export function siteDirectionToApartment([x, y, z]: ReadonlyPoint3): Point3 {
  return [cos * x - sin * z, y, sin * x + cos * z]
}
export function siteDirectionFromApartment([x, y, z]: ReadonlyPoint3): Point3 {
  return [cos * x + sin * z, y, -sin * x + cos * z]
}

export function apartmentToSite(floor: Floor, [x, y, z]: ReadonlyPoint3): Point3 {
  const [dx, , dz] = siteDirectionFromApartment([x, y, z])
  const { position } = housePlacement(floor)
  return [dx + position[0], y + position[1], dz + position[2]]
}

/** The house-frame point [u, v] at the local plan point [x, z]; handy to check the frames against `houseToSite`. */
export const localToSite = (x: number, z: number) => houseToSite(x, -z)
