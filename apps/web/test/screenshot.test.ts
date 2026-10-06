import assert from 'node:assert/strict'
import test from 'node:test'
import { screenshotName } from '../src/walkthrough/screenshot.ts'

test('a screenshot is named after the local date and time of the shot, sortable and padded', () => {
  assert.equal(screenshotName(new Date(2026, 9, 6, 15, 30, 45)), 'tapalque-walkthrough-20261006-153045.png')
  assert.equal(screenshotName(new Date(2026, 0, 2, 3, 4, 5)), 'tapalque-walkthrough-20260102-030405.png')
})
