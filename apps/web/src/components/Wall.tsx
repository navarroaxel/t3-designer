import { segmentWall, wallRotation } from '@t3-designer/geometry'
import type { DesignCustomization, Door as DoorData, Wall as WallData, Window as WindowData } from '@t3-designer/scene-schema'
import { wallNiches, type WallNiche } from '../data/house-interior'
import { Door } from './Door'
import { Window } from './Window'

type WallProps = {
  wall: WallData
  doors: DoorData[]
  windows: WindowData[]
  cutaway: boolean
  customization?: DesignCustomization
}

type Slab = { x: [number, number]; y: [number, number]; z: [number, number] }

/** A solid segment of a wall as the boxes around the niches cut into it: the wall at each side, above and below a niche, and the back left behind it. Across the wall, z runs over its thickness. */
function cutNiches(segment: { offset: number; length: number; bottom: number; height: number }, thickness: number, niches: WallNiche[]): Slab[] {
  let slabs: Slab[] = [{ x: [segment.offset, segment.offset + segment.length], y: [segment.bottom, segment.bottom + segment.height], z: [-thickness / 2, thickness / 2] }]
  for (const niche of niches) {
    const x: [number, number] = [niche.offset, niche.offset + niche.width], y: [number, number] = [niche.bottom, niche.bottom + niche.height]
    slabs = slabs.flatMap((slab): Slab[] => {
      const hole = { x: [Math.max(slab.x[0], x[0]), Math.min(slab.x[1], x[1])], y: [Math.max(slab.y[0], y[0]), Math.min(slab.y[1], y[1])] }
      if (hole.x[1] - hole.x[0] < 1e-6 || hole.y[1] - hole.y[0] < 1e-6) return [slab]
      // What stays in the niche's column, behind its recess: from the far face to the recess floor.
      const back: [number, number] = niche.side > 0 ? [slab.z[0], Math.min(slab.z[1], thickness / 2 - niche.depth)] : [Math.max(slab.z[0], -thickness / 2 + niche.depth), slab.z[1]]
      return [
        { ...slab, x: [slab.x[0], hole.x[0]] }, { ...slab, x: [hole.x[1], slab.x[1]] },
        { ...slab, x: [hole.x[0], hole.x[1]], y: [slab.y[0], hole.y[0]] }, { ...slab, x: [hole.x[0], hole.x[1]], y: [hole.y[1], slab.y[1]] },
        { x: [hole.x[0], hole.x[1]], y: [hole.y[0], hole.y[1]], z: back },
      ].filter(piece => piece.x[1] - piece.x[0] > 1e-6 && piece.y[1] - piece.y[0] > 1e-6 && piece.z[1] - piece.z[0] > 1e-6) as Slab[]
    })
  }
  return slabs
}

export function Wall({ wall, doors, windows, cutaway, customization }: WallProps) {
  const visibleHeight = cutaway ? Math.min(1, wall.height) : wall.height
  const segments = segmentWall(wall, [...doors, ...windows])
  const niches = wallNiches(wall)

  return (
    <group position={[wall.from[0], 0, wall.from[1]]} rotation={[0, wallRotation(wall), 0]}>
      {segments.flatMap((segment, index) => cutNiches(segment, wall.thickness, niches).map((slab, part) => {
        const top = Math.min(slab.y[1], visibleHeight)
        if (top - slab.y[0] <= 1e-6) return null
        return (
          <mesh
            key={`${index}-${part}`}
            position={[(slab.x[0] + slab.x[1]) / 2, (slab.y[0] + top) / 2, (slab.z[0] + slab.z[1]) / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[slab.x[1] - slab.x[0], top - slab.y[0], slab.z[1] - slab.z[0]]} />
            <meshStandardMaterial color={customization?.wallColors[wall.id] ?? (wall.kind === 'exterior' ? '#e9e7dc' : '#f1eee1')} roughness={0.94} />
          </mesh>
        )
      }))}
      {/* Skirting follows the actual solid intervals and stops at every doorway. */}
      {segments.filter((segment) => segment.bottom === 0).map((segment, index) => (
        <group key={`skirting-${index}`}>
          {(wall.kind === 'exterior' ? [1] : [-1, 1]).map((side) => (
            <group key={side}>
              <mesh position={[segment.offset + segment.length / 2, 0.055, side * (wall.thickness / 2 + 0.009)]} castShadow receiveShadow>
                <boxGeometry args={[segment.length, 0.09, 0.018]} />
                <meshStandardMaterial color="#aeb7b0" roughness={0.65} />
              </mesh>
              <mesh position={[segment.offset + segment.length / 2, 0.102, side * (wall.thickness / 2 + 0.007)]} receiveShadow>
                <boxGeometry args={[segment.length, 0.008, 0.014]} />
                <meshStandardMaterial color="#c3c9bc" roughness={0.62} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {doors.map((door) => <Door key={door.id} door={door} wall={wall} visibleWallHeight={visibleHeight} customization={customization?.doors[door.id]} />)}
      {windows.map((window) => <Window key={window.id} window={window} wall={wall} visibleWallHeight={visibleHeight} customization={customization?.windows[window.id]} />)}
    </group>
  )
}
