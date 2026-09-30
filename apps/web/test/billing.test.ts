import assert from 'node:assert/strict'
import test from 'node:test'
import { DAYS_IN_MONTH } from '../src/data/climate.ts'
import { computeBills, DEFAULT_BILLING, loadCurve, PROFILE_PRESETS, sanitizeBilling, type BillingInput, type BillingSettings } from '../src/lib/pv/billing.ts'

const flat = (value: number) => Array.from({ length: 12 }, () => value)
/** A simple sun: `watts` from 10:00 to 14:00 every day, hourly points, so 4 h x watts a day. */
const sun = (watts: number): BillingInput => {
  const curve = Array.from({ length: 24 }, (_, hour) => hour >= 10 && hour < 14 ? watts : 0)
  return { generation: DAYS_IN_MONTH.map(days => watts * 4 / 1000 * days), curves: flat(0).map(() => curve), stepMinutes: 60 }
}
const settings = (patch: Partial<BillingSettings> = {}): BillingSettings =>
  ({ tariff: 100, creditShare: .7, daytimeShare: .6, dayStart: 8, dayEnd: 20, fixedCharge: 0, consumption: flat(500), ...patch })
const close = (actual: number, expected: number, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be ${expected}`)

test('the load profile is two blocks that add up to the day', () => {
  const load = loadCurve(24, { daytimeShare: .75, dayStart: 8, dayEnd: 20 }, 60)
  assert.equal(load.length, 24)
  // 18 kWh in 12 daytime hours, 6 kWh in 12 night hours.
  close(load[10], 1500)
  close(load[2], 500)
  close(load.reduce((sum, watts) => sum + watts, 0) / 1000, 24)
  close(load[7], load[21])
  assert.equal(load.length, loadCurve(24, { daytimeShare: .5, dayStart: 6, dayEnd: 22 }, 20).length / 3)
})

test('what the house uses as it is made never reaches the meter: the sun set against the profile, moment by moment', () => {
  // 31 days: 310 kWh a month is 10 kWh a day; 60% by day is .5 kW over the 12 daytime hours.
  const [january] = computeBills(sun(2000), settings({ consumption: flat(310) })).months
  // The sun (2 kW) always exceeds that load, so the house uses .5 kW for 4 h = 2 kWh a day.
  close(january.selfUsed, 2 * 31)
  close(january.generation, 8 * 31)
  close(january.exported, 6 * 31)
  close(january.imported, 310 - 62)
  // 248 kWh taken at 100, less 186 kWh sent at 70.
  close(january.billWith, 248 * 100 - 186 * 70)
  close(january.selfPercent, 25)
})

test('the same consumption costs less when it happens by day', () => {
  const totalFor = (daytimeShare: number) => computeBills(sun(2000), settings({ daytimeShare, consumption: flat(600) })).totals
  const nightly = totalFor(0), even = totalFor(PROFILE_PRESETS.even), home = totalFor(PROFILE_PRESETS.homeByDay), allDay = totalFor(1)
  assert.ok(nightly.selfPercent < even.selfPercent && even.selfPercent < home.selfPercent && home.selfPercent < allDay.selfPercent)
  assert.ok(nightly.billWith > even.billWith && even.billWith > home.billWith && home.billWith > allDay.billWith)
  // Nothing is used at once when everything is consumed at night, and it can only be more with more day use.
  close(nightly.selfPercent, 0)
  close(nightly.billWithout, allDay.billWithout)
})

test('a small load is covered completely at the sun\'s hours and the energy still balances', () => {
  const { months } = computeBills(sun(5000), settings({ daytimeShare: 1, dayStart: 10, dayEnd: 14, consumption: flat(100) }))
  for (const month of months) {
    // 100 kWh in four hours a day is under the sun's 5 kW at every moment: all of it is made at home.
    close(month.selfUsed, 100, 1e-6)
    close(month.imported, 0)
    close(month.selfUsed + month.exported, month.generation)
    close(month.selfUsed + month.imported, month.consumption)
  }
})

test('a surplus credit carries into the next month, and the fixed charge is always paid', () => {
  const { months, totals } = computeBills(sun(2000), settings({ fixedCharge: 1000, consumption: flat(100) }))
  assert.ok(months.every(month => month.billWith >= 1000))
  assert.ok(months[0].creditLeft > 0)
  assert.ok(months[1].creditLeft > months[0].creditLeft, 'a surplus month piles up credit')
  // The credit left at the end of the year is reported, not paid.
  close(totals.creditLeft, months[11].creditLeft)
})

test('without generation the bill is the tariff times the consumption plus the fixed charge', () => {
  const none: BillingInput = { generation: flat(0), curves: flat(0).map(() => Array.from({ length: 24 }, () => 0)), stepMinutes: 60 }
  const { totals } = computeBills(none, settings({ fixedCharge: 500 }))
  close(totals.billWith, totals.billWithout)
  close(totals.billWithout, 12 * (500 * 100 + 500))
  close(totals.saved, 0)
  close(totals.coverage, 0)
  close(totals.selfPercent, 0)
})

test('the totals add up the months', () => {
  const { months, totals } = computeBills(sun(3000), settings())
  close(totals.saved, months.reduce((sum, month) => sum + month.saved, 0))
  close(totals.billWithout - totals.billWith, totals.saved)
  close(totals.generation, months.reduce((sum, month) => sum + month.generation, 0))
})

test('a higher share paid for the export lowers the bill, and the settings are clamped', () => {
  const low = computeBills(sun(3000), settings({ creditShare: .3 })).totals.billWith
  const high = computeBills(sun(3000), settings({ creditShare: .7 })).totals.billWith
  assert.ok(high < low)
  const clean = sanitizeBilling({ tariff: -5, creditShare: 4, daytimeShare: Number.NaN, dayStart: 15, dayEnd: 9, fixedCharge: 'x', consumption: [1, 2] })
  assert.equal(clean.tariff, 0)
  assert.equal(clean.creditShare, 1)
  assert.equal(clean.daytimeShare, DEFAULT_BILLING.daytimeShare)
  // A window that ends before it starts falls back to the default one.
  assert.deepEqual([clean.dayStart, clean.dayEnd], [DEFAULT_BILLING.dayStart, DEFAULT_BILLING.dayEnd])
  assert.equal(clean.fixedCharge, DEFAULT_BILLING.fixedCharge)
  assert.deepEqual(clean.consumption, DEFAULT_BILLING.consumption)
  assert.deepEqual(sanitizeBilling(null), DEFAULT_BILLING)
  assert.equal(DEFAULT_BILLING.creditShare, .7)
  assert.equal(sanitizeBilling({ dayStart: 6, dayEnd: 22 }).dayEnd, 22)
})
