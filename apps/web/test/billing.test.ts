import assert from 'node:assert/strict'
import test from 'node:test'
import { DAYS_IN_MONTH } from '../src/data/climate.ts'
import { annualReturn, computeBills, DEGRADATION_PER_YEAR, installCostFor, paybackOf, DEFAULT_BILLING, loadCurve, PROFILE_PRESETS, resultOf, sanitizeBilling, type BillingInput, type BillingSettings } from '../src/lib/pv/billing.ts'

const flat = (value: number) => Array.from({ length: 12 }, () => value)
/** A simple sun: `watts` from 10:00 to 14:00 every day, hourly points, so 4 h x watts a day. */
const sun = (watts: number): BillingInput => {
  const curve = Array.from({ length: 24 }, (_, hour) => hour >= 10 && hour < 14 ? watts : 0)
  return { generation: DAYS_IN_MONTH.map(days => watts * 4 / 1000 * days), curves: flat(0).map(() => curve), stepMinutes: 60 }
}
const settings = (patch: Partial<BillingSettings> = {}): BillingSettings =>
  ({ tariff: 100, creditShare: .7, daytimeShare: .6, dayStart: 8, dayEnd: 20, fixedCharge: 0, cashOut: 'off', consumption: flat(500), installCost: 12_500_000, costPerPanelLeftOut: 0, priceChange: 0, ...patch })
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

test('the surplus is the gain, paid each month or once at the year\'s end', () => {
  const base = settings({ fixedCharge: 1000, consumption: flat(100) })
  const off = computeBills(sun(2000), base)
  const monthly = computeBills(sun(2000), { ...base, cashOut: 'monthly' })
  const yearly = computeBills(sun(2000), { ...base, cashOut: 'yearly' })
  // The bills paid are the same while the surplus is only kept: the fixed charge each month.
  for (const result of [off, monthly, yearly]) assert.ok(result.months.every(month => month.billWith >= 1000))
  // Off: nothing is paid out, and the leftover is only reported.
  close(off.totals.gain, 0)
  assert.ok(off.totals.creditLeft > 0)
  // Monthly: every month pays out its own surplus, and nothing carries.
  assert.ok(monthly.months.every(month => month.gain > 0 && month.creditLeft === 0))
  close(monthly.totals.creditLeft, 0)
  // Yearly: nothing until December, when everything the year piled up is paid.
  assert.ok(yearly.months.slice(0, 11).every(month => month.gain === 0))
  assert.ok(yearly.months[11].gain > 0)
  close(yearly.totals.gain, off.totals.creditLeft)
  close(yearly.totals.creditLeft, 0)
  // Monthly pays a little more than yearly: no month's surplus is spent on a later charge.
  assert.ok(monthly.totals.gain >= yearly.totals.gain - 1e-6)
  // The saving never exceeds what the bills cost, and the gain is only what is beyond it.
  for (const { totals } of [off, monthly, yearly]) assert.ok(totals.saved <= totals.billWithout + 1e-6)
})

test('a month that is short of energy is paid from the credit before any gain', () => {
  // Surplus in the sunny months, none in the last ones: the year-end cash out is what is left after them.
  const uneven = sun(2000)
  uneven.generation = uneven.generation.map((kwh, month) => month < 6 ? kwh : 0)
  const off = computeBills(uneven, settings({ consumption: flat(300) }))
  const yearly = computeBills(uneven, settings({ consumption: flat(300), cashOut: 'yearly' }))
  close(yearly.totals.gain, off.totals.creditLeft)
  assert.ok(yearly.totals.billWith <= yearly.totals.billWithout)
})

test('there is no gain when the array does not cover the bills', () => {
  const small = computeBills(sun(300), settings({ consumption: flat(900), cashOut: 'yearly' })).totals
  close(small.gain, 0)
  assert.ok(small.saved > 0 && small.saved < small.billWithout)
  // With a fixed charge the saving stops at the energy the bills cost, and what is beyond is the gain.
  const big = computeBills(sun(5000), settings({ consumption: flat(100), fixedCharge: 1000, cashOut: 'yearly' })).totals
  close(big.saved, big.billWithout - 12 * 1000)
  assert.ok(big.gain > 0)
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
  const clean = sanitizeBilling({ tariff: -5, cashOut: 'weekly', creditShare: 4, daytimeShare: Number.NaN, dayStart: 15, dayEnd: 9, fixedCharge: 'x', consumption: [1, 2] })
  assert.equal(clean.tariff, 0)
  assert.equal(clean.cashOut, DEFAULT_BILLING.cashOut)
  assert.equal(sanitizeBilling({ cashOut: 'monthly' }).cashOut, 'monthly')
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

test('the bottom line is a gain, or the annual electricity cost in red when the company was paid more than it paid', () => {
  // A big array over a small consumption: the company pays more than it bills.
  const big = computeBills(sun(5000), settings({ consumption: flat(100), cashOut: 'yearly' })).totals
  close(big.net, big.gain - big.billWith)
  assert.deepEqual(resultOf(big), { kind: 'gain', amount: big.net })
  assert.ok(big.net > 0)
  // A small array over a large consumption: the year cost money, and the cost is what was paid to the company.
  const small = computeBills(sun(300), settings({ consumption: flat(900), cashOut: 'yearly' })).totals
  assert.ok(small.net < 0)
  const cost = resultOf(small)
  assert.equal(cost.kind, 'cost')
  close(cost.amount, small.billWith - small.gain)
  close(cost.amount, small.billWith, 1e-6) // nothing was cashed out
  // Without generation the cost is the whole bill; an exact tie is a gain of nothing.
  assert.deepEqual(resultOf({ net: 0 }), { kind: 'gain', amount: 0 })
  assert.equal(resultOf({ net: -5 }).amount, 5)
  // Paying in some months and being paid in others nets out over the year.
  const monthly = computeBills(sun(2000), settings({ consumption: flat(500), cashOut: 'monthly' })).totals
  close(monthly.net, monthly.gain - monthly.billWith)
})

test('the payback: years until the return repays the cost', () => {
  // A flat return of a quarter of the cost a year (no price change) repays it in a bit over four years, because of the ageing.
  const flatReturn = paybackOf(2_500_000, 10_000_000, 0)
  assert.ok(flatReturn.years! > 4 && flatReturn.years! < 4.2, `years ${flatReturn.years}`)
  close(flatReturn.returnPercent, 25)
  assert.equal(flatReturn.returns.length, 25)
  assert.equal(flatReturn.accumulated.length, 26)
  close(flatReturn.accumulated[0], -10_000_000)
  close(flatReturn.returns[1], 2_500_000 * (1 - DEGRADATION_PER_YEAR))
  // The accumulated return at the payback year is not negative any more, and the year before it is.
  const whole = Math.ceil(flatReturn.years!)
  assert.ok(flatReturn.accumulated[whole] >= 0 && flatReturn.accumulated[whole - 1] < 0)
  // A rising price shortens it, a falling one lengthens it.
  assert.ok(paybackOf(2_500_000, 10_000_000, .3).years! < flatReturn.years!)
  assert.ok(paybackOf(2_500_000, 10_000_000, -.05).years! > flatReturn.years!)
  // Too small a return never repays it within the years looked at.
  assert.equal(paybackOf(100_000, 10_000_000, 0).years, null)
  // Nothing to repay is paid back at once.
  assert.equal(paybackOf(1, 0, 0).years, 0)
})

test('the cost follows the panels installed only if each one saves something', () => {
  const s = settings({ installCost: 12_500_000, costPerPanelLeftOut: 0 })
  assert.equal(installCostFor(s, 6), 12_500_000)
  assert.equal(installCostFor({ ...s, costPerPanelLeftOut: 300_000 }, 6), 12_500_000 - 1_800_000)
  assert.equal(installCostFor({ ...s, costPerPanelLeftOut: 5_000_000 }, 6), 0)
  assert.equal(DEFAULT_BILLING.installCost, 12_500_000)
  assert.equal(sanitizeBilling({ installCost: -1 }).installCost, 0)
  assert.equal(sanitizeBilling({ priceChange: 99 }).priceChange, 5)
})

test('the annual return is the bill saved plus the gain', () => {
  const totals = computeBills(sun(5000), settings({ consumption: flat(100), cashOut: 'yearly' })).totals
  close(annualReturn(totals), totals.saved + totals.gain)
  assert.ok(annualReturn(totals) > totals.billWithout, 'a big array returns more than the bills cost')
})
