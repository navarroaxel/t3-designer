import { useEffect, useMemo } from 'react'
import { Line, RoundedBox } from '@react-three/drei'
import { CanvasTexture, ExtrudeGeometry, RepeatWrapping, SRGBColorSpace } from 'three'
import { FLOOR_HEIGHT, HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import {
  CUT_HEIGHT, ENTRY_RECESS_OUTLINE, GROUND_DOOR_SWINGS, GROUND_FLOOR_LEVEL, GROUND_FLOOR_TILING, FLOOR_TILING, LIVING_DOOR, LIVING_DOOR_FRAME, LIVING_DOOR_LEAVES, TILE_THICKNESS, FIRST_FLOOR_DOOR_SWINGS, FIRST_OUTLINE, GROUND_OUTLINE, SLAB_THICKNESS, STAIRWELL_HOLE,
  type DoorSwing, type Floor, type FloorTiling, type PlanPoint, type TilePattern,
} from '../data/house-plan'
import { STAIR_BLOCKS, STAIR_CEILING } from '../data/stair'
import { type KitchenBox } from '../data/kitchen'
import { shellWallBoxes } from '../data/house-interior'
import { HouseFurnishings } from './HouseFurnishings'
import { edgeRadius } from '../lib/rounding'
import { polygonShape } from '../lib/polygon-shape'

/** The stairwell opening in the first-floor slab, as a ring. Defined once so the slab's geometry is not rebuilt on every render. */
const STAIRWELL_RINGS: PlanPoint[][] = [[[STAIRWELL_HOLE[0], STAIRWELL_HOLE[2]], [STAIRWELL_HOLE[1], STAIRWELL_HOLE[2]], [STAIRWELL_HOLE[1], STAIRWELL_HOLE[3]], [STAIRWELL_HOLE[0], STAIRWELL_HOLE[3]]]]

const WALL_COLOR = '#d9cdb2'
/** The interior partitions are painted white. */
const PARTITION_COLOR = '#f3f1ec'
const SLAB_COLOR = '#b9b3a5'

/** A floor slab from a plan outline. Local z is -v, so the shape takes [u, -v]. */
function Slab({ outline, top, castShadow = false, holes = [] }: { outline: PlanPoint[]; top: number; castShadow?: boolean; holes?: PlanPoint[][] }) {
  const geometry = useMemo(() => {
    const slab = new ExtrudeGeometry(polygonShape(outline.map(([u, v]) => [u, -v]), holes.map(ring => ring.map(([u, v]) => [u, -v] as [number, number]))), { depth: SLAB_THICKNESS, bevelEnabled: false })
    slab.rotateX(-Math.PI / 2)
    return slab
  }, [outline, holes])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={[0, top - SLAB_THICKNESS, 0]} castShadow={castShadow} receiveShadow>
    <meshStandardMaterial color={SLAB_COLOR} roughness={.95} />
  </mesh>
}

/** The stair's concrete slabs, floating, drawn up to `top` (the cut, or the underside of the first-floor slab). */
function StairBlocks({ top }: { top: number }) {
  return <>{STAIR_BLOCKS.filter(block => block.y[0] < top).map(block => {
    const [bottom, roof] = [block.y[0], Math.min(block.y[1], top)]
    return <mesh key={block.id} position={[(block.u[0] + block.u[1]) / 2, (bottom + roof) / 2, -(block.v[0] + block.v[1]) / 2]} receiveShadow>
      <boxGeometry args={[block.u[1] - block.u[0], roof - bottom, block.v[1] - block.v[0]]} />
      <meshStandardMaterial color="#b9b6ae" roughness={.95} />
    </mesh>
  })}</>
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
export function KitchenPiece({ box }: { box: KitchenBox }) {
  const { pattern } = box
  const map = useMemo(() => {
    if (!pattern) return null
    const texture = patternTexture(box.color, pattern)
    texture.repeat.set((box.u[1] - box.u[0]) / pattern.length, (box.v[1] - box.v[0]) / (pattern.width * pattern.rows))
    return texture
  }, [pattern, box.color, box.u, box.v])
  useEffect(() => () => map?.dispose(), [map])
  const size = [box.u[1] - box.u[0], box.y[1] - box.y[0], box.v[1] - box.v[0]] as [number, number, number]
  const position: [number, number, number] = [(box.u[0] + box.u[1]) / 2, (box.y[0] + box.y[1]) / 2, -(box.v[0] + box.v[1]) / 2]
  const material = <meshStandardMaterial color={map ? '#ffffff' : box.color} map={map} roughness={box.id === 'fridge' ? .4 : map ? .35 : .6} metalness={box.id === 'fridge' ? .3 : 0} />
  // The worktops carry a pattern laid for a flat box and stay sharp; the cabinets, the fridge and the column get a soft edge.
  const radius = map ? 0 : edgeRadius(size)
  return radius > 0
    ? <RoundedBox args={size} radius={radius} smoothness={3} position={position} castShadow receiveShadow>{material}</RoundedBox>
    : <mesh position={position} receiveShadow>
        <boxGeometry args={size} />
        {material}
      </mesh>
}

/** One rectangle of a floor zone, with its pattern repeated at real scale. */
export function FloorPatch({ zone, rect }: { zone: FloorTiling; rect: [number, number, number, number] }) {
  const [u0, u1, v0, v1] = rect
  const { pattern } = zone
  const map = useMemo(() => {
    const texture = patternTexture(zone.color, pattern)
    texture.repeat.set((u1 - u0) / pattern.length, (v1 - v0) / (pattern.width * pattern.rows))
    return texture
  }, [pattern, zone.color, u0, u1, v0, v1])
  useEffect(() => () => map.dispose(), [map])
  return <mesh position={[(u0 + u1) / 2, (zone.level ?? FLOOR_HEIGHT) + TILE_THICKNESS / 2, -(v0 + v1) / 2]} receiveShadow>
    <boxGeometry args={[u1 - u0, TILE_THICKNESS, v1 - v0]} />
    <meshStandardMaterial color="#ffffff" map={map} roughness={.4} metalness={.05} />
  </mesh>
}

function Walls({ floor, top, castShadow = false }: { floor: Floor; top: number; castShadow?: boolean }) {
  // The exterior walls and the partitions, from the same walls the walkthrough walks through.
  const boxes = useMemo(() => shellWallBoxes(floor, top), [floor, top])
  return <>
    {boxes.map((box, index) => <mesh key={index} position={[box.center[0], box.center[1], -box.center[2]]} castShadow={castShadow} receiveShadow>
      <boxGeometry args={[box.size[0], box.size[1], box.size[2]]} />
      <meshStandardMaterial color={box.kind === 'exterior' ? WALL_COLOR : PARTITION_COLOR} roughness={.95} />
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
      <Slab outline={GROUND_OUTLINE} top={GROUND_FLOOR_LEVEL} />
      <Walls floor="ground" top={CUT_HEIGHT} />
      {/* The furniture and the equipment, from the same data the walkthrough furnishes the house with: sawn off at the cut like the walls. */}
      <HouseFurnishings floor="ground" absolute cut={CUT_HEIGHT} />
      {/* The ground floor's tiles: the bathroom's and the living's. */}
      {GROUND_FLOOR_TILING.flatMap(zone => zone.rects.map((rect, index) => <FloorPatch key={`${zone.id}-${index}`} zone={zone} rect={rect} />))}
      {/* The L-shaped stair from the hall, cut at the same height as the walls. */}
      <StairBlocks top={CUT_HEIGHT} />
      {/* The office door, open, with its swing. */}
      {GROUND_DOOR_SWINGS.map(door => <DoorSwingView key={door.id} door={door} level={0} />)}
    </>}
    {floor === 'first' && <>
      {/* The ground floor below is shown whole, capped by the first-floor slab. */}
      <Walls floor="ground" top={FLOOR_HEIGHT - SLAB_THICKNESS} />
      <StairBlocks top={STAIR_CEILING} />
      <Slab outline={GROUND_OUTLINE} top={FLOOR_HEIGHT} holes={STAIRWELL_RINGS} />
      {/* The first floor is built over the entrance recess, so its floor covers it. */}
      <Slab outline={ENTRY_RECESS_OUTLINE} top={FLOOR_HEIGHT} />
      <Walls floor="first" top={FLOOR_HEIGHT + CUT_HEIGHT} />
      {/* Porcelain floors: Saing almendra planks in the bedrooms, Saing miel planks in the living, travertine in the bathroom. */}
      {FLOOR_TILING.flatMap(zone => zone.rects.map((rect, index) => <FloorPatch key={`${zone.id}-${index}`} zone={zone} rect={rect} />))}
      {/* The wardrobes, the beds, the TVs on their mounts, the bathroom, the kitchen, the living's table with the PS5, the outlets and the laundry: the walkthrough's own furniture, sawn off at the cut. */}
      <HouseFurnishings floor="first" absolute cut={FLOOR_HEIGHT + CUT_HEIGHT} />
      {/* The living door's narrow leaf: the same aluminium frame and glass, beside the wide one that swings. */}
      <GlazedLeaf centre={[(LIVING_DOOR.u[0] + LIVING_DOOR.u[1]) / 2, LIVING_DOOR.v[1] - LIVING_DOOR_LEAVES.narrow / 2]} alongU={false} length={LIVING_DOOR_LEAVES.narrow} />
      {/* The doors, open 90 degrees with their swings; all right-handed. */}
      {FIRST_FLOOR_DOOR_SWINGS.map(door => <DoorSwingView key={door.id} door={door} />)}
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
    <Slab outline={GROUND_OUTLINE} top={FLOOR_HEIGHT} castShadow holes={STAIRWELL_RINGS} />
    <Slab outline={ENTRY_RECESS_OUTLINE} top={FLOOR_HEIGHT} castShadow />
    <Walls floor="first" top={2 * FLOOR_HEIGHT - SLAB_THICKNESS} castShadow />
    <Slab outline={FIRST_OUTLINE} top={2 * FLOOR_HEIGHT} castShadow />
  </group>
}
