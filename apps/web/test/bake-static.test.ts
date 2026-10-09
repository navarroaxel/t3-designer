import assert from 'node:assert/strict'
import test from 'node:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { bakeStatic } from '../src/lib/bake-static.ts'

const brick = () => new MeshStandardMaterial({ color: '#a5533b', roughness: .9 })

test('scenery that looks the same is baked into one mesh in the root\'s frame, the originals are hidden, and undo puts everything back', () => {
  const root = new Group(), inner = new Group()
  inner.position.set(5, 0, 0)
  const a = new Mesh(new BoxGeometry(1, 1, 1), brick()), b = new Mesh(new BoxGeometry(1, 1, 1), brick()), c = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#ffffff' }))
  b.position.set(0, 3, 0)
  for (const mesh of [a, b, c]) { mesh.castShadow = true; mesh.receiveShadow = true }
  inner.add(a, b); root.add(inner, c)
  root.position.set(100, 0, 0)  // the root's own place is not baked: the group goes inside it
  const baked = bakeStatic(root)
  assert.equal(baked.group.children.length, 2, 'the two bricks are one, the white one another')
  const brickMesh = baked.group.children.find(child => (child as Mesh).geometry.attributes.position.count === 48) as Mesh
  assert.ok(brickMesh && brickMesh.castShadow && brickMesh.receiveShadow, 'one geometry of both boxes, with shadows as before')
  brickMesh.geometry.computeBoundingBox()
  assert.deepEqual(brickMesh.geometry.boundingBox!.min.toArray().map(n => +n.toFixed(6)), [4.5, -.5, -.5], 'in the root\'s frame: the inner group\'s place is baked')
  assert.deepEqual(brickMesh.geometry.boundingBox!.max.toArray().map(n => +n.toFixed(6)), [5.5, 3.5, .5])
  assert.ok([a, b, c].every(mesh => !mesh.visible), 'the originals are hidden')
  baked.undo()
  assert.ok([a, b, c].every(mesh => mesh.visible), 'undone: the originals are back')
  assert.equal(baked.group.parent, null)
})

test('what cannot be joined is left alone: transparent meshes, ones with several materials, instanced ones and ones already hidden', () => {
  const root = new Group()
  const glass = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#99bbcc', transparent: true, opacity: .4 }))
  const multi = new Mesh(new BoxGeometry(1, 1, 1), [brick(), brick()])
  const hidden = new Mesh(new BoxGeometry(1, 1, 1), brick()); hidden.visible = false
  const plain = new Mesh(new BoxGeometry(1, 1, 1), brick()), twin = new Mesh(new BoxGeometry(1, 1, 1), brick())
  root.add(glass, multi, hidden, plain, twin)
  const baked = bakeStatic(root)
  assert.equal(baked.group.children.length, 1, 'only the two plain bricks')
  assert.ok(glass.visible && multi.visible && !hidden.visible, 'the rest as they were')
  assert.ok(!plain.visible && !twin.visible)
  // A second bake does not take its own result for scenery.
  root.add(baked.group)
  assert.equal(bakeStatic(root).group.children.length, 0, 'nothing left to join')
})

test('a material that does not write colour (the shadow-only ones) is never taken for a plain one of the same colour', () => {
  const root = new Group()
  const shadowOnly = new MeshStandardMaterial({ color: '#a5533b', roughness: .9 }); shadowOnly.colorWrite = false; shadowOnly.depthWrite = false
  root.add(new Mesh(new BoxGeometry(1, 1, 1), brick()), new Mesh(new BoxGeometry(1, 1, 1), shadowOnly))
  assert.equal(bakeStatic(root).group.children.length, 2, 'two meshes, each alone with its own material: nothing joined')
})
