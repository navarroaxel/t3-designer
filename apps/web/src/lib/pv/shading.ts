import { SITE_BUILDINGS, houseToSite, type BuildingFootprint } from '../../data/building-site.ts'
import { PANELS, type Panel } from '../../data/solar-array.ts'
import { dot, type Vec3 } from './plane.ts'

/**
 * Shading of each panel by ray casting: from sample points on the panel a ray goes toward the
 * sun, and the point is shaded if the ray meets a building prism (the house's parapets and
 * water tank, the neighbours, the block) or another panel. Everything is in site axes: x east,
 * y up, z south. Distant obstructions beyond the modelled block are not included.
 */
type Ring = [number, number][]
export type Prism = { ring: Ring; base: number; top: number; min: [number, number]; max: [number, number] }
type Triangle = [Vec3, Vec3, Vec3]

/** Samples across each panel: along the slope and along its width. */
export const SAMPLES = { alongSlope: 4, acrossWidth: 6 }
/** Sample points sit this far in front of the panel so a point never hits its own plane. */
const LIFT = 1e-3

export const toPrism = (building: BuildingFootprint): Prism => {
  const ring = building.footprint as Ring
  return {
    ring, base: building.base ?? 0, top: building.height + (building.slope?.rise ?? 0),
    min: [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1]))],
    max: [Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))],
  }
}

const pointInRing = (x: number, z: number, ring: Ring) => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j]
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside
  }
  return inside
}

const cross = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) => (bx - ax) * (cz - az) - (bz - az) * (cx - ax)

function segmentsCross(ax: number, az: number, bx: number, bz: number, cx: number, cz: number, dx: number, dz: number) {
  const d1 = cross(ax, az, bx, bz, cx, cz), d2 = cross(ax, az, bx, bz, dx, dz)
  const d3 = cross(cx, cz, dx, dz, ax, az), d4 = cross(cx, cz, dx, dz, bx, bz)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** Does the horizontal segment A-B touch the ring: an end inside it, or a crossing of an edge. */
export function segmentHitsRing(ax: number, az: number, bx: number, bz: number, ring: Ring): boolean {
  if (pointInRing(ax, az, ring) || pointInRing(bx, bz, ring)) return true
  for (let i = 0; i < ring.length; i++) {
    const [cx, cz] = ring[i], [dx, dz] = ring[(i + 1) % ring.length]
    if (segmentsCross(ax, az, bx, bz, cx, cz, dx, dz)) return true
  }
  return false
}

/** Does a ray from `origin` toward the sun (direction `dir`, going up) pass through the prism. */
export function rayHitsPrism(origin: Vec3, dir: Vec3, prism: Prism): boolean {
  if (dir[1] <= 1e-9) return false
  const tTop = (prism.top - origin[1]) / dir[1]
  if (tTop <= 0) return false
  const tBase = Math.max(0, (prism.base - origin[1]) / dir[1])
  if (tBase >= tTop) return false
  const ax = origin[0] + dir[0] * tBase, az = origin[2] + dir[2] * tBase
  const bx = origin[0] + dir[0] * tTop, bz = origin[2] + dir[2] * tTop
  if (Math.max(ax, bx) < prism.min[0] || Math.min(ax, bx) > prism.max[0]) return false
  if (Math.max(az, bz) < prism.min[1] || Math.min(az, bz) > prism.max[1]) return false
  return segmentHitsRing(ax, az, bx, bz, prism.ring)
}

/** Möller-Trumbore: does the ray meet the triangle in front of its origin. */
export function rayHitsTriangle(origin: Vec3, dir: Vec3, [a, b, c]: Triangle): boolean {
  const e1: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], e2: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const p: Vec3 = [dir[1] * e2[2] - dir[2] * e2[1], dir[2] * e2[0] - dir[0] * e2[2], dir[0] * e2[1] - dir[1] * e2[0]]
  const det = dot(e1, p)
  if (Math.abs(det) < 1e-12) return false
  const t: Vec3 = [origin[0] - a[0], origin[1] - a[1], origin[2] - a[2]]
  const u = dot(t, p) / det
  if (u < 0 || u > 1) return false
  const q: Vec3 = [t[1] * e1[2] - t[2] * e1[1], t[2] * e1[0] - t[0] * e1[2], t[0] * e1[1] - t[1] * e1[0]]
  const v = dot(dir, q) / det
  if (v < 0 || u + v > 1) return false
  return dot(e2, q) / det > 1e-6
}

/** A panel in site axes: corners, unit normal and the points sampled on it. */
export type SitePanel = { id: string; corners: [Vec3, Vec3, Vec3, Vec3]; normal: Vec3; samples: Vec3[]; triangles: [Triangle, Triangle] }

const S = Math.SQRT1_2
/** A house-frame point [u, y, v] in site axes. */
const houseToSitePoint = ([u, y, v]: Vec3): Vec3 => {
  const [x, z] = houseToSite(u, v)
  return [x, y, z]
}
/** A house-frame direction in site axes. */
export const houseToSiteDirection = ([u, y, v]: Vec3): Vec3 => [S * (u + v), y, S * (u - v)]

export function toSitePanel(panel: Panel, samples = SAMPLES): SitePanel {
  const corners = panel.corners.map(houseToSitePoint) as [Vec3, Vec3, Vec3, Vec3]
  const normal = houseToSiteDirection(panel.normal)
  // corners: low-left, low-right, high-right, high-left seen from the street.
  const [lowLeft, lowRight, highRight, highLeft] = corners
  const points: Vec3[] = []
  for (let i = 0; i < samples.alongSlope; i++) {
    for (let j = 0; j < samples.acrossWidth; j++) {
      const s = (i + .5) / samples.alongSlope, t = (j + .5) / samples.acrossWidth
      points.push([0, 1, 2].map(k =>
        (lowLeft[k] * (1 - t) + lowRight[k] * t) * (1 - s) + (highLeft[k] * (1 - t) + highRight[k] * t) * s + normal[k] * LIFT) as Vec3)
    }
  }
  return { id: panel.id, corners, normal, samples: points, triangles: [[lowLeft, lowRight, highRight], [lowLeft, highRight, highLeft]] }
}

export const SITE_PANELS: SitePanel[] = PANELS.map(panel => toSitePanel(panel))

const subsets = new Map<string, SitePanel[]>()
/**
 * The panels that are installed, for the shading: they shade each other, so leaving some out changes what the
 * rest receive. `null` means the whole planned array.
 */
export function sitePanelsFor(enabled: ReadonlySet<string> | null): SitePanel[] {
  if (!enabled) return SITE_PANELS
  const key = SITE_PANELS.filter(panel => enabled.has(panel.id)).map(panel => panel.id).join(',')
  let subset = subsets.get(key)
  if (!subset) { subset = SITE_PANELS.filter(panel => enabled.has(panel.id)); subsets.set(key, subset) }
  return subset
}

/** Only prisms rising above the lowest panel can ever shade one: rays go up. */
const lowestPanel = Math.min(...PANELS.map(panel => panel.lowEdgeY))
export const OBSTACLES: Prism[] = SITE_BUILDINGS.map(toPrism).filter(prism => prism.top > lowestPanel)

/**
 * The share of each panel that receives the direct beam for a sun direction (a unit vector
 * toward the sun, in site axes). A panel facing away from the sun, or a sun below the horizon,
 * gets none. `panels` and `obstacles` default to the planned array and the modelled site.
 */
export function litFractions(
  sun: Vec3,
  { panels = SITE_PANELS, obstacles = OBSTACLES }: { panels?: SitePanel[]; obstacles?: Prism[] } = {},
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const panel of panels) {
    if (sun[1] <= 0 || dot(sun, panel.normal) <= 0) { result[panel.id] = 0; continue }
    let lit = 0
    for (const sample of panel.samples) {
      const blocked = obstacles.some(prism => rayHitsPrism(sample, sun, prism))
        || panels.some(other => other !== panel && other.triangles.some(triangle => rayHitsTriangle(sample, sun, triangle)))
      if (!blocked) lit++
    }
    result[panel.id] = lit / panel.samples.length
  }
  return result
}
