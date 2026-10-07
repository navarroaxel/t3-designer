import { useEffect, useMemo } from 'react'
import { CanvasTexture, Path, RepeatWrapping, SRGBColorSpace, Shape } from 'three'
import type { DesignCustomization, Door as DoorData, Wall as WallData } from '@t3-designer/scene-schema'

type DoorProps = {
  door: DoorData
  wall: WallData
  visibleWallHeight: number
  customization?: DesignCustomization['doors'][string]
}

function DamagedPanel({ width, height, color }: { width: number; height: number; color: string }) {
  const shape = useMemo(() => {
    const panel = new Shape()
    panel.moveTo(0, 0)
    panel.lineTo(width, 0)
    panel.lineTo(width, height)
    panel.lineTo(0, height)
    panel.closePath()
    const hole = new Path()
    const x = width * 0.45
    const y = height * 0.54
    const points = [[-0.047, -0.075], [-0.039, 0.03], [-0.049, 0.08], [-0.019, 0.052], [0.003, 0.065], [0.019, 0.021], [0.048, 0.009], [0.034, -0.039], [0.032, -0.079]]
    points.forEach(([px, py], index) => index === 0 ? hole.moveTo(x + px, y + py) : hole.lineTo(x + px, y + py))
    hole.closePath()
    panel.holes.push(hole)
    return panel
  }, [width, height])
  return (
    <mesh position={[0, 0, -0.008]} castShadow receiveShadow>
      <extrudeGeometry args={[shape, { depth: 0.016, bevelEnabled: false }]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  )
}

function PaneledLeaf({ width, fullHeight, visibleHeight, color, damaged, glazed = false }: { width: number; fullHeight: number; visibleHeight: number; color: string; damaged: boolean; glazed?: boolean }) {
  const rail = 0.085
  const panelWidth = width - rail * 2
  const panelHeight = (fullHeight - rail * 5) / 4
  const leafHeight = Math.min(fullHeight, visibleHeight)
  return (
    <group>
      {[rail / 2, width - rail / 2].map((x) => (
        <mesh key={x} position={[x, leafHeight / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[rail, leafHeight, 0.035]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      ))}
      {Array.from({ length: 5 }, (_, index) => {
        const bottom = index * (panelHeight + rail)
        const height = Math.min(rail, leafHeight - bottom)
        if (height <= 0) return null
        return (
          <mesh key={index} position={[width / 2, bottom + height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[panelWidth, height, 0.035]} />
            <meshStandardMaterial color={color} roughness={0.68} />
          </mesh>
        )
      })}
      {Array.from({ length: 4 }, (_, index) => {
        const bottom = rail + index * (panelHeight + rail)
        const height = Math.min(panelHeight, leafHeight - bottom)
        if (height <= 0) return null
        return (
          <group key={index} position={[rail, bottom, 0]}>
            {damaged && index === 2 && height === panelHeight ? (
              <DamagedPanel width={panelWidth} height={height} color={color} />
            ) : (
              <mesh position={[panelWidth / 2, height / 2, 0]} castShadow={!(glazed && index > 0)} receiveShadow>
                <boxGeometry args={[panelWidth, height, 0.016]} />
                {glazed && index > 0
                  ? <meshPhysicalMaterial color="#dae5df" transparent opacity={.22} roughness={.08} depthWrite={false} />
                  : <meshStandardMaterial color={color} roughness={0.77} />}
              </mesh>
            )}
            {[-1, 1].map((face) => (
              <group key={face}>
                {[0.012, panelWidth - 0.012].map((x) => (
                  <mesh key={x} position={[x, height / 2, face * 0.012]} receiveShadow>
                    <boxGeometry args={[0.024, height, 0.014]} />
                    <meshStandardMaterial color={color} roughness={0.6} />
                  </mesh>
                ))}
                {[0.012, panelHeight - 0.012].filter((y) => y < height).map((y) => (
                  <mesh key={y} position={[panelWidth / 2, y, face * 0.012]} receiveShadow>
                    <boxGeometry args={[panelWidth, 0.024, 0.014]} />
                    <meshStandardMaterial color={color} roughness={0.6} />
                  </mesh>
                ))}
              </group>
            ))}
          </group>
        )
      })}
      {visibleHeight > 1.1 && [-1, 1].map((face) => (
        <group key={face} position={[width - 0.065, 1.01, face * 0.027]}>
          <mesh castShadow>
            <boxGeometry args={[0.037, 0.18, 0.012]} />
            <meshStandardMaterial color="#929892" metalness={0.86} roughness={0.26} />
          </mesh>
          <mesh position={[-0.046, 0.019, face * 0.028]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.008, 0.008, 0.092, 10]} />
            <meshStandardMaterial color="#b4bbb5" metalness={0.88} roughness={0.22} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Fine vertical grain over a base colour, for the flush wenge doors: a deterministic scatter of darker and lighter streaks. */
function grainTexture(base: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 512
  const context = canvas.getContext('2d')!
  context.fillStyle = base
  context.fillRect(0, 0, 256, 512)
  let seed = 7
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  for (let index = 0; index < 150; index++) {
    const x = random() * 256, light = random() > .5
    context.strokeStyle = light ? `rgba(120, 95, 80, ${.05 + random() * .09})` : `rgba(0, 0, 0, ${.08 + random() * .16})`
    context.lineWidth = .5 + random() * 2.2
    context.beginPath(); context.moveTo(x, 0); context.bezierCurveTo(x + random() * 5 - 2.5, 170, x + random() * 5 - 2.5, 340, x + random() * 4 - 2, 512); context.stroke()
  }
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

/**
 * A flush door, as in the owner's picture of the wenge ones: a plain slab of dark, fine-grained wood with no panels, a slim lever handle in satin chrome on a round rose and, below it,
 * the keyhole's escutcheon, on both faces. `width` runs from the hinge; the free edge is at `width`.
 */
function FlushLeaf({ width, fullHeight, visibleHeight, color }: { width: number; fullHeight: number; visibleHeight: number; color: string }) {
  const leafHeight = Math.min(fullHeight, visibleHeight)
  const grain = useMemo(() => grainTexture(color), [color])
  useEffect(() => () => grain.dispose(), [grain])
  return <group>
    <mesh position={[width / 2, leafHeight / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, leafHeight, .04]} />
      <meshStandardMaterial color="#ffffff" map={grain} roughness={.55} />
    </mesh>
    {leafHeight > 1.1 && [-1, 1].map(face => <group key={face} position={[width - .06, 1.01, face * .0215]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, face * .003]} castShadow><cylinderGeometry args={[.026, .026, .006, 24]} /><meshStandardMaterial color="#aeb3b6" metalness={.9} roughness={.25} /></mesh>
      <mesh position={[-.055, 0, face * .03]} castShadow><boxGeometry args={[.115, .014, .012]} /><meshStandardMaterial color="#c4c8ca" metalness={.9} roughness={.22} /></mesh>
      <mesh position={[0, 0, face * .018]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.009, .009, .03, 12]} /><meshStandardMaterial color="#b9bdbf" metalness={.9} roughness={.25} /></mesh>
      <mesh position={[0, -.06, face * .0025]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.013, .013, .005, 20]} /><meshStandardMaterial color="#a9aeb1" metalness={.9} roughness={.3} /></mesh>
      <mesh position={[0, -.06, face * .006]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.004, .004, .004, 10]} /><meshStandardMaterial color="#17181a" roughness={.6} /></mesh>
    </group>)}
  </group>
}

/** A glazed leaf in a white aluminium frame: stiles, a bottom rail and a translucent pane, like the plan's living door. */
function AluminiumLeaf({ width, height, color }: { width: number; height: number; color: string }) {
  const profile = .05, rail = .12
  return <group>
    {[0, width - profile].map(x => <mesh key={x} position={[x + profile / 2, height / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[profile, height, .045]} /><meshStandardMaterial color={color} roughness={.45} metalness={.25} />
    </mesh>)}
    {[rail / 2, height - profile / 2].map(y => <mesh key={y} position={[width / 2, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[width, y < height / 2 ? rail : profile, .045]} /><meshStandardMaterial color={color} roughness={.45} metalness={.25} />
    </mesh>)}
    <mesh position={[width / 2, (rail + height - profile) / 2, 0]}>
      <boxGeometry args={[width - profile * 2, height - rail - profile, .008]} /><meshPhysicalMaterial color="#bcd6df" transparent opacity={.35} roughness={.05} depthWrite={false} />
    </mesh>
  </group>
}

/**
 * A white aluminium sliding door: two glazed panels on two tracks, one fixed and one that slides over it. `x` is where the span starts in
 * the wall's frame; the sliding panel starts on the far half and travels toward the start.
 */
function SlidingPanels({ x, width, height, openness, color }: { x: number; width: number; height: number; openness: number; color: string }) {
  const panel = width / 2 + .03, profile = .05, glassHeight = height - .12
  const pane = (left: number, z: number, key: string) => <group key={key} position={[left, .03, z]}>
    {[0, panel - profile].map(offset => <mesh key={offset} position={[offset + profile / 2, (height - .05) / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[profile, height - .05, .045]} /><meshStandardMaterial color={color} roughness={.4} metalness={.25} />
    </mesh>)}
    {[.06, height - .05 - .03].map(y => <mesh key={y} position={[panel / 2, y, 0]} castShadow receiveShadow>
      <boxGeometry args={[panel, y < .1 ? .12 : .06, .045]} /><meshStandardMaterial color={color} roughness={.4} metalness={.25} />
    </mesh>)}
    <mesh position={[panel / 2, .12 + glassHeight / 2 - .03, 0]}>
      <boxGeometry args={[panel - profile * 2, glassHeight - .1, .008]} /><meshPhysicalMaterial color="#cfe0e6" transparent opacity={.28} roughness={.05} depthWrite={false} />
    </mesh>
  </group>
  return <>
    {pane(x, .03, 'fixed')}
    {pane(x + width - panel - (width / 2) * openness, -.03, 'sliding')}
  </>
}

// All positions are in the wall's local frame: X follows wall.from → wall.to.
export function Door({ door, wall, visibleWallHeight, customization }: DoorProps) {
  // A door on a landing stands on its sill, above the floor beside it: the frame and the leaf are drawn from there.
  const sill = door.sill ?? 0
  const height = Math.min(door.height, visibleWallHeight - sill)
  const hingeAtStart = door.hinge === 'start'
  const leafDirection = hingeAtStart ? 1 : -1
  const aluminium = (customization?.style ?? door.appearance) === 'aluminium'
  const fixedLeaf = aluminium ? door.fixedLeaf ?? 0 : 0
  const leafWidth = door.width - fixedLeaf - 0.045
  const hingeX = door.offset + (hingeAtStart ? 0.024 : door.width - 0.024)
  const style = customization?.style ?? door.appearance
  const sliding = style === 'sliding'
  const frameColor = customization?.color ?? door.color ?? (door.finish === 'blue-gray' ? '#526f80' : door.finish === 'white' ? '#e3e6dc' : '#a2afa9')
  const slidingOpenness = customization?.openness ?? .6
  const leafColor = customization?.color ?? door.color ?? (door.finish === 'blue-gray' ? '#d0d5ca' : '#b7c0b6')
  const passage = customization ? customization.style === 'passage' : door.appearance === 'passage'

  return (
    <group position={[0, sill, 0]}>
      {[door.offset + 0.014, door.offset + door.width - 0.014].map((x) => (
        <mesh key={x} position={[x, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.028, height, wall.thickness + 0.008]} />
          <meshStandardMaterial color={frameColor} roughness={0.66} />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          {[door.offset - 0.019, door.offset + door.width + 0.019].map((x) => (
            <group key={x}>
              <mesh position={[x, height / 2, side * (wall.thickness / 2 + 0.014)]} castShadow receiveShadow>
                <boxGeometry args={[0.066, height, 0.027]} />
                <meshStandardMaterial color={frameColor} roughness={0.62} />
              </mesh>
              <mesh position={[x, height / 2, side * (wall.thickness / 2 + 0.031)]} receiveShadow>
                <boxGeometry args={[0.025, height, 0.013]} />
                <meshStandardMaterial color={frameColor} roughness={0.58} />
              </mesh>
            </group>
          ))}
          {visibleWallHeight - sill >= door.height + 0.07 && (
            <group position={[door.offset + door.width / 2, door.height + 0.02, side * (wall.thickness / 2 + 0.014)]}>
              <mesh castShadow receiveShadow>
                <boxGeometry args={[door.width + 0.105, 0.075, 0.027]} />
                <meshStandardMaterial color={frameColor} roughness={0.62} />
              </mesh>
              <mesh position={[0, 0.016, side * 0.017]} receiveShadow>
                <boxGeometry args={[door.width + 0.105, 0.025, 0.013]} />
                <meshStandardMaterial color={frameColor} roughness={0.58} />
              </mesh>
            </group>
          )}
        </group>
      ))}
      {visibleWallHeight - sill >= door.height && (
        <mesh position={[door.offset + door.width / 2, door.height - 0.013, 0]} castShadow>
          <boxGeometry args={[door.width, 0.026, wall.thickness]} />
          <meshStandardMaterial color={frameColor} roughness={0.66} />
        </mesh>
      )}
      <mesh position={[door.offset + door.width / 2, 0.016, 0]} receiveShadow>
        <boxGeometry args={[door.width - 0.028, 0.012, 0.085]} />
        <meshStandardMaterial color={passage ? '#997649' : '#979d97'} metalness={passage ? 0 : 0.65} roughness={0.48} />
      </mesh>
      {fixedLeaf > 0 && <group position={[hingeAtStart ? door.offset + door.width - fixedLeaf : door.offset, 0.025, 0]}><AluminiumLeaf width={fixedLeaf} height={Math.max(0, door.height - 0.05)} color={door.color ?? '#f3f2ee'} /></group>}
      {sliding && <SlidingPanels x={door.offset} width={door.width} height={Math.min(height, door.height) - .03} openness={slidingOpenness} color={door.color ?? '#f3f2ee'} />}
      {!passage && !sliding && [{ x: hingeX, dir: leafDirection }].map(({ x, dir }) => (
        <group key={x} position={[x, 0.025, 0]} rotation={[0, (customization ? customization.openness * Math.PI / 2 : (Math.PI * 76) / 180) * door.opensToward * -dir, 0]}>
          <group scale={[dir, 1, 1]}>
            {aluminium ? <AluminiumLeaf width={leafWidth} height={Math.max(0, door.height - 0.05)} color={door.color ?? '#f3f2ee'} /> : style === 'flush' ? <FlushLeaf width={leafWidth} fullHeight={door.height - 0.05} visibleHeight={Math.max(0, height - 0.025)} color={leafColor} /> : <PaneledLeaf width={leafWidth} fullHeight={door.height - 0.05} visibleHeight={Math.max(0, height - 0.025)} color={leafColor} damaged={!customization && door.condition === 'damaged-panel'} glazed={customization?.style === 'glazed'} />}
          </group>
        </group>
      ))}
    </group>
  )
}
