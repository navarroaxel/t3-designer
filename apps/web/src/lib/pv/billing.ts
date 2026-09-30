import { DAYS_IN_MONTH } from '../../data/climate.ts'
import type { YearResult } from './model.ts'

/**
 * The electricity bill with and without the array, for a house with a two-way (net) meter.
 *
 * Each month the house's consumption follows a day/night profile, and it is set against the array's typical
 * day: at every moment the house uses what it makes, up to what it consumes (`min(generation, load)`), and
 * that energy is never metered. The rest of the generation goes to the grid, and the rest of the consumption
 * comes from it. The grid charges the energy taken at the tariff and credits the energy sent at a share of it
 * (`creditShare`; the generation and distribution costs are not paid back, so it is a fraction). A credit larger
 * than the month's energy charge is a surplus: depending on `cashOut` the company pays it in cash each month,
 * pays what is left once at the end of the year, or only carries it over to the next month (what is left at the end
 * of the year is then not counted). The fixed charge is always paid.
 *
 * The load profile is two blocks: the daytime hours (`dayStart` to `dayEnd`) hold `daytimeShare` of the day's
 * consumption spread evenly, the night hours the rest. A house that works from home has most of it by day.
 *
 * The tariff is the owner's price per kWh; the fixed charge, the consumption and the profile are the owner's to
 * set, and their defaults are placeholders until the real bill is typed in.
 */
export type CashOut = 'monthly' | 'yearly' | 'off'
export const CASH_OUT_MODES: readonly CashOut[] = ['monthly', 'yearly', 'off']

export type BillingSettings = {
  /** Price of a kWh taken from the grid, all charges and taxes included, in the local currency. */
  tariff: number
  /** What the grid pays for an exported kWh, as a share of the tariff. */
  creditShare: number
  /** Share of the consumption that falls in the daytime hours. */
  daytimeShare: number
  /** The daytime hours, whole hours of the day: from `dayStart` up to `dayEnd`. */
  dayStart: number
  dayEnd: number
  /** Fixed monthly charge of the bill. */
  fixedCharge: number
  /** When the company pays the surplus credit in cash: each month, once at the end of the year, or never (it only carries over). */
  cashOut: CashOut
  /** The house's consumption in each month, kWh. */
  consumption: number[]
}

export const DEFAULT_BILLING: BillingSettings = {
  tariff: 160, creditShare: .7, daytimeShare: .6, dayStart: 8, dayEnd: 20, fixedCharge: 0, cashOut: 'yearly', consumption: Array.from({ length: 12 }, () => 500),
}

/** Daytime shares the calculator offers as starting points. */
export const PROFILE_PRESETS = { homeByDay: .75, even: .5, awayByDay: .25 } as const

export type BillMonth = {
  month: number
  generation: number
  consumption: number
  /** Generation the house used as it was made, kWh. */
  selfUsed: number
  /** Share of the month's generation that was used as it was made, percent. */
  selfPercent: number
  exported: number
  imported: number
  billWithout: number
  billWith: number
  saved: number
  /** Money the company pays in cash this month for what the array made beyond the bills (0 when nothing is left over). */
  gain: number
  /** Credit carried into the next month, in currency. */
  creditLeft: number
}

export type BillTotals = {
  generation: number
  consumption: number
  exported: number
  imported: number
  billWithout: number
  billWith: number
  saved: number
  /** Cash the company pays over the year for the surplus. */
  gain: number
  /** Cash received minus the bills paid over the year: positive is a gain, negative is what the electricity cost. */
  net: number
  /** Generation over consumption, in percent. */
  coverage: number
  /** Share of the year's generation used as it was made, percent. */
  selfPercent: number
  /** Credit still unused at the end of the year, in currency (only when the surplus is not paid out). */
  creditLeft: number
}

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

/** A daytime window of whole hours with at least one hour on each side of the day; anything else is the default. */
function sanitizeWindow(start: number, end: number): { dayStart: number; dayEnd: number } {
  const dayStart = Math.round(start), dayEnd = Math.round(end)
  return dayStart >= 0 && dayEnd <= 23 && dayEnd > dayStart ? { dayStart, dayEnd } : { dayStart: DEFAULT_BILLING.dayStart, dayEnd: DEFAULT_BILLING.dayEnd }
}

/** Settings in the ranges the calculator accepts; anything missing or broken falls back to the default. */
export function sanitizeBilling(input: Partial<Record<keyof BillingSettings, unknown>> | null | undefined): BillingSettings {
  const source = input ?? {}
  const number = (value: unknown, fallback: number) => typeof value === 'number' ? finite(value, fallback) : fallback
  const consumption = Array.isArray(source.consumption) && source.consumption.length === 12
    ? source.consumption.map((value, index) => clamp(number(value, DEFAULT_BILLING.consumption[index]), 0, 100_000))
    : [...DEFAULT_BILLING.consumption]
  return {
    tariff: clamp(number(source.tariff, DEFAULT_BILLING.tariff), 0, 1_000_000),
    creditShare: clamp(number(source.creditShare, DEFAULT_BILLING.creditShare), 0, 1),
    daytimeShare: clamp(number(source.daytimeShare, DEFAULT_BILLING.daytimeShare), 0, 1),
    ...sanitizeWindow(number(source.dayStart, DEFAULT_BILLING.dayStart), number(source.dayEnd, DEFAULT_BILLING.dayEnd)),
    fixedCharge: clamp(number(source.fixedCharge, DEFAULT_BILLING.fixedCharge), 0, 10_000_000),
    cashOut: CASH_OUT_MODES.find(mode => mode === source.cashOut) ?? DEFAULT_BILLING.cashOut,
    consumption,
  }
}

/** What the calculator needs of a simulated year: each month's energy and the typical day's curve. */
export type BillingInput = { generation: number[]; curves: number[][]; stepMinutes: number }

export const billingInput = (year: YearResult): BillingInput => ({
  generation: year.months.map(month => month.acKwh), curves: year.months.map(month => month.curveW), stepMinutes: year.stepMinutes,
})

/** The house's load at each step of a day, W, for a daily consumption in kWh. */
export function loadCurve(dailyKwh: number, settings: Pick<BillingSettings, 'daytimeShare' | 'dayStart' | 'dayEnd'>, stepMinutes: number): number[] {
  const { daytimeShare, dayStart, dayEnd } = settings
  const dayHours = dayEnd - dayStart, nightHours = 24 - dayHours
  const dayW = dailyKwh * daytimeShare / dayHours * 1000, nightW = dailyKwh * (1 - daytimeShare) / nightHours * 1000
  return Array.from({ length: Math.round(1440 / stepMinutes) }, (_, index) => {
    const hour = index * stepMinutes / 60
    return hour >= dayStart && hour < dayEnd ? dayW : nightW
  })
}

export function computeBills(input: BillingInput, settings: BillingSettings): { months: BillMonth[]; totals: BillTotals } {
  const { tariff, creditShare, fixedCharge, consumption } = settings
  let carried = 0
  const months = input.generation.map((produced, month): BillMonth => {
    const used = consumption[month]
    // The typical day, moment by moment: what the house makes and consumes at once never reaches the meter.
    const load = loadCurve(used / DAYS_IN_MONTH[month], settings, input.stepMinutes)
    const perDay = input.curves[month].reduce((sum, watts, index) => sum + Math.min(watts, load[index]), 0) * input.stepMinutes / 60 / 1000
    const selfUsed = Math.min(perDay * DAYS_IN_MONTH[month], produced, used)
    const exported = produced - selfUsed
    const imported = used - selfUsed
    const charge = imported * tariff - exported * tariff * creditShare - carried
    const billWith = fixedCharge + Math.max(0, charge)
    const surplus = Math.max(0, -charge)
    // The surplus is paid now, kept for the year's end, or only carried over.
    const paidNow = settings.cashOut === 'monthly' ? surplus : 0
    carried = settings.cashOut === 'monthly' ? 0 : surplus
    const gain = paidNow + (month === 11 && settings.cashOut === 'yearly' ? carried : 0)
    if (month === 11 && settings.cashOut === 'yearly') carried = 0
    const billWithout = used * tariff + fixedCharge
    const saved = billWithout - billWith
    return {
      month, generation: produced, consumption: used, selfUsed, selfPercent: produced > 0 ? selfUsed / produced * 100 : 0,
      exported, imported, billWithout, billWith, saved, gain, creditLeft: carried,
    }
  })
  const sum = (pick: (month: BillMonth) => number) => months.reduce((total, month) => total + pick(month), 0)
  const totalConsumption = sum(month => month.consumption), totalGeneration = sum(month => month.generation)
  return {
    months,
    totals: {
      generation: totalGeneration, consumption: totalConsumption, exported: sum(month => month.exported), imported: sum(month => month.imported),
      billWithout: sum(month => month.billWithout), billWith: sum(month => month.billWith), saved: sum(month => month.saved), gain: sum(month => month.gain), net: sum(month => month.gain) - sum(month => month.billWith),
      coverage: totalConsumption > 0 ? totalGeneration / totalConsumption * 100 : 0,
      selfPercent: totalGeneration > 0 ? sum(month => month.selfUsed) / totalGeneration * 100 : 0,
      creditLeft: carried,
    },
  }
}

/**
 * The year's bottom line: a gain when the company pays more than it bills, otherwise the annual electricity cost, which is
 * what had to be paid to the company over the year (after the credit and any cash out). A tie counts as a gain of nothing.
 */
export function resultOf(totals: Pick<BillTotals, 'net'>): { kind: 'gain' | 'cost'; amount: number } {
  return totals.net >= 0 ? { kind: 'gain', amount: totals.net } : { kind: 'cost', amount: -totals.net }
}
