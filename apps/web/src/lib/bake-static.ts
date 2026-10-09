import { BufferGeometry, Group, Mesh, type Material, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { materialSignature } from './merge-model.ts'

/**
 * Bakes what stands still. The scenery of the walkthrough (the neighbours, the street) is a few hundred meshes that never move, each its own draw call. `bakeStatic` joins the ones that look the same
 * (see `materialSignature`) into one mesh each, in the frame of `root`, and hides the originals; `undo` puts everything back. Left alone, because they cannot be joined without changing how they look or
 * what they are: meshes that are transparent, that have several materials or vertex colours, that are instanced or skinned, and anything that is not a plain mesh (lines, sprites).
 */
export type Baked = { group: Group; hidden: Mesh[]; undo: () => void }

export function bakeStatic(root: Object3D): Baked {
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  type Source = { material: Material; castShadow: boolean; receiveShadow: boolean; geometries: BufferGeometry[]; meshes: Mesh[] }
  const groups = new Map<string, Source>()
  root.traverse(node => {
    const mesh = node as Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean }
    if (!mesh.isMesh || mesh.isInstancedMesh || mesh.isSkinnedMesh || !mesh.visible || Array.isArray(mesh.material) || mesh.userData.baked) return
    const material = mesh.material as Material & { transparent?: boolean; vertexColors?: boolean; opacity?: number }
    if (material.transparent || (material.opacity ?? 1) < 1 || material.vertexColors) return
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld))
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name)
    if (!geometry.attributes.normal) geometry.computeVertexNormals()
    const key = `${materialSignature(material)}|${mesh.castShadow}|${mesh.receiveShadow}`
    const source = groups.get(key) ?? { material, castShadow: mesh.castShadow, receiveShadow: mesh.receiveShadow, geometries: [], meshes: [] }
    source.geometries.push(geometry); source.meshes.push(mesh)
    groups.set(key, source)
  })
  const group = new Group(), baked: Mesh[] = [], made: BufferGeometry[] = []
  group.userData.baked = true
  for (const source of groups.values()) {
    const { geometries } = source
    if (!geometries.every(geometry => geometry.attributes.uv)) for (const geometry of geometries) geometry.deleteAttribute('uv')
    const indexed = geometries.filter(geometry => geometry.index).length
    const ready = indexed === 0 || indexed === geometries.length ? geometries : geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry)
    const joined = ready.length === 1 ? ready[0] : mergeGeometries(ready, false)
    // A group that would not join is left as it was: its meshes stay visible.
    if (!joined) continue
    const mesh = new Mesh(joined, source.material)
    mesh.castShadow = source.castShadow; mesh.receiveShadow = source.receiveShadow
    mesh.userData.baked = true
    group.add(mesh); made.push(joined)
    baked.push(...source.meshes)
  }
  for (const mesh of baked) mesh.visible = false
  return { group, hidden: baked, undo: () => { for (const mesh of baked) mesh.visible = true; for (const geometry of made) geometry.dispose(); group.removeFromParent() } }
}
