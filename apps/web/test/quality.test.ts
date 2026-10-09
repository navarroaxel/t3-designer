import assert from 'node:assert/strict'
import test from 'node:test'
import { QUALITY_FPS, QUALITY_LEVELS, stepQuality } from '../src/walkthrough/quality.ts'

test('the walkthrough steps its quality down when it is slow and back up when it is not, within the steps there are', () => {
  assert.equal(QUALITY_LEVELS.length, 3)
  assert.equal(stepQuality(0, 'decline'), 1); assert.equal(stepQuality(1, 'decline'), 2); assert.equal(stepQuality(2, 'decline'), 2, 'no lower than the last')
  assert.equal(stepQuality(2, 'incline'), 1); assert.equal(stepQuality(1, 'incline'), 0); assert.equal(stepQuality(0, 'incline'), 0, 'no higher than the first')
  assert.ok(QUALITY_FPS[0] < QUALITY_FPS[1] && QUALITY_FPS[0] >= 30, 'it steps down under 45 fps, not under 60')
})

test('each step asks less than the one before: fewer pixels, a simpler soft shadow, then none', () => {
  const pixels = (level: typeof QUALITY_LEVELS[number]) => Array.isArray(level.dpr) ? level.dpr[1] : level.dpr
  for (let index = 1; index < QUALITY_LEVELS.length; index++) assert.ok(pixels(QUALITY_LEVELS[index]) <= pixels(QUALITY_LEVELS[index - 1]), `step ${index} draws no more pixels`)
  assert.equal(QUALITY_LEVELS[0].ao, 'medium'); assert.equal(QUALITY_LEVELS[QUALITY_LEVELS.length - 1].ao, null, 'the last has no soft shadows')
})
