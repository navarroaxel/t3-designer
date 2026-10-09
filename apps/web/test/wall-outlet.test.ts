import assert from 'node:assert/strict'
import test from 'node:test'
import { FLOOR_HEIGHT } from '../src/data/building-site.ts'
import { CUT_HEIGHT } from '../src/data/house-plan.ts'
import { furnishingsOn } from '../src/data/house-furnishings.ts'
import { outletBoxes, wallOutlet } from '../src/data/outlets.ts'

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)

test('a plate on a +v wall is the plain one moved to the wall and the centre', () => {
  const plain = outletBoxes('p', 0, 0, 3.2), placed = wallOutlet('p', '+v', 2, 5, 3.2)
  placed.forEach((box, i) => { near(box.u[0], 5 + plain[i].u[0]); near(box.v[0], 2 + plain[i].v[0]); assert.equal(box.roll, plain[i].roll) })
})

test('a plate on a -v wall is turned half way about the vertical: it sticks out toward -v and its slots mirror', () => {
  const plain = outletBoxes('p', 0, 0, 3.2), placed = wallOutlet('p', '-v', 8, 5, 3.2)
  placed.forEach((box, i) => { near(box.u[0], 5 - plain[i].u[1]); near(box.v[1], 8 - plain[i].v[0]); assert.ok(box.v[1] > box.v[0]) })
})

test('plates on walls that face along u turn about u, and a +u wall mirrors the slant', () => {
  const plain = outletBoxes('p', 0, 0, 3.2), minus = wallOutlet('p', '-u', 1, 4, 3.2), plus = wallOutlet('p', '+u', 1, 4, 3.2)
  minus.forEach((box, i) => { assert.equal(box.rollAboutU, true); near(box.u[1], 1 - plain[i].v[0]); assert.equal(box.roll, plain[i].roll) })
  plus.forEach((box, i) => { assert.equal(box.rollAboutU, true); near(box.u[0], 1 + plain[i].v[0]); assert.equal(box.roll, plain[i].roll ? -(plain[i].roll as number) : undefined) })
})

test('the cutaway draws wall fittings whole, and saws everything else that crosses the cut', () => {
  const cut = FLOOR_HEIGHT + CUT_HEIGHT, crossing = furnishingsOn('first').filter(p => p.y[0] < cut && p.y[1] > cut)
  assert.ok(crossing.some(p => p.hung), 'a TV or a plate crosses the cut')
  for (const piece of crossing.filter(p => !p.hung)) assert.ok(!/outlet|tv-|wallbox|cable-hole/.test(piece.id), `${piece.id} hangs on a wall`)
  assert.ok(crossing.some(p => !p.hung && !p.solid), 'a tall piece that is not solid, a wardrobe leaf, is sawn off too')
})
