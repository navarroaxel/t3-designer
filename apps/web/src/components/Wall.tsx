import { Edges } from '@react-three/drei'
import { segmentWall, wallRotation } from '@t3-designer/geometry'
import type { Door as DoorData, Wall as WallData, Window as WindowData } from '@t3-designer/scene-schema'
import { Door } from './Door'
import { Window } from './Window'

type WallProps = {
  wall: WallData
  doors: DoorData[]
  windows: WindowData[]
  cutaway: boolean
}

export function Wall({ wall, doors, windows, cutaway }: WallProps) {
  const visibleHeight = cutaway ? Math.min(1, wall.height) : wall.height
  const segments = segmentWall(wall, [...doors, ...windows])

  return (
    <group position={[wall.from[0], 0, wall.from[1]]} rotation={[0, wallRotation(wall), 0]}>
      {segments.map((segment, index) => {
        const height = Math.min(segment.height, visibleHeight - segment.bottom)
        if (height <= 0) return null
        return (
          <mesh
            key={index}
            position={[segment.offset + segment.length / 2, segment.bottom + height / 2, 0]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[segment.length, height, wall.thickness]} />
            <meshStandardMaterial color={wall.kind === 'exterior' ? '#e8e7de' : '#f0eee7'} roughness={0.9} />
            <Edges color="#c7c8bc" />
          </mesh>
        )
      })}
      {doors.map((door) => <Door key={door.id} door={door} wall={wall} visibleWallHeight={visibleHeight} />)}
      {windows.map((window) => <Window key={window.id} window={window} wall={wall} visibleWallHeight={visibleHeight} />)}
    </group>
  )
}
