import { FLOOR_ELEVATION } from '../data/house-interior'
import { furnishingsOn } from '../data/house-furnishings'
import type { Floor } from '../data/house-plan'
import { FLOOR_TILING, GROUND_FLOOR_TILING } from '../data/house-plan'
import { FloorPatch, KitchenPiece } from './HouseShell'

/**
 * The cutaway's furniture and equipment, standing at full height in the viewer's frame: x = u, z = -v, y up from the floor. The plan's
 * heights are absolute, so the group sinks by the floor's level.
 */
export function HouseFurnishings({ floor }: { floor: Floor }) {
  return <group name="house-furnishings" position={[0, -FLOOR_ELEVATION[floor], 0]}>
    {furnishingsOn(floor).map(piece => {
      if (piece.kitchen) return <KitchenPiece key={piece.id} box={piece.kitchen} />
      const size: [number, number, number] = [piece.u[1] - piece.u[0], piece.y[1] - piece.y[0], piece.v[1] - piece.v[0]]
      const ellipse = piece.shape === 'ellipse'
      return <mesh key={piece.id} position={[(piece.u[0] + piece.u[1]) / 2, (piece.y[0] + piece.y[1]) / 2, -(piece.v[0] + piece.v[1]) / 2]}
        scale={ellipse ? [size[0] / 2, 1, size[2] / 2] : undefined} castShadow receiveShadow>
        {ellipse ? <cylinderGeometry args={[1, piece.taper ?? 1, size[1], 40]} /> : <boxGeometry args={size} />}
        <meshStandardMaterial color={piece.color} roughness={piece.roughness ?? .6} metalness={piece.metalness ?? 0}
          transparent={piece.opacity !== undefined} opacity={piece.opacity ?? 1} depthWrite={piece.opacity === undefined} />
      </mesh>
    })}
  </group>
}

/** Raises the tiles a hair over the room floors the viewers draw, so the two never fight for the same pixels. */
const TILE_LIFT = .012
/** The laundry's tile runs on under the stair's landing in the plan; the visitor's floor ends at the laundry's back wall. */
const LAUNDRY_END = 7

/**
 * The floors' own finishes, from the plan: Saing planks in the bedrooms, hall and living, Navona tiles in the bathrooms and the laundry, each at its
 * real scale. The same patches the floor cutaway lays, here under the walkthrough and the interior view.
 */
export function HouseFloorTiles({ floor }: { floor: Floor }) {
  const zones = floor === 'ground' ? GROUND_FLOOR_TILING : FLOOR_TILING
  return <group name="house-floor-tiles" position={[0, -FLOOR_ELEVATION[floor] + TILE_LIFT, 0]}>
    {zones.flatMap(zone => zone.rects.map((rect, index) => {
      const clipped: [number, number, number, number] = zone.id === 'laundry' ? [rect[0], Math.min(rect[1], LAUNDRY_END), rect[2], rect[3]] : rect
      return <FloorPatch key={`${zone.id}-${index}`} zone={zone} rect={clipped} />
    }))}
  </group>
}
