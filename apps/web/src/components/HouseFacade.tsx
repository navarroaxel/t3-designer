import { Line } from '@react-three/drei'
import { HOUSE_CENTER, HOUSE_HALF_WIDTH, HOUSE_YAW } from '../data/building-site'

/**
 * Front elevation of the house, read from Street View (August 2025).
 * House frame: local x runs toward the rear (u), local z toward the south-west
 * (-v), y is up from the ground-floor level. The street front is at u = -5 and
 * the facade is 8.95 m wide, v in [-4.475, 4.475]. Positions come from the photo
 * scaled to the frontage (about 93 px/m); expect roughly +/-0.2 m.
 */
const FRONT = -5
const FLOOR = 3.2

type Span = [number, number]
type Part = { u: number; depth: number; v: Span; y: Span; color: string }
// The entrance recess is 1 m deep, between a 0.5 m flush wall (north-east) and a pier.
const ENTRY_FRONT = FRONT + 1

const slabs: Part[] = [
  // First-floor balcony slab, projecting about 1 m over the pavement.
  { u: FRONT - .5, depth: 1, v: [-4.6, 4.6], y: [FLOOR - .3, FLOOR], color: '#c9b58a' },
]

const openings: Part[] = [
  { u: ENTRY_FRONT - .03, depth: .06, v: [2.21, 3.5], y: [.3, 1.85], color: '#3d4a4c' }, // barred window, recessed
  { u: ENTRY_FRONT - .04, depth: .08, v: [1.07, 1.91], y: [0, 1.9], color: '#5b3a26' }, // wooden door, recessed
  { u: FRONT - .04, depth: .08, v: [-3.87, .14], y: [0, 2.4], color: '#cfcab3' }, // garage door
  { u: FRONT - .03, depth: .06, v: [.1, 3.1], y: [FLOOR, FLOOR + 2.1], color: '#d5d6cf' }, // 3 m balcony door, white shutter down to the floor
  { u: FRONT - .03, depth: .06, v: [-3.33, -1.5], y: [FLOOR + .7, FLOOR + 1.6], color: '#a7aaa0' }, // small window
]

function Box({ part, castShadow }: { part: Part; castShadow: boolean }) {
  const [v0, v1] = part.v, [y0, y1] = part.y
  return <mesh position={[part.u, (y0 + y1) / 2, -(v0 + v1) / 2]} castShadow={castShadow} receiveShadow>
    <boxGeometry args={[part.depth, y1 - y0, Math.abs(v1 - v0)]} />
    <meshStandardMaterial color={part.color} roughness={.9} />
  </mesh>
}

/** Open railing: a line loop in local house coordinates (u, v). */
const rail = (height: number, corners: [number, number][]): [number, number, number][] =>
  [...corners, corners[0]].map(([u, v]) => [u, height, -v])

/** `physical` renders only what shades other things (the two slabs) for the
 * shadow pass; the visible pass adds openings and railings. */
export function HouseFacade({ physical = false }: { physical?: boolean }) {
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    {slabs.map(part => <Box key={part.u} part={part} castShadow={physical} />)}
    {!physical && <>
      {openings.map(part => <Box key={`${part.v}-${part.y}`} part={part} castShadow={false} />)}
      {/* Balcony railing at the slab edge, and the open railing above the front parapet. */}
      <Line points={rail(FLOOR + 1, [[FRONT - 1, -4.6], [FRONT - 1, 4.6]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - 1, -4.6], [FRONT, -4.6]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - 1, 4.6], [FRONT, 4.6]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(2 * FLOOR + 1.2, [[-6, -HOUSE_HALF_WIDTH], [-6, HOUSE_HALF_WIDTH]])} color="#3f4a44" lineWidth={1.4} />
    </>}
  </group>
}
