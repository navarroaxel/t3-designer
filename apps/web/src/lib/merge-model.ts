import { BufferGeometry, Group, Mesh, type Material, type MeshStandardMaterial, type Object3D } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/** What makes two materials the same to the eye: if every part of this is equal, one stands for both. A material with a texture is never the same as another. */
export function materialSignature(material: Material): string {
  const standard = material as MeshStandardMaterial
  if (!standard.isMeshStandardMaterial || standard.map || standard.normalMap || standard.roughnessMap || standard.metalnessMap || standard.emissiveMap) return material.uuid
  return [standard.color.getHexString(), standard.roughness.toFixed(3), standard.metalness.toFixed(3), standard.emissive.getHexString(), standard.emissiveIntensity.toFixed(3), standard.opacity.toFixed(3), standard.transparent, standard.side, standard.flatShading, standard.vertexColors].join('|')
}

/**
 * Merges what a static model is made of into as few meshes as it has materials. A model from Blender is a tree of small meshes, a few hundred for a complicated one, and each is a draw call, which
 * is what the walkthrough pays for most. The meshes that look the same, whose materials have the same colour, finish, glow and opacity (a Blender file gives each object a material of its own, even where
 * they are all the same black), are joined into one, in the model's own frame: each one's transform, from the
 * root down, is baked into its vertices. Only the position, the normal and the first uv are kept, so that meshes with different attributes can join; a group that still cannot join stays as it is.
 *
 * The root's own transform is not baked: it is the one a placed model is given. Models that move their parts (an animated one) must not be merged.
 */
export function mergeStaticModel(root: Object3D): Group {
  // A model that bends (skinned meshes) cannot be baked: it is kept as it is.
  let bends = false
  root.traverse(node => { if ((node as { isSkinnedMesh?: boolean }).isSkinnedMesh) bends = true })
  if (bends) { const kept = new Group(); kept.add(root.clone(true)); return kept }
  root.updateWorldMatrix(true, true)
  const inverse = root.matrixWorld.clone().invert()
  const groups = new Map<string, { material: Material; geometries: BufferGeometry[] }>(), loose: Mesh[] = []
  root.traverse(node => {
    const mesh = node as Mesh
    if (!mesh.isMesh || Array.isArray(mesh.material)) { if (mesh.isMesh) loose.push(mesh); return }
    const geometry = mesh.geometry.clone()
    geometry.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld))
    for (const name of Object.keys(geometry.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geometry.deleteAttribute(name)
    if (!geometry.attributes.normal) geometry.computeVertexNormals()
    const key = materialSignature(mesh.material), group = groups.get(key) ?? { material: mesh.material, geometries: [] }
    group.geometries.push(geometry)
    groups.set(key, group)
  })
  const merged = new Group()
  for (const { material, geometries } of groups.values()) {
    // Geometries join only when they have the same attributes and are all indexed or all not: the uv stays only if every one has it, and an indexed one among plain ones is opened up.
    if (!geometries.every(geometry => geometry.attributes.uv)) for (const geometry of geometries) geometry.deleteAttribute('uv')
    const indexed = geometries.filter(geometry => geometry.index).length
    const ready = indexed === 0 || indexed === geometries.length ? geometries : geometries.map(geometry => geometry.index ? geometry.toNonIndexed() : geometry)
    const joined = ready.length === 1 ? ready[0] : mergeGeometries(ready, false)
    if (joined) {
      const mesh = new Mesh(joined, material)
      mesh.castShadow = true; mesh.receiveShadow = true
      merged.add(mesh)
    } else {
      for (const geometry of geometries) { const mesh = new Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; merged.add(mesh) }
    }
  }
  for (const mesh of loose) merged.add(mesh.clone())
  return merged
}

/** The merged model of a loaded file, made once for each and shared by every placing of it. */
const CACHE = new WeakMap<Object3D, Group>()
/** True with `?nomerge` in the address: the tour draws the models as they were loaded, to see what the merging saves (with `?perf`). */
const unmerged = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('nomerge')
export function mergedModel(scene: Object3D): Group {
  if (unmerged()) { const whole = new Group(); whole.add(scene.clone(true)); return whole }
  let model = CACHE.get(scene)
  if (!model) { model = mergeStaticModel(scene); CACHE.set(scene, model) }
  return model
}
