import { useMemo } from 'react'
import { Shape } from 'three'
import type { Point2D } from '@t3-designer/scene-schema'

type FloorProps = {
  polygon: Point2D[]
  color: string
  elevation?: number
  thickness?: number
}

export function Floor({ polygon, color, elevation = 0, thickness = 0 }: FloorProps) {
  const shape = useMemo(() => {
    const outline = new Shape()
    polygon.forEach(([x, z], index) => {
      // Shape uses XY. Negating Z before rotating keeps plan north at world -Z.
      if (index === 0) outline.moveTo(x, -z)
      else outline.lineTo(x, -z)
    })
    outline.closePath()
    return outline
  }, [polygon])

  return (
    <mesh position={[0, elevation - thickness, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      {thickness > 0 ? (
        <extrudeGeometry args={[shape, { depth: thickness, bevelEnabled: false }]} />
      ) : (
        <shapeGeometry args={[shape]} />
      )}
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  )
}
