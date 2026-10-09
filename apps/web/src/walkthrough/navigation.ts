import { polygonBounds, polygonCentroid, segmentWall, wallLength, wallRotation } from '@t3-designer/geometry'
import { furnishingBlockers, furnishingDevices, isInPlace, isRemovable } from '../data/house-furnishings.ts'
import { AZOTEA_LEVEL, AZOTEA_OBSTACLES, AZOTEA_OUTLINE, AZOTEA_ROOM, LANDING_LEVEL, LANDING_OUTLINE } from '../data/azotea.ts'
import { ceilingPolygon, floorOfApartment, walkOutline } from '../data/house-interior.ts'
import { STAIR_BLOCKS } from '../data/stair.ts'
import { pointInEditorPolygon, type Point2D, type ProjectSnapshot, type Room } from '@t3-designer/scene-schema'

export const WALK_RADIUS = .2
export const WALK_EYE_HEIGHT = 1.65
export const WALK_CROUCH_HEIGHT = .95
export const WALK_GRAVITY = 9.8
export const WALK_JUMP_SPEED = 2.8

// The landing before the last flight leaves 1.756 m under the slab: a standing visitor, eyes at 1.65 m, needs this much room above the eyes, no more.
const headClearance = .05
/** The tallest step the visitor climbs without jumping: a stair's riser is under 0.2 m. */
export const WALK_STEP = .3
const epsilon = 1e-8
const maxMovement = 4
const movementStep = WALK_RADIUS / 4

type WalkBlocker = {
  center: Point2D
  halfWidth: number
  halfDepth: number
  cos: number
  sin: number
  bottom: number
  top: number
  doorId?: string
  /** A floor or a roof, as its outline: the footprint is the polygon, not the box. */
  polygon?: Point2D[]
  /** A step: walked up and down without jumping. */
  climb?: true
  /** A thing to switch, not a door: it is aimed at like one, and the map does not draw it. */
  device?: true
}
type WalkDoorLeaf = { hinge: Point2D; rotation: number; direction: number; swingSign: number; width: number; bottom: number; top: number; initialOpenness: number }
/** A sliding panel: it keeps its orientation and moves along the wall by `travel` as it opens. */
type WalkDoorSlide = { origin: Point2D; direction: Point2D; panel: number; travel: number; rotation: number; bottom?: number; top: number; initialOpenness: number }
type WalkDoor = { level?: number; center: Point2D; normal: Point2D; exterior: boolean; id: string; clearance: number; leaf?: WalkDoorLeaf; slide?: WalkDoorSlide; device?: WalkBlocker & { initialOpenness: number } }
/** A floor of the house: where its feet may stand (the outline of the floor, stairwell included) and its level. */
export type WalkLevel = { elevation: number; perimeter: Point2D[] }
export type WalkRoom = Room & { elevation: number }
export type WalkWorld = {
  perimeter: Point2D[]
  levels: WalkLevel[]
  rooms: WalkRoom[]
  floorElevation: number
  ceilingElevation: number
  blockers: WalkBlocker[]
  staticBlockers: WalkBlocker[]
  doors: WalkDoor[]
}
export type WalkSpawn = { position: Point2D; yaw: number; /** The floor's level above the world's floor; omitted for the lowest. */ elevation?: number }
export type WalkVerticalState = { offset: number; velocity: number; grounded: boolean }
export type WalkDoorStates = Record<string, number>
export type WalkDoorPose = { x: number; z: number; yaw: number; pitch: number; eyeHeight: number; feetOffset: number }

export function resolveWalkDoorOpenness(states: WalkDoorStates | undefined, id: string, fallback = 1): number {
  const value = states?.[id]
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value! : Number.isFinite(fallback) ? fallback : 1))
}

/** Door settings are copied into a disposable visit, with passages excluded. */
export function initialWalkDoorStates(snapshot: ProjectSnapshot): WalkDoorStates {
  return Object.fromEntries(snapshot.apartment.doors.flatMap(door => {
    const customization = snapshot.customization?.doors[door.id]
    const style = customization?.style ?? door.appearance ?? 'panel'
    // A sliding door starts closed; the others, open.
    return style === 'passage' ? []
      : [[door.id, resolveWalkDoorOpenness(undefined, door.id, customization?.openness ?? (style === 'sliding' || door.sill ? 0 : 1))]]
  }))
}

/** Collision is an upright body in the same local metre coordinates as the scene.
 * Models use their authored rotated bounds; leaves follow saved or visiting states.
 * Window openings remain barriers, including balcony glazing at the perimeter. */
export function buildWalkWorld(snapshot: ProjectSnapshot, doorStates = initialWalkDoorStates(snapshot), upper?: ProjectSnapshot): WalkWorld {
  const blockers: WalkBlocker[] = []
  const doors: WalkDoor[] = []
  for (const wall of snapshot.apartment.walls) {
    const length = wallLength(wall)
    const ux = (wall.to[0] - wall.from[0]) / length
    const uz = (wall.to[1] - wall.from[1]) / length
    const angle = wallRotation(wall)
    for (const segment of segmentWall(wall, snapshot.apartment.doors)) {
      const distance = segment.offset + segment.length / 2
      blockers.push({
        center: [wall.from[0] + ux * distance, wall.from[1] + uz * distance],
        halfWidth: segment.length / 2, halfDepth: wall.thickness / 2,
        cos: Math.cos(angle), sin: Math.sin(angle),
        bottom: segment.bottom, top: segment.bottom + segment.height,
        // The wall under a door that stands on a sill is the sill: stepped over, up and down, like a stair's last step.
        ...(snapshot.apartment.doors.some(door => door.wallId === wall.id && (door.sill ?? 0) > 0 && segment.offset >= door.offset - epsilon
          && segment.offset + segment.length <= door.offset + door.width + epsilon && Math.abs(segment.height - door.sill!) < 1e-6) ? { climb: true as const } : {}),
      })
    }
    for (const door of snapshot.apartment.doors.filter(item => item.wallId === wall.id)) {
      const distance = door.offset + door.width / 2
      const customization = snapshot.customization?.doors[door.id]
      const hingeAtStart = door.hinge === 'start'
      const hingeDistance = door.offset + (hingeAtStart ? .024 : door.width - .024)
      const direction = hingeAtStart ? 1 : -1
      if ((customization?.style ?? door.appearance) === 'sliding') {
        const panel = door.width / 2 + .03
        // The fixed half stands in the way for good; the other slides over it.
        blockers.push({ center: [wall.from[0] + ux * (door.offset + panel / 2), wall.from[1] + uz * (door.offset + panel / 2)],
          halfWidth: panel / 2, halfDepth: .03, cos: Math.cos(angle), sin: Math.sin(angle), bottom: 0, top: door.height })
        doors.push({ id: door.id, center: [wall.from[0] + ux * distance, wall.from[1] + uz * distance], normal: [-uz, ux],
          exterior: wall.kind === 'exterior', clearance: wall.thickness / 2 + WALK_RADIUS + .08,
          slide: { origin: [wall.from[0] + ux * door.offset, wall.from[1] + uz * door.offset], direction: [ux, uz], panel, travel: door.width / 2, rotation: angle,
            top: door.height, initialOpenness: resolveWalkDoorOpenness(undefined, door.id, customization?.openness ?? 0) } })
        continue
      }
      const fixed = (customization?.style ?? door.appearance) === 'aluminium' ? door.fixedLeaf ?? 0 : 0
      if (fixed > 0) {
        // The fixed leaf beside the swinging one stays where it is, at the end away from the hinge.
        const fixedCentre = hingeAtStart ? door.offset + door.width - fixed / 2 : door.offset + fixed / 2
        blockers.push({ center: [wall.from[0] + ux * fixedCentre, wall.from[1] + uz * fixedCentre], halfWidth: fixed / 2, halfDepth: .0225,
          cos: Math.cos(angle), sin: Math.sin(angle), bottom: .025, top: door.height - .025 })
      }
      const style = customization?.style ?? door.appearance ?? 'panel'
      doors.push({ id: door.id, center: [wall.from[0] + ux * distance, wall.from[1] + uz * distance],
        normal: [-uz, ux], exterior: wall.kind === 'exterior', clearance: wall.thickness / 2 + WALK_RADIUS + .08,
        ...(style === 'passage' ? {} : { leaf: {
          hinge: [wall.from[0] + ux * hingeDistance, wall.from[1] + uz * hingeDistance] as Point2D,
          rotation: angle, direction, swingSign: door.opensToward * -direction,
          width: Math.max(.001, door.width - fixed - .045), bottom: (door.sill ?? 0) + .025, top: (door.sill ?? 0) + door.height - .025,
          initialOpenness: resolveWalkDoorOpenness(undefined, door.id, customization?.openness ?? (door.sill ? 0 : 1)),
        } }) })
    }
  }
  const assets = new Map(snapshot.assets.map(asset => [asset.id, asset]))
  for (const fixture of snapshot.fixtures) {
    const asset = assets.get(fixture.assetId)
    if (!asset) continue
    blockers.push({ center: [fixture.position[0], fixture.position[2]],
      halfWidth: asset.dimensions[0] / 2, halfDepth: asset.dimensions[2] / 2,
      cos: Math.cos(fixture.rotation), sin: Math.sin(fixture.rotation),
      bottom: fixture.position[1], top: fixture.position[1] + asset.dimensions[1] })
  }
  // The house's own furniture, from the plan, stops a visitor like any fixture.
  const floor = floorOfApartment(snapshot.apartment)
  if (floor) blockers.push(...furnishingBlockers(floor, snapshot.placement.floorElevation))
  if (floor) for (const device of furnishingDevices(floor, snapshot.placement.floorElevation)) {
    doors.push({ id: device.id, center: device.center, normal: [0, 1], exterior: false, clearance: 0, device: { ...device, doorId: device.id, device: true, initialOpenness: 0 } })
  }
  const perimeter: Point2D[] = snapshot.apartment.perimeter.map(point => [...point])
  const floorElevation = snapshot.geometry.floor.elevation
  const levels: WalkLevel[] = [{ elevation: floorElevation, perimeter }]
  const rooms: WalkRoom[] = snapshot.apartment.rooms.map(room => ({ ...room, polygon: room.polygon.map(point => [...point]), elevation: floorElevation }))
  let ceilingElevation = snapshot.geometry.ceiling.elevation
  if (upper) {
    // A second floor stacked on the first, joined by the stair: one world, so a visitor can walk from one to the other.
    const level = upper.placement.floorElevation
    const above = buildWalkWorld(upper, doorStates)
    const lift = (blocker: WalkBlocker): WalkBlocker => ({ ...blocker, bottom: blocker.bottom + level, top: blocker.top + level })
    blockers.push(...above.staticBlockers.map(lift))
    const bounds = polygonBounds(upper.apartment.perimeter)
    // The floor between the two is a slab with the stairwell as a notch: a ceiling for the one below, the floor of the one above.
    blockers.push({ center: bounds.center, halfWidth: bounds.width / 2, halfDepth: bounds.depth / 2, cos: 1, sin: 0, bottom: level - .2, top: level, polygon: upper.apartment.perimeter.map(point => [...point]), climb: true })
    for (const door of above.doors) {
      doors.push({ ...door, level, ...(door.leaf ? { leaf: { ...door.leaf, bottom: door.leaf.bottom + level, top: door.leaf.top + level } } : {}),
        ...(door.slide ? { slide: { ...door.slide, bottom: level, top: door.slide.top + level } } : {}), ...(door.device ? { device: lift(door.device) as WalkBlocker & { initialOpenness: number } } : {}) })
    }
    // The stair climbs from the hall to the corridor: each step and landing is a floating slab.
    if (floorOfApartment(snapshot.apartment) === 'ground') for (const block of STAIR_BLOCKS) {
      blockers.push({ center: [(block.u[0] + block.u[1]) / 2, -(block.v[0] + block.v[1]) / 2], halfWidth: (block.u[1] - block.u[0]) / 2, halfDepth: (block.v[1] - block.v[0]) / 2,
        cos: 1, sin: 0, bottom: block.y[0], top: block.y[1], climb: true })
    }
    levels.push({ elevation: level, perimeter: walkOutline(floorOfApartment(upper.apartment) ?? 'first') })
    rooms.push(...upper.apartment.rooms.map(room => ({ ...room, polygon: room.polygon.map(point => [...point]) as Point2D[], elevation: level })))
    // Above the first floor, the owner's stair outside the laundry climbs to the azotea. The roof is a slab to stand on, and the rooms below, a ceiling.
    if (floorOfApartment(upper.apartment) === 'first') {
      const roof = ceilingPolygon('first'), roofBounds = polygonBounds(roof)
      blockers.push({ center: roofBounds.center, halfWidth: roofBounds.width / 2, halfDepth: roofBounds.depth / 2, cos: 1, sin: 0,
        bottom: level + upper.geometry.ceiling.elevation, top: level + upper.geometry.ceiling.elevation + upper.geometry.ceiling.thickness, polygon: roof.map(point => [...point]), climb: true })
      for (const obstacle of AZOTEA_OBSTACLES) {
        const box = polygonBounds(obstacle.polygon)
        blockers.push({ center: box.center, halfWidth: box.width / 2, halfDepth: box.depth / 2, cos: 1, sin: 0, bottom: obstacle.bottom, top: obstacle.top,
          polygon: obstacle.polygon.map(point => [...point]), ...(obstacle.climb ? { climb: true as const } : {}) })
      }
      levels.push({ elevation: LANDING_LEVEL, perimeter: LANDING_OUTLINE.map(point => [...point]) }, { elevation: AZOTEA_LEVEL, perimeter: AZOTEA_OUTLINE.map(point => [...point]) })
      rooms.push({ ...AZOTEA_ROOM, polygon: AZOTEA_ROOM.polygon.map(point => [...point]) as Point2D[], elevation: AZOTEA_LEVEL })
      // Open sky above the azotea: the roof slab is the ceiling of what lies below it.
      ceilingElevation = 40
    } else ceilingElevation = level + upper.geometry.ceiling.elevation
  }
  const world: WalkWorld = { blockers, staticBlockers: blockers, doors, perimeter, levels, rooms, floorElevation, ceilingElevation }
  return withWalkDoorStates(world, doorStates)
}

function finitePoint(point: Point2D) { return point.every(Number.isFinite) }

function distanceToSegmentSquared(point: Point2D, from: Point2D, to: Point2D) {
  const dx = to[0] - from[0], dz = to[1] - from[1]
  const lengthSquared = dx * dx + dz * dz
  const t = lengthSquared > epsilon ? Math.max(0, Math.min(1, ((point[0] - from[0]) * dx + (point[1] - from[1]) * dz) / lengthSquared)) : 0
  return (point[0] - from[0] - t * dx) ** 2 + (point[1] - from[1] - t * dz) ** 2
}

/** The level a body with its feet at `feet` stands on: the highest whose floor it can step onto. */
function levelAt(world: WalkWorld, feet: number): WalkLevel {
  return world.levels.reduce((best, level) => level.elevation <= feet + WALK_STEP + epsilon && level.elevation >= best.elevation ? level : best, world.levels[0])
}

export function roomAtPosition(world: WalkWorld, point: Point2D, feetOffset = 0): Room | undefined {
  if (!finitePoint(point)) return undefined
  const level = levelAt(world, world.floorElevation + feetOffset)
  return world.rooms.find(room => room.elevation === level.elevation && pointInEditorPolygon(point, room.polygon))
}

function overlapsFootprint(blocker: WalkBlocker, point: Point2D, radius = WALK_RADIUS): boolean {
  if (blocker.polygon) {
    return pointInEditorPolygon(point, blocker.polygon)
      || blocker.polygon.some((from, index) => distanceToSegmentSquared(point, from, blocker.polygon![(index + 1) % blocker.polygon!.length]) < radius ** 2 - epsilon)
  }
  const dx = point[0] - blocker.center[0], dz = point[1] - blocker.center[1]
  // Inverse of Three's rotation around +Y; the same convention as fixture.rotation.
  const localX = blocker.cos * dx - blocker.sin * dz
  const localZ = blocker.sin * dx + blocker.cos * dz
  const outsideX = Math.max(0, Math.abs(localX) - blocker.halfWidth)
  const outsideZ = Math.max(0, Math.abs(localZ) - blocker.halfDepth)
  return outsideX * outsideX + outsideZ * outsideZ < radius ** 2 - epsilon
}

export function walkDoorLeaf(door: WalkDoor, openness: number): WalkBlocker | null {
  if (door.device) return door.device
  const slide = door.slide
  if (slide) {
    // Closed, the panel covers the far half of the span (plus the overlap); open, it has slid over the fixed one.
    const along = slide.travel * 2 - slide.panel / 2 - slide.travel * openness
    return { doorId: door.id, center: [slide.origin[0] + slide.direction[0] * along, slide.origin[1] + slide.direction[1] * along],
      halfWidth: slide.panel / 2, halfDepth: .03, cos: Math.cos(slide.rotation), sin: Math.sin(slide.rotation), bottom: slide.bottom ?? 0, top: slide.top }
  }
  const leaf = door.leaf
  if (!leaf) return null
  // Mirrors Door.tsx: wall rotation, hinge rotation, then signed leaf scale.
  const angle = leaf.rotation + openness * Math.PI / 2 * leaf.swingSign
  const cos = Math.cos(angle), sin = Math.sin(angle)
  return { doorId: door.id,
    center: [leaf.hinge[0] + cos * leaf.direction * leaf.width / 2, leaf.hinge[1] - sin * leaf.direction * leaf.width / 2],
    halfWidth: leaf.width / 2, halfDepth: .035 / 2, cos, sin, bottom: leaf.bottom, top: leaf.top,
  }
}

/** Reuses fixed geometry and replaces leaves, never accumulating old colliders. */
export function withWalkDoorStates(world: WalkWorld, states: WalkDoorStates): WalkWorld {
  const leaves = world.doors.flatMap(door => {
    // What was taken away (the table, the fridge, the microwave) leaves its spot free to walk through, though it can still be aimed at to put it back.
    if (isRemovable(door.id) && !isInPlace(states, door.id)) return []
    const leaf = walkDoorLeaf(door, resolveWalkDoorOpenness(states, door.id, (door.leaf ?? door.slide ?? door.device)?.initialOpenness))
    return leaf ? [leaf] : []
  })
  return { ...world, blockers: [...world.staticBlockers, ...leaves] }
}

type Vector3 = [number, number, number]

function rayBlockerDistance(origin: Vector3, direction: Vector3, blocker: WalkBlocker, limit: number, padding = 0): number | null {
  const dx = origin[0] - blocker.center[0], dz = origin[2] - blocker.center[1]
  const localOrigin = [blocker.cos * dx - blocker.sin * dz, origin[1], blocker.sin * dx + blocker.cos * dz]
  const localDirection = [blocker.cos * direction[0] - blocker.sin * direction[2], direction[1], blocker.sin * direction[0] + blocker.cos * direction[2]]
  const minimum = [-blocker.halfWidth - padding, blocker.bottom - padding, -blocker.halfDepth - padding]
  const maximum = [blocker.halfWidth + padding, blocker.top + padding, blocker.halfDepth + padding]
  let near = 0, far = limit
  for (let axis = 0; axis < 3; axis++) {
    const component = localDirection[axis]
    if (Math.abs(component) < epsilon) {
      if (localOrigin[axis] < minimum[axis] || localOrigin[axis] > maximum[axis]) return null
      continue
    }
    const a = (minimum[axis] - localOrigin[axis]) / component, b = (maximum[axis] - localOrigin[axis]) / component
    near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b))
    if (near > far) return null
  }
  return near
}

function closestBlockerPoint(point: Vector3, blocker: WalkBlocker): Vector3 {
  const dx = point[0] - blocker.center[0], dz = point[2] - blocker.center[1]
  const x = Math.max(-blocker.halfWidth, Math.min(blocker.halfWidth, blocker.cos * dx - blocker.sin * dz))
  const z = Math.max(-blocker.halfDepth, Math.min(blocker.halfDepth, blocker.sin * dx + blocker.cos * dz))
  return [blocker.center[0] + blocker.cos * x + blocker.sin * z,
    Math.max(blocker.bottom, Math.min(blocker.top, point[1])),
    blocker.center[1] - blocker.sin * x + blocker.cos * z]
}

function validDoorPose(pose: WalkDoorPose): boolean {
  return [pose.x, pose.z, pose.yaw, pose.pitch, pose.eyeHeight, pose.feetOffset].every(Number.isFinite)
    && pose.eyeHeight >= WALK_CROUCH_HEIGHT && pose.feetOffset >= 0
}

/** A forgiving eye ray selects an actual visible leaf within two metres.
 * Occlusion is checked to the real leaf, so the aim tolerance cannot reach
 * through an adjacent jamb or through furniture. */
export function findWalkDoorTarget(world: WalkWorld, states: WalkDoorStates, pose: WalkDoorPose): { id: string; open: boolean } | null {
  if (!validDoorPose(pose)) return null
  const origin: Vector3 = [pose.x, world.floorElevation + pose.feetOffset + pose.eyeHeight, pose.z]
  const direction: Vector3 = [-Math.sin(pose.yaw) * Math.cos(pose.pitch), Math.sin(pose.pitch), -Math.cos(pose.yaw) * Math.cos(pose.pitch)]
  const current = withWalkDoorStates(world, states)
  let nearest: { id: string; open: boolean; distance: number } | null = null
  for (const door of world.doors) {
    const openness = resolveWalkDoorOpenness(states, door.id, (door.leaf ?? door.slide ?? door.device)?.initialOpenness)
    const leaf = walkDoorLeaf(door, openness)
    if (!leaf) continue
    const hit = rayBlockerDistance(origin, direction, leaf, 2, .12)
    if (hit === null) continue
    const target = closestBlockerPoint([origin[0] + direction[0] * hit, origin[1] + direction[1] * hit, origin[2] + direction[2] * hit], leaf)
    const distance = Math.hypot(target[0] - origin[0], target[1] - origin[1], target[2] - origin[2])
    if (distance > 2 || distance < epsilon || (nearest && distance >= nearest.distance)) continue
    const toward: Vector3 = [(target[0] - origin[0]) / distance, (target[1] - origin[1]) / distance, (target[2] - origin[2]) / distance]
    if (toward[0] * direction[0] + toward[1] * direction[1] + toward[2] * direction[2] <= 0) continue
    if (current.blockers.some(blocker => blocker.doorId !== door.id && rayBlockerDistance(origin, toward, blocker, Math.max(0, distance - .005)) !== null)) continue
    nearest = { id: door.id, open: openness >= .5, distance }
  }
  return nearest ? { id: nearest.id, open: nearest.open } : null
}

/** Reject a toggle whose entire leaf arc would sweep through the visitor.
 * Bounds at successive angles are conservatively inflated by the maximum
 * vertex travel between samples, covering the unsampled part of the arc. */
export function canSetWalkDoorOpenness(world: WalkWorld, states: WalkDoorStates, id: string, nextOpenness: number, pose: WalkDoorPose): boolean {
  if (!validDoorPose(pose) || !Number.isFinite(nextOpenness) || nextOpenness < 0 || nextOpenness > 1) return false
  const door = world.doors.find(item => item.id === id)
  if (door?.device) return true
  if (door?.slide) {
    // A panel sliding along the wall sweeps a strip: reject the toggle if the visitor stands in it.
    const current = resolveWalkDoorOpenness(states, id, door.slide.initialOpenness)
    return Array.from({ length: 11 }, (_, step) => walkDoorLeaf(door, current + (nextOpenness - current) * step / 10)!)
      .every(leaf => !overlapsFootprint(leaf, [pose.x, pose.z], WALK_RADIUS))
  }
  if (!door?.leaf) return false
  const feet = world.floorElevation + pose.feetOffset, head = feet + pose.eyeHeight + headClearance
  const current = resolveWalkDoorOpenness(states, id, door.leaf.initialOpenness)
  const angle = Math.abs(nextOpenness - current) * Math.PI / 2
  const steps = Math.max(1, Math.min(180, Math.ceil(angle * door.leaf.width / .025)))
  const arcPadding = 2 * Math.hypot(door.leaf.width, .035 / 2) * Math.sin(angle / steps / 4)
  if (door.leaf.top <= feet + epsilon || door.leaf.bottom >= head - epsilon) return true
  for (let step = 0; step <= steps; step++) {
    const leaf = walkDoorLeaf(door, current + (nextOpenness - current) * step / steps)!
    if (overlapsFootprint(leaf, [pose.x, pose.z], WALK_RADIUS + arcPadding)) return false
  }
  return true
}

export function isWalkPositionFree(world: WalkWorld, point: Point2D, eyeHeight = WALK_EYE_HEIGHT, feetOffset = 0): boolean {
  if (!finitePoint(point) || !Number.isFinite(eyeHeight) || eyeHeight < WALK_CROUCH_HEIGHT || !Number.isFinite(feetOffset) || feetOffset < 0) return false
  const feet = world.floorElevation + feetOffset, head = feet + eyeHeight + headClearance
  // Each floor has its own outline: a body belongs to the one whose floor it can step onto.
  const { perimeter } = levelAt(world, feet)
  if (head > world.ceilingElevation + epsilon || !pointInEditorPolygon(point, perimeter)) return false
  // Checking every edge also handles concave notches, rather than just a bounding box.
  if (perimeter.some((from, index) => distanceToSegmentSquared(point, from, perimeter[(index + 1) % perimeter.length]) < WALK_RADIUS ** 2 - epsilon)) return false
  return !world.blockers.some(blocker => {
    // A step is walked up, not walked into: what is within a riser's reach of the feet does not stop the body.
    if (blocker.top <= feet + (blocker.climb ? WALK_STEP : 0) + epsilon || blocker.bottom >= head - epsilon) return false
    return overlapsFootprint(blocker, point)
  })
}

/** Bounded substeps prevent a delayed frame from jumping through a thin partition.
 * When the complete step collides, independent axes retain motion along the wall. */
export function moveWalkPosition(world: WalkWorld, position: Point2D, displacement: Point2D, eyeHeight = WALK_EYE_HEIGHT, feetOffset = 0): Point2D {
  if (!finitePoint(position)) return findWalkSpawn(world, undefined, eyeHeight)?.position ?? [0, 0]
  let next: Point2D = [...position]
  if (!finitePoint(displacement) || !isWalkPositionFree(world, position, eyeHeight, feetOffset)) return next
  const distance = Math.hypot(...displacement)
  if (distance < epsilon) return next
  const bounded = Math.min(distance, maxMovement)
  const steps = Math.ceil(bounded / movementStep)
  const dx = displacement[0] / distance * bounded / steps
  const dz = displacement[1] / distance * bounded / steps
  for (let step = 0; step < steps; step++) {
    const candidate: Point2D = [next[0] + dx, next[1] + dz]
    if (isWalkPositionFree(world, candidate, eyeHeight, feetOffset)) { next = candidate; continue }
    const alongX: Point2D = [next[0] + dx, next[1]]
    if (isWalkPositionFree(world, alongX, eyeHeight, feetOffset)) next = alongX
    const alongZ: Point2D = [next[0], next[1] + dz]
    if (isWalkPositionFree(world, alongZ, eyeHeight, feetOffset)) next = alongZ
  }
  return next
}

/** Ballistic movement inside the free vertical interval at the current XZ point.
 * Sweeping the full body catches thin shelves and ceilings even across the apex.
 * Use the latest horizontal position: losing support starts a fall immediately.
 * jumpRequested is an input edge; callers should consume it once per press. */
export function stepWalkVertical(world: WalkWorld, point: Point2D, eyeHeight: number, state: WalkVerticalState, delta: number, jumpRequested: boolean): WalkVerticalState {
  const offset = Number.isFinite(state.offset) ? Math.max(0, state.offset) : 0
  let velocity = Number.isFinite(state.velocity) ? Math.max(-50, Math.min(50, state.velocity)) : 0
  if (!isWalkPositionFree(world, point, eyeHeight, offset)) return { offset, velocity: 0, grounded: false }

  // The body cannot move into a collider at either side of its current free
  // interval. Landing uses exactly the same footprint as lateral collision.
  // `support` is what the body stands on now; `reach` also counts the steps within a riser above it.
  let support = 0, reach = 0
  let upper = world.ceilingElevation - world.floorElevation - eyeHeight - headClearance
  for (const blocker of world.blockers) {
    if (!overlapsFootprint(blocker, point)) continue
    const top = blocker.top - world.floorElevation
    const underside = blocker.bottom - world.floorElevation - eyeHeight - headClearance
    if (top <= offset + epsilon) support = Math.max(support, top)
    if (top <= offset + (blocker.climb ? WALK_STEP : 0) + epsilon) reach = Math.max(reach, top)
    if (underside >= offset - epsilon) upper = Math.min(upper, underside)
  }
  // Up a step, or down one, without leaving the ground: the body follows the stair rather than flying off it.
  // It takes a free body at the new height: a step under a low ceiling waits until the head has room.
  if (reach > offset + epsilon && reach <= upper + epsilon && velocity <= epsilon && isWalkPositionFree(world, point, eyeHeight, reach)) return { offset: reach, velocity: 0, grounded: true }
  if (state.grounded && velocity <= epsilon && !jumpRequested && offset - support <= WALK_STEP + epsilon && support < offset - epsilon && climbableUnder(world, point, support)) {
    return { offset: support, velocity: 0, grounded: true }
  }
  const onSupport = Math.abs(offset - support) <= epsilon && velocity <= epsilon
  const seconds = Number.isFinite(delta) ? Math.max(0, Math.min(.05, delta)) : 0
  if (seconds === 0) return { offset, velocity, grounded: onSupport }
  if (jumpRequested && state.grounded && onSupport) velocity = WALK_JUMP_SPEED
  else if (onSupport) return { offset: support, velocity: 0, grounded: true }

  let remaining = seconds
  let start = offset
  // A frame can pass its apex and end below a low ceiling after crossing it.
  // Inspect the peak, then solve the first ascending impact analytically.
  if (velocity > 0) {
    const peakTime = Math.min(remaining, velocity / WALK_GRAVITY)
    const peak = start + velocity * peakTime - WALK_GRAVITY * peakTime * peakTime / 2
    if (peak >= upper - epsilon) {
      const distance = Math.max(0, upper - start)
      const discriminant = Math.max(0, velocity * velocity - 2 * WALK_GRAVITY * distance)
      const impact = distance === 0 ? 0 : 2 * distance / (velocity + Math.sqrt(discriminant))
      remaining = Math.max(0, remaining - impact)
      start = upper
      velocity = 0
    }
  }
  const next = start + velocity * remaining - WALK_GRAVITY * remaining * remaining / 2
  velocity -= WALK_GRAVITY * remaining
  if (next <= support + epsilon) return { offset: support, velocity: 0, grounded: true }
  return { offset: Math.max(support, Math.min(upper, next)), velocity, grounded: false }
}

/** Whether the support below is a step: only a stair is stepped down; anything else is a fall. */
function climbableUnder(world: WalkWorld, point: Point2D, support: number): boolean {
  return world.blockers.some(blocker => blocker.climb && Math.abs(blocker.top - world.floorElevation - support) < epsilon && overlapsFootprint(blocker, point))
}

function facing(from: Point2D, toward: Point2D): number {
  return Math.atan2(from[0] - toward[0], from[1] - toward[1])
}

function roomSpawn(world: WalkWorld, room: WalkRoom, eyeHeight: number): WalkSpawn | null {
  const lift = room.elevation - world.floorElevation
  const center = polygonCentroid(room.polygon)
  const bounds = polygonBounds(room.polygon)
  // Include the centroid, then a bounded regular search for furnished/concave rooms.
  // No free point means no teleport: we never silently select another room.
  const candidates: Point2D[] = [center]
  const columns = Math.min(100, Math.max(1, Math.ceil(bounds.width / .16)))
  const rows = Math.min(100, Math.max(1, Math.ceil(bounds.depth / .16)))
  for (let x = 0; x < columns; x++) for (let z = 0; z < rows; z++) {
    candidates.push([bounds.min[0] + bounds.width * (x + .5) / columns, bounds.min[1] + bounds.depth * (z + .5) / rows])
  }
  candidates.sort((a, b) => Math.hypot(a[0] - center[0], a[1] - center[1]) - Math.hypot(b[0] - center[0], b[1] - center[1]))
  const position = candidates.find(point => pointInEditorPolygon(point, room.polygon) && isWalkPositionFree(world, point, eyeHeight, lift))
  if (!position) return null
  const nearestDoor = world.doors.filter(door => !door.exterior && (door.level ?? world.floorElevation) === room.elevation).sort((a, b) =>
    Math.hypot(a.center[0] - position[0], a.center[1] - position[1]) - Math.hypot(b.center[0] - position[0], b.center[1] - position[1]))[0]
  return { position, yaw: nearestDoor ? facing(position, nearestDoor.center) : 0, ...(lift > 0 ? { elevation: lift } : {}) }
}

export function findWalkSpawn(world: WalkWorld, roomId?: string, eyeHeight = WALK_EYE_HEIGHT): WalkSpawn | null {
  if (!Number.isFinite(eyeHeight) || eyeHeight < WALK_CROUCH_HEIGHT || world.floorElevation + eyeHeight + headClearance > world.ceilingElevation + epsilon) return null
  if (roomId !== undefined) {
    const room = world.rooms.find(item => item.id === roomId)
    return room ? roomSpawn(world, room, eyeHeight) : null
  }
  const exteriorDoors = world.doors.filter(door => door.exterior && door.level === undefined)
    .sort((a, b) => Number(/entry|entrance/i.test(b.id)) - Number(/entry|entrance/i.test(a.id)))
  for (const door of exteriorDoors) for (const side of [1, -1]) {
    const position: Point2D = [door.center[0] + door.normal[0] * door.clearance * side, door.center[1] + door.normal[1] * door.clearance * side]
    if (isWalkPositionFree(world, position, eyeHeight)) {
      const toward: Point2D = [position[0] + door.normal[0] * side, position[1] + door.normal[1] * side]
      return { position, yaw: facing(position, toward) }
    }
  }
  const rooms = world.rooms.filter(room => room.elevation === world.floorElevation).sort((a, b) => Number(/entrance|entry/i.test(b.id)) - Number(/entrance|entry/i.test(a.id)))
  for (const room of rooms) {
    const spawn = roomSpawn(world, room, eyeHeight)
    if (spawn) return spawn
  }
  return null
}
