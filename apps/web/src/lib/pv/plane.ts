import type { ClearSky } from './clear-sky.ts'

export type Vec3 = [number, number, number]
export type PlaneIrradiance = {
  /** Direct light on the plane, after the glass loss, W/m2. */
  beam: number
  /** Sky light on the plane, W/m2. */
  diffuse: number
  /** Light reflected by the ground onto the plane, W/m2. */
  ground: number
  /** Cosine of the angle between the sun and the plane's normal. */
  cosIncidence: number
}

export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]

/** ASHRAE incidence-angle modifier for the beam through the glass. */
export function incidenceModifier(cosIncidence: number, b0: number): number {
  if (cosIncidence <= .02) return 0
  return Math.min(1, Math.max(0, 1 - b0 * (1 / cosIncidence - 1)))
}

/**
 * Irradiance on a tilted plane: the direct beam by the cosine of incidence, isotropic sky
 * light, and light reflected by the ground. `sun` points toward the sun and `normal` out of
 * the plane's front, in the same axes. `beamLit` is the share of the beam that reaches it.
 */
export function planeIrradiance(
  { sun, normal, sky, albedo, iamB0, beamLit = 1 }:
  { sun: Vec3; normal: Vec3; sky: ClearSky; albedo: number; iamB0: number; beamLit?: number },
): PlaneIrradiance {
  const cosIncidence = dot(sun, normal)
  const beam = cosIncidence > 0 ? sky.dni * cosIncidence * incidenceModifier(cosIncidence, iamB0) * beamLit : 0
  const cosTilt = Math.min(1, Math.max(-1, normal[1]))
  return {
    beam,
    diffuse: sky.dhi * (1 + cosTilt) / 2,
    ground: sky.ghi * albedo * (1 - cosTilt) / 2,
    cosIncidence,
  }
}
