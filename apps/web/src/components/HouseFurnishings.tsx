import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { FLOOR_ELEVATION } from '../data/house-interior'
import { furnishingsOn } from '../data/house-furnishings'
import type { Floor } from '../data/house-plan'
import { FLOOR_TILING, GROUND_FLOOR_TILING } from '../data/house-plan'
import { FloorPatch, KitchenPiece } from './HouseShell'

/**
 * The cutaway's furniture and equipment, standing at full height in the viewer's frame: x = u, z = -v, y up from the floor. The plan's
 * heights are absolute, so the group sinks by the floor's level.
 */
/**
 * The picture a TV shows when it is on: the Prex wordmark, drawn here. It is an approximation, not the brand's own artwork.
 */
function prexTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 576
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 1024, 576)
  gradient.addColorStop(0, '#0b1a3a'); gradient.addColorStop(1, '#1b3a8a')
  context.fillStyle = gradient
  context.fillRect(0, 0, 1024, 576)
  context.fillStyle = '#ffffff'
  context.font = '800 230px "Helvetica Neue", Arial, sans-serif'
  context.textAlign = 'center'; context.textBaseline = 'middle'
  context.fillText('prex', 512, 292)
  context.fillStyle = '#2fe6a6'
  context.beginPath(); context.arc(842, 342, 22, 0, Math.PI * 2); context.fill()
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

/** `on` holds the switched-on devices by id: a TV is on at an opening of 1 or more half. */
export function HouseFurnishings({ floor, devices = {} }: { floor: Floor; devices?: Record<string, number> }) {
  const texture = useMemo(() => prexTexture(), [])
  return <group name="house-furnishings" position={[0, -FLOOR_ELEVATION[floor], 0]}>
    {furnishingsOn(floor).map(piece => {
      const screen = (devices[piece.id] ?? 0) >= .5
      if (piece.kitchen) return <KitchenPiece key={piece.id} box={piece.kitchen} />
      const size: [number, number, number] = [piece.u[1] - piece.u[0], piece.y[1] - piece.y[0], piece.v[1] - piece.v[0]]
      const ellipse = piece.shape === 'ellipse'
      const tv = piece.id === 'tv-main' || piece.id === 'tv-living'
      return <group key={piece.id}>
        <mesh position={[(piece.u[0] + piece.u[1]) / 2, (piece.y[0] + piece.y[1]) / 2, -(piece.v[0] + piece.v[1]) / 2]}
          scale={ellipse ? [size[0] / 2, 1, size[2] / 2] : undefined} castShadow receiveShadow>
          {ellipse ? <cylinderGeometry args={[1, piece.taper ?? 1, size[1], 40]} /> : <boxGeometry args={size} />}
          <meshStandardMaterial color={piece.color} roughness={piece.roughness ?? .6} metalness={piece.metalness ?? 0}
            transparent={piece.opacity !== undefined} opacity={piece.opacity ?? 1} depthWrite={piece.opacity === undefined} />
        </mesh>
        {tv && screen && <mesh position={[(piece.u[0] + piece.u[1]) / 2, (piece.y[0] + piece.y[1]) / 2, -(piece.v[1] + .002)]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[(piece.u[1] - piece.u[0]) * .97, (piece.y[1] - piece.y[0]) * .95]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>}
      </group>
    })}
  </group>
}

/** Raises the tiles a hair over the room floors the viewers draw, so the two never fight for the same pixels. */
const TILE_LIFT = .012
/** The laundry's tile runs on under the stair's landing in the plan; the visitor's floor ends at the laundry's back wall. */
const LAUNDRY_END = 7

/**
 * The floors' own finishes, from the plan: Saing planks in the bedrooms, hall and living, Navona tiles in the bathrooms and the laundry, each at its
 * real scale. The same patches the floor cutaway lays, here under the walkthrough and the interior view.
 */
export function HouseFloorTiles({ floor }: { floor: Floor }) {
  const zones = floor === 'ground' ? GROUND_FLOOR_TILING : FLOOR_TILING
  return <group name="house-floor-tiles" position={[0, -FLOOR_ELEVATION[floor] + TILE_LIFT, 0]}>
    {zones.flatMap(zone => zone.rects.map((rect, index) => {
      const clipped: [number, number, number, number] = zone.id === 'laundry' ? [rect[0], Math.min(rect[1], LAUNDRY_END), rect[2], rect[3]] : rect
      return <FloorPatch key={`${zone.id}-${index}`} zone={zone} rect={clipped} />
    }))}
  </group>
}
