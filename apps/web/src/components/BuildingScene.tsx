import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line, OrbitControls } from '@react-three/drei'
import { Color, DirectionalLight, Object3D, Vector3 } from 'three'
import { BUILDING_SITE, SITE_BUILDINGS } from '../data/building-site'
import { BuildingContext, SiteGround, type FloorView } from './BuildingContext'
import { BuildingLabelOverlay, BuildingLabelProjection, type BuildingLabel } from './BuildingLabels'
import { getLocalDate, getSolarDay, type SolarPosition } from '../lib/solar'
import { advanceCameraTransition, type CameraTransition } from '../lib/camera-transition'
import { defaultCamera } from '../lib/default-camera'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { WebGLGuard } from './WebGLGuard'

export type BuildingSceneProps = {
  instant: Date
  sun: SolarPosition
  showNeighbors: boolean
  showSunPath: boolean
  showLabels: boolean
  showPanels: boolean
  /** Each panel's lit share of the beam at the chosen moment, or null at night. */
  panelShade: Record<string, number> | null
  /** The panels installed (ids), or null for the whole planned array. */
  installedPanels: ReadonlySet<string> | null
  floor: FloorView
  view: { mode: '3d' | 'top'; revision: number }
}

function Sunlight({ sun }: Pick<BuildingSceneProps, 'sun'>) {
  const light = useRef<DirectionalLight>(null)
  const sceneTarget = useMemo(() => new Object3D(), [])
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
  }, [sun, sceneTarget])
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
  const goal = useRef<CameraTransition | null>(null)
  const initialized = useRef(false)
  const { camera, size, invalidate } = useThree()
  useEffect(() => {
    const control = controls.current
    if (!control) return
    const factor = Math.max(1, .95 / (Math.max(1, size.width) / Math.max(1, size.height)))
    const placement = defaultCamera(view.mode, factor)
    const position = new Vector3(...placement.position)
    const targetPosition = new Vector3(...placement.target)
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
    const arrived = advanceCameraTransition(camera.position, controls.current.target, goal.current, delta)
    controls.current.update()
    if (arrived) goal.current = null
    else invalidate()
  })
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={.08} minDistance={12} maxDistance={260} maxPolarAngle={Math.PI / 2.04} onStart={() => { goal.current = null }} />
}

export function BuildingScene(props: BuildingSceneProps) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const { instant, sun, showNeighbors, showSunPath, showLabels, showPanels, panelShade, installedPanels, view, floor } = props
  const elements = useRef(new Map<string, HTMLDivElement>())
  const labels: BuildingLabel[] = showLabels ? [
    { id: 'building', position: [-1, 16, -18] as [number, number, number], text: BUILDING_SITE.address.split(' · ')[0], subtitle: t('building.location'), kind: 'building' as const },
    ...([['N', 'building.north', 0, -56], ['S', 'building.south', 0, 56], ['E', 'building.east', 56, 0], ['W', 'building.west', -56, 0]] as const).map(([id, key, x, z]) => ({ id, position: [x, .3, z] as [number, number, number], text: t(key), kind: 'cardinal' as const })),
    ...(sun.isDaylight && showSunPath ? [{ id: 'sun', position: sun.direction.map(value => value * 52) as [number, number, number], text: t('building.sunLabel', { altitude: formatNumber(sun.altitude, 0) }), kind: 'sun' as const }] : []),
  ] : []
  return <div className="building-scene-surface">
    <WebGLGuard fallback={<div className="canvas-fallback">{t('building.canvasFallback')}</div>}>
    <Canvas frameloop="demand" shadows="percentage" camera={{ fov: 43, near: .2, far: 1600, position: defaultCamera('3d').position }} dpr={[1, 1.6]}
      fallback={<div className="canvas-fallback">{t('building.canvasFallback')}</div>}
      aria-label={t('building.canvasAria')}>
      <color attach="background" args={[sun.isDaylight ? '#e7eae2' : '#667482']} />
      <fog attach="fog" args={[sun.isDaylight ? '#e7eae2' : '#667482', 155, 350]} />
      <Sunlight sun={sun} />
      <SiteGround />
      <BuildingContext showNeighbors={showNeighbors} showPanels={showPanels} panelShade={panelShade} installedPanels={installedPanels} floor={floor} />
      {showSunPath && <SolarOrbit instant={instant} sun={sun} />}
      <Camera view={view} />
      <BuildingLabelProjection labels={labels} elements={elements} />
    </Canvas>
    </WebGLGuard>
    <BuildingLabelOverlay labels={labels} elements={elements} />
  </div>
}
