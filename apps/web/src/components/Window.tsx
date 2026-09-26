import type { Window as WindowData, Wall as WallData } from '@t3-designer/scene-schema'

type WindowProps = {
  window: WindowData
  wall: WallData
  visibleWallHeight: number
}

export function Window({ window: opening, wall, visibleWallHeight }: WindowProps) {
  const height = Math.min(opening.height, visibleWallHeight - opening.sillHeight)
  if (height <= 0) return null
  const frameWidth = 0.045

  return (
    <group position={[opening.offset + opening.width / 2, opening.sillHeight, 0]}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[opening.width, height, 0.015]} />
        <meshStandardMaterial color="#b8d1d2" transparent opacity={0.35} roughness={0.2} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[(side * opening.width) / 2, height / 2, 0]} castShadow>
          <boxGeometry args={[frameWidth, height, wall.thickness + 0.025]} />
          <meshStandardMaterial color="#e2e5df" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, frameWidth / 2, 0]} castShadow>
        <boxGeometry args={[opening.width, frameWidth, wall.thickness + 0.025]} />
        <meshStandardMaterial color="#e2e5df" roughness={0.8} />
      </mesh>
      {height === opening.height && (
        <mesh position={[0, height - frameWidth / 2, 0]} castShadow>
          <boxGeometry args={[opening.width, frameWidth, wall.thickness + 0.025]} />
          <meshStandardMaterial color="#e2e5df" roughness={0.8} />
        </mesh>
      )}
    </group>
  )
}
