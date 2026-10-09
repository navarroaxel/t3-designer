import { useEffect, useRef, type ReactNode } from 'react'
import { useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { bakeStatic } from '../lib/bake-static'

/**
 * Draws what stands still as a few meshes, not a few hundred: once it has mounted, the meshes below that look the same are joined (see `bakeStatic`) and the originals hidden. For scenery, which is made
 * of many small meshes and does not change; `deps` says when it does (a new site), and then it is baked again. Nothing under it may move, change colour or open.
 */
export function StaticBake({ children, deps = [] }: { children: ReactNode; deps?: readonly unknown[] }) {
  const holder = useRef<Group>(null), { gl, invalidate } = useThree()
  useEffect(() => {
    const root = holder.current
    if (!root) return
    const baked = bakeStatic(root)
    root.add(baked.group)
    // The static shadows are drawn once: draw them again with the joined meshes in them.
    gl.shadowMap.needsUpdate = true
    invalidate()
    return () => baked.undo()
  }, [gl, invalidate, ...deps])
  return <group ref={holder} name="static-bake">{children}</group>
}
