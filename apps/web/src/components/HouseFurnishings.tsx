import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { RoundedBox, useGLTF } from '@react-three/drei'
import { edgeRadius } from '../lib/rounding'
import { CanvasTexture, SRGBColorSpace, type Object3D } from 'three'
import { FLOOR_ELEVATION } from '../data/house-interior'
import type { Furnishing } from '../data/house-furnishings'
import { armReach, furnishingsOn, isTvMounted } from '../data/house-furnishings'
import { tvMountLinks } from '../data/tv-mount'
import type { Floor } from '../data/house-plan'
import { FLOOR_TILING, GROUND_FLOOR_TILING } from '../data/house-plan'
import { FloorPatch, KitchenPiece } from './HouseShell'

/**
 * The cutaway's furniture and equipment, standing at full height in the viewer's frame: x = u, z = -v, y up from the floor. The plan's
 * heights are absolute, so the group sinks by the floor's level.
 */
/**
 * The picture a TV shows when it is on: a Plex-style splash, drawn here (a dark screen, the amber chevron and the wordmark). It is an
 * approximation, not the brand's own artwork.
 */
function plexTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024; canvas.height = 576
  const context = canvas.getContext('2d')!
  context.fillStyle = '#1f2326'
  context.fillRect(0, 0, 1024, 576)
  // The chevron: a thick arrow pointing right, in Plex amber.
  const amber = '#e5a00d'
  context.fillStyle = amber
  context.beginPath()
  context.moveTo(250, 170); context.lineTo(330, 170); context.lineTo(405, 288); context.lineTo(330, 406); context.lineTo(250, 406); context.lineTo(325, 288)
  context.closePath(); context.fill()
  context.fillStyle = '#ffffff'
  context.font = '800 150px "Helvetica Neue", Arial, sans-serif'
  context.textAlign = 'left'; context.textBaseline = 'middle'
  context.fillText('PLEX', 450, 292)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

type Piece = { u: [number, number]; v: [number, number]; y: [number, number]; color: string; opacity?: number; metalness?: number }
const WHITE = '#f1f3f5', GLASS = '#dfe9ee'

/** A box placed relative to a pivot (u, v) in the viewer's frame, x = u, z = -v. */
function Part({ box, at = [0, 0] }: { box: Piece; at?: [number, number] }) {
  return <mesh position={[(box.u[0] + box.u[1]) / 2 - at[0], (box.y[0] + box.y[1]) / 2, -((box.v[0] + box.v[1]) / 2 - at[1])]} castShadow receiveShadow>
    <boxGeometry args={[box.u[1] - box.u[0], box.y[1] - box.y[0], box.v[1] - box.v[0]]} />
    <meshStandardMaterial color={box.color} roughness={.5} metalness={box.metalness ?? 0} transparent={box.opacity !== undefined} opacity={box.opacity ?? 1} depthWrite={box.opacity === undefined} />
  </mesh>
}

/**
 * The fridge with its two doors open, as in the maker's picture: a hollow white cabinet with its shelves, the freezer's ice maker and the
 * vegetable drawer, and the two doors swung out on their right-hand hinges, each with its bins. It stands where the closed fridge stood.
 */
function OpenFridge({ body, lowerDoor, upperDoor, extras }: { body: Furnishing; lowerDoor: Furnishing; upperDoor: Furnishing; extras: Furnishing[] }) {
  const [u0, u1] = body.u, [, backV] = body.v, [y0, y1] = body.y
  const front = body.v[0], t = .035, inner: [number, number] = [u0 + t, u1 - t]
  const split = upperDoor.y[0] - .005
  const depth: [number, number] = [front, backV - t]
  const shelf = (y: number): Piece => ({ u: inner, v: [front + .03, backV - t - .02], y: [y, y + .012], color: GLASS, opacity: .55 })
  const bin = (y: number): Piece => ({ u: [u0 + .03, u1 - .03], v: [lowerDoor.v[1], lowerDoor.v[1] + .09], y: [y, y + .08], color: GLASS, opacity: .6 })
  // The hinge is on the right, seen from the front: the higher u. The doors swing out toward the aisle, 100 degrees.
  const pivot: [number, number] = [u1, lowerDoor.v[0]]
  const doorAngle = Math.PI * 100 / 180
  return <group name="fridge-open">
    {[{ u: [u0, u0 + t], v: depth, y: [y0, y1] }, { u: [u1 - t, u1], v: depth, y: [y0, y1] }, { u: [u0, u1], v: [backV - t, backV], y: [y0, y1] }, { u: [u0, u1], v: depth, y: [y1 - t, y1] }, { u: [u0, u1], v: depth, y: [y0, y0 + t] }]
      .map((box, index) => <Part key={index} box={{ ...box, u: box.u as [number, number], v: box.v as [number, number], y: box.y as [number, number], color: index === 4 ? '#6f7377' : WHITE }} />)}
    {[0, 1].map(index => <Part key={`skin-${index}`} box={{ u: index ? [u1 - .004, u1] : [u0, u0 + .004], v: depth, y: [y0, y1], color: body.color }} />)}
    <Part box={{ u: inner, v: depth, y: [split - .02, split + .01], color: WHITE }} />
    {[split - .14, split - .44, split - .74, split - 1.04].map(y => <Part key={y} box={shelf(y)} />)}
    <Part box={{ u: [inner[0] + .03, inner[1] - .03], v: [front + .02, backV - t - .05], y: [y0 + t + .01, y0 + .3], color: GLASS, opacity: .5 }} />
    <Part box={{ ...shelf(split + .17), color: '#cfe3f7', opacity: .75 }} />
    <Part box={{ u: [inner[0], inner[1]], v: [front + .03, front + .05], y: [split + .165, split + .182], color: '#5aa7ff' }} />
    <Part box={{ u: [inner[0] + .02, inner[0] + .2], v: [front + .05, front + .3], y: [split + .02, split + .15], color: GLASS, opacity: .6 }} />
    {/* The two round fans on the back wall, lit blue, one in each compartment. */}
    {[y1 - .1, split - .13].map(y => <mesh key={y} position={[(u0 + u1) / 2, y, -(backV - t - .004)]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[.055, .055, .008, 32]} /><meshStandardMaterial color="#3d8bff" emissive="#2a6fe0" emissiveIntensity={.6} roughness={.3} />
    </mesh>)}
    <group position={[pivot[0], 0, -pivot[1]]} rotation={[0, doorAngle, 0]}>
      <Part box={lowerDoor} at={pivot} />
      {extras.filter(piece => piece.id !== lowerDoor.id && piece.id !== upperDoor.id).map(piece => <Part key={piece.id} box={piece} at={pivot} />)}
      {[y0 + .2, y0 + .62, y0 + .95].map(y => <Part key={y} box={bin(y)} at={pivot} />)}
      <Part box={upperDoor} at={pivot} />
      {[split + .05, split + .24].map(y => <Part key={y} box={bin(y)} at={pivot} />)}
    </group>
  </group>
}

/** `on` holds the switched-on devices by id: a TV is on at an opening of 1 or more half. */
class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

/** A Blender model standing on the floor at the middle of the piece's box, its front (+z in the file) toward the room (-z here, the wall's normal) unless `turn` says otherwise. */
function PlacedModel({ url, position, turn = Math.PI }: { url: string; position: [number, number, number]; turn?: number }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((node: Object3D) => { node.castShadow = true; node.receiveShadow = true })
    return copy
  }, [scene])
  return <primitive object={model} position={position} rotation={[0, turn, 0]} dispose={null} />
}

/**
 * Sawn off at `cut` like the cutaway's walls: a solid piece taller than the cut is cut to it, and anything that starts at or above it is not drawn. What hangs on a wall
 * (a TV, an outlet) is drawn whole, as long as it begins below the cut.
 */
function clipToCut(piece: Furnishing, cut: number): Furnishing | null {
  if (piece.y[0] >= cut) return null
  if (!piece.solid || piece.y[1] <= cut) return piece
  return { ...piece, y: [piece.y[0], cut], ...(piece.kitchen ? { kitchen: { ...piece.kitchen, y: [piece.kitchen.y[0], cut] as [number, number] } } : {}) }
}

export function HouseFurnishings({ floor, devices = {}, absolute = false, cut }: {
  floor: Floor; devices?: Record<string, number>
  /** The heights are the plan's own, from the ground floor's level: for a parent that already works in that frame (the floor cutaway). */
  absolute?: boolean
  /** Saw the furniture off at this height, as the cutaway does its walls. */
  cut?: number
}) {
  const texture = useMemo(() => plexTexture(), [])
  const pieces = furnishingsOn(floor)
  // What moves with the arm: the TV, its picture, and the mount's head and rails.
  const pieceReach = (id: string) => /^tv-(main|living)$|^tv-(main|living)-mount-(head|rail-)/.test(id) ? armReach(devices, `tv-${id.split('-')[1]}`) : 0
  const fridge = pieces.find(piece => piece.id === 'kitchen-fridge')
  const fridgeOpen = (devices['kitchen-fridge'] ?? 0) >= .5 && !!fridge
  // Closed, the fridge is the Blender model (feet included, so it starts 4 cm below the body), unless the cut would saw it: then its boxes are drawn, cut like the rest.
  const fridgeModel = !!fridge && !fridgeOpen && (cut === undefined || cut >= fridge.y[1])
  return <group name="house-furnishings" position={[0, absolute ? 0 : -FLOOR_ELEVATION[floor], 0]}>
    {fridgeModel && <ModelBoundary fallback={null}><Suspense fallback={null}>
      <PlacedModel url="/models/house/fridge.glb" turn={0} position={[(fridge.u[0] + fridge.u[1]) / 2, fridge.y[0] - .04, -(fridge.v[1] - .334)]} />
    </Suspense></ModelBoundary>}
    {fridgeOpen && <OpenFridge body={pieces.find(piece => piece.id === 'kitchen-fridge')!} lowerDoor={pieces.find(piece => piece.id === 'kitchen-fridge-door')!} upperDoor={pieces.find(piece => piece.id === 'kitchen-fridge-freezer-door')!}
      extras={pieces.filter(piece => ['kitchen-fridge-handle', 'kitchen-fridge-dispenser'].includes(piece.id))} />}
    {(['main', 'living'] as const).flatMap(name => {
      const reach = armReach(devices, `tv-${name}`), plate = pieces.find(piece => piece.id === `tv-${name}-mount-wall-plate`), tvBody = pieces.find(piece => piece.id === `tv-${name}`)
      return reach > 0 && plate && tvBody ? tvMountLinks(name, plate.v[0], (plate.u[0] + plate.u[1]) / 2, (plate.y[0] + plate.y[1]) / 2, reach) : []
    }).map(link => <mesh key={link.id} rotation={[0, -link.yaw, 0]} position={[(link.u[0] + link.u[1]) / 2, (link.y[0] + link.y[1]) / 2, -(link.v[0] + link.v[1]) / 2]} castShadow>
      <boxGeometry args={[link.u[1] - link.u[0], link.y[1] - link.y[0], link.v[1] - link.v[0]]} /><meshStandardMaterial color={link.color} roughness={.5} metalness={link.metalness ?? 0} />
    </mesh>)}
    {pieces.map(source => {
      const piece = cut === undefined ? source : clipToCut(source, cut)
      if (!piece) return null
      if ((fridgeOpen || fridgeModel) && piece.id.startsWith('kitchen-fridge')) return null
      // The folded links give way to the arm drawn below when the mount reaches out.
      if (/^tv-(main|living)-mount-link-/.test(piece.id) && armReach(devices, `tv-${piece.id.split('-')[1]}`) > 0) return null
      const screen = (devices[piece.id] ?? 0) >= .5
      if (piece.kitchen) return <KitchenPiece key={piece.id} box={piece.kitchen} />
      const size: [number, number, number] = [piece.u[1] - piece.u[0], piece.y[1] - piece.y[0], piece.v[1] - piece.v[0]]
      const ellipse = piece.shape === 'ellipse'
      const tv = piece.id === 'tv-main' || piece.id === 'tv-living'
      // X takes a TV off its mount: the mount stays on the wall, the TV (and its picture) is gone.
      if (tv && !isTvMounted(devices, piece.id)) return null
      return <group key={piece.id} position={[0, 0, -pieceReach(piece.id)]}>
        {piece.model ? <ModelBoundary fallback={<mesh position={[(piece.u[0] + piece.u[1]) / 2, (piece.y[0] + piece.y[1]) / 2, -(piece.v[0] + piece.v[1]) / 2]}><boxGeometry args={size} /><meshStandardMaterial color={piece.color} /></mesh>}>
          <Suspense fallback={null}><PlacedModel url={piece.model} position={[(piece.u[0] + piece.u[1]) / 2, piece.y[0], -(piece.v[0] + piece.v[1]) / 2]} /></Suspense>
        </ModelBoundary> : (() => {
          const radius = piece.disc || ellipse ? 0 : edgeRadius(size)
          const position: [number, number, number] = [(piece.u[0] + piece.u[1]) / 2, (piece.y[0] + piece.y[1]) / 2, -(piece.v[0] + piece.v[1]) / 2]
          const material = <meshStandardMaterial color={piece.color} roughness={piece.roughness ?? .6} metalness={piece.metalness ?? 0}
            transparent={piece.opacity !== undefined} opacity={piece.opacity ?? 1} depthWrite={piece.opacity === undefined} />
          // A soft edge catches the light and breaks the voxel look; plates, slots and ports stay sharp.
          if (radius > 0) return <RoundedBox args={size} radius={radius} smoothness={3} position={position} rotation={piece.roll ? [0, 0, piece.roll] : undefined} castShadow receiveShadow>{material}</RoundedBox>
          return <mesh position={position} rotation={piece.disc ? [Math.PI / 2, 0, 0] : piece.roll ? [0, 0, piece.roll] : undefined}
            scale={ellipse ? [size[0] / 2, 1, size[2] / 2] : undefined} castShadow receiveShadow>
            {piece.disc ? <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[2], 40]} /> : ellipse ? <cylinderGeometry args={[1, piece.taper ?? 1, size[1], 40]} /> : <boxGeometry args={size} />}
            {material}
          </mesh>
        })()}
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
