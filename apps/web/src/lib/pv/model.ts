import { BUILDING_SITE } from '../../data/building-site.ts'
import { CLIMATE, DAYS_IN_MONTH } from '../../data/climate.ts'
import { PV_SYSTEM } from '../../data/pv-system.ts'
import { ARRAY_WATTS, PANELS, PANEL_SPEC } from '../../data/solar-array.ts'
import { getSolarPosition, localDateTimeToDate, type SolarPosition } from '../solar.ts'
import { DARK, ineichenClearSky, type ClearSky } from './clear-sky.ts'
import { planeIrradiance, type Vec3 } from './plane.ts'
import { SITE_PANELS, litFractions } from './shading.ts'

/**
 * Energy of the planned array, from the sun to the inverter.
 *
 * For each moment: the sun's position gives clear-sky irradiance (Ineichen-Perez); each panel
 * receives its beam only where the ray casting of shading.ts finds it lit, plus sky light and
 * ground reflection; the cell temperature follows the irradiance; each series of panels is
 * limited by its weakest panels through bypass diodes; and the losses and the inverter close
 * the chain.
 *
 * The weather is a mix of two skies, chosen per month so that the horizontal irradiance
 * matches the NASA POWER climatology (see anchoredClearFraction): a share of the days is clear
 * and the rest overcast, with diffuse light only. Shading only costs energy on the clear days.
 */
const { latitude, longitude } = BUILDING_SITE
const { site, overcastTransmittance, albedo, iamB0, temperature, losses, inverter } = PV_SYSTEM
const LOSS_FACTOR = Object.values(losses).reduce((product, factor) => product * factor, 1)

export type SkyState = 'clear' | 'overcast'

const parse = (date: string) => { const [year, month, day] = date.split('-').map(Number); return { year, month, day } }
/** Day of the year, 1 to 366. */
export const dayOfYear = (date: string) => {
  const { year, month, day } = parse(date)
  return Math.round((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86_400_000)
}
export const monthIndex = (date: string) => parse(date).month - 1
const pad = (value: number) => String(value).padStart(2, '0')
/** The 15th of a month (0 to 11) in the year 2026, the representative day of that month. */
export const middleOfMonth = (month: number) => `2026-${pad(month + 1)}-15`

export const sunAt = (date: string, minutes: number): SolarPosition => getSolarPosition(localDateTimeToDate(date, minutes), latitude, longitude)

/** Clear-sky irradiance for a sun position on a date. */
export const clearSky = (sun: SolarPosition, date: string): ClearSky =>
  sun.altitude <= 0 ? DARK : ineichenClearSky({ zenithDegrees: 90 - sun.altitude, dayOfYear: dayOfYear(date), altitudeM: site.altitudeM, linkeTurbidity: site.linkeTurbidity })

/** Irradiance under a sky: clear, or overcast with only diffuse light. */
export function skyIrradiance(sun: SolarPosition, date: string, state: SkyState): ClearSky {
  const clear = clearSky(sun, date)
  if (state === 'clear') return clear
  const diffuse = clear.ghi * overcastTransmittance
  return { ghi: diffuse, dni: 0, dhi: diffuse }
}

/** Ambient temperature: the month's mean plus a daily swing peaking in the afternoon. */
export const ambientTemperature = (date: string, minutes: number) =>
  CLIMATE.temperature[monthIndex(date)] + temperature.dailySwingK * Math.cos(2 * Math.PI * (minutes / 60 - temperature.peakHour) / 24)

// -- Daily energy of the horizontal plane, and the weather mix anchored to NASA ---------------

const STEP = 10
/** Clear-sky global horizontal energy of a date, in kWh/m2. */
export function clearSkyDailyGhi(date: string): number {
  let wattHours = 0
  for (let minutes = 0; minutes < 1440; minutes += STEP) wattHours += clearSky(sunAt(date, minutes), date).ghi * STEP / 60
  return wattHours / 1000
}

const anchorCache = new Map<number, { clearDaily: number; ratio: number; clearFraction: number }>()
/**
 * The share of clear days in a month. A month's typical day is `w` of a clear day and `1 - w`
 * of an overcast one, whose global irradiance is `overcastTransmittance` of the clear one.
 * `w` is chosen so that the mean daily global horizontal energy equals NASA's all-sky value:
 * w + (1 - w) c = ratio, where ratio is NASA's all-sky energy over the model's clear-sky one.
 */
export function anchoredClearFraction(month: number) {
  const cached = anchorCache.get(month)
  if (cached) return cached
  const clearDaily = clearSkyDailyGhi(middleOfMonth(month))
  const ratio = CLIMATE.allSkyGhi[month] / clearDaily
  const c = overcastTransmittance
  const anchor = { clearDaily, ratio, clearFraction: Math.min(1, Math.max(0, (ratio - c) / (1 - c))) }
  anchorCache.set(month, anchor)
  return anchor
}

// -- One moment --------------------------------------------------------------------------------

export type Instant = {
  /** Global horizontal irradiance, W/m2. */
  ghi: number
  /** Mean irradiance on the panels, W/m2. */
  poa: number
  /** Mean share of the beam that reaches the panels. */
  lit: number
  dcW: number
  acW: number
}

/**
 * Power of a series of panels with bypass diodes. `g` is each panel's irradiance over 1000 W/m2.
 * The series carries one current: at the k-th best panel's current, the k panels that can carry
 * it deliver full voltage and the rest are bypassed, so the series power is the best of k * g(k).
 */
export function seriesPower(g: number[]): number {
  const sorted = [...g].sort((a, b) => b - a)
  let best = 0
  sorted.forEach((value, index) => { best = Math.max(best, value * (index + 1)) })
  return best
}

const EMPTY: Instant = { ghi: 0, poa: 0, lit: 0, dcW: 0, acW: 0 }
const panelIndex = new Map(PANELS.map((panel, index) => [panel.id, index]))

/**
 * Power of the array at one moment. `lit` gives each panel's lit share of the beam; leaving it
 * out means no shading at all.
 */
export function instantPower(
  sun: SolarPosition, sky: ClearSky, ambientC: number, lit: Record<string, number> | null,
): Instant {
  if (sun.altitude <= 0 || sky.ghi <= 0) return EMPTY
  const direction = sun.direction as Vec3
  const irradiance = SITE_PANELS.map(panel => {
    const parts = planeIrradiance({ sun: direction, normal: panel.normal, sky, albedo, iamB0, beamLit: lit ? lit[panel.id] : 1 })
    return parts.beam + parts.diffuse + parts.ground
  })
  let dc = 0
  for (const ids of PV_SYSTEM.strings) {
    const indices = ids.map(id => panelIndex.get(id)!)
    const g = indices.map(index => irradiance[index] / 1000)
    const total = indices.reduce((sum, index) => sum + irradiance[index], 0)
    // Cell temperature from the irradiance, averaged over the series and weighted by it.
    const cell = total > 0
      ? indices.reduce((sum, index) => sum + irradiance[index] * (ambientC + (temperature.noct - 20) / 800 * irradiance[index]), 0) / total
      : ambientC
    const temperatureFactor = Math.max(0, 1 + temperature.coefficientPerK * (cell - 25))
    dc += PANEL_SPEC.watts * seriesPower(g) * temperatureFactor
  }
  const ac = Math.min(inverter.maxAcW, dc * LOSS_FACTOR * inverter.efficiency)
  const litMean = lit ? SITE_PANELS.reduce((sum, panel) => sum + lit[panel.id], 0) / SITE_PANELS.length : 1
  return { ghi: sky.ghi, poa: irradiance.reduce((sum, value) => sum + value, 0) / irradiance.length, lit: litMean, dcW: dc, acW: ac }
}

// -- A day ---------------------------------------------------------------------------------------

export type SkyDay = {
  state: SkyState
  shaded: boolean
  minutes: number[]
  acW: number[]
  ghi: number[]
  poa: number[]
  lit: number[]
  acKwh: number
  dcKwh: number
  ghiKwhM2: number
  poaKwhM2: number
}

/** Simulate one date under one sky, with or without the shading of the surroundings. */
export function simulateSky(date: string, state: SkyState, { shaded = true, stepMinutes = STEP } = {}): SkyDay {
  const out: SkyDay = { state, shaded, minutes: [], acW: [], ghi: [], poa: [], lit: [], acKwh: 0, dcKwh: 0, ghiKwhM2: 0, poaKwhM2: 0 }
  const hours = stepMinutes / 60
  for (let minutes = 0; minutes < 1440; minutes += stepMinutes) {
    const sun = sunAt(date, minutes)
    const sky = skyIrradiance(sun, date, state)
    // Only a clear sky has a beam to shade.
    const shares = shaded && state === 'clear' && sun.altitude > 0 ? litFractions(sun.direction as Vec3) : null
    const now = instantPower(sun, sky, ambientTemperature(date, minutes), shares)
    out.minutes.push(minutes)
    out.acW.push(now.acW); out.ghi.push(now.ghi); out.poa.push(now.poa); out.lit.push(now.lit)
    out.acKwh += now.acW * hours / 1000
    out.dcKwh += now.dcW * hours / 1000
    out.ghiKwhM2 += now.ghi * hours / 1000
    out.poaKwhM2 += now.poa * hours / 1000
  }
  return out
}

export type DayResult = {
  date: string
  /** Share of clear days in the month, from the anchoring to NASA. */
  clearFraction: number
  clear: SkyDay
  overcast: SkyDay
  /** The clear day without any shading, to measure what shading costs. */
  clearUnshaded: SkyDay
  /** The month's typical day: the mix of the clear and overcast days. */
  typical: { minutes: number[]; acW: number[]; acKwh: number; ghiKwhM2: number; poaKwhM2: number; unshadedAcKwh: number }
  /** Energy lost to shading on a clear day and on the typical day, in percent. */
  clearShadingLossPercent: number
  typicalShadingLossPercent: number
}

export function simulateDay(date: string, stepMinutes = STEP): DayResult {
  const { clearFraction: w } = anchoredClearFraction(monthIndex(date))
  const clear = simulateSky(date, 'clear', { stepMinutes })
  const clearUnshaded = simulateSky(date, 'clear', { shaded: false, stepMinutes })
  const overcast = simulateSky(date, 'overcast', { shaded: false, stepMinutes })
  const mix = (a: number, b: number) => w * a + (1 - w) * b
  const acKwh = mix(clear.acKwh, overcast.acKwh)
  const unshadedAcKwh = mix(clearUnshaded.acKwh, overcast.acKwh)
  const loss = (real: number, ideal: number) => ideal > 0 ? (1 - real / ideal) * 100 : 0
  return {
    date, clearFraction: w, clear, overcast, clearUnshaded,
    typical: {
      minutes: clear.minutes,
      acW: clear.acW.map((value, index) => mix(value, overcast.acW[index])),
      acKwh, unshadedAcKwh,
      ghiKwhM2: mix(clear.ghiKwhM2, overcast.ghiKwhM2),
      poaKwhM2: mix(clear.poaKwhM2, overcast.poaKwhM2),
    },
    clearShadingLossPercent: loss(clear.acKwh, clearUnshaded.acKwh),
    typicalShadingLossPercent: loss(acKwh, unshadedAcKwh),
  }
}

// -- A year --------------------------------------------------------------------------------------

export type MonthResult = {
  month: number
  clearFraction: number
  /** Mean energy of a day of the month, kWh. */
  acKwhPerDay: number
  acKwh: number
  ghiKwhM2PerDay: number
  shadingLossPercent: number
}
export type YearResult = {
  months: MonthResult[]
  annualKwh: number
  /** Annual energy per kWp installed. */
  specificYield: number
  annualShadingLossPercent: number
  peakKw: number
}

/** The year, one representative day (the 15th) per month, at a coarser time step. */
export function simulateYear(stepMinutes = 20): YearResult {
  const days = Array.from({ length: 12 }, (_, month) => simulateDay(middleOfMonth(month), stepMinutes))
  const months = days.map((day, month): MonthResult => ({
    month, clearFraction: day.clearFraction,
    acKwhPerDay: day.typical.acKwh, acKwh: day.typical.acKwh * DAYS_IN_MONTH[month],
    ghiKwhM2PerDay: day.typical.ghiKwhM2, shadingLossPercent: day.typicalShadingLossPercent,
  }))
  const annualKwh = months.reduce((sum, item) => sum + item.acKwh, 0)
  const unshadedKwh = days.reduce((sum, day, month) => sum + day.typical.unshadedAcKwh * DAYS_IN_MONTH[month], 0)
  return {
    months, annualKwh,
    specificYield: annualKwh / (ARRAY_WATTS / 1000),
    annualShadingLossPercent: unshadedKwh > 0 ? (1 - annualKwh / unshadedKwh) * 100 : 0,
    peakKw: Math.max(...days.map(day => Math.max(...day.clear.acW))) / 1000,
  }
}
