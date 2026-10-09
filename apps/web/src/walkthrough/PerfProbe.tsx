import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Light, Material, Mesh } from 'three'
import type { PerfReport } from './perf'

/**
 * Reads the cost of the walkthrough while it runs: frames per second and the draw calls, triangles, meshes, materials and lights of the frame. Only mounted with `?perf` in the address, so it costs nothing
 * otherwise. The figures are in `window.__perf` and in a small box in the corner of the page.
 */
export function PerfProbe() {
  const gl = useThree(state => state.gl), scene = useThree(state => state.scene)
  const box = useRef<HTMLDivElement | null>(null)
  const sample = useRef({ frames: 0, since: performance.now() })
  useEffect(() => {
    // The renderer resets its counters at every render, and the tour renders more than once a frame (the soft-shadow pass): count them over the second instead.
    gl.info.autoReset = false
    window.__scene = scene
    const element = document.createElement('div')
    element.dataset.testid = 'perf-probe'
    Object.assign(element.style, { position: 'fixed', right: '8px', bottom: '8px', zIndex: '9999', font: '11px/1.4 monospace', background: 'rgba(0,0,0,.72)', color: '#9fe', padding: '6px 8px', borderRadius: '4px', whiteSpace: 'pre' })
    document.body.appendChild(element)
    box.current = element
    return () => { element.remove(); box.current = null; gl.info.autoReset = true; delete window.__scene }
  }, [gl, scene])
  useFrame(() => {
    const now = performance.now(), state = sample.current
    state.frames += 1
    if (now - state.since < 1000) return
    const seconds = (now - state.since) / 1000
    let meshes = 0, visibleMeshes = 0, shadowCasters = 0, lights = 0, pointLights = 0
    const materials = new Set<Material>()
    scene.traverse(node => {
      const mesh = node as Mesh, light = node as Light
      if (mesh.isMesh) {
        meshes += 1
        if (mesh.visible) visibleMeshes += 1
        if (mesh.castShadow) shadowCasters += 1
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material)
      }
      if (light.isLight) { lights += 1; if ((light as Light & { isPointLight?: boolean }).isPointLight) pointLights += 1 }
    })
    const { render, memory, programs } = gl.info
    const frames = state.frames, drawCalls = render.calls / frames, drawTriangles = render.triangles / frames
    gl.info.reset()
    const report: PerfReport = {
      fps: state.frames / seconds, frameMs: seconds * 1000 / state.frames, calls: Math.round(drawCalls), triangles: Math.round(drawTriangles),
      meshes, visibleMeshes, shadowCasters, materials: materials.size, lights, pointLights, programs: programs?.length ?? 0, geometries: memory.geometries, textures: memory.textures,
    }
    window.__perf = report
    if (box.current) box.current.textContent = `${report.fps.toFixed(1)} fps (${report.frameMs.toFixed(0)} ms)\ncalls ${report.calls}  tris ${report.triangles}\nmeshes ${report.visibleMeshes}/${report.meshes}  shadow ${report.shadowCasters}\nmaterials ${report.materials}  lights ${report.lights} (${report.pointLights} point)\nshaders ${report.programs}`
    state.frames = 0; state.since = now
  })
  return null
}
