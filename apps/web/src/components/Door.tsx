import type { Door as DoorData, Wall as WallData } from '@t3-designer/scene-schema'

type DoorProps = {
  door: DoorData
  wall: WallData
  visibleWallHeight: number
}

// All positions are in the parent wall's local frame: X runs from wall.from to wall.to.
export function Door({ door, wall, visibleWallHeight }: DoorProps) {
  const height = Math.min(door.height, visibleWallHeight)
  const hingeAtStart = door.hinge === 'start'
  const hingeX = door.offset + (hingeAtStart ? 0 : door.width)
  const leafDirection = hingeAtStart ? 1 : -1
  const leafWidth = door.width - 0.04
  const swing = ((Math.PI * 80) / 180) * door.opensToward * -leafDirection
  const frameWidth = 0.035

  return (
    <group>
      {[door.offset, door.offset + door.width].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[frameWidth, height, wall.thickness + 0.025]} />
          <meshStandardMaterial color="#b7a48a" roughness={0.85} />
        </mesh>
      ))}
      {visibleWallHeight >= door.height && (
        <mesh position={[door.offset + door.width / 2, door.height - frameWidth / 2, 0]} castShadow>
          <boxGeometry args={[door.width, frameWidth, wall.thickness + 0.025]} />
          <meshStandardMaterial color="#b7a48a" roughness={0.85} />
        </mesh>
      )}
      <group position={[hingeX, 0, 0]} rotation={[0, swing, 0]}>
        <mesh position={[(leafDirection * leafWidth) / 2, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[leafWidth, height, 0.035]} />
          <meshStandardMaterial color={door.locationConfidence === 'inferred' ? '#cbad72' : '#c3ac8b'} roughness={0.85} />
        </mesh>
      </group>
    </group>
  )
}
