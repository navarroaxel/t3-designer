import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3, PerspectiveCamera, PMREMGenerator, Object3D } from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { apartmentBounds, polygonBounds, polygonCentroid } from '@t3-designer/geometry'
import type { Apartment as ApartmentData, Point2D } from '@t3-designer/scene-schema'
import { Apartment } from './Apartment'

type ViewRequest = { mode: '3d' | 'top'; revision: number }

type ApartmentSceneProps = {
  apartment: ApartmentData
  cutaway: boolean
  showLabels: boolean
  showFixtures?: boolean
  focusRoomId?: string
  view: ViewRequest
}

type RoomLabel = {
  id: string
  name: string
  area: number
  position: Point2D
  extra: boolean
}

function LabelProjection({ labels, elements }: { labels: RoomLabel[]; elements: RefObject<Map<string, HTMLDivElement>> }) {
  const projected = useMemo(() => new Vector3(), [])

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld()
    for (const label of labels) {
      const element = elements.current.get(label.id)
      if (!element) continue
      projected.set(label.position[0], 0.035, label.position[1]).project(camera)
      const visible = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) <= 1.15 && Math.abs(projected.y) <= 1.15
      element.style.visibility = visible ? 'visible' : 'hidden'
      element.style.transform = `translate3d(${((projected.x + 1) * size.width) / 2}px, ${((1 - projected.y) * size.height) / 2}px, 0) translate(-50%, -50%)`
    }
  })

  return null
}

function SceneCamera({ apartment, view, focusRoomId }: Pick<ApartmentSceneProps, 'apartment' | 'view' | 'focusRoomId'>) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const transition = useRef<{ position: Vector3; target: Vector3 } | null>(null)
  const initialized = useRef(false)
  const { width, height } = useThree((state) => state.size)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !(camera instanceof PerspectiveCamera)) return
    const focusRoom = apartment.rooms.find((room) => room.id === focusRoomId)
    const bounds = focusRoom ? polygonBounds(focusRoom.polygon) : apartmentBounds(apartment)
    const [x, z] = focusRoom ? polygonCentroid(focusRoom.polygon) : bounds.center
    const aspect = width / Math.max(height, 1)
    const span = Math.max(bounds.width, bounds.depth, bounds.width / aspect)
    // Flush any remaining drag momentum before applying a deliberate view reset.
    controls.enableDamping = false
    controls.update()
    camera.up.set(0, 1, 0)
    const target = new Vector3(x, focusRoom && view.mode !== 'top' ? 0.35 : 0, z)
    const position = new Vector3()
    if (view.mode === 'top') {
      // A tiny southward offset avoids the OrbitControls pole singularity.
      // North (-Z) remains at the top of the screen with the conventional Y-up camera.
      position.set(x, (span * 0.63) / Math.tan((camera.fov * Math.PI) / 360), z + 0.02)
    } else if (focusRoomId === 'kitchen') {
      // View through the actual east-side passage so the fridge does not hide the run.
      position.set(x + span * 1.45, Math.max(3.5, span * 1.48), z + span * 0.10)
    } else {
      position.set(x + span * 0.82, Math.max(3.1, span * 1.38), z + span * 1.13)
    }
    if (!initialized.current) {
      camera.position.copy(position)
      controls.target.copy(target)
      initialized.current = true
    } else {
      transition.current = { position, target }
    }
    camera.lookAt(x, 0, z)
    camera.updateProjectionMatrix()
    controls.update()
    controls.enableDamping = true
  }, [camera, apartment, view, width, height, focusRoomId])

  useFrame((_, delta) => {
    const goal = transition.current
    const controls = controlsRef.current
    if (!goal || !controls) return
    const amount = 1 - Math.exp(-7 * delta)
    camera.position.lerp(goal.position, amount)
    controls.target.lerp(goal.target, amount)
    controls.update()
    if (camera.position.distanceTo(goal.position) < 0.005 && controls.target.distanceTo(goal.target) < 0.005) {
      camera.position.copy(goal.position)
      controls.target.copy(goal.target)
      transition.current = null
    }
  })

  return (
      <OrbitControls
        ref={controlsRef}
        camera={camera}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={50}
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI / 2.05}
        enablePan
        enableZoom
        onStart={() => { transition.current = null }}
      />
  )
}

function Daylight({ center }: { center: [number, number] }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const target = useMemo(() => {
    const object = new Object3D()
    object.position.set(center[0], 0, center[1])
    return object
  }, [center[0], center[1]])

  useEffect(() => {
    // A local studio environment gives the stainless-steel appliances reflections
    // without downloading an HDRI or depending on a third-party CDN.
    const environment = new RoomEnvironment()
    const generator = new PMREMGenerator(gl)
    const output = generator.fromScene(environment, 0.04)
    const previous = scene.environment
    const previousIntensity = scene.environmentIntensity
    scene.environment = output.texture
    scene.environmentIntensity = 0.52
    environment.dispose()
    generator.dispose()
    return () => {
      scene.environment = previous
      scene.environmentIntensity = previousIntensity
      output.dispose()
    }
  }, [gl, scene])

  return (
    <group>
      <primitive object={target} />
      <ambientLight intensity={0.32} />
      <hemisphereLight args={['#e9f0ff', '#d5c3a1', 0.75]} />
      <directionalLight
        position={[center[0] - 4, 11, center[1] - 5]}
        target={target}
        color="#fff6e3"
        intensity={2.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-camera-near={0.1}
        shadow-camera-far={32}
        shadow-bias={-0.00015}
        shadow-normalBias={0.018}
        shadow-radius={3}
      />
      <directionalLight position={[center[0] + 7, 6, center[1] + 5]} target={target} color="#ecf2ff" intensity={0.55} />
    </group>
  )
}

export function ApartmentScene({ apartment, cutaway, showLabels, showFixtures = true, focusRoomId, view }: ApartmentSceneProps) {
  const bounds = apartmentBounds(apartment)
  const [x, z] = bounds.center
  // Canvas owns one explicit camera; controls and labels always use that same instance.
  const camera = useMemo(() => {
    const perspective = new PerspectiveCamera(42, 1, 0.1, 150)
    perspective.position.set(13, 16, 16)
    return perspective
  }, [])
  const labelElements = useRef(new Map<string, HTMLDivElement>())
  const labels = useMemo<RoomLabel[]>(() => [
    ...apartment.rooms.map((room) => ({ id: room.id, name: room.name, area: room.reportedArea, position: polygonCentroid(room.polygon), extra: false })),
    ...(apartment.balcony ? [{ id: apartment.balcony.id, name: apartment.balcony.name, area: apartment.balcony.reportedArea, position: polygonCentroid(apartment.balcony.polygon), extra: true }] : []),
  ], [apartment])

  return (
    <div className="scene-surface">
    <Canvas
      camera={camera}
      shadows="percentage"
      dpr={[1, 2]}
      fallback={<div className="canvas-fallback">This apartment view needs a browser with WebGL enabled.</div>}
      aria-label="Interactive 3D model of the T3 apartment. Drag to orbit, scroll to zoom, right-drag to pan."
    >
      <color attach="background" args={['#e8eae4']} />
      <Daylight center={[x, z]} />
      <mesh position={[x, -0.155, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#e8eae4" roughness={1} />
      </mesh>
      <gridHelper position={[x, -0.15, z]} args={[30, 30, '#dce0d6', '#e1e5db']} />
      <Apartment apartment={apartment} cutaway={cutaway} showFixtures={showFixtures} />
      <SceneCamera apartment={apartment} view={view} focusRoomId={focusRoomId} />
      <LabelProjection labels={labels} elements={labelElements} />
    </Canvas>
    {showLabels && (
      <div className="labels-overlay" aria-label="Room names and reported areas">
        {labels.map((label) => (
          <div
            key={label.id}
            ref={(element) => {
              if (element) labelElements.current.set(label.id, element)
              else labelElements.current.delete(label.id)
            }}
            className={`room-label${label.area < 1.5 ? ' room-label-small' : ''}`}
            style={{ visibility: 'hidden' }}
          >
            <span>{label.name}</span>
            <small>{label.area.toFixed(2)} m²{label.extra ? ' · extra' : ''}</small>
          </div>
        ))}
      </div>
    )}
    </div>
  )
}
