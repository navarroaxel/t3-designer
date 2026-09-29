import { useEffect, useMemo } from 'react'
import { ExtrudeGeometry } from 'three'
import { FLOOR_HEIGHT, HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import {
  CUT_HEIGHT, FIRST_OUTLINE, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, SLAB_THICKNESS, wallBoxes,
  type Floor, type PlanPoint,
} from '../data/house-plan'
import { polygonShape } from '../lib/polygon-shape'

const WALL_COLOR = '#d9cdb2'
const SLAB_COLOR = '#b9b3a5'

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
      <Walls floor="first" top={FLOOR_HEIGHT + CUT_HEIGHT} />
    </>}
  </group>
}
