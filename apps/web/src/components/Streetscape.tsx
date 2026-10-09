import { useEffect, useMemo } from 'react'
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { houseToSite } from '../data/frame'
import { SIDEWALK_TOP, STREET_POLE, STREET_RECTS, STREET_TREE, siteBox, streetPoles, streetTrees, type StreetRect } from '../data/streetscape'

/** One cement tile with its joints, repeated: the sidewalk's square tiles at real scale (40 cm). */
function tileTexture(color: string) {
  const size = 64, canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')!
  context.fillStyle = color
  context.fillRect(0, 0, size, size)
  context.fillStyle = 'rgba(70,70,64,.35)'
  context.fillRect(0, 0, size, 2); context.fillRect(0, 0, 2, size)
  const texture = new CanvasTexture(canvas)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.colorSpace = SRGBColorSpace
  return texture
}

function Slab({ rect, tile }: { rect: StreetRect; tile: number }) {
  const { position, scale, angle } = useMemo(() => siteBox(rect.u, rect.v, rect.y), [rect])
  const map = useMemo(() => {
    if (!rect.tiles) return null
    const texture = tileTexture(rect.color)
    texture.repeat.set(scale[0] / tile, scale[2] / tile)
    return texture
  }, [rect, scale, tile])
  useEffect(() => () => map?.dispose(), [map])
  return <mesh position={position} rotation={[0, angle, 0]} scale={scale} receiveShadow>
    <boxGeometry />
    <meshStandardMaterial color={map ? '#ffffff' : rect.color} map={map} roughness={.9} />
  </mesh>
}

/** The street's sidewalks, curbs, grass strips, plane trees and light poles (the owner's Street View photo): context only, nothing the sun study counts. */
export function Streetscape() {
  const trees = useMemo(() => streetTrees().map(at => houseToSite(at.u, at.v)), [])
  const poles = useMemo(() => streetPoles().map(at => houseToSite(at.u, at.v)), [])
  return <group name="streetscape">
    {STREET_RECTS.map(rect => <Slab key={rect.id} rect={rect} tile={.4} />)}
    {trees.map(([x, z], index) => <group key={`tree-${index}`} position={[x, SIDEWALK_TOP, z]}>
      <mesh position={[0, STREET_TREE.height / 2, 0]}><cylinderGeometry args={[STREET_TREE.trunk * .8, STREET_TREE.trunk * 1.2, STREET_TREE.height, 8]} /><meshStandardMaterial color="#6b5f52" roughness={1} /></mesh>
      <mesh position={[0, STREET_TREE.height + STREET_TREE.crown * .2, 0]}><icosahedronGeometry args={[STREET_TREE.crown, 1]} /><meshStandardMaterial color="#869a62" roughness={1} flatShading /></mesh>
      <mesh position={[STREET_TREE.crown * .6, STREET_TREE.height - .2, STREET_TREE.crown * .2]}><icosahedronGeometry args={[STREET_TREE.crown * .7, 1]} /><meshStandardMaterial color="#7d9259" roughness={1} flatShading /></mesh>
    </group>)}
    {poles.map(([x, z], index) => <mesh key={`pole-${index}`} position={[x, SIDEWALK_TOP + STREET_POLE.height / 2, z]}>
      <cylinderGeometry args={[.07, .1, STREET_POLE.height, 8]} /><meshStandardMaterial color="#77776f" roughness={.8} />
    </mesh>)}
  </group>
}
