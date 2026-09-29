import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import { ExtrudeGeometry } from 'three'
import { FLOOR_HEIGHT, HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import {
  CUT_HEIGHT, ENTRY_RECESS_OUTLINE, CLOSET_SLIDING_PANELS, CLOSET_WARDROBE, LIVING_TV_PLACEMENT, MAIN_BED, QUEEN_BED, FIRST_FLOOR_DOOR_SWINGS, FIRST_FLOOR_PARTITIONS, MAIN_ROOM_CLOSET_WARDROBE, MAIN_TV_PLACEMENT, SECONDARY_BED, WARDROBE_LEAVES, SINGLE_BED, SECONDARY_WARDROBE, WARDROBE, FIRST_OUTLINE, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, SLAB_THICKNESS, wallBoxes,
  type DoorSwing, type Floor, type PlanPoint,
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

/** A door open 90 degrees, with the dashed quarter circle of its swing on the floor. */
function DoorSwingView({ door }: { door: DoorSwing }) {
  const { hinge, closed, open, radius, color } = door
  const point = (fraction: number, height: number): [number, number, number] => {
    const angle = Math.PI / 2 * fraction
    return [hinge[0] + radius * (Math.cos(angle) * closed[0] + Math.sin(angle) * open[0]), height, -(hinge[1] + radius * (Math.cos(angle) * closed[1] + Math.sin(angle) * open[1]))]
  }
  // The open leaf is a slab from the hinge along `open`, .04 m thick; local x is u, local z is -v.
  const alongU = Math.abs(open[0]) > 0
  return <>
    <mesh position={[hinge[0] + open[0] * radius / 2 + (alongU ? 0 : -closed[0] * .02), FLOOR_HEIGHT + CUT_HEIGHT / 2, -(hinge[1] + open[1] * radius / 2 + (alongU ? -closed[1] * .02 : 0))]} receiveShadow>
      <boxGeometry args={[alongU ? radius : .04, CUT_HEIGHT, alongU ? .04 : radius]} />
      <meshStandardMaterial color={color} roughness={.6} />
    </mesh>
    <Line points={Array.from({ length: 13 }, (_, i) => point(i / 12, FLOOR_HEIGHT + .03))} color="#8a6a3a" lineWidth={1} dashed dashSize={.08} gapSize={.06} />
  </>
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
      {/* The closet's wardrobe along the whole party wall with neighbour A, sectioned at the cut. */}
      <mesh position={[(MAIN_ROOM_CLOSET_WARDROBE.u[0] + MAIN_ROOM_CLOSET_WARDROBE.u[1]) / 2, FLOOR_HEIGHT + Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT) / 2, -(MAIN_ROOM_CLOSET_WARDROBE.v[0] + MAIN_ROOM_CLOSET_WARDROBE.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[MAIN_ROOM_CLOSET_WARDROBE.u[1] - MAIN_ROOM_CLOSET_WARDROBE.u[0], Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT), MAIN_ROOM_CLOSET_WARDROBE.v[1] - MAIN_ROOM_CLOSET_WARDROBE.v[0]]} />
        <meshStandardMaterial color={WARDROBE_COLOR} roughness={.85} />
      </mesh>
      {/* Its sliding doors, on two tracks. */}
      {CLOSET_SLIDING_PANELS.map((panel, index) => <mesh key={index} position={[(panel.u[0] + panel.u[1]) / 2, FLOOR_HEIGHT + Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT) / 2, -(panel.v[0] + panel.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[panel.u[1] - panel.u[0], Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT), panel.v[1] - panel.v[0]]} />
        <meshStandardMaterial color={panel.front ? '#d8d1c2' : '#c9c0ae'} roughness={.7} />
      </mesh>)}
      {/* The wardrobe's three doors of two leaves, on its face toward the room. */}
      {WARDROBE_LEAVES.map(([v0, v1], index) => <mesh key={index} position={[SECONDARY_WARDROBE.u[0] - .01, FLOOR_HEIGHT + Math.min(WARDROBE.height, CUT_HEIGHT) / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[.02, Math.min(WARDROBE.height, CUT_HEIGHT), v1 - v0]} />
        <meshStandardMaterial color={LEAF_COLORS[index % 2]} roughness={.75} />
      </mesh>)}
      {/* The queen bed in the main room: head against the drywall, with headboard and two pillows. */}
      <mesh position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2, FLOOR_HEIGHT + QUEEN_BED.height / 2, -(MAIN_BED.v[0] + MAIN_BED.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[QUEEN_BED.width, QUEEN_BED.height, QUEEN_BED.length]} />
        <meshStandardMaterial color={BED_COLOR} roughness={.9} />
      </mesh>
      <mesh position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2, FLOOR_HEIGHT + .55, -(MAIN_BED.v[1] - .03)]} receiveShadow>
        <boxGeometry args={[QUEEN_BED.width, 1.1, .06]} />
        <meshStandardMaterial color="#8b6b4a" roughness={.8} />
      </mesh>
      {[-.4, .4].map(offset => <mesh key={offset} position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2 + offset, FLOOR_HEIGHT + QUEEN_BED.height + .06, -(MAIN_BED.v[1] - .3)]} receiveShadow>
        <boxGeometry args={[.6, .12, .4]} />
        <meshStandardMaterial color="#f4f1ea" roughness={.95} />
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
      {/* The TVs: OLEDs on wall brackets, one in the main room and one in the living. */}
      {[MAIN_TV_PLACEMENT, LIVING_TV_PLACEMENT].map((tv, index) => <group key={index}>
        <mesh position={[(tv.u[0] + tv.u[1]) / 2, (tv.y[0] + tv.y[1]) / 2, -(tv.v[0] + tv.v[1]) / 2]} receiveShadow>
          <boxGeometry args={[tv.u[1] - tv.u[0], tv.y[1] - tv.y[0], tv.v[1] - tv.v[0]]} />
          <meshStandardMaterial color="#0d0e10" roughness={.15} metalness={.4} />
        </mesh>
        <mesh position={[(tv.u[0] + tv.u[1]) / 2, (tv.y[0] + tv.y[1]) / 2, -(tv.bracket.v[0] + tv.bracket.v[1]) / 2]}>
          <boxGeometry args={[tv.bracket.width, tv.bracket.height, tv.bracket.v[1] - tv.bracket.v[0]]} />
          <meshStandardMaterial color="#3b3d40" roughness={.5} metalness={.6} />
        </mesh>
      </group>)}
      {/* The closet's wardrobe along the whole party wall with neighbour A, sectioned at the cut. */}
      <mesh position={[(MAIN_ROOM_CLOSET_WARDROBE.u[0] + MAIN_ROOM_CLOSET_WARDROBE.u[1]) / 2, FLOOR_HEIGHT + Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT) / 2, -(MAIN_ROOM_CLOSET_WARDROBE.v[0] + MAIN_ROOM_CLOSET_WARDROBE.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[MAIN_ROOM_CLOSET_WARDROBE.u[1] - MAIN_ROOM_CLOSET_WARDROBE.u[0], Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT), MAIN_ROOM_CLOSET_WARDROBE.v[1] - MAIN_ROOM_CLOSET_WARDROBE.v[0]]} />
        <meshStandardMaterial color={WARDROBE_COLOR} roughness={.85} />
      </mesh>
      {/* Its sliding doors, on two tracks. */}
      {CLOSET_SLIDING_PANELS.map((panel, index) => <mesh key={index} position={[(panel.u[0] + panel.u[1]) / 2, FLOOR_HEIGHT + Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT) / 2, -(panel.v[0] + panel.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[panel.u[1] - panel.u[0], Math.min(CLOSET_WARDROBE.height, CUT_HEIGHT), panel.v[1] - panel.v[0]]} />
        <meshStandardMaterial color={panel.front ? '#d8d1c2' : '#c9c0ae'} roughness={.7} />
      </mesh>)}
      {/* The wardrobe's three doors of two leaves, on its face toward the room. */}
      {WARDROBE_LEAVES.map(([v0, v1], index) => <mesh key={index} position={[SECONDARY_WARDROBE.u[0] - .01, FLOOR_HEIGHT + Math.min(WARDROBE.height, CUT_HEIGHT) / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[.02, Math.min(WARDROBE.height, CUT_HEIGHT), v1 - v0]} />
        <meshStandardMaterial color={LEAF_COLORS[index % 2]} roughness={.75} />
      </mesh>)}
      {/* The queen bed in the main room: head against the drywall, with headboard and two pillows. */}
      <mesh position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2, FLOOR_HEIGHT + QUEEN_BED.height / 2, -(MAIN_BED.v[0] + MAIN_BED.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[QUEEN_BED.width, QUEEN_BED.height, QUEEN_BED.length]} />
        <meshStandardMaterial color={BED_COLOR} roughness={.9} />
      </mesh>
      <mesh position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2, FLOOR_HEIGHT + .55, -(MAIN_BED.v[1] - .03)]} receiveShadow>
        <boxGeometry args={[QUEEN_BED.width, 1.1, .06]} />
        <meshStandardMaterial color="#8b6b4a" roughness={.8} />
      </mesh>
      {[-.4, .4].map(offset => <mesh key={offset} position={[(MAIN_BED.u[0] + MAIN_BED.u[1]) / 2 + offset, FLOOR_HEIGHT + QUEEN_BED.height + .06, -(MAIN_BED.v[1] - .3)]} receiveShadow>
        <boxGeometry args={[.6, .12, .4]} />
        <meshStandardMaterial color="#f4f1ea" roughness={.95} />
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
      {/* The main room's TV: an OLED on a wall bracket, on the wall it shares with the secondary room. */}
      <mesh position={[(MAIN_TV_PLACEMENT.u[0] + MAIN_TV_PLACEMENT.u[1]) / 2, (MAIN_TV_PLACEMENT.y[0] + MAIN_TV_PLACEMENT.y[1]) / 2, -(MAIN_TV_PLACEMENT.v[0] + MAIN_TV_PLACEMENT.v[1]) / 2]} receiveShadow>
        <boxGeometry args={[MAIN_TV_PLACEMENT.u[1] - MAIN_TV_PLACEMENT.u[0], MAIN_TV_PLACEMENT.y[1] - MAIN_TV_PLACEMENT.y[0], MAIN_TV_PLACEMENT.v[1] - MAIN_TV_PLACEMENT.v[0]]} />
        <meshStandardMaterial color="#0d0e10" roughness={.15} metalness={.4} />
      </mesh>
      <mesh position={[(MAIN_TV_PLACEMENT.u[0] + MAIN_TV_PLACEMENT.u[1]) / 2, (MAIN_TV_PLACEMENT.y[0] + MAIN_TV_PLACEMENT.y[1]) / 2, -(MAIN_TV_PLACEMENT.bracket.v[0] + MAIN_TV_PLACEMENT.bracket.v[1]) / 2]}>
        <boxGeometry args={[MAIN_TV_PLACEMENT.bracket.width, MAIN_TV_PLACEMENT.bracket.height, MAIN_TV_PLACEMENT.bracket.v[1] - MAIN_TV_PLACEMENT.bracket.v[0]]} />
        <meshStandardMaterial color="#3b3d40" roughness={.5} metalness={.6} />
      </mesh>
      {/* The three doors, open 90 degrees with their swings; all right-handed. */}
      {FIRST_FLOOR_DOOR_SWINGS.map(door => <DoorSwingView key={door.id} door={door} />)}
      {FIRST_FLOOR_PARTITIONS.map(([u0, u1, v0, v1]) => <mesh key={`${u0}-${v0}`} position={[(u0 + u1) / 2, FLOOR_HEIGHT + CUT_HEIGHT / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[u1 - u0, CUT_HEIGHT, v1 - v0]} />
        <meshStandardMaterial color={PARTITION_COLOR} roughness={.95} />
      </mesh>)}
    </>}
  </group>
}
