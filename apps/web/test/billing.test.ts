import assert from 'node:assert/strict'
import test from 'node:test'
import { computeBills, DEFAULT_BILLING, sanitizeBilling, type BillingSettings } from '../src/lib/pv/billing.ts'

const flat = (value: number) => Array.from({ length: 12 }, () => value)
const settings = (patch: Partial<BillingSettings> = {}): BillingSettings => ({ tariff: 100, creditShare: .7, selfShare: .4, fixedCharge: 0, consumption: flat(500), ...patch })
const close = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} should be ${expected}`)

test('a month with less generation than consumption: the grid supplies the rest and pays 70% for the export', () => {
  const [january] = computeBills(flat(300), settings()).months
  close(january.selfUsed, 120)
  close(january.exported, 180)
  close(january.imported, 380)
  close(january.billWithout, 50_000)
  // 380 kWh imported at 100, less 180 kWh exported at 70: 38,000 - 12,600.
  close(january.billWith, 25_400)
  close(january.saved, 24_600)
})

test('energy is conserved: generation is what the house used plus what went to the grid', () => {
  for (const generation of [0, 100, 450, 2000]) {
    for (const month of computeBills(flat(generation), settings()).months) {
      close(month.selfUsed + month.exported, month.generation)
      close(month.selfUsed + month.imported, month.consumption)
    }
  }
})

test('the house never self-consumes more than it uses', () => {
  const [month] = computeBills(flat(2000), settings({ selfShare: 1, consumption: flat(300) })).months
  close(month.selfUsed, 300)
  close(month.imported, 0)
  close(month.exported, 1700)
})

test('a surplus credit carries into the next month, and the fixed charge is always paid', () => {
  const generation = [2000, 0, 0, ...flat(0).slice(3)]
  const { months, totals } = computeBills(generation, settings({ fixedCharge: 1000, consumption: flat(100) }))
  // January: the house uses 100 kWh as they are made and exports 1,900 (70 each): a credit of 133,000.
  close(months[0].billWith, 1000)
  close(months[0].creditLeft, 133_000)
  // February uses it: 100 kWh = 10,000 of energy charge, fully covered.
  close(months[1].billWith, 1000)
  close(months[1].creditLeft, 123_000)
  assert.ok(months.every(month => month.billWith >= 1000))
  // The credit left over at the end of the year is reported, not paid.
  close(totals.creditLeft, months[11].creditLeft)
  assert.ok(totals.creditLeft > 0)
})

test('without generation the bill is the tariff times the consumption plus the fixed charge', () => {
  const { totals } = computeBills(flat(0), settings({ fixedCharge: 500 }))
  close(totals.billWith, totals.billWithout)
  close(totals.billWithout, 12 * (500 * 100 + 500))
  close(totals.saved, 0)
  close(totals.coverage, 0)
})

test('the totals add up the months', () => {
  const { months, totals } = computeBills(Array.from({ length: 12 }, (_, month) => 200 + month * 40), settings())
  close(totals.saved, months.reduce((sum, month) => sum + month.saved, 0))
  close(totals.billWithout - totals.billWith, totals.saved)
  close(totals.generation, months.reduce((sum, month) => sum + month.generation, 0))
})

test('a higher share paid for the export lowers the bill, and the settings are clamped', () => {
  const low = computeBills(flat(700), settings({ creditShare: .3 })).totals.billWith
  const high = computeBills(flat(700), settings({ creditShare: .7 })).totals.billWith
  assert.ok(high < low)
  const clean = sanitizeBilling({ tariff: -5, creditShare: 4, selfShare: Number.NaN, fixedCharge: 'x', consumption: [1, 2] })
  assert.equal(clean.tariff, 0)
  assert.equal(clean.creditShare, 1)
  assert.equal(clean.selfShare, DEFAULT_BILLING.selfShare)
  assert.equal(clean.fixedCharge, DEFAULT_BILLING.fixedCharge)
  assert.deepEqual(clean.consumption, DEFAULT_BILLING.consumption)
  assert.deepEqual(sanitizeBilling(null), DEFAULT_BILLING)
  assert.equal(DEFAULT_BILLING.creditShare, .7)
})
