/** What the probe reads off the renderer and the scene once a second, for `?perf` and for the tests of the walkthrough's cost. */
export type PerfReport = {
  fps: number; frameMs: number
  /** One frame's draw calls and triangles, as the renderer counted them. */
  calls: number; triangles: number
  /** What the scene holds: the meshes, how many are drawn, how many cast a shadow, the distinct materials, the lights and the shaders compiled. */
  meshes: number; visibleMeshes: number; shadowCasters: number; materials: number; lights: number; pointLights: number; programs: number; geometries: number; textures: number
}

declare global { interface Window { __perf?: PerfReport; __scene?: import('three').Scene } }

/** True when the page was opened with `?perf`: the probe runs and shows its figures in a corner. */
export const perfRequested = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('perf')

