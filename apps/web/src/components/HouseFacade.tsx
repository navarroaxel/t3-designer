import { Line } from '@react-three/drei'
import { HOUSE_CENTER, HOUSE_HALF_WIDTH, HOUSE_YAW } from '../data/building-site'
import { BALCONY, OPENINGS, SIDE_OPENINGS } from '../data/house-plan'

/**
 * Front elevation of the house, read from Street View (August 2025).
 * House frame: local x runs toward the rear (u), local z toward the south-west
 * (-v), y is up from the ground-floor level. The street front is at u = -5 and
 * the facade is 8.66 m wide, v in [-4.33, 4.33]. Positions come from the photo
 * scaled to the frontage (about 93 px/m); expect roughly +/-0.2 m.
 */
const FRONT = -5
const FLOOR = 3.2

type Span = [number, number]
type Part = { u: number; depth: number; v: Span; y: Span; color: string }
// The entrance recess is 1 m deep, between a 0.5 m flush wall (north-east) and a pier.
const ENTRY_FRONT = FRONT + 1

const slabs: Part[] = [
  // First-floor balcony slab, 7.94 m by 0.86 m over the pavement (owner).
  { u: FRONT - BALCONY.depth / 2, depth: BALCONY.depth, v: [-BALCONY.width / 2, BALCONY.width / 2], y: [FLOOR - BALCONY.edge, FLOOR], color: '#c9b58a' },
]

const openings: Part[] = [
  { u: ENTRY_FRONT - .03, depth: .06, v: [2.21, 3.5], y: [.3, 1.85], color: '#3d4a4c' }, // barred window, recessed
  { u: ENTRY_FRONT - .04, depth: .08, v: [1.07, 1.91], y: [0, 1.9], color: '#5b3a26' }, // wooden door, recessed
  { u: FRONT - .04, depth: .08, v: [-3.87, .14], y: [0, 2.4], color: '#cfcab3' }, // garage door
  { u: FRONT - .03, depth: .06, v: [.1, 3.1], y: [FLOOR, FLOOR + 2.1], color: '#d5d6cf' }, // 3 m balcony door, white shutter down to the floor
  { u: FRONT - .03, depth: .06, v: [-2.415 - 1.02, -2.415 + 1.02], y: [FLOOR + .7, FLOOR + 1.6], color: '#a7aaa0' }, // window of the secondary room, 2.04 m
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
export function HouseFacade({ physical = false, balconyOnly = false }: { physical?: boolean; balconyOnly?: boolean }) {
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    {slabs.map(part => <Box key={part.u} part={part} castShadow={physical} />)}
    {!physical && balconyOnly && <>
      {/* The first-floor balcony alone, for the cutaway: its slab (above) and its railing. */}
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, -BALCONY.width / 2], [FRONT - BALCONY.depth, BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, -BALCONY.width / 2], [FRONT, -BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, BALCONY.width / 2], [FRONT, BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
    </>}
    {!physical && !balconyOnly && <>
      {/* Rear wall of the first floor, facing the terrace and the light well: glass in its openings. */}
      {[...OPENINGS.ground, ...OPENINGS.first].filter(opening => opening.u > 0).map(opening => <mesh key={`${opening.v}-${opening.y}`} position={[opening.u + .02, (opening.y[0] + opening.y[1]) / 2, -(opening.v[0] + opening.v[1]) / 2]}>
        <boxGeometry args={[.04, opening.y[1] - opening.y[0], opening.v[1] - opening.v[0]]} />
        <meshStandardMaterial color="#a9b8bf" roughness={.08} metalness={.35} transparent opacity={.8} />
      </mesh>)}
      {/* The windows onto the light well (the office's, and the right arm's), in the walls that run along the well: glass on the well's face. */}
      {SIDE_OPENINGS.ground.map(opening => <mesh key={`${opening.u}-${opening.y}`} position={[(opening.u[0] + opening.u[1]) / 2, (opening.y[0] + opening.y[1]) / 2, -(opening.v + (opening.v > .25 ? -.02 : .02))]}>
        <boxGeometry args={[opening.u[1] - opening.u[0], opening.y[1] - opening.y[0], .04]} />
        <meshStandardMaterial color="#a9b8bf" roughness={.08} metalness={.35} transparent opacity={.8} />
      </mesh>)}
      {openings.map(part => <Box key={`${part.v}-${part.y}`} part={part} castShadow={false} />)}
      {/* Balcony railing at the slab edge, and the open railing above the front parapet. */}
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, -BALCONY.width / 2], [FRONT - BALCONY.depth, BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, -BALCONY.width / 2], [FRONT, -BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(FLOOR + 1, [[FRONT - BALCONY.depth, BALCONY.width / 2], [FRONT, BALCONY.width / 2]])} color="#3f4a44" lineWidth={1.4} />
      <Line points={rail(2 * FLOOR + 1.2, [[-6, -HOUSE_HALF_WIDTH], [-6, HOUSE_HALF_WIDTH]])} color="#3f4a44" lineWidth={1.4} />
    </>}
  </group>
}
