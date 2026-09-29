import assert from 'node:assert/strict'
import test from 'node:test'
import { BUILDING_SITE } from '../src/data/building-site.ts'
import { getLocalDate, getLocalMinutes, getSolarDay, getSolarPosition, localDateTimeToDate, resolveLocalDateTime } from '../src/lib/solar.ts'

const SITE = { latitude: BUILDING_SITE.latitude, longitude: BUILDING_SITE.longitude }
const closeTo = (actual: number, expected: number, tolerance: number) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} should be within ${tolerance} of ${expected}`)

test('solar direction agrees with the published NREL SPA example', () => {
  // Independent reference: https://midcdmz.nlr.gov/spa/spa_tester.c
  // The reference includes atmospheric refraction and observer elevation;
  // this geometric NOAA model intentionally omits them (comparison tolerance 0.1°).
  const position = getSolarPosition(new Date('2003-10-17T19:30:30Z'), 39.742476, -105.1786)
  closeTo(position.azimuth, 194.340241, 0.1)
  closeTo(position.altitude, 90 - 50.111622, 0.1)
  closeTo(Math.hypot(...position.direction), 1, 1e-12)
  assert.ok(position.direction[0] < 0, 'afternoon sunlight comes from west')
  assert.ok(position.direction[2] > 0, 'the sun is south of this northern observer')
})

test('sunrise and sunset agree with the independent NREL example within two minutes', () => {
  const day = getSolarDay('2003-10-17', 39.742476, -105.1786, 'Etc/GMT+7')
  assert.ok(day.sunrise && day.sunset)
  closeTo(day.sunrise.getTime(), new Date('2003-10-17T13:12:43Z').getTime(), 120_000)
  closeTo(day.sunset.getTime(), new Date('2003-10-18T00:20:19Z').getTime(), 120_000)
})

test('Buenos Aires clock selections resolve independently of the host timezone', () => {
  // Argentina has used UTC-3 all year since 2009.
  assert.equal(localDateTimeToDate('2026-01-15', 12 * 60).toISOString(), '2026-01-15T15:00:00.000Z')
  assert.equal(localDateTimeToDate('2026-07-15', 12 * 60).toISOString(), '2026-07-15T15:00:00.000Z')
  assert.equal(getLocalDate(new Date('2026-07-15T02:30:00Z')), '2026-07-14')
  assert.equal(getLocalMinutes(new Date('2026-07-15T02:30:00Z')), 23 * 60 + 30)
  assert.equal(localDateTimeToDate('2024-02-29', 0).toISOString(), '2024-02-29T03:00:00.000Z')
})

test('there are no clock-change gaps or repeated times', () => {
  for (const date of ['2026-03-29', '2026-10-25', '2026-09-27']) {
    for (const minutes of [0, 119, 150, 180, 1439]) {
      const resolution = resolveLocalDateTime(date, minutes)
      assert.equal(resolution.status, 'exact', `${date} ${minutes}`)
      assert.equal(resolution.instants.length, 1)
    }
  }
})

test('every daily path has 24 hours of samples', () => {
  for (const date of ['2026-03-29', '2026-10-25', '2026-12-21']) {
    assert.equal(getSolarDay(date, SITE.latitude, SITE.longitude).path.length, 24 * 6, date)
  }
})

test('Buenos Aires seasons: the sun is always north at noon and highest in December', () => {
  const summer = getSolarDay('2026-12-21', SITE.latitude, SITE.longitude)
  const winter = getSolarDay('2026-06-21', SITE.latitude, SITE.longitude)
  const summerNoon = getSolarPosition(summer.solarNoon, SITE.latitude, SITE.longitude)
  const winterNoon = getSolarPosition(winter.solarNoon, SITE.latitude, SITE.longitude)
  closeTo(summerNoon.altitude, 90 - 34.65 + 23.44, 0.15)
  closeTo(winterNoon.altitude, 90 - 34.65 - 23.44, 0.15)
  closeTo(summerNoon.azimuth, 0, 0.01)
  closeTo(winterNoon.azimuth, 0, 0.01)
  assert.ok(summerNoon.direction[2] < 0, 'sunlight comes from the north (negative z = north)')
  assert.ok(summer.daylightMinutes > 850 && summer.daylightMinutes < 890)
  assert.ok(winter.daylightMinutes > 570 && winter.daylightMinutes < 610)
  assert.ok(summer.sunrise && summer.sunset && winter.sunrise && winter.sunset)
  const morning = getSolarPosition(localDateTimeToDate('2026-12-21', 9 * 60), SITE.latitude, SITE.longitude)
  const evening = getSolarPosition(localDateTimeToDate('2026-12-21', 18 * 60), SITE.latitude, SITE.longitude)
  const night = getSolarPosition(localDateTimeToDate('2026-12-21', 2 * 60), SITE.latitude, SITE.longitude)
  assert.ok(morning.direction[0] > 0 && evening.direction[0] < 0)
  assert.equal(night.isDaylight, false)
  assert.ok(night.direction[1] < 0)
})

test('polar days and nights have no fabricated rise or set events', () => {
  const summer = getSolarDay('2026-06-21', 80, 0, 'UTC')
  const winter = getSolarDay('2026-12-21', 80, 0, 'UTC')
  assert.equal(summer.sunrise, null)
  assert.equal(summer.sunset, null)
  assert.equal(summer.daylightMinutes, 1440)
  assert.equal(winter.sunrise, null)
  assert.equal(winter.sunset, null)
  assert.equal(winter.daylightMinutes, 0)
})

test('the last supported calendar day can compute its complete local path', () => {
  const day = getSolarDay('2100-12-31', SITE.latitude, SITE.longitude)
  assert.equal(day.path.length, 144)
  assert.equal(getLocalDate(day.path.at(-1)!.date), '2100-12-31')
  assert.ok(day.sunrise && day.sunset)
})

test('invalid dates, clock values and coordinates never yield misleading NaN geometry', () => {
  assert.throws(() => localDateTimeToDate('2026-02-30', 720), /Invalid calendar date/)
  assert.throws(() => localDateTimeToDate('2026-02-15', 1440), /Clock minutes/)
  assert.throws(() => localDateTimeToDate('2026-02-15', 2.5), /Clock minutes/)
  assert.throws(() => getSolarPosition(new Date('invalid'), 48, -4), /Invalid date/)
  assert.throws(() => getSolarPosition(new Date(), 91, -4), /Latitude/)
  assert.throws(() => getSolarPosition(new Date(), 48, NaN), /Latitude/)
})
