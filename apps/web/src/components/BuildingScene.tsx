import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { BufferGeometry, Color, DirectionalLight, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, InstancedMesh, Object3D, Path, Shape, ShapeGeometry, Vector3 } from 'three'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL, SITE_ROADS, type BuildingFootprint, type SitePoint } from '../data/building-site'
import { BuildingLabelOverlay, BuildingLabelProjection, type BuildingLabel } from './BuildingLabels'
import { getLocalDate, getSolarDay, type SolarPosition } from '../lib/solar'

export type BuildingSceneProps = {
  instant: Date
  sun: SolarPosition
  showNeighbors: boolean
  showSunPath: boolean
  showLabels: boolean
  view: { mode: '3d' | 'top'; revision: number }
}

type Box = { position: [number, number, number]; scale: [number, number, number]; angle?: number }
const target = SITE_BUILDINGS.find(item => item.isTarget)!
const sceneTarget = new Object3D()
sceneTarget.position.set(0, 0, 0)

function polygonShape(points: SitePoint[], holes: SitePoint[][] = []) {
  const shape = new Shape()
  points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z))
  shape.closePath()
  shape.holes = holes.map(ring => {
    const path = new Path()
    ring.forEach(([x, z], i) => i ? path.lineTo(x, -z) : path.moveTo(x, -z))
    path.closePath()
    return path
  })
  return shape
}

/** Roof silhouettes are inferred, not supplied by IGN. Split at the ridge
 * before triangulation so the low-pitch target roof casts a coherent shadow. */
function roofGeometry(building: BuildingFootprint) {
  const p = building.footprint
  let axis: SitePoint = [1, 0], longest = 0
  p.forEach((a, i) => {
    const b = p[(i + 1) % p.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length > longest) { longest = length; axis = [(b[0] - a[0]) / length, (b[1] - a[1]) / length] }
  })
  const across = ([x, z]: SitePoint) => -axis[1] * x + axis[0] * z
  const offsets = p.map(across), min = Math.min(...offsets), max = Math.max(...offsets), middle = (min + max) / 2
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

function Volume({ building }: { building: BuildingFootprint }) {
  const geometry = useMemo(() => {
    const wall = new ExtrudeGeometry(polygonShape(building.footprint, building.holes), { depth: building.height, bevelEnabled: false })
    wall.rotateX(-Math.PI / 2)
    return wall
  }, [building])
  const roof = useMemo(() => roofGeometry(building), [building])
  useEffect(() => () => { geometry.dispose(); roof.dispose() }, [geometry, roof])
  // A common ground datum is deliberate: the source has building base altitudes,
  // but no terrain surface. It avoids inventing retaining walls or buried annexes.
  return <group>
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={building.isTarget ? '#e4dcc0' : building.height > 12 ? '#c6cec6' : '#d0d3c8'} roughness={0.92} />
    </mesh>
    <mesh geometry={roof} castShadow receiveShadow>
      <meshStandardMaterial color={building.isTarget ? '#94a3a0' : '#88938d'} roughness={0.8} side={DoubleSide} />
    </mesh>
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

function Facades() {
  const details = useMemo(() => {
    const glass: Box[] = [], frames: Box[] = [], rails: Box[] = [], shutters: Box[] = [], trim: Box[] = []
    const points = target.footprint
    const signedArea = points.reduce((sum, a, i) => { const b = points[(i + 1) % points.length]; return sum + a[0] * b[1] - b[0] * a[1] }, 0)
    points.forEach((a, edge) => {
      const b = points[(edge + 1) % points.length], length = Math.hypot(b[0] - a[0], b[1] - a[1])
      const dx = (b[0] - a[0]) / length, dz = (b[1] - a[1]) / length
      const nx = signedArea > 0 ? dz : -dz, nz = signedArea > 0 ? -dx : dx
      const angle = Math.atan2(nx, nz)
      const add = (collection: Box[], t: number, y: number, width: number, height: number, depth: number, offset = 0.06) => collection.push({ position: [a[0] + dx * t + nx * offset, y, a[1] + dz * t + nz * offset], scale: [width, height, depth], angle })
      add(trim, length / 2, 15.28, length + .12, .18, .27, .1)
      add(trim, length / 2, .45, length, .8, .08, .015)
      // Long elevations have five levels; the short gable is blind as in photos.
      if (length < 4 || (edge === 1)) return
      const columns = Math.max(1, Math.floor(length / (length > 20 ? 2.65 : 2.8)))
      for (let column = 0; column < columns; column++) {
        const t = length * (column + .5) / columns
        const staircase = length > 20 && column % 5 === 2
        for (let floor = 0; floor < 5; floor++) {
          const width = staircase ? .72 : 1.14, height = staircase ? .85 : 1.58
          const y = 2.05 + floor * 2.91 - (staircase ? .35 : 0)
          add(frames, t, y, width + .22, height + .22, .12)
          add(glass, t, y, width, height, .04, .14)
          if ((column * 3 + floor + edge) % 7 === 0 && !staircase) add(shutters, t, y + .2, width, height - .4, .04, .17)
          else {
            add(frames, t, y, .05, height, .04, .17)
            add(frames, t, y + .24, width, .055, .04, .17)
          }
          add(trim, t, y - height / 2, width + .3, .09, .28, .15)
          if (!staircase) {
            add(rails, t, y - .36, width + .28, .045, .055, .37)
            add(rails, t - width / 2, y - .57, .035, .42, .045, .37)
            add(rails, t + width / 2, y - .57, .035, .42, .045, .37)
          }
          if (staircase && floor === 0) add(rails, t, 1.05, .95, 2, .12, .19)
        }
      }
    })
    return { glass, frames, rails, shutters, trim }
  }, [])
  return <>
    <Boxes boxes={details.glass} color="#547071" roughness={.32} castShadow={false} />
    <Boxes boxes={details.frames} color="#e8e6d6" />
    <Boxes boxes={details.rails} color="#806d54" />
    <Boxes boxes={details.shutters} color="#c8cbbf" />
    <Boxes boxes={details.trim} color="#c1b594" />
  </>
}

function SiteGround() {
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

function Sunlight({ sun }: { sun: SolarPosition }) {
  const light = useRef<DirectionalLight>(null)
  useLayoutEffect(() => {
    if (!light.current) return
    const source = light.current, camera = source.shadow.camera
    source.updateMatrixWorld(true)
    sceneTarget.updateMatrixWorld(true)
    source.shadow.updateMatrices(source)
    const points = SITE_BUILDINGS.flatMap(building => building.footprint.flatMap(([x, z]) => [
      new Vector3(x, 0, z), new Vector3(x, building.height + Math.min(5, building.roofHeight), z),
    ]))
    // Include the visible receiving ground, including low-winter-sun shadows.
    for (const x of [-165, 165]) for (const z of [-165, 165]) points.push(new Vector3(x, 0, z))
    points.forEach(point => point.applyMatrix4(camera.matrixWorldInverse))
    camera.left = Math.min(...points.map(point => point.x)) - 3
    camera.right = Math.max(...points.map(point => point.x)) + 3
    camera.bottom = Math.min(...points.map(point => point.y)) - 3
    camera.top = Math.max(...points.map(point => point.y)) + 3
    camera.updateProjectionMatrix()
    source.shadow.needsUpdate = true
  }, [sun])
  const warm = Math.max(0, Math.min(1, sun.altitude / 22))
  const color = new Color('#ffd098').lerp(new Color('#fff8e9'), warm)
  return <>
    <primitive object={sceneTarget} />
    <ambientLight intensity={sun.isDaylight ? .42 : .2} />
    <hemisphereLight args={[sun.isDaylight ? '#e8f0ff' : '#aabdd4', '#b9b3a0', sun.isDaylight ? .85 : .25]} />
    <directionalLight ref={light} position={sun.direction.map(n => n * 450) as [number, number, number]} target={sceneTarget}
      intensity={sun.isDaylight ? 2.9 * Math.min(1, sun.altitude / 8) : 0} color={color} castShadow={sun.isDaylight}
      shadow-mapSize={[4096, 4096]} shadow-camera-left={-115} shadow-camera-right={115} shadow-camera-top={115} shadow-camera-bottom={-115}
      shadow-camera-near={1} shadow-camera-far={1100} shadow-bias={-.00008} shadow-normalBias={.035} shadow-radius={2} />
  </>
}

function SolarOrbit({ instant, sun }: Pick<BuildingSceneProps, 'instant' | 'sun'>) {
  const date = getLocalDate(instant, BUILDING_SITE.timeZone)
  const path = useMemo(() => getSolarDay(date, BUILDING_SITE.latitude, BUILDING_SITE.longitude, BUILDING_SITE.timeZone).path.filter(point => point.altitude > 0), [date])
  const radius = 52
  const points = path.map(point => point.direction.map(value => value * radius) as [number, number, number])
  const sunPoint = sun.direction.map(value => value * radius) as [number, number, number]
  const ring = Array.from({ length: 97 }, (_, i) => [Math.sin(i / 96 * Math.PI * 2) * radius, .16, Math.cos(i / 96 * Math.PI * 2) * radius] as [number, number, number])
  return <group>
    <Line points={ring} color="#a6ad98" lineWidth={1} dashed dashSize={1} gapSize={.7} />
    {points.length > 1 && <Line points={points} color="#b69850" lineWidth={1.6} />}
    {sun.isDaylight && <>
      <mesh position={sunPoint}><sphereGeometry args={[1.15, 24, 16]} /><meshBasicMaterial color="#ebc370" /></mesh>
      <Line points={[[0, .3, 0], sunPoint]} color="#c9aa67" lineWidth={1} dashed dashSize={.55} gapSize={.5} transparent opacity={.6} />
    </>}
  </group>
}

function Camera({ view }: Pick<BuildingSceneProps, 'view'>) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  const goal = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const initialized = useRef(false)
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    const control = controls.current
    if (!control) return
    const factor = Math.max(1, .95 / (size.width / size.height))
    const position = view.mode === 'top' ? new Vector3(0, 125 * factor, .01) : new Vector3(69 * factor, 55 * factor, -80 * factor)
    const targetPosition = new Vector3(0, 3, 0)
    control.enableDamping = false
    control.update()
    if (!initialized.current) { camera.position.copy(position); control.target.copy(targetPosition); initialized.current = true }
    else goal.current = { position, target: targetPosition }
    control.update()
    control.enableDamping = true
    invalidate()
  }, [camera, size.width, size.height, view, invalidate])
  useFrame((_, delta) => {
    if (!goal.current || !controls.current) return
    const t = 1 - Math.exp(-7 * delta)
    camera.position.lerp(goal.current.position, t)
    controls.current.target.lerp(goal.current.target, t)
    controls.current.update()
    if (camera.position.distanceTo(goal.current.position) < .02) goal.current = null
    else invalidate()
  })
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={20} maxDistance={260} maxPolarAngle={Math.PI / 2.04} onStart={() => { goal.current = null }} />
}

export function BuildingScene(props: BuildingSceneProps) {
  const { instant, sun, showNeighbors, showSunPath, showLabels, view } = props
  const elements = useRef(new Map<string, HTMLDivElement>())
  const labels: BuildingLabel[] = showLabels ? [
    { id: 'building', position: [0, 19, 0], text: '1 / 1 bis / 1 ter', subtitle: 'Jean-Baptiste Colbert', kind: 'building' },
    ...([['N', 0, -56], ['S', 0, 56], ['E', 56, 0], ['O', -56, 0]] as const).map(([name, x, z]) => ({ id: name, position: [x, .3, z] as [number, number, number], text: name, kind: 'cardinal' as const })),
    ...(sun.isDaylight && showSunPath ? [{ id: 'sun', position: sun.direction.map(value => value * 52) as [number, number, number], text: `Sol · ${sun.altitude.toFixed(0)}°`, kind: 'sun' as const }] : []),
  ] : []
  return <div className="building-scene-surface">
    <Canvas frameloop="demand" shadows="percentage" camera={{ fov: 43, near: .5, far: 1600, position: [69, 55, -80] }} dpr={[1, 1.6]}
      fallback={<div className="canvas-fallback">La vista del edificio necesita WebGL. Activá la aceleración gráfica del navegador.</div>}
      aria-label="Modelo 3D georreferenciado del edificio y vecinos con sombras solares">
      <color attach="background" args={[sun.isDaylight ? '#e7eae2' : '#667482']} />
      <fog attach="fog" args={[sun.isDaylight ? '#e7eae2' : '#667482', 155, 350]} />
      <Sunlight sun={sun} />
      <SiteGround />
      {SITE_BUILDINGS.filter(building => showNeighbors || building.isTarget).map(building => <Volume key={building.id} building={building} />)}
      <Facades />
      {showSunPath && <SolarOrbit instant={instant} sun={sun} />}
      <Camera view={view} />
      <BuildingLabelProjection labels={labels} elements={elements} />
    </Canvas>
    <BuildingLabelOverlay labels={labels} elements={elements} />
  </div>
}
