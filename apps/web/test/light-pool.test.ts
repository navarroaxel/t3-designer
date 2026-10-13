import assert from 'node:assert/strict'
import test from 'node:test'
import { chooseSources, type LightSource } from '../src/lib/light-pool.ts'

const source = (id: string, x: number): LightSource => ({ id, position: [x, 0, 0], color: '#ffffff', intensity: 1, distance: 3 })

test('the pool shows the nearest sources to the camera, as many as it has slots', () => {
  const sources = [source('a', 0), source('b', 10), source('c', 20), source('d', 30), source('e', 40)]
  const slots = chooseSources(sources, [11, 0, 0], [], 3)
  assert.deepEqual([...slots].sort(), ['a', 'b', 'c'], 'the three nearest to x = 11')
  assert.equal(slots.length, 3)
  // Fewer sources than slots: the slots left over carry nothing.
  const few = chooseSources([source('a', 0)], [0, 0, 0], [], 3)
  assert.deepEqual(few.filter(Boolean), ['a']); assert.equal(few.length, 3)
})

test('a source that stays among the nearest keeps its slot, and only the ones that leave are replaced', () => {
  const sources = [source('a', 0), source('b', 10), source('c', 20), source('d', 30)]
  const first = chooseSources(sources, [5, 0, 0], [], 2)
  assert.deepEqual([...first].sort(), ['a', 'b'])
  // Walking on toward the others: b stays where it was, a gives its slot to c.
  const second = chooseSources(sources, [16, 0, 0], first, 2)
  assert.deepEqual([...second].sort(), ['b', 'c'])
  assert.equal(second[first.indexOf('b')], 'b', 'b did not move slots')
  assert.equal(second[first.indexOf('a')], 'c', 'c took the slot a left')
})

test('with nothing to light the pool is empty, and a source that is gone is let go', () => {
  assert.deepEqual(chooseSources([], [0, 0, 0], ['a', 'b'], 2), [null, null])
  assert.deepEqual(chooseSources([source('b', 0)], [0, 0, 0], ['a', 'b'], 2), [null, 'b'])
})

test('the sources of a group are shown together or not at all: a group that does not fit whole gives way to nearer singles', () => {
  const grouped = (id: string, x: number): LightSource => ({ ...source(id, x), group: 'box' })
  const sources = [grouped('g1', 0), grouped('g2', 1), grouped('g3', 2), source('s', 5), source('t', 6)]
  // Three slots: the group (nearest at x = 0) takes them all.
  assert.deepEqual([...chooseSources(sources, [0, 0, 0], [], 3)].sort(), ['g1', 'g2', 'g3'])
  // Two slots: the group does not fit, so the two nearest singles are shown, not two thirds of the group.
  assert.deepEqual([...chooseSources(sources, [0, 0, 0], [], 2)].sort(), ['s', 't'])
  // Four slots: the group and the nearest single.
  assert.deepEqual([...chooseSources(sources, [0, 0, 0], [], 4)].sort(), ['g1', 'g2', 'g3', 's'])
  // Far from the group, the singles come first, and the group is whole or out whatever the slots.
  for (const size of [1, 2, 3, 4, 5, 6]) { const shown = chooseSources(sources, [6, 0, 0], [], size).filter(id => id?.startsWith('g')); assert.ok(shown.length === 0 || shown.length === 3, `size ${size}`) }
})
