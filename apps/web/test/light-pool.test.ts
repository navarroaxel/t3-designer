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

test('a source with a region is shown only to a camera inside it, and does not take the place of a lamp that lights the camera\'s own room', () => {
  const shut = (id: string, x: number): LightSource => ({ ...source(id, x), region: { x: [-1, 1], z: [-1, 1] } })
  // Behind a wall, but nearer than the lamp of the room the camera is in.
  const sources = [shut('bath-1', 0), shut('bath-2', 0.2), source('kitchen', 8)]
  assert.deepEqual(chooseSources(sources, [3, 0, 0], [], 2).filter(Boolean), ['kitchen'], 'outside the region the shut lights are not shown')
  assert.deepEqual([...chooseSources(sources, [0.5, 0, 0], [], 2)].sort(), ['bath-1', 'bath-2'], 'inside it they are, and nearest')
  assert.deepEqual(chooseSources(sources, [0, 0, 1.5], [], 3).filter(Boolean), ['kitchen'], 'the region holds z too')
})
