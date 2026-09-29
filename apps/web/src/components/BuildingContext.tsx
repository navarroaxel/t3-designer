import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import { BufferGeometry, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, InstancedMesh, Object3D, ShapeGeometry } from 'three'
import { SITE_BUILDINGS, SITE_PARCEL, SITE_ROADS, type BuildingFootprint, type SitePoint } from '../data/building-site'
import { polygonShape } from '../lib/polygon-shape'
import { ShadowOnly } from './ShadowOnly'
import { HouseFacade } from './HouseFacade'
import { HouseShell } from './HouseShell'
import type { Floor } from '../data/house-plan'
import { NeighborFacades } from './NeighborFacades'

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
  const heightAt = (point: SitePoint) => building.height + (rise > .4 ? rise * Math.max(0, 1 - Math.abs(across(point) - middle) / ((max - min) / 2)) : .08)
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
  // The rear neighbour is blue so that it never reads as part of the house.
  if (building.id === 'NEIGHBOR-B') return { wall: '#9db6cc', roof: '#86a1bb', roughness: .92, metalness: 0 }
  if (building.id.endsWith('-ENTRY')) return { wall: '#a5533b', roof: WHITE_PAINT, roughness: .92, metalness: 0 }
  if (/-(TANK-BLOCK|TANK-SLAB|TANK-COLUMN-[A-Z]+|PARAPET-[A-Z]+)$/.test(building.id)) return { wall: WHITE_PAINT, roof: WHITE_PAINT, roughness: .9, metalness: 0 }
  if (building.id === 'NEIGHBOR-D' || building.id === 'NEIGHBOR-A-WALL') return { wall: '#a85a3d', roof: '#8f8a80', roughness: .92, metalness: 0 }
  if (building.id === 'NEIGHBOR-A' || building.id.startsWith('NEIGHBOR-C')) return { wall: '#e6e0c8', roof: '#b7b3a4', roughness: .92, metalness: 0 }
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
    <Line points={[...SITE_PARCEL.footprint, SITE_PARCEL.footprint[0]].map(([x, z]) => [x, .09, z])} color="#a29b72" lineWidth={1} dashed dashSize={.6} gapSize={.4} />
  </>
}

/** Site-space building context. Hiding the neighbours never changes the
 * physical obstacles used by the sunlight pass. */
export type FloorView = 'exterior' | Floor

export function BuildingContext({ visible = true, showNeighbors = true, floor = 'exterior' }: {
  visible?: boolean
  showNeighbors?: boolean
  floor?: FloorView
}) {
  const house = useMemo(() => SITE_BUILDINGS.filter(isHouse), [])
  const neighbors = useMemo(() => SITE_BUILDINGS.filter(building => !house.includes(building)), [house])
  const physical = useMemo(() => <>
    {house.map(building => <Volume key={building.id} building={building} />)}
    <HouseFacade physical />
    {neighbors.map(building => <Volume key={building.id} building={building} />)}
  </>, [house, neighbors])
  return <>
    <ShadowOnly>{physical}</ShadowOnly>
    {visible && <>
      {floor === 'exterior'
        ? <>
            {house.map(building => <Volume key={building.id} building={building} castShadow={false} />)}
            <HouseFacade />
          </>
        : <HouseShell floor={floor} />}
      {showNeighbors && <NeighborFacades />}
      {showNeighbors && neighbors.map(building => <Volume key={building.id} building={building} castShadow={false} />)}
    </>}
  </>
}
