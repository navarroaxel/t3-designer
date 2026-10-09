import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Group, type PointLight } from 'three'
import { chooseSources, type LightSource } from '../lib/light-pool'

/**
 * The scene's point lights, a fixed few. Every point light costs every pixel of every lit surface, so a house with a light in each lamp (a dozen and a half) is slow, and one that adds and removes
 * lights as you walk recompiles its shaders at each change. The pool keeps `size` lights, and each moves to the source nearest to the camera, that being what lights the part of the house in view; a
 * light that takes a new source fades in from nothing. The sources are in the frame of the group that holds the pool.
 */
export function LightPool({ sources, size = 6 }: { sources: readonly LightSource[]; size?: number }) {
  const group = useRef<Group>(null), lights = useRef<(PointLight | null)[]>([])
  const assigned = useRef<(string | null)[]>(Array.from({ length: size }, () => null)), shown = useRef<number[]>(Array.from({ length: size }, () => 0))
  const latest = useRef(sources), since = useRef(1), from = useRef(new Vector3())
  latest.current = sources
  const camera = useThree(state => state.camera)
  useFrame((_, delta) => {
    const holder = group.current
    if (!holder) return
    since.current += delta
    // Choose again a few times a second, not at every frame: the nearest lamps change as one walks, not as one looks.
    if (since.current > .15) {
      since.current = 0
      camera.getWorldPosition(from.current)
      holder.worldToLocal(from.current)
      const before = assigned.current
      assigned.current = chooseSources(latest.current, [from.current.x, from.current.y, from.current.z], before, size)
      assigned.current.forEach((id, index) => { if (id !== before[index]) shown.current[index] = 0 })
    }
    assigned.current.forEach((id, index) => {
      const light = lights.current[index], source = id ? latest.current.find(item => item.id === id) : undefined
      if (!light) return
      if (source) { light.position.set(...source.position); light.color.set(source.color); light.distance = source.distance }
      // Fade toward what the source asks (nothing if it has none): about a quarter of a second.
      shown.current[index] += ((source?.intensity ?? 0) - shown.current[index]) * Math.min(1, delta * 8)
      light.intensity = shown.current[index]
    })
  })
  return <group ref={holder => { group.current = holder }} name="light-pool">
    {Array.from({ length: size }, (_, index) => <pointLight key={index} ref={light => { lights.current[index] = light }} intensity={0} decay={2} />)}
  </group>
}
