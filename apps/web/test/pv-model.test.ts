import assert from 'node:assert/strict'
import test from 'node:test'
import { CLIMATE, DAYS_IN_MONTH } from '../src/data/climate.ts'
import { PV_SYSTEM } from '../src/data/pv-system.ts'
import { ARRAY_WATTS, PANELS } from '../src/data/solar-array.ts'
import {
  anchoredClearFraction, dayOfYear, instantPower, middleOfMonth, seriesPower, simulateDay, simulateSky, simulateYear, skyIrradiance, sunAt,
} from '../src/lib/pv/model.ts'

const closeTo = (actual: number, expected: number, tolerance: number) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)

test('a series of panels with bypass diodes: the weakest panels limit it, up to the point they are skipped', () => {
  closeTo(seriesPower([1, 1, 1, 1, 1, 1, 1, 1]), 8, 1e-12)
  closeTo(seriesPower([.5, .5, .5, .5]), 2, 1e-12)
  // One dead panel is bypassed: the other seven keep working.
  closeTo(seriesPower([1, 1, 1, 1, 1, 1, 1, 0]), 7, 1e-12)
  // One half-shaded panel: bypassing it (7) beats dragging everyone to half current (8 x 0.5 = 4).
  closeTo(seriesPower([1, 1, 1, 1, 1, 1, 1, .5]), 7, 1e-12)
  // Two mildly shaded panels: carrying them (8 x 0.9) beats skipping them (6).
  closeTo(seriesPower([1, 1, 1, 1, 1, 1, .9, .9]), 7.2, 1e-12)
  assert.equal(seriesPower([]), 0)
  assert.equal(seriesPower([0, 0]), 0)
})

test('the two series of 8 cover every panel exactly once', () => {
  assert.equal(PV_SYSTEM.strings.length, 2)
  for (const ids of PV_SYSTEM.strings) assert.equal(ids.length, 8)
  const assigned = PV_SYSTEM.strings.flat().sort()
  assert.deepEqual(assigned, PANELS.map(panel => panel.id).sort())
})

test('dates: day of the year and the middle of each month', () => {
  assert.equal(dayOfYear('2026-01-01'), 1)
  assert.equal(dayOfYear('2026-12-31'), 365)
  assert.equal(dayOfYear('2024-12-31'), 366)
  assert.equal(middleOfMonth(0), '2026-01-15')
  assert.equal(middleOfMonth(11), '2026-12-15')
  assert.equal(DAYS_IN_MONTH.reduce((sum, days) => sum + days, 0), 365)
})

test('every month’s weather mix reproduces NASA’s all-sky irradiance', () => {
  for (let month = 0; month < 12; month++) {
    const { ratio, clearFraction } = anchoredClearFraction(month)
    // The model's clear sky must be at least as bright as NASA's all-sky mean, or the mix would need more than 100 % clear days.
    assert.ok(ratio < 1, `month ${month + 1}: ratio ${ratio}`)
    assert.ok(clearFraction > .5 && clearFraction < 1, `month ${month + 1}: clear fraction ${clearFraction}`)
    const day = simulateDay(middleOfMonth(month), 20)
    assert.ok(Math.abs(day.typical.ghiKwhM2 / CLIMATE.allSkyGhi[month] - 1) < .01, `month ${month + 1}: modelled ${day.typical.ghiKwhM2.toFixed(2)} against NASA ${CLIMATE.allSkyGhi[month]}`)
  }
})

test('an overcast sky has no beam and about a quarter of the clear-sky light', () => {
  const sun = sunAt('2026-12-21', 12 * 60)
  const clear = skyIrradiance(sun, '2026-12-21', 'clear'), overcast = skyIrradiance(sun, '2026-12-21', 'overcast')
  assert.equal(overcast.dni, 0)
  closeTo(overcast.ghi, clear.ghi * PV_SYSTEM.overcastTransmittance, 1e-9)
  closeTo(overcast.dhi, overcast.ghi, 1e-12)
})

test('the array makes no power at night and never more than the panels or the inverter allow', () => {
  const night = sunAt('2026-12-21', 2 * 60)
  assert.equal(instantPower(night, skyIrradiance(night, '2026-12-21', 'clear'), 20, null).acW, 0)
  const day = simulateSky('2026-12-21', 'clear', { shaded: false })
  assert.ok(Math.max(...day.acW) < ARRAY_WATTS, 'below the rated power of the panels')
  assert.ok(Math.max(...day.acW) <= PV_SYSTEM.inverter.maxAcW)
  assert.equal(day.acW[0], 0)
  assert.ok(day.dcKwh > day.acKwh, 'the inverter and losses take a share')
})

test('summer days give more than twice the energy of winter days', () => {
  const summer = simulateDay('2026-12-21'), winter = simulateDay('2026-06-21')
  assert.ok(summer.typical.acKwh > 2 * winter.typical.acKwh, `${summer.typical.acKwh} against ${winter.typical.acKwh}`)
  // Clear days, per kWp: about 7.5 kWh in December and 2.8 kWh in June at this latitude.
  const perKwp = (kwh: number) => kwh / (ARRAY_WATTS / 1000)
  assert.ok(perKwp(summer.clear.acKwh) > 6.5 && perKwp(summer.clear.acKwh) < 8.5, `${perKwp(summer.clear.acKwh)}`)
  assert.ok(perKwp(winter.clear.acKwh) > 2.2 && perKwp(winter.clear.acKwh) < 3.5, `${perKwp(winter.clear.acKwh)}`)
  // A clear day beats the mix, which beats a wholly overcast day.
  for (const day of [summer, winter]) assert.ok(day.clear.acKwh > day.typical.acKwh && day.typical.acKwh > day.overcast.acKwh)
})

test('shading can only cost energy, and only on clear days', () => {
  for (const date of ['2026-12-21', '2026-06-21', '2026-03-20', '2026-09-22']) {
    const day = simulateDay(date)
    assert.ok(day.clear.acKwh <= day.clearUnshaded.acKwh + 1e-9, `${date}: shading cannot add energy`)
    assert.ok(day.clearShadingLossPercent >= -1e-9 && day.clearShadingLossPercent < 15)
    assert.ok(day.typicalShadingLossPercent <= day.clearShadingLossPercent + 1e-9, 'overcast days lose nothing')
    assert.equal(day.overcast.shaded, false)
  }
})

test('a year at this site gives a plausible yield for panels nearly flat toward the north-west', () => {
  const year = simulateYear()
  assert.equal(year.months.length, 12)
  // Buenos Aires: about 1300 to 1600 kWh per kWp for well-oriented panels; nearly flat ones a little less.
  assert.ok(year.specificYield > 1250 && year.specificYield < 1600, `yield ${year.specificYield}`)
  closeTo(year.annualKwh, year.specificYield * ARRAY_WATTS / 1000, 1e-6)
  closeTo(year.annualKwh, year.months.reduce((sum, month) => sum + month.acKwh, 0), 1e-6)
  assert.ok(year.annualShadingLossPercent >= 0 && year.annualShadingLossPercent < 5, `shading ${year.annualShadingLossPercent}%`)
  assert.ok(year.peakKw > 6 && year.peakKw < ARRAY_WATTS / 1000)
  // December is the best month and June the worst.
  const kwh = year.months.map(month => month.acKwhPerDay)
  assert.equal(kwh.indexOf(Math.max(...kwh)), 11)
  assert.equal(kwh.indexOf(Math.min(...kwh)), 5)
})
