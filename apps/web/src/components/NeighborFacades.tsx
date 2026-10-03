import { HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import { CORNER_FACES, CROSS_STREET_PARTS, OCHAVA_PARTS, facePoint, type CornerPart } from '../data/corner-front'
import { BLACK_FRONT_FACE, BLACK_FRONT_PARTS, BLACK_ROOM_FACE, BLACK_ROOM_PARTS, CORNER_23_FACES, CORNER_STREET_PARTS, OPPOSITE_SLABS, cornerTrim } from '../data/opposite-fronts'
import { A_FRONT, REAR_LOT_FRONT } from '../data/neighbor-fronts'

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
  { v: [-4.33, -10.9], y: [2.85, 3], color: CREAM_DARK, depth: .3 },
  // Lot 9, first floor above the ground-floor cornice.
  { v: [-5.975, -7.475], y: [4.4, 5.8], color: OCHRE, depth: .08 },
  // Lot 7, the garage next to its patio: green side door and garage doors between brick piers. The
  // sheet-metal roof is the garage volume itself.
  { v: [8.55, 9.35], y: [0, 2.5], color: GREEN, depth: .1 },
  { v: [9.9, 13.2], y: [0, 2.7], color: GREEN, depth: .1 },
]

/** Details on a slanted face of the corner lot: a box at metres `s` along the face, flush with its wall. */
function CornerFace({ face, parts }: { face: readonly [[number, number], [number, number]]; parts: CornerPart[] }) {
  return <>{parts.map(part => {
    const [s0, s1] = part.s, [y0, y1] = part.y
    const { u, v, normal, angle } = facePoint(face, (s0 + s1) / 2)
    const push = part.depth / 2 - .01
    return <mesh key={`${part.s}-${part.y}`} position={[u + normal[0] * push, (y0 + y1) / 2, -(v + normal[1] * push)]} rotation={[0, angle, 0]} receiveShadow>
      <boxGeometry args={[s1 - s0, y1 - y0, part.depth]} />
      <meshStandardMaterial color={part.color} roughness={.9} />
    </mesh>
  })}</>
}

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
    {/* Lot 9, the corner: the chamfer and the face on the cross street. */}
    <CornerFace face={CORNER_FACES.ochava} parts={OCHAVA_PARTS} />
    <CornerFace face={CORNER_FACES.crossStreet} parts={CROSS_STREET_PARTS} />
    {/* Across the street: lot 23's base and visor, and lot 24's fence and party walls. */}
    {CORNER_23_FACES.map(face => <CornerFace key={`${face[0]}`} face={face} parts={cornerTrim(face)} />)}
    <CornerFace face={CORNER_23_FACES[2]} parts={CORNER_STREET_PARTS} />
    <CornerFace face={BLACK_FRONT_FACE} parts={BLACK_FRONT_PARTS} />
    <CornerFace face={BLACK_ROOM_FACE} parts={BLACK_ROOM_PARTS} />
    {OPPOSITE_SLABS.map(slab => <mesh key={`${slab.u}-${slab.v}-${slab.y}`} position={[(slab.u[0] + slab.u[1]) / 2, (slab.y[0] + slab.y[1]) / 2, -(slab.v[0] + slab.v[1]) / 2]} receiveShadow castShadow>
      <boxGeometry args={[slab.u[1] - slab.u[0], slab.y[1] - slab.y[0], slab.v[1] - slab.v[0]]} />
      <meshStandardMaterial color={slab.color} roughness={.85} />
    </mesh>)}
    {/* Lot 10, behind: its light-yellow front on the cross street, with the garage door and the side door. */}
    {REAR_LOT_FRONT.parts.map(part => {
      const [u0, u1] = part.u, [y0, y1] = part.y
      return <mesh key={`${part.u}-${part.y}`} position={[(u0 + u1) / 2, (y0 + y1) / 2, -(REAR_LOT_FRONT.v - part.depth / 2)]} receiveShadow>
        <boxGeometry args={[u1 - u0, y1 - y0, part.depth]} />
        <meshStandardMaterial color={part.color} roughness={.9} />
      </mesh>
    })}
    {/* Lot 7 (A): the balcony's red floor, the brick cap of its street wall, and the house's front. */}
    <mesh position={[(FRONT + .15 + A_FRONT.u) / 2, (A_FRONT.floor.y[0] + A_FRONT.floor.y[1]) / 2, -(A_FRONT.v[0] + A_FRONT.v[1]) / 2]} receiveShadow>
      <boxGeometry args={[A_FRONT.u - FRONT - .15, A_FRONT.floor.y[1] - A_FRONT.floor.y[0], A_FRONT.v[1] - A_FRONT.v[0]]} />
      <meshStandardMaterial color={A_FRONT.floor.color} roughness={.95} />
    </mesh>
    {A_FRONT.cap.map(course => <mesh key={`${course.y}`} position={[FRONT + .075, (course.y[0] + course.y[1]) / 2, -(A_FRONT.v[0] + A_FRONT.v[1]) / 2]} receiveShadow>
      <boxGeometry args={[course.depth, course.y[1] - course.y[0], A_FRONT.v[1] - A_FRONT.v[0]]} />
      <meshStandardMaterial color={course.color} roughness={.9} />
    </mesh>)}
    {A_FRONT.parts.map(part => {
      const [v0, v1] = part.v, [y0, y1] = part.y
      return <mesh key={`${part.v}-${part.y}`} position={[A_FRONT.u - part.depth / 2 + .01, (y0 + y1) / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[part.depth, y1 - y0, v1 - v0]} />
        <meshStandardMaterial color={part.color} roughness={.8} />
      </mesh>
    })}
  </group>
}
