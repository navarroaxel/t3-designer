import { FLOOR_ELEVATION } from '../data/house-interior'
import { furnishingsOn } from '../data/house-furnishings'
import type { Floor } from '../data/house-plan'
import { KitchenPiece } from './HouseShell'

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
