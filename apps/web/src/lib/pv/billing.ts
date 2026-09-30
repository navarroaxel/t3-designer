/**
 * The electricity bill with and without the array, for a house with a two-way (net) meter.
 *
 * Each month the array's energy splits in two: the part the house uses as it is made (`selfShare`, never more
 * than the house consumes) and the rest, which goes to the grid. The grid pays the exported energy at a share
 * of the tariff (`creditShare`; the generation and distribution costs are not paid back, so it is a fraction)
 * as a credit on the bill. A credit larger than the month's energy charge carries over to the next month;
 * what is left at the end of the year is not counted. The fixed charge is always paid.
 *
 * The tariff is the owner's price per kWh; the fixed charge, the consumption and the self-consumed share are
 * the owner's to set, and their defaults are placeholders until the real bill is typed in.
 */
export type BillingSettings = {
  /** Price of a kWh taken from the grid, all charges and taxes included, in the local currency. */
  tariff: number
  /** What the grid pays for an exported kWh, as a share of the tariff. */
  creditShare: number
  /** Share of the array's energy that the house uses as it is made. */
  selfShare: number
  /** Fixed monthly charge of the bill. */
  fixedCharge: number
  /** The house's consumption in each month, kWh. */
  consumption: number[]
}

export const DEFAULT_BILLING: BillingSettings = { tariff: 160, creditShare: .7, selfShare: .35, fixedCharge: 0, consumption: Array.from({ length: 12 }, () => 500) }

export type BillMonth = {
  month: number
  generation: number
  consumption: number
  /** Generation the house used as it was made, kWh. */
  selfUsed: number
  exported: number
  imported: number
  billWithout: number
  billWith: number
  saved: number
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
  /** Generation over consumption, in percent. */
  coverage: number
  /** Credit still unused at the end of the year, in currency. */
  creditLeft: number
}

const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))

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
    selfShare: clamp(number(source.selfShare, DEFAULT_BILLING.selfShare), 0, 1),
    fixedCharge: clamp(number(source.fixedCharge, DEFAULT_BILLING.fixedCharge), 0, 10_000_000),
    consumption,
  }
}

/** `generation` is the array's energy in each of the 12 months, kWh. */
export function computeBills(generation: number[], settings: BillingSettings): { months: BillMonth[]; totals: BillTotals } {
  const { tariff, creditShare, selfShare, fixedCharge, consumption } = settings
  let carried = 0
  const months = generation.map((produced, month): BillMonth => {
    const used = consumption[month]
    const selfUsed = Math.min(produced * selfShare, used)
    const exported = produced - selfUsed
    const imported = used - selfUsed
    const charge = imported * tariff - exported * tariff * creditShare - carried
    const billWith = fixedCharge + Math.max(0, charge)
    carried = Math.max(0, -charge)
    const billWithout = used * tariff + fixedCharge
    return { month, generation: produced, consumption: used, selfUsed, exported, imported, billWithout, billWith, saved: billWithout - billWith, creditLeft: carried }
  })
  const sum = (pick: (month: BillMonth) => number) => months.reduce((total, month) => total + pick(month), 0)
  const totalConsumption = sum(month => month.consumption)
  return {
    months,
    totals: {
      generation: sum(month => month.generation), consumption: totalConsumption, exported: sum(month => month.exported), imported: sum(month => month.imported),
      billWithout: sum(month => month.billWithout), billWith: sum(month => month.billWith), saved: sum(month => month.saved),
      coverage: totalConsumption > 0 ? sum(month => month.generation) / totalConsumption * 100 : 0,
      creditLeft: carried,
    },
  }
}
