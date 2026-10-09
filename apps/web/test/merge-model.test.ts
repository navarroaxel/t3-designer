import assert from 'node:assert/strict'
import test from 'node:test'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three'
import { materialSignature, mergeStaticModel } from '../src/lib/merge-model.ts'

test('a model\'s meshes that share a material become one mesh, in the model\'s own frame, and the ones with another stay apart', () => {
  const steel = new MeshStandardMaterial({ color: '#cccccc' }), black = new MeshStandardMaterial({ color: '#111111' })
  const root = new Group(), inner = new Group()
  inner.position.set(1, 0, 0)
  const a = new Mesh(new BoxGeometry(1, 1, 1), steel), b = new Mesh(new BoxGeometry(1, 1, 1), steel), c = new Mesh(new SphereGeometry(.5, 8, 6), black)
  b.position.set(0, 2, 0); c.position.set(0, 0, 3)
  inner.add(a, b); root.add(inner, c)
  // The root's own placement is not part of the model: it must not be baked in.
  root.position.set(10, 20, 30); root.scale.setScalar(2)
  const merged = mergeStaticModel(root)
  assert.equal(merged.children.length, 2, 'one mesh per material')
  const [boxes, sphere] = merged.children as Mesh[]
  assert.equal(boxes.material, steel); assert.equal(sphere.material, black)
  assert.equal(boxes.geometry.attributes.position.count, 2 * 24, 'the two boxes in one geometry')
  // The inner group's offset is baked in: the first box's centre is at x = 1, the second at (1, 2, 0), in the model's frame (the root's scale and place left out).
  boxes.geometry.computeBoundingBox()
  assert.deepEqual(boxes.geometry.boundingBox!.min.toArray().map(n => +n.toFixed(6)), [.5, -.5, -.5])
  assert.deepEqual(boxes.geometry.boundingBox!.max.toArray().map(n => +n.toFixed(6)), [1.5, 2.5, .5])
  sphere.geometry.computeBoundingBox()
  assert.ok(Math.abs(sphere.geometry.boundingBox!.min.z - 2.5) < 1e-6 && Math.abs(sphere.geometry.boundingBox!.max.z - 3.5) < 1e-6, 'the sphere is at z = 3')
  assert.ok(boxes.castShadow && boxes.receiveShadow, 'shadows as before')
})

test('meshes with different attributes still join: the uv stays only when every one has it, and an indexed geometry among plain ones is opened', () => {
  const material = new MeshStandardMaterial()
  const root = new Group(), plain = new BoxGeometry(1, 1, 1).toNonIndexed(), noUv = new BoxGeometry(1, 1, 1)
  noUv.deleteAttribute('uv')
  root.add(new Mesh(plain, material), new Mesh(noUv, material))
  const merged = mergeStaticModel(root)
  assert.equal(merged.children.length, 1)
  const geometry = (merged.children[0] as Mesh).geometry
  assert.ok(!geometry.attributes.uv, 'no uv: one had none')
  assert.equal(geometry.attributes.position.count, 72, 'two boxes of 36 vertices, opened')
})

test('a model with a skinned mesh is not merged: it is kept whole', () => {
  const root = new Group(), skinned = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial())
  ;(skinned as unknown as { isSkinnedMesh: boolean }).isSkinnedMesh = true
  root.add(skinned)
  const kept = mergeStaticModel(root)
  assert.equal(kept.children.length, 1); assert.equal(kept.children[0].children.length, 1, 'the model inside, as it was')
})

test('materials that look the same are one even when they are not the same object, as a Blender file has them; another colour or glow stays apart', () => {
  const root = new Group()
  const black = () => new MeshStandardMaterial({ color: '#111111', roughness: .4, metalness: .2 })
  root.add(new Mesh(new BoxGeometry(1, 1, 1), black()), new Mesh(new BoxGeometry(1, 1, 1), black()), new Mesh(new BoxGeometry(1, 1, 1), black()))
  root.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#111111', roughness: .4, metalness: .2, emissive: '#ffcc66', emissiveIntensity: 3 })))
  root.add(new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial({ color: '#eeeeee', roughness: .4, metalness: .2 })))
  const merged = mergeStaticModel(root)
  assert.equal(merged.children.length, 3, 'the three blacks are one; the glowing one and the white are apart')
  const counts = merged.children.map(child => (child as Mesh).geometry.attributes.position.count).sort((a, b) => b - a)
  assert.deepEqual(counts, [72, 24, 24])
  assert.notEqual(materialSignature(new MeshStandardMaterial({ color: '#111111' })), materialSignature(new MeshStandardMaterial({ color: '#111112' })))
})
