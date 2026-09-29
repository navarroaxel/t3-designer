import assert from 'node:assert/strict'
import test from 'node:test'
import { BUILDING_SITE } from '../src/data/building-site.ts'
import { seasonPresets } from '../src/lib/seasons.ts'

const byKey = (latitude: number) => Object.fromEntries(seasonPresets(latitude).map(item => [item.key, item.date]))

test('southern-hemisphere seasons: summer starts on 21 December, winter on 21 June', () => {
  assert.deepEqual(byKey(-34.65), {
    'solar.autumn': '03-20', 'solar.winter': '06-21', 'solar.spring': '09-22', 'solar.summer': '12-21',
  })
})

test('northern-hemisphere seasons keep the usual dates', () => {
  assert.deepEqual(byKey(48), {
    'solar.spring': '03-20', 'solar.summer': '06-21', 'solar.autumn': '09-22', 'solar.winter': '12-21',
  })
})

test('the site is in the southern hemisphere, so its December sun is the summer sun', () => {
  const dates = byKey(BUILDING_SITE.latitude)
  assert.equal(dates['solar.summer'], '12-21')
  assert.equal(dates['solar.winter'], '06-21')
})

test('every preset is a valid month-day and the four are in calendar order', () => {
  for (const latitude of [-34.65, 48]) {
    const dates = seasonPresets(latitude).map(item => item.date)
    assert.deepEqual(dates, [...dates].sort())
    assert.equal(new Set(seasonPresets(latitude).map(item => item.key)).size, 4)
  }
})
