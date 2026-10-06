import { segmentWall } from '@t3-designer/geometry'
import { ApartmentSchema, SCENE_SCHEMA_VERSION, type Apartment, type Door, type Point2D, type Room, type Wall, type Window } from '@t3-designer/scene-schema'
import { FLOOR_HEIGHT } from './building-site.ts'
import {
  BATHROOM_DOOR, BATHROOM_DOOR_COLOR, CLOSET_WARDROBE, LIVING_DOOR_COLOR, MAIN_DOOR_COLOR, SECONDARY_DOOR_COLOR, OFFICE_DOOR_COLOR, type DoorSwing, FIRST_FLOOR_BATHROOM, FIRST_FLOOR_DOOR_SWINGS, FIRST_FLOOR_PARTITIONS, FIRST_OUTLINE,
  FRONT_ROOMS, GARAGE_DOOR, GROUND_BATHROOM, GROUND_DOOR_SWINGS, GROUND_GARAGE, GROUND_HALL, GROUND_BATHROOM_DOOR, GROUND_LIVING, GROUND_OFFICE,
  GROUND_OUTLINE, GROUND_PANTRY, GROUND_PARTITIONS, HALL_ARCH, KITCHEN_LIVING, LIVING_DOOR, LIVING_KITCHEN_DOOR, MAIN_DOOR, MAIN_ROOM_CLOSET,
  MAIN_ROOM_DRYWALL, MAIN_ROOM_SETBACK, OFFICE_DOOR, OPENINGS, PANTRY_DOOR, PARTITION_THICKNESS, SECONDARY_DOOR, SECONDARY_WARDROBE, SIDE_OPENINGS,
  SLAB_THICKNESS, STAIRWELL_HOLE, BALCONY, WALL_THICKNESS, exteriorThickness, polygonArea, type Floor, type PlanPoint,
} from './house-plan.ts'
import { LAUNDRY } from './laundry.ts'
import { TERRACE_INNER, TERRACE_PARTY_WALL, TERRACE_RAILING, TERRACE_REAR_WALL, TERRACE_WALL_THICKNESS, houseSouthWestEdge } from './building-site.ts'
import { HOUSE_HALF_WIDTH, PARTY_WALL, WELL_BACK_U, HOUSE_REAR, GROUND_WELL_EDGE } from './building-site.ts'

/**
 * The house as the apartment viewer and the walkthrough read it: one `Apartment` per floor, built from the house plan so the plan stays the
 * single source of truth. The local frame is the house frame turned to the viewer's axes: x = u (toward the rear), z = -v (v runs to the
 * north-east), y up from the floor's own level. Exterior walls are the strips the cutaway already draws, here as centre lines; the
 * partitions are the plan's boxes; each gap the plan leaves for a door becomes a short wall holding that door.
 */
export const HOUSE_FLOOR_ORDER: readonly Floor[] = ['ground', 'first']
export const WALL_HEIGHT = FLOOR_HEIGHT - SLAB_THICKNESS
const DOOR_HEIGHT = 2.1
const local = (u: number, v: number): Point2D => [u, -v]
const EPS = 1e-6
const level: Record<Floor, number> = { ground: 0, first: FLOOR_HEIGHT }
const TERRACE_REAR = HOUSE_REAR.southWest

type Box = readonly [number, number, number, number]
const longAlongU = (box: Box) => box[1] - box[0] >= box[3] - box[2]

function partitionWall(id: string, box: Box): Wall {
  const [u0, u1, v0, v1] = box
  const alongU = longAlongU(box)
  return {
    id, height: WALL_HEIGHT, kind: 'interior', estimated: true,
    thickness: alongU ? v1 - v0 : u1 - u0,
    from: alongU ? local(u0, (v0 + v1) / 2) : local((u0 + u1) / 2, v0),
    to: alongU ? local(u1, (v0 + v1) / 2) : local((u0 + u1) / 2, v1),
  }
}

type InteriorDoor = { id: string; box: Box; swing?: DoorSwing; appearance: 'passage' | 'panel' | 'glazed'; finish?: Door['finish']; color?: string; evidence?: string }
const boxOf = (door: { u: [number, number]; v: [number, number] }): Box => [door.u[0], door.u[1], door.v[0], door.v[1]]

const FIRST_DOORS: InteriorDoor[] = [
  { id: 'bathroom-door', box: boxOf(BATHROOM_DOOR), swing: FIRST_FLOOR_DOOR_SWINGS.find(swing => swing.id === 'bathroom'), appearance: 'panel', finish: 'white', color: BATHROOM_DOOR_COLOR },
  { id: 'living-door', box: boxOf(LIVING_DOOR), swing: FIRST_FLOOR_DOOR_SWINGS.find(swing => swing.id === 'living'), appearance: 'glazed', finish: 'white', color: LIVING_DOOR_COLOR },
  { id: 'main-door', box: boxOf(MAIN_DOOR), swing: FIRST_FLOOR_DOOR_SWINGS.find(swing => swing.id === 'main'), appearance: 'panel', finish: 'gray', color: MAIN_DOOR_COLOR },
  { id: 'secondary-door', box: boxOf(SECONDARY_DOOR), swing: FIRST_FLOOR_DOOR_SWINGS.find(swing => swing.id === 'secondary'), appearance: 'panel', finish: 'gray', color: SECONDARY_DOOR_COLOR },
]
const GROUND_DOORS: InteriorDoor[] = [
  { id: 'garage-hall-doorway', box: boxOf(GARAGE_DOOR), appearance: 'passage', finish: 'white', evidence: 'Doorway without a door yet (owner).' },
  { id: 'hall-arch', box: boxOf(HALL_ARCH), appearance: 'passage', finish: 'white', evidence: 'Doorway without a leaf (owner).' },
  { id: 'office-door', box: boxOf(OFFICE_DOOR), swing: GROUND_DOOR_SWINGS.find(swing => swing.id === 'office'), appearance: 'panel', finish: 'gray', color: OFFICE_DOOR_COLOR },
  { id: 'living-rear-door', box: boxOf(LIVING_KITCHEN_DOOR), appearance: 'passage', finish: 'white', evidence: 'Opening only; leaf, colour and hand not known.' },
  { id: 'pantry-door', box: boxOf(PANTRY_DOOR), appearance: 'passage', finish: 'white', evidence: 'Opening only; width and centring assumed.' },
  { id: 'ground-bathroom-door', box: boxOf(GROUND_BATHROOM_DOOR), appearance: 'passage', finish: 'white', evidence: 'Opening only; leaf, colour and hand not known.' },
]

/** One floor's exterior walls with the openings the plan puts in them. Every opening gets a wall id and an offset along it. */
function exteriorWalls(floor: Floor, outline: PlanPoint[]) {
  const count = outline.length
  const orientation = Math.sign(polygonArea(outline))
  const reflex = (index: number) => {
    const prev = outline[(index + count - 1) % count], at = outline[index], next = outline[(index + 1) % count]
    return ((at[0] - prev[0]) * (next[1] - at[1]) - (at[1] - prev[1]) * (next[0] - at[0])) * orientation < 0
  }
  const base = level[floor]
  const walls: Wall[] = [], doors: Door[] = [], windows: Window[] = []
  const wallIds = new Map<number, string>()
  const kinds: Record<string, { kind: 'door' | 'balcony-door' | 'window'; id: string; appearance?: Door['appearance']; finish?: Door['finish'] }> = {}
  outline.forEach((a, index) => {
    const b = outline[(index + 1) % count]
    const du = b[0] - a[0], dv = b[1] - a[1], length = Math.hypot(du, dv)
    const dir: PlanPoint = [du / length, dv / length]
    const inward: PlanPoint = orientation > 0 ? [-dir[1], dir[0]] : [dir[1], -dir[0]]
    const thickness = exteriorThickness(a, b)
    const previous = outline[(index + count - 1) % count], following = outline[(index + 2) % count]
    const start = reflex(index) ? -exteriorThickness(previous, a) : 0
    const end = length + (reflex((index + 1) % count) ? exteriorThickness(b, following) : 0)
    const point = (s: number): PlanPoint => [a[0] + dir[0] * s + inward[0] * thickness / 2, a[1] + dir[1] * s + inward[1] * thickness / 2]
    const id = `${floor}-exterior-${index + 1}`
    wallIds.set(index, id)
    const from = point(start), to = point(end)
    walls.push({ id, from: local(...from), to: local(...to), height: WALL_HEIGHT, thickness, kind: 'exterior', estimated: true })
    // Openings on this edge: those that run along v sit at a fixed u; the side openings at a fixed v.
    const along = (coordinate: number) => Math.abs(du) < EPS ? (coordinate - a[1]) * Math.sign(dv) : (coordinate - a[0]) * Math.sign(du)
    const lists: { span: [number, number]; y: [number, number] }[] = Math.abs(du) < EPS
      ? OPENINGS[floor].filter(opening => Math.abs(opening.u - a[0]) < EPS && opening.v[0] >= Math.min(a[1], b[1]) - EPS && opening.v[1] <= Math.max(a[1], b[1]) + EPS).map(opening => ({ span: opening.v, y: opening.y }))
      : SIDE_OPENINGS[floor].filter(opening => Math.abs(opening.v - a[1]) < EPS && opening.u[0] >= Math.min(a[0], b[0]) - EPS && opening.u[1] <= Math.max(a[0], b[0]) + EPS).map(opening => ({ span: opening.u, y: opening.y }))
    lists.forEach((opening, openingIndex) => {
      const s0 = Math.min(along(opening.span[0]), along(opening.span[1])), s1 = Math.max(along(opening.span[0]), along(opening.span[1]))
      const offset = Math.max(0, s0 - start)
      const width = Math.min(s1 - s0, end - start - offset)
      const bottom = Math.max(0, opening.y[0] - base), top = opening.y[1] - base
      const spec = openingSpec(floor, wallIds.get(index)!, openingIndex, bottom, top, width)
      kinds[spec.id] = spec
      if (spec.kind === 'door') {
        doors.push({
          id: spec.id, wallId: id, offset, width, height: top - bottom, hinge: 'start', opensToward: 1, locationConfidence: 'observed',
          appearance: spec.appearance, finish: spec.finish, color: 'color' in spec ? spec.color : undefined, estimated: true,
        })
      } else {
        windows.push({
          id: spec.id, wallId: id, offset, width, height: top - bottom, sillHeight: bottom, estimated: true,
          kind: spec.kind === 'balcony-door' ? 'balcony-door' : 'casement', locationConfidence: 'observed',
        })
      }
    })
  })
  return { walls, doors, windows }
}

/** What each exterior opening is. Heights are checked here so a door never becomes a window by accident. */
function openingSpec(floor: Floor, wallId: string, index: number, bottom: number, top: number, width: number) {
  const id = `${wallId}-opening-${index + 1}`
  if (bottom <= .05 && top - bottom > 2.3 && width > 3) return { id, kind: 'door' as const, appearance: 'passage' as const, finish: 'gray' as const } // the garage door, shown as an open frame: a 4 m leaf would swing across the street
  // The balcony's 3 m door and the terrace's 1.78 m one are ways out: an open frame, not glazing the visitor bumps into.
  // The main room's 3 m door onto the balcony and the kitchen-living's 1.78 m door onto the terrace are the same white aluminium sliding door.
  if (floor === 'first' && bottom <= .05 && width > 1.5) return { id, kind: 'door' as const, appearance: 'sliding' as const, finish: 'white' as const, color: '#f3f2ee' }
  if (bottom <= .05 && width > 1.5) return { id, kind: 'balcony-door' as const }
  if (bottom <= .05) return { id, kind: 'door' as const, appearance: floor === 'ground' ? 'panel' as const : 'glazed' as const, finish: 'gray' as const }
  return { id, kind: 'window' as const }
}

function interiorWalls(floor: Floor, partitions: readonly Box[], doors: InteriorDoor[]) {
  const walls = partitions.map((box, index) => partitionWall(`${floor}-partition-${index + 1}`, box))
  const result: Door[] = []
  for (const door of doors) {
    const gap = partitionWall(`${door.id}-wall`, [door.box[0], door.box[1], door.box[2], door.box[3]])
    walls.push(gap)
    const [fx, fz] = gap.from, [tx, tz] = gap.to
    const length = Math.hypot(tx - fx, tz - fz)
    // Wall-local +Z is (-dz, dx); the swing's open direction is in [u, v], so its plan direction is [u, -v].
    const normal: Point2D = [-(tz - fz) / length, (tx - fx) / length]
    let hinge: Door['hinge'] = 'start', opensToward: 1 | -1 = 1
    if (door.swing) {
      const hingePoint = local(...door.swing.hinge)
      hinge = Math.hypot(hingePoint[0] - fx, hingePoint[1] - fz) <= Math.hypot(hingePoint[0] - tx, hingePoint[1] - tz) ? 'start' : 'end'
      opensToward = normal[0] * door.swing.open[0] + normal[1] * -door.swing.open[1] >= 0 ? 1 : -1
    }
    result.push({
      id: door.id, wallId: gap.id, offset: 0, width: length, height: DOOR_HEIGHT, hinge, opensToward, locationConfidence: door.swing ? 'observed' : 'inferred',
      appearance: door.appearance, finish: door.finish, color: door.color, evidence: door.evidence, estimated: true,
    })
  }
  return { walls, doors: result }
}

const rect = (u: [number, number], v: [number, number]): Point2D[] => [local(u[0], v[0]), local(u[1], v[0]), local(u[1], v[1]), local(u[0], v[1])]
const room = (id: string, name: string, polygon: Point2D[], color: string): Room => ({
  id, name, polygon, color,
  reportedArea: Math.abs(polygon.reduce((sum, p, i) => { const q = polygon[(i + 1) % polygon.length]; return sum + p[0] * q[1] - q[0] * p[1] }, 0)) / 2,
})

const firstHallV: [number, number] = [SECONDARY_WARDROBE.v[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.v[0] - PARTITION_THICKNESS + MAIN_ROOM_SETBACK]
const sleepingMain: [number, number] = [FRONT_ROOMS.main.v[0], MAIN_ROOM_DRYWALL[2]]
const LAUNDRY_U_ROOM: [number, number] = [4, 4 + LAUNDRY.length]
const firstRooms: Room[] = [
  room('secondary-room', 'Secondary room', rect(FRONT_ROOMS.secondary.u, FRONT_ROOMS.secondary.v), '#d8cdb8'),
  room('main-room', 'Main room', rect(FRONT_ROOMS.main.u, sleepingMain), '#dfc7bf'),
  room('closet', 'Walk-in closet', rect(MAIN_ROOM_CLOSET.u, MAIN_ROOM_CLOSET.v), '#ccc9bc'),
  room('bathroom', 'Bathroom', rect(FIRST_FLOOR_BATHROOM.u, FIRST_FLOOR_BATHROOM.v), '#c1d3d2'),
  room('hall', 'Hall', rect([FRONT_ROOMS.secondary.u[1] + PARTITION_THICKNESS, FRONT_ROOMS.main.u[1] + PARTITION_THICKNESS], firstHallV), '#ded6c3'),
  room('stair-corridor', 'Stair corridor', rect([STAIRWELL_HOLE[0], STAIRWELL_HOLE[1]], [firstHallV[0], STAIRWELL_HOLE[2]]), '#d3ccb8'),
  room('laundry', 'Laundry', rect(LAUNDRY_U_ROOM, [HOUSE_HALF_WIDTH - PARTY_WALL - LAUNDRY.width, HOUSE_HALF_WIDTH - PARTY_WALL]), '#d8d4c6'),
  room('terrace', 'Terrace', rect([4, TERRACE_REAR], [houseSouthWestEdge((4 + TERRACE_REAR) / 2) + TERRACE_WALL_THICKNESS, TERRACE_INNER - TERRACE_WALL_THICKNESS]), '#d6d2c2'),
  room('balcony', 'Balcony', rect([-5 - BALCONY.depth, -5], [-BALCONY.width / 2, BALCONY.width / 2]), '#c2c2b9'),
  room('kitchen-living', 'Kitchen and living', rect(KITCHEN_LIVING.u, KITCHEN_LIVING.v), '#e3d5bd'),
]
const groundRooms: Room[] = [
  room('garage', 'Garage', rect(GROUND_GARAGE.u, GROUND_GARAGE.v), '#c9c9c2'),
  room('entrance-hall', 'Entrance hall', rect(GROUND_HALL.u, GROUND_HALL.v), '#ded6c3'),
  room('ground-living', 'Living', rect(GROUND_LIVING.u, GROUND_LIVING.v), '#e3d5bd'),
  room('pantry', 'Pantry', rect(GROUND_PANTRY.u, GROUND_PANTRY.v), '#cfbea3'),
  room('ground-bathroom', 'Bathroom', rect(GROUND_BATHROOM.u, GROUND_BATHROOM.v), '#c1d3d2'),
  room('office', 'Office', rect(GROUND_OFFICE.u, GROUND_OFFICE.v), '#dfc7bf'),
  room('light-well', 'Light well', rect([WELL_BACK_U, HOUSE_REAR.northEast - PARTY_WALL], [-1, GROUND_WELL_EDGE]), '#c9d2bd'),
]

function centreLine(outline: PlanPoint[]): Point2D[] {
  return outline.map(([u, v]) => local(u, v))
}

const FIRST_NE = HOUSE_HALF_WIDTH - PARTY_WALL
const LAUNDRY_V0 = FIRST_NE - LAUNDRY.width
const LAUNDRY_U: [number, number] = [4, 4 + LAUNDRY.length]
const LAUNDRY_BACK = LAUNDRY_U[1] + LAUNDRY.wallThickness
const BALCONY_V = BALCONY.width / 2
const BALCONY_FRONT = -5 - BALCONY.depth
const RAIL = .04
const TERRACE_SW = (u: number) => houseSouthWestEdge(u) + TERRACE_WALL_THICKNESS / 2

/**
 * What the first floor adds to its block: the balcony on the street, which the visitor can walk out onto, the laundry behind the kitchen
 * (its north-east half, the other being the stair's first flight) and the stairwell, a notch in the floor along the north-east party wall.
 * The perimeter is what the walkthrough treats as floor, so it follows all three.
 */
function firstFloorPerimeter(withTerrace = true): Point2D[] {
  const hole = STAIRWELL_HOLE
  const terrace = withTerrace ? [local(4, TERRACE_INNER), local(TERRACE_REAR, TERRACE_INNER), local(TERRACE_REAR, houseSouthWestEdge(TERRACE_REAR))] : []
  return [
    local(-5, FIRST_OUTLINE[0][1]), local(-5, -BALCONY_V), local(BALCONY_FRONT, -BALCONY_V), local(BALCONY_FRONT, BALCONY_V), local(-5, BALCONY_V),
    local(-5, HOUSE_HALF_WIDTH), local(hole[0], HOUSE_HALF_WIDTH), local(hole[0], hole[2]), local(hole[1], hole[2]), local(hole[1], HOUSE_HALF_WIDTH),
    local(LAUNDRY_BACK, HOUSE_HALF_WIDTH), local(LAUNDRY_BACK, LAUNDRY_V0 - LAUNDRY.wallThickness), local(4, LAUNDRY_V0 - LAUNDRY.wallThickness), ...terrace, local(4, FIRST_OUTLINE[0][1]),
  ]
}

function firstFloorAnnex() {
  const walls: Wall[] = [], windows: Window[] = []
  const wall = (id: string, from: [number, number], to: [number, number], thickness: number, height = WALL_HEIGHT): Wall => {
    const result: Wall = { id, from: local(...from), to: local(...to), thickness, height, kind: 'exterior', estimated: true }
    walls.push(result)
    return result
  }
  // The laundry: the party wall, the glazed wall on the light well and the back wall, past which the stair's landing lies.
  wall('first-laundry-party', [4, HOUSE_HALF_WIDTH - PARTY_WALL / 2], [LAUNDRY_BACK, HOUSE_HALF_WIDTH - PARTY_WALL / 2], PARTY_WALL)
  const glazed = wall('first-laundry-glass', [4, LAUNDRY_V0 - LAUNDRY.wallThickness / 2], [LAUNDRY_BACK, LAUNDRY_V0 - LAUNDRY.wallThickness / 2], LAUNDRY.wallThickness)
  windows.push({ id: 'first-laundry-glazing', wallId: glazed.id, offset: .1, width: LAUNDRY.length - .1, height: 2.7, sillHeight: .1, estimated: true, kind: 'casement', locationConfidence: 'observed' })
  wall('first-laundry-back', [LAUNDRY_U[1] + LAUNDRY.wallThickness / 2, LAUNDRY_V0 - LAUNDRY.wallThickness], [LAUNDRY_U[1] + LAUNDRY.wallThickness / 2, HOUSE_HALF_WIDTH - PARTY_WALL], LAUNDRY.wallThickness)
  // The balcony's railing: 1 m, on its front and its two sides.
  wall('first-balcony-rail-front', [BALCONY_FRONT + RAIL / 2, -BALCONY_V], [BALCONY_FRONT + RAIL / 2, BALCONY_V], RAIL, 1)
  wall('first-balcony-rail-south-west', [BALCONY_FRONT, -BALCONY_V + RAIL / 2], [-5, -BALCONY_V + RAIL / 2], RAIL, 1)
  wall('first-balcony-rail-north-east', [BALCONY_FRONT, BALCONY_V - RAIL / 2], [-5, BALCONY_V - RAIL / 2], RAIL, 1)
  // The terrace behind the kitchen, over the rear ground-floor band: the party wall on the south-west (it leans with the lot), the wall at the
  // back, and the railing on the light well's side.
  wall('first-terrace-party', [4, TERRACE_SW(4)], [TERRACE_REAR, TERRACE_SW(TERRACE_REAR)], TERRACE_WALL_THICKNESS, TERRACE_PARTY_WALL)
  wall('first-terrace-rear', [TERRACE_REAR - TERRACE_REAR_WALL / 2, houseSouthWestEdge(TERRACE_REAR) + TERRACE_WALL_THICKNESS], [TERRACE_REAR - TERRACE_REAR_WALL / 2, TERRACE_INNER - TERRACE_WALL_THICKNESS], TERRACE_REAR_WALL, TERRACE_PARTY_WALL)
  wall('first-terrace-rail', [4, TERRACE_INNER - TERRACE_WALL_THICKNESS / 2], [TERRACE_REAR, TERRACE_INNER - TERRACE_WALL_THICKNESS / 2], TERRACE_WALL_THICKNESS, TERRACE_RAILING)
  return { walls, windows }
}

/** The ceiling the walkthrough draws: the house's roof. The terrace is open to the sky. */
export function ceilingPolygon(floor: Floor): Point2D[] {
  return floor === 'first' ? firstFloorPerimeter(false) : HOUSE_FLOORS[floor].perimeter
}

function buildFloor(floor: Floor): Apartment {
  const outline = floor === 'ground' ? GROUND_OUTLINE : FIRST_OUTLINE
  const exterior = exteriorWalls(floor, outline)
  const interior = interiorWalls(floor, floor === 'ground' ? GROUND_PARTITIONS : FIRST_FLOOR_PARTITIONS, floor === 'ground' ? GROUND_DOORS : FIRST_DOORS)
  const annex = floor === 'first' ? firstFloorAnnex() : { walls: [], windows: [] }
  const rooms = floor === 'ground' ? groundRooms : firstRooms
  return ApartmentSchema.parse({
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: `house-${floor}`,
    name: floor === 'ground' ? 'Ground floor' : 'First floor',
    units: 'meters',
    coordinateSystem: { x: 'east', y: 'up', z: 'south' },
    perimeter: floor === 'ground' ? centreLine(outline) : firstFloorPerimeter(),
    rooms,
    walls: [...exterior.walls, ...annex.walls, ...interior.walls],
    doors: [...exterior.doors, ...interior.doors],
    windows: [...exterior.windows, ...annex.windows],
    metadata: {
      source: 'Built from the house plan (src/data/house-plan.ts): owner measurements, photos and Street View.',
      description: 'One floor of the house in the viewer frame: x = u (toward the rear), z = -v (v runs north-east), y up from the floor.',
      reportedCarrezArea: Math.max(1, rooms.reduce((sum, item) => sum + item.reportedArea, 0)),
      reportedBasementArea: 0,
      assumptions: [
        `Exterior walls are ${WALL_THICKNESS} m thick at the street and ${PARTY_WALL} m on the party walls; partitions are ${PARTITION_THICKNESS} m (see the plan).`,
        `Wall height is ${WALL_HEIGHT} m: the 3.2 m storey less the ${SLAB_THICKNESS} m slab. Door height 2.1 m is assumed.`,
        `The wardrobe's depth (${CLOSET_WARDROBE.depth} m) and the other built-ins are not part of this architectural model.`,
      ],
      unresolved: ['The rooms behind the ground floor\'s back wall and the terrace are not modelled yet.'],
    },
  })
}

export const HOUSE_FLOORS: Record<Floor, Apartment> = { ground: buildFloor('ground'), first: buildFloor('first') }
export { level as FLOOR_ELEVATION }

/** The floor a room belongs to, for anything that carries a room id: fixtures, labels, layouts. */
export function floorOfRoom(roomId: string): Floor | undefined {
  return HOUSE_FLOOR_ORDER.find(floor => HOUSE_FLOORS[floor].rooms.some(room => room.id === roomId))
}

export type ShellBox = { center: [number, number, number]; size: [number, number, number]; kind: Wall['kind'] }
const ANNEX = /^first-(laundry|balcony|terrace)/

/**
 * The walls of one floor as solid boxes in the house frame ([u, y, v], absolute heights), sawn off at `top`: what the floor cutaway draws.
 * They come from the same walls, doors and windows the walkthrough walks through, so the two views cannot drift apart. The balcony and the
 * laundry are left out: the cutaway draws them from the facade and the laundry's own volumes.
 */
export function shellWallBoxes(floor: Floor, top: number): ShellBox[] {
  const apartment = HOUSE_FLOORS[floor], base = level[floor]
  const boxes: ShellBox[] = []
  for (const wall of apartment.walls) {
    if (ANNEX.test(wall.id)) continue
    const dx = wall.to[0] - wall.from[0], dz = wall.to[1] - wall.from[1], length = Math.hypot(dx, dz)
    const ux = dx / length, uz = dz / length
    const alongU = Math.abs(ux) > .5
    const openings = [...apartment.doors, ...apartment.windows].filter(opening => opening.wallId === wall.id)
    for (const segment of segmentWall(wall, openings)) {
      const bottom = base + segment.bottom, roof = Math.min(base + segment.bottom + segment.height, top)
      if (roof - bottom < 1e-6) continue
      const along = segment.offset + segment.length / 2
      const x = wall.from[0] + ux * along, z = wall.from[1] + uz * along
      boxes.push({
        center: [x, (bottom + roof) / 2, -z], kind: wall.kind,
        size: alongU ? [segment.length, roof - bottom, wall.thickness] : [wall.thickness, roof - bottom, segment.length],
      })
    }
  }
  return boxes
}

/** The floor an apartment record stands for, or undefined for anything that is not one of the house's floors. */
export function floorOfApartment(apartment: Pick<Apartment, 'id'>): Floor | undefined {
  return HOUSE_FLOOR_ORDER.find(floor => HOUSE_FLOORS[floor].id === apartment.id)
}
