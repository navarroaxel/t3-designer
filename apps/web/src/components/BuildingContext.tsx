import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { BufferGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, InstancedMesh, Object3D, ShapeGeometry } from 'three'
import { TOSCANA_VENA_COLOR } from '../data/house-plan'
import { OPPOSITE_COLORS } from '../data/opposite-fronts'
import { SITE_BUILDINGS, SITE_LOTS, SITE_PARCEL, SITE_ROADS, type BuildingFootprint, type SitePoint } from '../data/building-site'
import { REAR_LOT_WALL_COLOR } from '../data/neighbor-fronts'
import { polygonShape } from '../lib/polygon-shape'
import { ShadowOnly } from './ShadowOnly'
import { HouseFacade } from './HouseFacade'
import { HouseShell, HouseShellPhysical } from './HouseShell'
import type { Floor } from '../data/house-plan'
import { NeighborFacades } from './NeighborFacades'
import { SolarPanels } from './SolarPanels'

/** The house's prisms that the hollow shell replaces in the shadow pass. */
const HOLLOW_HOUSE_PARTS = new Set(['HOUSE', 'HOUSE-ENTRY', 'HOUSE-ARM', 'HOUSE-TERRACE'])

const TARGET_ID = SITE_BUILDINGS.find(item => item.isTarget)!.id
const isHouse = (building: BuildingFootprint) => building.isTarget || building.id.startsWith(`${TARGET_ID}-`)

type Box = { position: [number, number, number]; scale: [number, number, number]; angle?: number }

/** Roof silhouettes are inferred, not supplied by IGN. Split at the ridge
 * before triangulation so the low-pitch target roof casts a coherent shadow. */
function roofGeometry(building: BuildingFootprint, roofDatum = building) {
  const p = building.footprint
  let axis: SitePoint = [1, 0], longest = 0
  roofDatum.footprint.forEach((a, i) => {
    const b = roofDatum.footprint[(i + 1) % roofDatum.footprint.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length > longest) { longest = length; axis = [(b[0] - a[0]) / length, (b[1] - a[1]) / length] }
  })
  const across = ([x, z]: SitePoint) => -axis[1] * x + axis[0] * z
  const offsets = roofDatum.footprint.map(across), min = Math.min(...offsets), max = Math.max(...offsets), middle = (min + max) / 2
  const split = (side: number) => {
    const result: SitePoint[] = []
    p.forEach((a, i) => {
      const b = p[(i + 1) % p.length], da = (across(a) - middle) * side, db = (across(b) - middle) * side
      if (da >= 0) result.push(a)
      if ((da > 0 && db < 0) || (da < 0 && db > 0)) {
        const t = da / (da - db)
        result.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
      }
    })
    return result
  }
  const positions: number[] = []
  // Complex/courtyard buildings keep a flat inferred roof rather than bridge holes.
  const rise = building.holes?.length || p.length > 18 ? 0 : Math.min(5, building.roofHeight)
  // A single-pitch roof rises linearly across the footprint; otherwise a gable or a flat roof.
  const { slope } = building
  const along = ([x, z]: SitePoint) => slope ? x * slope.direction[0] + z * slope.direction[1] : 0
  const alongValues = slope ? p.map(along) : [0, 1], lo = Math.min(...alongValues), hi = Math.max(...alongValues)
  const heightAt = (point: SitePoint) => slope
    ? building.height + slope.rise * (along(point) - lo) / (hi - lo)
    : building.height + (rise > .4 ? rise * Math.max(0, 1 - Math.abs(across(point) - middle) / ((max - min) / 2)) : .08)
  for (const ring of rise > 0.4 ? [split(1), split(-1)] : [p]) {
    if (ring.length < 3) continue
    const shape = new ShapeGeometry(polygonShape(ring, rise > 0.4 ? [] : building.holes))
    const points = shape.getAttribute('position'), indices = shape.index
    for (let i = 0; i < (indices?.count ?? points.count); i++) {
      const index = indices ? indices.getX(i) : i
      const x = points.getX(index), z = -points.getY(index)
      positions.push(x, heightAt([x, z]), z)
    }
    shape.dispose()
  }
  // Close the eaves and gables; a floating roof would leak light into the mass.
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length], da = across(a) - middle, db = across(b) - middle
    const edge = [a]
    if (da * db < 0) { const t = da / (da - db); edge.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]) }
    edge.push(b)
    edge.slice(1).forEach((end, j) => {
      const start = edge[j], base = building.height
      positions.push(start[0], base, start[1], end[0], base, end[1], end[0], heightAt(end), end[1],
        start[0], base, start[1], end[0], heightAt(end), end[1], start[0], heightAt(start), start[1])
    })
  })
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  return geometry
}

type Finish = { wall: string; roof: string; roughness: number; metalness: number }
const WHITE_PAINT = '#ecebe5'
/** The azotea floor, its parapets and the concrete tank block are now painted white
 * (the owner's photo predates the repaint); the rest of the house is brick. */
function finishFor(building: BuildingFootprint): Finish {
  if (building.id.endsWith('-TANK-STEEL')) return { wall: '#d3d8dc', roof: '#e4e8eb', roughness: .38, metalness: .3 }
  // The lot behind is painted light yellow, which also keeps it from reading as part of the house.
  if (building.id === 'NEIGHBOR-B') return { wall: REAR_LOT_WALL_COLOR, roof: '#cbbd8c', roughness: .92, metalness: 0 }
  if (building.id.endsWith('-CANTILEVER')) return { wall: '#c9b58a', roof: WHITE_PAINT, roughness: .9, metalness: 0 }
  if (building.id.endsWith('-ENTRY')) return { wall: '#a5533b', roof: WHITE_PAINT, roughness: .92, metalness: 0 }
  if (/-(TANK-BLOCK|TANK-SLAB|TANK-COLUMN-[A-Z]+|PARAPET-[A-Z]+|TERRACE-(WALL|RAIL|GRILL))$/.test(building.id)) return { wall: WHITE_PAINT, roof: WHITE_PAINT, roughness: .9, metalness: 0 }
  if (building.id === 'NEIGHBOR-A-GARAGE') return { wall: '#a85a3d', roof: '#8a9296', roughness: .6, metalness: .25 }
  // The patio wall is weathered cream under a brick cap (see NeighborFacades); the house behind has a tile roof.
  if (building.id === 'NEIGHBOR-A-WALL') return { wall: '#d9d3b8', roof: '#a5533b', roughness: .95, metalness: 0 }
  if (building.id === 'NEIGHBOR-A') return { wall: '#e6e0c8', roof: '#b0553a', roughness: .85, metalness: 0 }
  // The houses across the street, from Street View: the corner white, the house opposite black.
  if (building.id === 'OPP-23') return { wall: OPPOSITE_COLORS.cornerWall, roof: OPPOSITE_COLORS.cornerRoof, roughness: .92, metalness: 0 }
  if (building.id === 'OPP-24') return { wall: OPPOSITE_COLORS.blackWall, roof: OPPOSITE_COLORS.blackRoof, roughness: .9, metalness: 0 }
  if (/^OPP-24-TANK/.test(building.id)) return { wall: OPPOSITE_COLORS.tank, roof: OPPOSITE_COLORS.tank, roughness: .9, metalness: 0 }
  if (building.id === 'OPP-24-PARAPET') return { wall: OPPOSITE_COLORS.blackWall, roof: OPPOSITE_COLORS.blackWall, roughness: .9, metalness: 0 }
  if (building.id === 'OPP-24-ROOM') return { wall: OPPOSITE_COLORS.roomWall, roof: OPPOSITE_COLORS.blackRoof, roughness: .9, metalness: 0 }
  // The terrace's sink: a Toscana Vena shelf with a dark basin set into it.
  if (building.id === 'HOUSE-TERRACE-SINK-BASIN') return { wall: '#4d5155', roof: '#4d5155', roughness: .4, metalness: .3 }
  if (building.id === 'HOUSE-TERRACE-SHELF') return { wall: TOSCANA_VENA_COLOR, roof: TOSCANA_VENA_COLOR, roughness: .55, metalness: 0 }
  // The terrace grill: brick body, dark cast-iron grate.
  if (building.id === 'HOUSE-TERRACE-GRILL-GRATE') return { wall: '#2a2a2c', roof: '#2a2a2c', roughness: .5, metalness: .6 }
  if (building.id === 'HOUSE-TERRACE-GRILL') return { wall: '#a5533b', roof: '#8a4a36', roughness: .95, metalness: 0 }
  // Fibre-cement water tanks: the corner's (a cylinder on its room) and the one on lot 23's roof.
  if (building.id === 'NEIGHBOR-C-TANK' || building.id === 'OPP-23-TANK') return { wall: '#a9a8a0', roof: '#b9b8b0', roughness: .95, metalness: 0 }
  if (building.id === 'NEIGHBOR-A' || building.id === 'NEIGHBOR-A-REAR' || building.id.startsWith('NEIGHBOR-C')) return { wall: '#e6e0c8', roof: '#b7b3a4', roughness: .92, metalness: 0 }
  if (isHouse(building)) return { wall: '#a5533b', roof: building.isTarget ? WHITE_PAINT : '#d9d2c0', roughness: .92, metalness: 0 }
  return { wall: '#d0d3c8', roof: '#88938d', roughness: .92, metalness: 0 }
}

function Volume({ building, base = building.base ?? 0, height = building.height - (building.base ?? 0), roof = true, roofDatum = building, castShadow = true }: {
  building: BuildingFootprint; base?: number; height?: number; roof?: boolean; roofDatum?: BuildingFootprint; castShadow?: boolean
}) {
  const geometry = useMemo(() => {
    const wall = new ExtrudeGeometry(polygonShape(building.footprint, building.holes), { depth: height, bevelEnabled: false })
    wall.rotateX(-Math.PI / 2)
    return wall
  }, [building, height])
  const finish = useMemo(() => finishFor(building), [building])
  const roofMesh = useMemo(() => roof ? roofGeometry(building, roofDatum) : null, [building, roof, roofDatum])
  useEffect(() => () => { geometry.dispose(); roofMesh?.dispose() }, [geometry, roofMesh])
  // A common ground datum is deliberate: the source has building base altitudes,
  // but no terrain surface. It avoids inventing retaining walls or buried annexes.
  return <group>
    <mesh geometry={geometry} position={[0, base, 0]} castShadow={castShadow} receiveShadow>
      <meshStandardMaterial color={finish.wall} roughness={finish.roughness} metalness={finish.metalness} />
    </mesh>
    {roofMesh && <mesh geometry={roofMesh} castShadow={castShadow} receiveShadow>
      <meshStandardMaterial color={finish.roof} roughness={Math.min(.8, finish.roughness)} metalness={finish.metalness} side={DoubleSide} />
    </mesh>}
  </group>
}

function Boxes({ boxes, color, roughness = 0.85, castShadow = true }: { boxes: Box[]; color: string; roughness?: number; castShadow?: boolean }) {
  const ref = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    if (!ref.current) return
    const object = new Object3D()
    boxes.forEach((box, i) => {
      object.position.set(...box.position)
      object.scale.set(...box.scale)
      object.rotation.set(0, box.angle ?? 0, 0)
      object.updateMatrix()
      ref.current!.setMatrixAt(i, object.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
    ref.current.computeBoundingSphere()
  }, [boxes])
  if (!boxes.length) return null
  return <instancedMesh ref={ref} args={[undefined, undefined, boxes.length]} castShadow={castShadow} receiveShadow>
    <boxGeometry />
    <meshStandardMaterial color={color} roughness={roughness} />
  </instancedMesh>
}

export function SiteGround() {
  const parcel = useMemo(() => new ShapeGeometry(polygonShape(SITE_PARCEL.footprint)), [])
  const roads = useMemo(() => SITE_ROADS.flatMap(road => road.points.slice(1).map((b, i) => {
    const a = road.points[i]
    return { position: [(a[0] + b[0]) / 2, .025, (a[1] + b[1]) / 2] as [number, number, number], scale: [road.width, .05, Math.hypot(b[0] - a[0], b[1] - a[1]) + .3] as [number, number, number], angle: Math.atan2(b[0] - a[0], b[1] - a[1]) }
  })), [])
  useEffect(() => () => parcel.dispose(), [parcel])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.04, 0]} receiveShadow>
      <planeGeometry args={[1000, 1000]} /><meshStandardMaterial color="#dce1d5" roughness={1} />
    </mesh>
    <mesh geometry={parcel} rotation={[-Math.PI / 2, 0, 0]} position={[0, .022, 0]} receiveShadow><meshStandardMaterial color="#c6d0b6" roughness={1} /></mesh>
    <Boxes boxes={roads} color="#c4c7bf" castShadow={false} />
    {/* Outlines of the other lots of the block; the surveyed ones are drawn a little firmer. */}
    {SITE_LOTS.filter(lot => lot.footprint !== SITE_PARCEL.footprint && lot.number !== 8).map(lot =>
      <Line key={lot.number} points={[...lot.footprint, lot.footprint[0]].map(([x, z]) => [x, .07, z])}
        color={lot.source === 'survey' ? '#8f9a7d' : '#b3b9a6'} lineWidth={lot.source === 'survey' ? 1.2 : .8} />)}
    <Line points={[...SITE_PARCEL.footprint, SITE_PARCEL.footprint[0]].map(([x, z]) => [x, .09, z])} color="#a29b72" lineWidth={1} dashed dashSize={.6} gapSize={.4} />
  </>
}

/** Site-space building context. Hiding the neighbours never changes the
 * physical obstacles used by the sunlight pass. */
export type FloorView = 'exterior' | Floor

export function BuildingContext({ visible = true, showNeighbors = true, showPanels = true, panelShade = null, installedPanels = null, floor = 'exterior' }: {
  visible?: boolean
  showNeighbors?: boolean
  showPanels?: boolean
  panelShade?: Record<string, number> | null
  installedPanels?: ReadonlySet<string> | null
  floor?: FloorView
}) {
  const house = useMemo(() => SITE_BUILDINGS.filter(isHouse), [])
  const neighbors = useMemo(() => SITE_BUILDINGS.filter(building => !house.includes(building)), [house])
  // Light sees the house as a hollow shell, so its solid prisms are replaced in the shadow pass: the main block, the
  // entrance upper floor and the rear ground-floor bands. Roof obstacles, the cantilever and the terrace walls stay.
  const solids = useMemo(() => house.filter(building => !HOLLOW_HOUSE_PARTS.has(building.id)), [house])
  const physical = useMemo(() => <>
    {solids.map(building => <Volume key={building.id} building={building} />)}
    <HouseShellPhysical />
    <HouseFacade physical />
    {/* Hiding the panels also removes their shadows: they are part of the physical obstacles only while shown. */}
    {showPanels && <SolarPanels physical installed={installedPanels} />}
    {neighbors.map(building => <Volume key={building.id} building={building} />)}
  </>, [solids, neighbors, showPanels, installedPanels])
  return <>
    <ShadowOnly>{physical}</ShadowOnly>
    {visible && <>
      {floor === 'exterior'
        ? <>
            {house.map(building => <Volume key={building.id} building={building} castShadow={false} />)}
            <HouseFacade />
            {showPanels && <SolarPanels shade={panelShade} installed={installedPanels} />}
          </>
        : <>
            <HouseShell floor={floor} />
            {/* The balcony belongs to the first floor: its slab and railing stay in that cut. */}
            {floor === 'first' && <HouseFacade balconyOnly />}
            {/* The terrace's walls stand at first-floor level: they belong to that cut. */}
            {floor === 'first' && house.filter(building => /-TERRACE-(WALL|RAIL|GRILL(-GRATE)?|SHELF|SINK-BASIN)$/.test(building.id)).map(building => <Volume key={building.id} building={building} castShadow={false} />)}
          </>}
      {showNeighbors && <NeighborFacades />}
      {showNeighbors && neighbors.map(building => <Volume key={building.id} building={building} castShadow={false} />)}
    </>}
  </>
}
