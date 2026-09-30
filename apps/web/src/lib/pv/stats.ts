import { PV_SYSTEM } from '../../data/pv-system.ts'
import type { DayResult, YearResult } from './model.ts'

/** Figures read off a simulated day, for the generation panels. */
export type DayStats = {
  /** Peak power of the clear day, kW, and the minute it happens. */
  clearPeakKw: number
  clearPeakMinutes: number
  typicalPeakKw: number
  /** Share of the inverter's rating used at the clear day's peak, in percent. */
  inverterLoadPercent: number
  /** Energy per kWp installed on the typical day. */
  specificYield: number
  /** First and last minute with production on the clear day; null when the sun never rises. */
  productionWindow: [number, number] | null
  /** The longest stretch of the clear day's useful hours with shade on the panels; null when there is none. */
  shadeWindow: [number, number] | null
}

/** Power below this share of the day's peak is too little to count when looking for shade. */
const MEANINGFUL = .1

/** Below this mean share of the beam reaching the panels, a moment counts as shaded; a thin self-shadow at dawn does not. */
const SHADED_BELOW = .9

export function dayStats(day: DayResult, kwp: number): DayStats {
  const { clear, typical } = day
  let peakIndex = 0
  clear.acW.forEach((watts, index) => { if (watts > clear.acW[peakIndex]) peakIndex = index })
  const producing: number[] = []
  let run: number[] = [], longest: number[] = []
  clear.minutes.forEach((minutes, index) => {
    if (clear.acW[index] > 0) producing.push(minutes)
    // Only hours that matter: the low sun of dawn and dusk is shaded by anything.
    const shaded = clear.acW[index] > clear.acW[peakIndex] * MEANINGFUL && clear.lit[index] < SHADED_BELOW
    run = shaded ? [...run, minutes] : []
    if (run.length > longest.length) longest = run
  })
  const edges = (minutes: number[]): [number, number] | null => minutes.length ? [minutes[0], minutes[minutes.length - 1]] : null
  return {
    clearPeakKw: clear.acW[peakIndex] / 1000,
    clearPeakMinutes: clear.minutes[peakIndex],
    typicalPeakKw: Math.max(...typical.acW) / 1000,
    inverterLoadPercent: clear.acW[peakIndex] / PV_SYSTEM.inverter.maxAcW * 100,
    specificYield: kwp > 0 ? typical.acKwh / kwp : 0,
    productionWindow: edges(producing),
    shadeWindow: edges(longest),
  }
}

/** Energy produced from midnight up to and including each step, kWh. */
export function cumulativeKwh(acW: number[], stepMinutes: number): number[] {
  let total = 0
  return acW.map(watts => { total += watts * stepMinutes / 60000; return total })
}

/** Round axis ticks from 0 to at least `max`, about `count` of them, on 1, 2, 2.5 or 5 steps. */
export function niceTicks(max: number, count = 4): number[] {
  if (!(max > 0)) return [0]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find(factor => factor * magnitude >= raw) ?? 10) * magnitude
  const last = Math.ceil(max / step - 1e-9)
  return Array.from({ length: last + 1 }, (_, index) => index * step)
}

/** What the year chart plots for each month. */
export type YearMetric = 'perDay' | 'perMonth' | 'perKwp'

export function monthValue(month: YearResult['months'][number], metric: YearMetric, kwp: number): number {
  return metric === 'perDay' ? month.acKwhPerDay : metric === 'perMonth' ? month.acKwh : month.acKwhPerDay / kwp
}

/** The months as CSV, always with a dot decimal so a spreadsheet in any locale can read it. */
export function yearCsv(year: YearResult, kwp: number, monthNames: string[]): string {
  const rows = year.months.map(month => [
    monthNames[month.month], month.acKwh.toFixed(1), month.acKwhPerDay.toFixed(2), (month.acKwhPerDay / kwp).toFixed(2),
    (month.clearFraction * 100).toFixed(0), month.shadingLossPercent.toFixed(2),
  ].join(','))
  return ['month,kwh_month,kwh_day,kwh_per_kwp_day,clear_days_percent,shading_loss_percent', ...rows].join('\n') + '\n'
}

/** Clock time, HH:MM, of a minute of the day. */
export const clock = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(Math.round(minutes) % 60).padStart(2, '0')}`

/** The metric's unit, as a translation key. */
export const METRIC_UNIT = { perDay: 'building.genUnitPerDay', perMonth: 'building.genUnitPerMonth', perKwp: 'building.genUnitPerKwp' } as const satisfies Record<YearMetric, string>
