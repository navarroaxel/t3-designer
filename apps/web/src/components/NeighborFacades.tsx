import { Line } from '@react-three/drei'
import { HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import { REAR_LOT_FRONT } from '../data/neighbor-fronts'

/**
 * Street fronts of the neighbours, read from Street View (August 2025).
 * Same house frame as HouseFacade: local x runs toward the rear (u), local z
 * toward the south-west (-v), y is up from the ground-floor level. The street
 * line is u = -5. Positions come from the photos scaled to known widths and
 * doors, so expect roughly +/-0.3 m.
 */
const FRONT = -5

type Span = [number, number]
type Part = { u?: number; depth?: number; v: Span; y: Span; color: string }

const BRICK = '#a85a3d'
const OCHRE = '#b58a2e'
const GREEN = '#3f6f4f'
const CREAM_DARK = '#d9d3b8'

const parts: Part[] = [
  // Lot 9, the south-west corner: brick panels and barred windows on the ground floor. The lot's
  // front ends at the ochava, 10.97 m from the house's lot line, so nothing is drawn past it.
  { v: [-4.625, -5.725], y: [.7, 2.15], color: BRICK },
  { v: [-7.625, -10.9], y: [.7, 2.15], color: BRICK },
  { v: [-5.825, -7.425], y: [.7, 2.15], color: OCHRE, depth: .1 },
  { v: [-9.125, -10.575], y: [1.4, 2.1], color: '#8a949a', depth: .1 },
  { v: [-4.475, -10.9], y: [2.85, 3], color: CREAM_DARK, depth: .3 },
  // Lot 9, first floor above the ground-floor cornice.
  { v: [-5.975, -7.475], y: [4.4, 5.8], color: OCHRE, depth: .08 },
  // Lot 7, the garage next to its patio: green side door and garage doors between brick piers. The
  // sheet-metal roof is the garage volume itself.
  { v: [8.55, 9.35], y: [0, 2.5], color: GREEN, depth: .1 },
  { v: [9.9, 13.2], y: [0, 2.7], color: GREEN, depth: .1 },
]

const railing = (height: number, v0: number, v1: number): [number, number, number][] =>
  [[FRONT + .075, height, -v0], [FRONT + .075, height, -v1]]

export function NeighborFacades() {
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    {parts.map(part => {
      const [v0, v1] = part.v, [y0, y1] = part.y
      const depth = part.depth ?? .06
      return <mesh key={`${part.v}-${part.y}`} position={[part.u ?? FRONT - depth / 2 + .01, (y0 + y1) / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[depth, y1 - y0, Math.abs(v1 - v0)]} />
        <meshStandardMaterial color={part.color} roughness={.9} />
      </mesh>
    })}
    {/* Lot 10, behind: its light-yellow front on the cross street, with the garage door and the side door. */}
    {REAR_LOT_FRONT.parts.map(part => {
      const [u0, u1] = part.u, [y0, y1] = part.y
      return <mesh key={`${part.u}-${part.y}`} position={[(u0 + u1) / 2, (y0 + y1) / 2, -(REAR_LOT_FRONT.v - part.depth / 2)]} receiveShadow>
        <boxGeometry args={[u1 - u0, y1 - y0, part.depth]} />
        <meshStandardMaterial color={part.color} roughness={.9} />
      </mesh>
    })}
    {/* Lot 7: green railing above the brick street wall of its patio (the wall itself is a volume). */}
    <Line points={railing(3, 4.55, 7.9)} color="#2f5d4a" lineWidth={1.4} />
    <Line points={railing(2.55, 4.55, 7.9)} color="#2f5d4a" lineWidth={1.4} />
  </group>
}
