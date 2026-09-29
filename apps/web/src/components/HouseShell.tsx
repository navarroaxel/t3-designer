import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry } from 'three'
import { FLOOR_HEIGHT, HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import {
  CUT_HEIGHT, ENTRY_RECESS_OUTLINE, FIRST_FLOOR_PARTITIONS, BATHROOM_DOOR, BATHROOM_DOOR_COLOR, SECONDARY_BED, SECONDARY_DOOR, WARDROBE_LEAVES, SECONDARY_DOOR_COLOR, SINGLE_BED, SECONDARY_WARDROBE, WARDROBE, FIRST_OUTLINE, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, SLAB_THICKNESS, wallBoxes,
  type Floor, type PlanPoint,
} from '../data/house-plan'
import { polygonShape } from '../lib/polygon-shape'

const WALL_COLOR = '#d9cdb2'
/** The interior partitions are painted white. */
const PARTITION_COLOR = '#f3f1ec'
const SLAB_COLOR = '#b9b3a5'
const WARDROBE_COLOR = '#b58b5a'
const BED_COLOR = '#d9d2c4'
const LEAF_COLORS = ['#c39a64', '#b58b5a']

/** A floor slab from a plan outline. Local z is -v, so the shape takes [u, -v]. */
function Slab({ outline, top }: { outline: PlanPoint[]; top: number }) {
  const geometry = useMemo(() => {
    const slab = new ExtrudeGeometry(polygonShape(outline.map(([u, v]) => [u, -v])), { depth: SLAB_THICKNESS, bevelEnabled: false })
    slab.rotateX(-Math.PI / 2)
    return slab
  }, [outline])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[0, top - SLAB_THICKNESS, 0]} receiveShadow>
    <meshStandardMaterial color={SLAB_COLOR} roughness={.95} />
  </mesh>
}

function Walls({ floor, top }: { floor: Floor; top: number }) {
  const level = FLOOR_LEVEL[floor]
  const boxes = useMemo(() => wallBoxes(floor === 'ground' ? GROUND_OUTLINE : FIRST_OUTLINE, OPENINGS[floor], level, top), [floor, level, top])
  return <>
    {boxes.map((box, index) => <mesh key={index} position={[box.center[0], box.center[1], -box.center[2]]} receiveShadow>
      <boxGeometry args={[box.size[0], box.size[1], box.size[2]]} />
      <meshStandardMaterial color={WALL_COLOR} roughness={.95} />
    </mesh>)}
  </>
}

/**
 * The house cut open at one floor: exterior walls, slabs and the front openings,
 * sectioned CUT_HEIGHT above the floor. Interior walls are not modelled yet. The
 * physical house still casts its full shadows; this is only what is drawn.
 */
export function HouseShell({ floor }: { floor: Floor }) {
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    {floor === 'ground' && <>
      <Slab outline={GROUND_OUTLINE} top={0} />
      <Walls floor="ground" top={CUT_HEIGHT} />
    </>}
    {floor === 'first' && <>
      {/* The ground floor below is shown whole, capped by the first-floor slab. */}
      <Walls floor="ground" top={FLOOR_HEIGHT - SLAB_THICKNESS} />
      <Slab outline={GROUND_OUTLINE} top={FLOOR_HEIGHT} />
      {/* The first floor is built over the entrance recess, so its floor covers it. */}
      <Slab outline={ENTRY_RECESS_OUTLINE} top={FLOOR_HEIGHT} />
      <Walls floor="first" top={FLOOR_HEIGHT + CUT_HEIGHT} />
      {/* The secondary room's built-in wardrobe, sectioned at the cut like the walls. */}
      <mesh position={[(SECONDARY_WARDROBE.u[0] + SECONDARY_WARDROBE.u[1]) / 2, FLOOR_HEIGHT + Math.min(WARDROBE.height, CUT_HEIGHT) / 2, -(SECONDARY_WARDROBE.v[0] + SECONDARY_WARDROBE.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[WARDROBE.depth, Math.min(WARDROBE.height, CUT_HEIGHT), WARDROBE.width]} />
        <meshStandardMaterial color={WARDROBE_COLOR} roughness={.85} />
      </mesh>
      {/* The wardrobe's three doors of two leaves, on its face toward the room. */}
      {WARDROBE_LEAVES.map(([v0, v1], index) => <mesh key={index} position={[SECONDARY_WARDROBE.u[0] - .01, FLOOR_HEIGHT + Math.min(WARDROBE.height, CUT_HEIGHT) / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[.02, Math.min(WARDROBE.height, CUT_HEIGHT), v1 - v0]} />
        <meshStandardMaterial color={LEAF_COLORS[index % 2]} roughness={.75} />
      </mesh>)}
      {/* A single bed in the secondary room. */}
      <mesh position={[(SECONDARY_BED.u[0] + SECONDARY_BED.u[1]) / 2, FLOOR_HEIGHT + SINGLE_BED.height / 2, -(SECONDARY_BED.v[0] + SECONDARY_BED.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[SINGLE_BED.width, SINGLE_BED.height, SINGLE_BED.length]} />
        <meshStandardMaterial color={BED_COLOR} roughness={.9} />
      </mesh>
      {/* Headboard against the party wall and a pillow, so the head end reads at a glance. */}
      <mesh position={[(SECONDARY_BED.u[0] + SECONDARY_BED.u[1]) / 2, FLOOR_HEIGHT + .45, -(SECONDARY_BED.v[0] + .03)]} receiveShadow>
        <boxGeometry args={[SINGLE_BED.width, .9, .06]} />
        <meshStandardMaterial color="#8b6b4a" roughness={.8} />
      </mesh>
      <mesh position={[(SECONDARY_BED.u[0] + SECONDARY_BED.u[1]) / 2, FLOOR_HEIGHT + SINGLE_BED.height + .06, -(SECONDARY_BED.v[0] + .35)]} receiveShadow>
        <boxGeometry args={[.6, .12, .4]} />
        <meshStandardMaterial color="#f4f1ea" roughness={.95} />
      </mesh>
      {/* The room's wenge door, closed, sectioned at the cut. */}
      <mesh position={[(SECONDARY_DOOR.u[0] + SECONDARY_DOOR.u[1]) / 2, FLOOR_HEIGHT + CUT_HEIGHT / 2, -(SECONDARY_DOOR.v[0] + SECONDARY_DOOR.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[.04, CUT_HEIGHT, SECONDARY_DOOR.v[1] - SECONDARY_DOOR.v[0]]} />
        <meshStandardMaterial color={SECONDARY_DOOR_COLOR} roughness={.6} />
      </mesh>
      {/* The bathroom's natural-oak door, closed, on the hall side. */}
      <mesh position={[(BATHROOM_DOOR.u[0] + BATHROOM_DOOR.u[1]) / 2, FLOOR_HEIGHT + CUT_HEIGHT / 2, -(BATHROOM_DOOR.v[0] + BATHROOM_DOOR.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[BATHROOM_DOOR.u[1] - BATHROOM_DOOR.u[0], CUT_HEIGHT, .04]} />
        <meshStandardMaterial color={BATHROOM_DOOR_COLOR} roughness={.6} />
      </mesh>
      {FIRST_FLOOR_PARTITIONS.map(([u0, u1, v0, v1]) => <mesh key={`${u0}-${v0}`} position={[(u0 + u1) / 2, FLOOR_HEIGHT + CUT_HEIGHT / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[u1 - u0, CUT_HEIGHT, v1 - v0]} />
        <meshStandardMaterial color={PARTITION_COLOR} roughness={.95} />
      </mesh>)}
    </>}
  </group>
}
