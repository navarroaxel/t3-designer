import assert from 'node:assert/strict'
import test from 'node:test'
import { ARRAY_WATTS } from '../src/data/solar-array.ts'
import { middleOfMonth, simulateDay, simulateYear } from '../src/lib/pv/model.ts'
import { cumulativeKwh, dayStats, monthValue, niceTicks, panelStats, yearCsv } from '../src/lib/pv/stats.ts'

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

test('the day is split by string and by panel without losing or inventing energy', async () => {
  const { panelStats } = await import('../src/lib/pv/stats.ts')
  const { PANELS } = await import('../src/data/solar-array.ts')
  const day = simulateDay(middleOfMonth(11), 20)
  const { panels, strings } = panelStats(day)
  assert.equal(panels.length, PANELS.length)
  assert.equal(strings.length, 2)
  closeEnough(panels.reduce((sum, panel) => sum + panel.kwh, 0), day.typical.acKwh)
  closeEnough(strings.reduce((sum, item) => sum + item.kwh, 0), day.typical.acKwh)
  assert.ok(panels.every(panel => panel.string >= 0 && panel.kwh > 0 && panel.shadeLossPercent >= 0 && panel.shadeLossPercent < 100))
  // Eight panels per string, and every panel belongs to exactly one.
  assert.deepEqual(strings.map(item => item.panels), [8, 8])
  assert.equal(new Set(panels.map(panel => panel.id)).size, panels.length)
  // The per-panel light agrees with the array's mean.
  const mean = day.typical.panelPoaKwhM2.reduce((sum, value) => sum + value, 0) / PANELS.length
  closeEnough(mean, day.typical.poaKwhM2)
})

function closeEnough(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-6 * Math.max(1, expected), `${actual} should equal ${expected}`)
}

test('a shade window is a real stretch, never a single step', () => {
  for (const month of [0, 5, 11]) {
    const window = dayStats(simulateDay(middleOfMonth(month), 10), kwp).shadeWindow
    if (window) assert.ok(window[1] > window[0], `month ${month}: ${window}`)
  }
})

test('leaving panels out lowers the energy in proportion, frees the strings and never adds shade', async () => {
  const { PANELS } = await import('../src/data/solar-array.ts')
  const { installedKwp, panelCount, simulateSky } = await import('../src/lib/pv/model.ts')
  const { litFractions, sitePanelsFor } = await import('../src/lib/pv/shading.ts')
  const { sunAt } = await import('../src/lib/pv/model.ts')
  const ids = (rows: string[]) => new Set(PANELS.filter(panel => rows.includes(panel.row)).map(panel => panel.id))
  const tenPanels = ids(['front', 'back'])
  assert.equal(panelCount(null), 16)
  assert.equal(panelCount(tenPanels), 10)
  closeEnough(installedKwp(tenPanels), 10 * 0.62)
  const date = middleOfMonth(11)
  const full = simulateDay(date, 20), ten = simulateDay(date, 20, undefined, tenPanels)
  closeEnough(ten.kwp, 6.2)
  // Ten of sixteen panels give about ten sixteenths of the energy; the sky's light on each is unchanged.
  const ratio = ten.typical.acKwh / full.typical.acKwh
  assert.ok(ratio > .58 && ratio < .66, `ratio ${ratio}`)
  // A panel left out gets and yields nothing, and the split still adds up.
  const { panels, strings } = panelStats(ten, tenPanels)
  assert.equal(panels.filter(panel => panel.installed).length, 10)
  assert.ok(panels.filter(panel => !panel.installed).every(panel => panel.kwh === 0 && panel.irradiation === 0))
  closeEnough(panels.reduce((sum, panel) => sum + panel.kwh, 0), ten.typical.acKwh)
  assert.deepEqual(strings.map(item => item.panels).reduce((a, b) => a + b), 10)
  // Fewer panels cannot shade the rest more.
  const sun = sunAt('2026-06-21', 11 * 60)
  const litFull = litFractions(sun.direction as [number, number, number])
  const litTen = litFractions(sun.direction as [number, number, number], { panels: sitePanelsFor(tenPanels) })
  for (const id of tenPanels) assert.ok(litTen[id] >= litFull[id] - 1e-9, id)
  // No panel installed, no energy.
  assert.equal(simulateSky(date, 'clear', { installed: new Set() }).acKwh, 0)
})

test('with the back row out the strings are two of six, and the split still adds up', async () => {
  const { PANELS } = await import('../src/data/solar-array.ts')
  const twelve = new Set(PANELS.filter(panel => panel.row !== 'back').map(panel => panel.id))
  const day = simulateDay(middleOfMonth(11), 20, undefined, twelve)
  const { panels, strings } = panelStats(day, twelve)
  assert.deepEqual(strings.map(item => item.panels), [6, 6])
  closeEnough(strings[0].kwp, 3.72)
  closeEnough(strings.reduce((sum, item) => sum + item.kwh, 0), day.typical.acKwh)
  // Each row is a series of its own, so the strings yield almost the same.
  assert.ok(Math.abs(strings[0].kwh / strings[1].kwh - 1) < .03)
  assert.ok(panels.filter(panel => panel.installed).every(panel => panel.row === 'front' ? panel.string === 0 : panel.string === 1))
})
