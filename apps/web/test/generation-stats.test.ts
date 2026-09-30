import assert from 'node:assert/strict'
import test from 'node:test'
import { ARRAY_WATTS } from '../src/data/solar-array.ts'
import { middleOfMonth, simulateDay, simulateYear } from '../src/lib/pv/model.ts'
import { cumulativeKwh, dayStats, monthValue, niceTicks, yearCsv } from '../src/lib/pv/stats.ts'

const kwp = ARRAY_WATTS / 1000

test('the day stats agree with the simulated day', () => {
  const day = simulateDay(middleOfMonth(11), 10)
  const stats = dayStats(day, kwp)
  assert.equal(stats.clearPeakKw, Math.max(...day.clear.acW) / 1000)
  assert.ok(stats.clearPeakMinutes > 11 * 60 && stats.clearPeakMinutes < 15 * 60, 'the peak is around solar noon')
  assert.ok(stats.typicalPeakKw <= stats.clearPeakKw)
  assert.ok(stats.inverterLoadPercent > 0 && stats.inverterLoadPercent <= 100)
  assert.ok(Math.abs(stats.specificYield * kwp - day.typical.acKwh) < 1e-9)
  const [first, last] = stats.productionWindow!
  assert.ok(first < 7 * 60 && last > 19 * 60, 'a December day produces from early morning to evening')
})

test('the cumulative energy ends at the day total', () => {
  const day = simulateDay(middleOfMonth(5), 10)
  const cumulative = cumulativeKwh(day.typical.acW, 10)
  assert.equal(cumulative.length, day.typical.acW.length)
  assert.ok(Math.abs(cumulative.at(-1)! - day.typical.acKwh) < 1e-9)
  assert.ok(cumulative.every((value, index) => index === 0 || value >= cumulative[index - 1]))
})

test('axis ticks are round, start at zero and cover the maximum', () => {
  assert.deepEqual(niceTicks(7.3, 4), [0, 2, 4, 6, 8])
  assert.deepEqual(niceTicks(2.4, 4), [0, 1, 2, 3])
  assert.deepEqual(niceTicks(0), [0])
  for (const max of [.3, 1, 12, 47, 380, 1420]) {
    const ticks = niceTicks(max)
    assert.equal(ticks[0], 0)
    assert.ok(ticks.at(-1)! >= max, `${ticks} should cover ${max}`)
  }
})

test('the year metrics and the CSV export', () => {
  const year = simulateYear(60)
  const january = year.months[0]
  assert.equal(monthValue(january, 'perDay', kwp), january.acKwhPerDay)
  assert.equal(monthValue(january, 'perMonth', kwp), january.acKwh)
  assert.ok(Math.abs(monthValue(january, 'perKwp', kwp) * kwp - january.acKwhPerDay) < 1e-9)
  const names = Array.from({ length: 12 }, (_, index) => `M${index + 1}`)
  const lines = yearCsv(year, kwp, names).trim().split('\n')
  assert.equal(lines.length, 13)
  assert.equal(lines[0], 'month,kwh_month,kwh_day,kwh_per_kwp_day,clear_days_percent,shading_loss_percent')
  assert.ok(lines.slice(1).every(line => line.split(',').length === 6 && !line.includes(';')))
  assert.ok(lines[1].startsWith('M1,'))
})

test('clock formats minutes of the day', async () => {
  const { clock } = await import('../src/lib/pv/stats.ts')
  assert.equal(clock(605), '10:05')
  assert.equal(clock(0), '00:00')
})

test('the efficiency factor scales the energy, and the default is the calibration', async () => {
  const { PV_SYSTEM } = await import('../src/data/pv-system.ts')
  const { clampFactor, FACTOR_RANGE, DEFAULT_FACTOR } = await import('../src/lib/pv/factor.ts')
  const date = middleOfMonth(0)
  const base = simulateDay(date, 20)
  assert.equal(DEFAULT_FACTOR, PV_SYSTEM.calibration.factor)
  assert.equal(simulateDay(date, 20, DEFAULT_FACTOR).typical.acKwh, base.typical.acKwh)
  // Without clipping the energy is proportional to the factor.
  const lower = simulateDay(date, 20, .6)
  assert.ok(Math.abs(lower.typical.acKwh / base.typical.acKwh - .6 / DEFAULT_FACTOR) < 1e-6)
  assert.ok(Math.abs(simulateYear(60, .6).annualKwh / simulateYear(60).annualKwh - .6 / DEFAULT_FACTOR) < 1e-6)
  assert.equal(clampFactor(.1), FACTOR_RANGE.min)
  assert.equal(clampFactor(9), FACTOR_RANGE.max)
  assert.equal(clampFactor(.834), .83)
  assert.equal(clampFactor(NaN), DEFAULT_FACTOR)
})
