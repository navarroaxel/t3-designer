import { useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3, PerspectiveCamera } from 'three'
import { apartmentBounds, polygonCentroid } from '@t3-designer/geometry'
import type { Apartment as ApartmentData, Point2D } from '@t3-designer/scene-schema'
import { Apartment } from './Apartment'

type ViewRequest = { mode: '3d' | 'top'; revision: number }

type ApartmentSceneProps = {
  apartment: ApartmentData
  cutaway: boolean
  showLabels: boolean
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

function SceneCamera({ apartment, view }: Pick<ApartmentSceneProps, 'apartment' | 'view'>) {
  const controlsRef = useRef<ComponentRef<typeof OrbitControls>>(null)
  const { width, height } = useThree((state) => state.size)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !(camera instanceof PerspectiveCamera)) return
    const bounds = apartmentBounds(apartment)
    const [x, z] = bounds.center
    const aspect = width / Math.max(height, 1)
    const span = Math.max(bounds.width, bounds.depth, bounds.width / aspect)
    // Flush any remaining drag momentum before applying a deliberate view reset.
    controls.enableDamping = false
    controls.update()
    camera.up.set(0, 1, 0)
    controls.target.set(x, 0, z)
    if (view.mode === 'top') {
      // A tiny southward offset avoids the OrbitControls pole singularity.
      // North (-Z) remains at the top of the screen with the conventional Y-up camera.
      camera.position.set(x, (span * 0.63) / Math.tan((camera.fov * Math.PI) / 360), z + 0.02)
    } else {
      camera.position.set(x + span * 0.82, span * 1.38, z + span * 1.13)
    }
    camera.lookAt(x, 0, z)
    camera.updateProjectionMatrix()
    controls.update()
    controls.enableDamping = true
  }, [camera, apartment, view, width, height])

  return (
      <OrbitControls
        ref={controlsRef}
        camera={camera}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={50}
        minPolarAngle={0.001}
        maxPolarAngle={Math.PI / 2.05}
        enablePan
        enableZoom
      />
  )
}

export function ApartmentScene({ apartment, cutaway, showLabels, view }: ApartmentSceneProps) {
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
      <color attach="background" args={['#edf0eb']} />
      <ambientLight intensity={1.2} />
      <directionalLight
        position={[x - 5, 14, z - 4]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={0.1}
        shadow-camera-far={35}
        shadow-bias={-0.0003}
        shadow-normalBias={0.025}
      />
      <mesh position={[x, -0.155, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#edf0eb" roughness={1} />
      </mesh>
      <gridHelper position={[x, -0.15, z]} args={[30, 30, '#d4dacf', '#e0e5dc']} />
      <Apartment apartment={apartment} cutaway={cutaway} />
      <SceneCamera apartment={apartment} view={view} />
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
