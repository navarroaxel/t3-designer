/**
 * Clear-sky irradiance: the Ineichen-Perez model, as published by Ineichen and
 * Perez (2002) and implemented in pvlib, driven by the Linke turbidity. Angles in
 * degrees, irradiance in W/m2.
 */
export const SOLAR_CONSTANT = 1361

export type ClearSky = { ghi: number; dni: number; dhi: number }
export const DARK: ClearSky = { ghi: 0, dni: 0, dhi: 0 }

const radians = (degrees: number) => degrees * Math.PI / 180

/** Extraterrestrial normal irradiance for a day of the year (1 to 366), by Spencer's series. */
export function extraterrestrialNormal(dayOfYear: number): number {
  const b = 2 * Math.PI * (dayOfYear - 1) / 365
  const factor = 1.00011 + .034221 * Math.cos(b) + .00128 * Math.sin(b) + .000719 * Math.cos(2 * b) + .000077 * Math.sin(2 * b)
  return SOLAR_CONSTANT * factor
}

/** Relative optical air mass, Kasten and Young (1989). */
export function relativeAirmass(zenithDegrees: number): number {
  if (zenithDegrees >= 90) return Infinity
  return 1 / (Math.cos(radians(zenithDegrees)) + .50572 * (96.07995 - zenithDegrees) ** -1.6364)
}

export type ClearSkyInput = {
  zenithDegrees: number
  dayOfYear: number
  /** Height of the site above sea level, in metres. */
  altitudeM: number
  linkeTurbidity: number
}

export function ineichenClearSky({ zenithDegrees, dayOfYear, altitudeM, linkeTurbidity: tl }: ClearSkyInput): ClearSky {
  if (!(zenithDegrees < 90)) return DARK
  const cosZ = Math.cos(radians(zenithDegrees))
  const extra = extraterrestrialNormal(dayOfYear)
  const airmass = relativeAirmass(zenithDegrees) * Math.exp(-altitudeM / 8434.5)
  const fh1 = Math.exp(-altitudeM / 8000), fh2 = Math.exp(-altitudeM / 1250)
  const cg1 = 5.09e-5 * altitudeM + .868, cg2 = 3.92e-5 * altitudeM + .0387
  // Global horizontal, with the Perez enhancement for low sun.
  const transmit = Math.exp(-cg2 * airmass * (fh1 + fh2 * (tl - 1))) * Math.exp(.01 * airmass ** 1.8)
  const ghi = Math.max(0, cg1 * extra * cosZ * transmit)
  // Direct normal, limited by the empirical correction of the model.
  const b = .664 + .163 / fh1
  const bnci = extra * Math.max(0, b * Math.exp(-.09 * airmass * (tl - 1)))
  const bnci2 = ghi * Math.min(Math.max((1 - (.1 - .2 * Math.exp(-tl)) / (.1 + .882 / fh1)) / cosZ, 0), 1e20)
  const dni = Math.max(0, Math.min(bnci, bnci2))
  const dhi = Math.max(0, ghi - dni * cosZ)
  return { ghi, dni, dhi }
}
