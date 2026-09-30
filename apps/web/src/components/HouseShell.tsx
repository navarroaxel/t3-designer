import { useEffect, useMemo } from 'react'
import { Line } from '@react-three/drei'
import { CanvasTexture, ExtrudeGeometry, RepeatWrapping, SRGBColorSpace } from 'three'
import { FLOOR_HEIGHT, HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import {
  CUT_HEIGHT, ENTRY_RECESS_OUTLINE, CLOSET_SLIDING_PANELS, CLOSET_WARDROBE, GROUND_DOOR_SWINGS, GROUND_PARTITIONS, FLOOR_TILING, LIVING_DOOR, LIVING_DOOR_FRAME, LIVING_DOOR_LEAVES, TILE_THICKNESS, LIVING_TV_PLACEMENT, MAIN_BED, QUEEN_BED, FIRST_FLOOR_DOOR_SWINGS, FIRST_FLOOR_PARTITIONS, MAIN_ROOM_CLOSET_WARDROBE, MAIN_TV_PLACEMENT, SECONDARY_BED, WARDROBE_LEAVES, SINGLE_BED, SECONDARY_WARDROBE, WARDROBE, FIRST_OUTLINE, FLOOR_LEVEL, GROUND_OUTLINE, OPENINGS, SIDE_OPENINGS, SLAB_THICKNESS, wallBoxes,
  type DoorSwing, type Floor, type FloorTiling, type PlanPoint, type TilePattern,
} from '../data/house-plan'
import { BATHROOM_BOXES } from '../data/bathroom'
import { KITCHEN_BOXES, type KitchenBox } from '../data/kitchen'
import { polygonShape } from '../lib/polygon-shape'

const WALL_COLOR = '#d9cdb2'
/** The interior partitions are painted white. */
const PARTITION_COLOR = '#f3f1ec'
const SLAB_COLOR = '#b9b3a5'
const WARDROBE_COLOR = '#b58b5a'
const BED_COLOR = '#d9d2c4'
const LEAF_COLORS = ['#c39a64', '#b58b5a']

/** A floor slab from a plan outline. Local z is -v, so the shape takes [u, -v]. */
function Slab({ outline, top, castShadow = false }: { outline: PlanPoint[]; top: number; castShadow?: boolean }) {
  const geometry = useMemo(() => {
    const slab = new ExtrudeGeometry(polygonShape(outline.map(([u, v]) => [u, -v])), { depth: SLAB_THICKNESS, bevelEnabled: false })
    slab.rotateX(-Math.PI / 2)
    return slab
  }, [outline])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[0, top - SLAB_THICKNESS, 0]} castShadow={castShadow} receiveShadow>
    <meshStandardMaterial color={SLAB_COLOR} roughness={.95} />
  </mesh>
}

/** Interior walls between two heights, from their plan rectangles. */
function InteriorWalls({ walls, from, to, castShadow = false }: { walls: readonly [number, number, number, number][]; from: number; to: number; castShadow?: boolean }) {
  return <>{walls.map(([u0, u1, v0, v1]) => <mesh key={`${u0}-${v0}`} position={[(u0 + u1) / 2, (from + to) / 2, -(v0 + v1) / 2]} castShadow={castShadow} receiveShadow>
    <boxGeometry args={[u1 - u0, to - from, v1 - v0]} />
    <meshStandardMaterial color={PARTITION_COLOR} roughness={.95} />
  </mesh>)}</>
}

/**
 * A glazed leaf, sectioned at the cut: white aluminium stiles and a bottom rail around a translucent pane.
 * `alongU` says which way its length runs; the thickness is across the other axis.
 */
function GlazedLeaf({ centre, alongU, length, color = '#f3f2ee' }: { centre: [number, number]; alongU: boolean; length: number; color?: string }) {
  const { profile, bottomRail, glass, glassOpacity } = LIVING_DOOR_FRAME
  const height = CUT_HEIGHT
  const piece = (along: [number, number], y: [number, number], thickness: number, key: string, glassPiece = false) => {
    const size: [number, number, number] = alongU ? [along[1] - along[0], y[1] - y[0], thickness] : [thickness, y[1] - y[0], along[1] - along[0]]
    const at: [number, number, number] = alongU ? [centre[0] + (along[0] + along[1]) / 2, FLOOR_HEIGHT + (y[0] + y[1]) / 2, -centre[1]] : [centre[0], FLOOR_HEIGHT + (y[0] + y[1]) / 2, -(centre[1] + (along[0] + along[1]) / 2)]
    return <mesh key={key} position={at} receiveShadow>
      <boxGeometry args={size} />
      {glassPiece
        ? <meshStandardMaterial color={glass} roughness={.05} metalness={.1} transparent opacity={glassOpacity} depthWrite={false} />
        : <meshStandardMaterial color={color} roughness={.45} metalness={.25} />}
    </mesh>
  }
  return <>
    {piece([-length / 2, -length / 2 + profile], [0, height], profile, 'stile-a')}
    {piece([length / 2 - profile, length / 2], [0, height], profile, 'stile-b')}
    {piece([-length / 2 + profile, length / 2 - profile], [0, bottomRail], profile, 'rail')}
    {piece([-length / 2 + profile, length / 2 - profile], [bottomRail, height], .012, 'glass', true)}
  </>
}

/** A door open 90 degrees, with the dashed quarter circle of its swing on the floor. */
function DoorSwingView({ door, level = FLOOR_HEIGHT }: { door: DoorSwing; level?: number }) {
  const { hinge, closed, open, radius, color } = door
  const point = (fraction: number, height: number): [number, number, number] => {
    const angle = Math.PI / 2 * fraction
    return [hinge[0] + radius * (Math.cos(angle) * closed[0] + Math.sin(angle) * open[0]), height, -(hinge[1] + radius * (Math.cos(angle) * closed[1] + Math.sin(angle) * open[1]))]
  }
  // The open leaf is a slab from the hinge along `open`, .04 m thick; local x is u, local z is -v.
  const alongU = Math.abs(open[0]) > 0
  const leafCentre: [number, number] = [hinge[0] + open[0] * radius / 2 + (alongU ? 0 : -closed[0] * .02), hinge[1] + open[1] * radius / 2 + (alongU ? -closed[1] * .02 : 0)]
  return <>
    {door.glazed
      ? <GlazedLeaf centre={leafCentre} alongU={alongU} length={radius} color={color} />
      : <mesh position={[leafCentre[0], level + CUT_HEIGHT / 2, -leafCentre[1]]} receiveShadow>
          <boxGeometry args={[alongU ? radius : .04, CUT_HEIGHT, alongU ? .04 : radius]} />
          <meshStandardMaterial color={color} roughness={.6} />
        </mesh>}
    <Line points={Array.from({ length: 13 }, (_, i) => point(i / 12, level + .03))} color="#8a6a3a" lineWidth={1} dashed dashSize={.08} gapSize={.06} />
  </>
}

/** One repeat of a floor pattern: `rows` rows of pieces, each row shifted by `stagger` of a piece, with a faint joint. */
function patternTexture(base: string, pattern: TilePattern) {
  const pixelsPerMetre = 500
  const canvas = document.createElement('canvas')
  const length = pattern.length * pixelsPerMetre, rowHeight = pattern.width * pixelsPerMetre
  canvas.width = length; canvas.height = pattern.rows * rowHeight
  const context = canvas.getContext('2d')!
  const [red, green, blue] = [1, 3, 5].map(index => parseInt(base.slice(index, index + 2), 16))
  for (let row = 0; row < pattern.rows; row++) {
    for (let piece = -1; piece < 1; piece++) {
      // A little tone variation per piece, from a fixed pattern so the floor looks the same every time.
      const shade = 1 + (((row * 7 + (piece + 2) * 3) % 5) - 2) * .025
      const x = piece * length + row * length * pattern.stagger
      context.fillStyle = `rgb(${Math.min(255, red * shade)}, ${Math.min(255, green * shade)}, ${Math.min(255, blue * shade)})`
      context.fillRect(x, row * rowHeight, length, rowHeight)
      if (pattern.veins) {
        // Soft vertical veins, like travertine.
        context.strokeStyle = pattern.veinColor ?? 'rgba(120, 95, 60, .13)'; context.lineWidth = pattern.veinColor ? 3 : 2
        for (let vein = 0; vein < 7; vein++) {
          const veinX = x + ((vein * 0.61803) % 1) * length
          context.beginPath(); context.moveTo(veinX, row * rowHeight); context.bezierCurveTo(veinX + 14, row * rowHeight + rowHeight * .3, veinX - 12, row * rowHeight + rowHeight * .7, veinX + 6, (row + 1) * rowHeight); context.stroke()
        }
      } else {
        // Faint grain along the plank.
        context.strokeStyle = 'rgba(70, 45, 20, .10)'; context.lineWidth = 1
        for (let line = 1; line < 5; line++) {
          context.beginPath(); context.moveTo(x, row * rowHeight + line * rowHeight / 5 + (row % 2)); context.lineTo(x + length, row * rowHeight + line * rowHeight / 5 - (piece % 2)); context.stroke()
        }
      }
      if (pattern.grout > 0) {
        context.strokeStyle = 'rgba(55, 40, 25, .55)'; context.lineWidth = Math.max(1, pattern.grout * pixelsPerMetre)
        context.strokeRect(x, row * rowHeight, length, rowHeight)
      }
    }
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** A kitchen piece: a plain box, or a slab with its pattern (the worktops' Toscana Vena veins). */
function KitchenPiece({ box }: { box: KitchenBox }) {
  const { pattern } = box
  const map = useMemo(() => {
    if (!pattern) return null
    const texture = patternTexture(box.color, pattern)
    texture.repeat.set((box.u[1] - box.u[0]) / pattern.length, (box.v[1] - box.v[0]) / (pattern.width * pattern.rows))
    return texture
  }, [pattern, box.color, box.u, box.v])
  useEffect(() => () => map?.dispose(), [map])
  return <mesh position={[(box.u[0] + box.u[1]) / 2, (box.y[0] + box.y[1]) / 2, -(box.v[0] + box.v[1]) / 2]} receiveShadow>
    <boxGeometry args={[box.u[1] - box.u[0], box.y[1] - box.y[0], box.v[1] - box.v[0]]} />
    <meshStandardMaterial color={map ? '#ffffff' : box.color} map={map} roughness={box.id === 'fridge' ? .4 : map ? .35 : .6} metalness={box.id === 'fridge' ? .3 : 0} />
  </mesh>
}

/** One rectangle of a floor zone, with its pattern repeated at real scale. */
function FloorPatch({ zone, rect }: { zone: FloorTiling; rect: [number, number, number, number] }) {
  const [u0, u1, v0, v1] = rect
  const { pattern } = zone
  const map = useMemo(() => {
    const texture = patternTexture(zone.color, pattern)
    texture.repeat.set((u1 - u0) / pattern.length, (v1 - v0) / (pattern.width * pattern.rows))
    return texture
  }, [pattern, zone.color, u0, u1, v0, v1])
  useEffect(() => () => map.dispose(), [map])
  return <mesh position={[(u0 + u1) / 2, FLOOR_HEIGHT + TILE_THICKNESS / 2, -(v0 + v1) / 2]} receiveShadow>
    <boxGeometry args={[u1 - u0, TILE_THICKNESS, v1 - v0]} />
    <meshStandardMaterial color="#ffffff" map={map} roughness={.4} metalness={.05} />
  </mesh>
}

function Walls({ floor, top, castShadow = false }: { floor: Floor; top: number; castShadow?: boolean }) {
  const level = FLOOR_LEVEL[floor]
  const boxes = useMemo(() => wallBoxes(floor === 'ground' ? GROUND_OUTLINE : FIRST_OUTLINE, OPENINGS[floor], level, top, undefined, SIDE_OPENINGS[floor]), [floor, level, top])
  return <>
    {boxes.map((box, index) => <mesh key={index} position={[box.center[0], box.center[1], -box.center[2]]} castShadow={castShadow} receiveShadow>
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
      <InteriorWalls walls={GROUND_PARTITIONS} from={0} to={CUT_HEIGHT} />
      {/* The office door, open, with its swing. */}
      {GROUND_DOOR_SWINGS.map(door => <DoorSwingView key={door.id} door={door} level={0} />)}
    </>}
    {floor === 'first' && <>
      {/* The ground floor below is shown whole, capped by the first-floor slab. */}
      <Walls floor="ground" top={FLOOR_HEIGHT - SLAB_THICKNESS} />
      <InteriorWalls walls={GROUND_PARTITIONS} from={0} to={FLOOR_HEIGHT - SLAB_THICKNESS} />
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
      {/* Porcelain floors: Saing almendra planks in the bedrooms, Saing miel planks in the living, travertine in the bathroom. */}
      {FLOOR_TILING.flatMap(zone => zone.rects.map((rect, index) => <FloorPatch key={`${zone.id}-${index}`} zone={zone} rect={rect} />))}
      {/* The bathroom's fixtures along the wall shared with the living: vanity with its mirror, toilet and shower. */}
      {BATHROOM_BOXES.map(box => <mesh key={box.id} position={[(box.u[0] + box.u[1]) / 2, (box.y[0] + box.y[1]) / 2, -(box.v[0] + box.v[1]) / 2]} scale={box.shape === 'ellipse' ? [(box.u[1] - box.u[0]) / 2, 1, (box.v[1] - box.v[0]) / 2] : [1, 1, 1]} receiveShadow>
        {box.shape === 'ellipse'
          ? <cylinderGeometry args={[1, box.taper ?? 1, box.y[1] - box.y[0], 40]} />
          : <boxGeometry args={[box.u[1] - box.u[0], box.y[1] - box.y[0], box.v[1] - box.v[0]]} />}
        <meshStandardMaterial color={box.color} roughness={box.metalness ? .35 : box.id.startsWith('toilet') ? .25 : .6} metalness={box.metalness ?? 0} transparent={box.opacity !== undefined} opacity={box.opacity ?? 1} depthWrite={box.opacity === undefined} />
      </mesh>)}
      {/* The kitchen of the living, from the owner's render, with assumed sizes. */}
      {KITCHEN_BOXES.map(box => <KitchenPiece key={box.id} box={box} />)}
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
      {/* The living door's narrow leaf: the same aluminium frame and glass, beside the wide one that swings. */}
      <GlazedLeaf centre={[(LIVING_DOOR.u[0] + LIVING_DOOR.u[1]) / 2, LIVING_DOOR.v[1] - LIVING_DOOR_LEAVES.narrow / 2]} alongU={false} length={LIVING_DOOR_LEAVES.narrow} />
      {/* The doors, open 90 degrees with their swings; all right-handed. */}
      {FIRST_FLOOR_DOOR_SWINGS.map(door => <DoorSwingView key={door.id} door={door} />)}
      {FIRST_FLOOR_PARTITIONS.map(([u0, u1, v0, v1]) => <mesh key={`${u0}-${v0}`} position={[(u0 + u1) / 2, FLOOR_HEIGHT + CUT_HEIGHT / 2, -(v0 + v1) / 2]} receiveShadow>
        <boxGeometry args={[u1 - u0, CUT_HEIGHT, v1 - v0]} />
        <meshStandardMaterial color={PARTITION_COLOR} roughness={.95} />
      </mesh>)}
    </>}
  </group>
}

/**
 * The house as light sees it: a hollow shell, not a solid block. Both floors' exterior walls with their
 * openings, the first-floor slab (over the recess too), the roof slab and the first floor's interior walls, so
 * sunlight reaches the rooms only through the windows and doors. It stands in the shadow pass in place of the
 * house's solid prisms; the panels' own shading still uses the prisms.
 */
export function HouseShellPhysical() {
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    <Walls floor="ground" top={FLOOR_HEIGHT - SLAB_THICKNESS} castShadow />
    <InteriorWalls walls={GROUND_PARTITIONS} from={0} to={FLOOR_HEIGHT - SLAB_THICKNESS} castShadow />
    <Slab outline={GROUND_OUTLINE} top={FLOOR_HEIGHT} castShadow />
    <Slab outline={ENTRY_RECESS_OUTLINE} top={FLOOR_HEIGHT} castShadow />
    <Walls floor="first" top={2 * FLOOR_HEIGHT - SLAB_THICKNESS} castShadow />
    <Slab outline={FIRST_OUTLINE} top={2 * FLOOR_HEIGHT} castShadow />
    {FIRST_FLOOR_PARTITIONS.map(([u0, u1, v0, v1]) => <mesh key={`${u0}-${v0}`} position={[(u0 + u1) / 2, FLOOR_HEIGHT + (FLOOR_HEIGHT - SLAB_THICKNESS) / 2, -(v0 + v1) / 2]} castShadow>
      <boxGeometry args={[u1 - u0, FLOOR_HEIGHT - SLAB_THICKNESS, v1 - v0]} />
      <meshStandardMaterial color={PARTITION_COLOR} />
    </mesh>)}
  </group>
}
