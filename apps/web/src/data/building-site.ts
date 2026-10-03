/**
 * Tapalque, Buenos Aires. Measured from Google Earth 3D imagery (captured
 * 2021-09-24) and reviewed on 2026-09-29.
 * Units: metres. x = true east, z = true south, y = up. Origin is the centre
 * of the Google Earth view that frames the house.
 * Street View imagery (August 2025) refines the front elevation and the height
 * of the neighbours' fronts.
 * The roof (10 m x 8.5 m, rotated 45 deg from north) was measured from the scale
 * bar of a top-down view. It spans 9 m of house plus a 1 m cantilever over the
 * pavement, ending on the same line as the first-floor balcony. The lot follows the
 * municipal survey sketches (8.66 m of front, 13.50 m and 13.70 m deep), and so do
 * the neighbouring lots 7, 9 and 10; the rest of the block comes from the block plan,
 * digitised by eye (see block.ts). The rear ground-floor band, terrace and light well
 * follow the owner's dimensions. Heights follow floor counts given by the
 * owner (3.2 m per floor), and neighbouring footprints are estimated from the
 * same view. This is a shading model, not a survey.
 */
import { houseToSite, planToSite, polygonArea, type PlanPoint, type SitePoint } from './frame.ts'
import { LOTS, blockStreets, genericBuildings } from './block.ts'
import { OPPOSITE_LOTS } from './opposite-block.ts'
import { LAUNDRY, laundryVolumes } from './laundry.ts'
import { CORNER_TANK, CORNER_UPPER, CROSS_STREET_END, OCHAVA_END, OCHAVA_START, cornerTankCentre } from './corner-front.ts'

export type { SitePoint }
export { HOUSE_CENTER, HOUSE_YAW, houseToSite, siteToHouse } from './frame.ts'

export interface BuildingFootprint {
  id: string;
  rnbId: string | null;
  isTarget: boolean;
  label: string;
  footprint: SitePoint[];
  holes?: SitePoint[][];
  /** Elevation of the top of the volume above ground (the roof slab for buildings). */
  height: number;
  /** Elevation of the bottom of the volume; omitted for volumes that stand on the ground. */
  base?: number;
  /** Extra roof relief above `height`; zero for flat roofs. */
  roofHeight: number;
  /**
   * A single-pitch roof: from the eave at `height` the surface rises by `rise` metres across the
   * footprint, toward `direction` (a unit vector in site axes). Without it the roof is flat.
   */
  slope?: { direction: [number, number]; rise: number };
  groundAltitude: number | null;
  groundOffset: number;
  floors: number | null;
  planarAccuracy: number | null;
  verticalAccuracy: number | null;
  source: 'ign-bdtopo' | 'estimated';
}

export interface SiteRoad {
  id: string;
  name: string;
  points: SitePoint[];
  width: number;
  isPath: boolean;
}

export const BUILDING_SITE = {
  // Rounded to two decimals (about 1 km) on purpose: the sun position changes by
  // less than 0.01 degrees, and the exact location of the house is not published.
  "latitude": -34.65,
  "longitude": -58.5,
  "timeZone": "America/Argentina/Buenos_Aires",
  "address": "Tapalque · Buenos Aires",
  "officialAddress": "Tapalque, Buenos Aires, Argentina",
  "targetId": "HOUSE",
  "rnbId": "N/A",
  "groundAltitude": 22,
  "retrievedAt": "2026-09-29",
  "radiusMeters": 40,
  "attribution": "Google Earth imagery, 2021-09-24 · measurements by the owner"
} as const;

export const FLOOR_HEIGHT = 3.2;

const rect = (u0: number, u1: number, v0: number, v1: number): SitePoint[] =>
  planToSite([[u0, v0], [u1, v0], [u1, v1], [u0, v1]]);
const poly = (points: PlanPoint[]): SitePoint[] => planToSite(points);
const squareAround = ([u, v]: PlanPoint, side: number): PlanPoint[] =>
  [[u - side / 2, v - side / 2], [u + side / 2, v - side / 2], [u + side / 2, v + side / 2], [u - side / 2, v + side / 2]]
const circleAround = ([u, v]: PlanPoint, radius: number, sides: number): PlanPoint[] =>
  Array.from({ length: sides }, (_, i) => [u + radius * Math.cos(2 * Math.PI * i / sides), v + radius * Math.sin(2 * Math.PI * i / sides)] as PlanPoint)
/** The point of the corner's cross-street face at house-frame u. */
const crossStreetAt = (u: number): PlanPoint =>
  [u, OCHAVA_END[1] + (u - OCHAVA_END[0]) / (CROSS_STREET_END[0] - OCHAVA_END[0]) * (CROSS_STREET_END[1] - OCHAVA_END[1])]
const lotPolygon = (number: number): PlanPoint[] => LOTS.find(item => item.number === number)!.polygon;

/** Half the width of the house: the lot has 8.66 m of front (owner) and the house fills it. */
export const HOUSE_HALF_WIDTH = 4.33;
/** The party walls, the medianeras, are 30 cm thick and shared: 15 cm stand on each lot (owner). The house's walls on the side lots are 15 cm. */
export const PARTY_WALL = .15;
const HALF_WIDTH = HOUSE_HALF_WIDTH;
/**
 * The south-west boundary of the lot leans toward the house: it is 13.70 m deep against 13.50 m
 * on the other side, and the rear is 8.70 m wide against 8.66 m at the front. The house's
 * south-west wall stands on that boundary, so it is not parallel to the north-east one.
 */
const SOUTH_WEST_LEAN = (HALF_WIDTH - 4.225) / 13.7;
/** The v of the lot's south-west boundary at depth u. */
export const houseSouthWestEdge = (u: number) => -HALF_WIDTH + (u + 5) * SOUTH_WEST_LEAN;
const southWest = (u: number): PlanPoint => [u, houseSouthWestEdge(u)];
const AZOTEA_REAR = 4; // upper block: 9 m deep, u in [-5, 4]
/** Front edge of the roof slab: a 1 m cantilever past the street line, level with the balcony. */
export const ROOF_FRONT = -6;
// The rear boundary is slightly inclined: 13.50 m deep on the north-east side, 13.70 m on the other.
const REAR_NE = 8.5;
const REAR_SW = 8.6;
// Rear ground-floor band, 4.5 m outside (3.95 m inside, between the walls): left arm | light well 2.5 m | terrace.
const LEFT_ARM_INNER = 1.5;
/**
 * The ground floor's front block reaches 0.46 m past the upper floor's rear wall (owner's depths): the wall that closes the light well, and the
 * living's and the office's, stands at u = 4.28 to 4.46, so the well starts at 4.46. Between the contrafrente's back face (1.11 m) and the rear wall's
 * inner face (8.35 m) fit the living (3.17 m), a wall of 0.18 m and the office (3.89 m).
 */
export const WELL_BACK_U = 4.46;
export const WELL_BACK_WALL = .18;
const TERRACE_INNER = -1;
const TERRACE_PARTY_WALL = 1.6; // wall on the corner's party wall
const TERRACE_RAILING = 1.1; // wall-railing on the light-well side
const TERRACE_WALL_THICKNESS = .15;
const TERRACE_REAR_WALL = .1; // wall on the party wall with the lot behind
const TERRACE_CENTRE_V = (houseSouthWestEdge(REAR_SW) + TERRACE_WALL_THICKNESS + TERRACE_INNER - TERRACE_WALL_THICKNESS) / 2;
/** A masonry grill at the back of the first-floor terrace (owner); its size is assumed: 1.2 m wide, 0.55 m deep, 0.85 m high, with a cast-iron grate. */
export const TERRACE_GRILL = { width: 1.2, depth: .55, height: .85, grate: .03 };
/**
 * The terrace's sink (owner): a shelf of Toscana Vena from the railing wall to the grill, which is on its left
 * seen from the terrace's rear, with the basin set into it. The shelf's depth, 0.5 m, its 3 cm edge, its 0.85 m height
 * and the basin's size are assumed.
 */
export const TERRACE_SHELF = { depth: .5, thickness: .03, height: .85, basinWidth: .5, basinDepth: .36, basin: .02 };
// The entrance is set back 1 m from the street line, between a 0.5 m wall that
// stays on the line next to the neighbour (north-east) and a 0.7 m pier next to
// the garage. The garage stands on the line. The upper floor overhangs the recess.
const ENTRY_SETBACK = 1;
const ENTRY_WALL = .5; // flush wall at the north-east end
const ENTRY_OUTER = HALF_WIDTH - ENTRY_WALL; // v of the recess's north-east return wall
/** The hall's width inside (owner: 3.7 m). The garage's is 4.43 m (owner); what is left between them is the wall that separates them. */
export const HALL_WIDTH = 3.7;
export const GARAGE_WIDTH = 4.43;
// The recess's south-west end, beside the pier, lines up with the wall that continues the recess's side wall to the back and separates the
// garage from the hall (owner): the hall is 3.7 m wide from the party wall's inner face, so that wall's hall face, and the recess's end, fall there.
const ENTRY_INNER = HALF_WIDTH - PARTY_WALL - HALL_WIDTH; // v of the recess's south-west end
/** The entrance recess, shared with the floor plans. */
export const ENTRY_RECESS = { setback: ENTRY_SETBACK, outer: ENTRY_OUTER, inner: ENTRY_INNER } as const;
/** Depth of the rear ground-floor band on each side, from the street line at u = -5 to the rear boundary. */
export const HOUSE_REAR = { northEast: REAR_NE, southWest: REAR_SW } as const;

/** Give a building a single-pitch roof rising toward `direction` by `rise` metres. */
const withSlope = (item: BuildingFootprint, direction: [number, number], rise: number): BuildingFootprint =>
  ({ ...item, slope: { direction, rise } });
/** Site-axes unit vector of the house frame's u axis, toward the rear. */
const REAR_DIRECTION: [number, number] = [Math.SQRT1_2, Math.SQRT1_2];
/** Site-axes unit vector of the house frame's +v axis, toward the north-east. */
const HOUSE_PLUS_V: [number, number] = (() => { const [x, z] = houseToSite(0, 1), [x0, z0] = houseToSite(0, 0); return [x - x0, z - z0] })();

const building = (
  id: string,
  label: string,
  footprint: SitePoint[],
  height: number,
  floors: number,
  isTarget = false,
  base?: number,
): BuildingFootprint => ({
  id,
  rnbId: null,
  isTarget,
  label,
  footprint,
  height,
  ...(base === undefined ? {} : { base }),
  roofHeight: 0,
  groundAltitude: BUILDING_SITE.groundAltitude,
  groundOffset: 0,
  floors,
  planarAccuracy: null,
  verticalAccuracy: null,
  source: 'estimated',
});

// Rooftop obstacles, read from the owner's photo of the azotea. Elevations are
// measured from the ground-floor level, on top of the 6.4 m roof slab.
/** Elevation of the azotea slab above the ground-floor level. */
export const ROOF_LEVEL = 2 * FLOOR_HEIGHT;
const ROOF = ROOF_LEVEL;
const PARAPET = 1.1; // white masonry parapets on the sides and rear
const FRONT_PARAPET = .3; // the balcony wall on the street side; the rest of the front is a grey railing
/**
 * Thickness of the parapets: the roof is 8.66 m wide outside and the azotea 8.5 m wide
 * between them.
 */
export const PARAPET_THICKNESS = (2 * HALF_WIDTH - 8.5) / 2;
const WALL = PARAPET_THICKNESS;
// Concrete tank block, 1.6 m x 1.6 m, against the rear wall of the azotea and
// slightly towards the south-west side. Its slab touches the rear parapet. The
// heights are estimates from the photo.
const TANK_U: [number, number] = [AZOTEA_REAR - WALL - .1 - 1.6, AZOTEA_REAR - WALL - .1];
const TANK_V: [number, number] = [-2, -.4];
const rooftop = (id: string, label: string, footprint: SitePoint[], base: number, top: number) =>
  building(`HOUSE-${id}`, label, footprint, ROOF + top, 1, false, ROOF + base);
const tankCentre: [number, number] = [(TANK_U[0] + TANK_U[1]) / 2, (TANK_V[0] + TANK_V[1]) / 2];
const octagon = (u: number, v: number, radius: number): SitePoint[] =>
  Array.from({ length: 8 }, (_, i) => houseToSite(u + radius * Math.cos(Math.PI / 8 + i * Math.PI / 4), v + radius * Math.sin(Math.PI / 8 + i * Math.PI / 4)));

/** Where the rear parapet is open for the stair: its 0.9 m, against the north-east party wall's inner face. */
const STAIR_OPENING: [number, number] = [HALF_WIDTH - PARTY_WALL - LAUNDRY.flight.width, HALF_WIDTH - PARTY_WALL];
const ROOFTOP_OBSTACLES: BuildingFootprint[] = [
  // The rear parapet is open where the stair from the laundry comes up to the azotea, on the party wall's side.
  rooftop('PARAPET-REAR', 'Parapeto trasero', poly([southWest(AZOTEA_REAR - WALL), southWest(AZOTEA_REAR), [AZOTEA_REAR, STAIR_OPENING[0]], [AZOTEA_REAR - WALL, STAIR_OPENING[0]]]), 0, PARAPET),
  rooftop('PARAPET-REAR-NE', 'Parapeto trasero · tramo junto a la medianera', rect(AZOTEA_REAR - WALL, AZOTEA_REAR, STAIR_OPENING[1], HALF_WIDTH), 0, PARAPET),
  rooftop('PARAPET-NE', 'Parapeto lado NE', rect(ROOF_FRONT, AZOTEA_REAR - WALL, HALF_WIDTH - WALL, HALF_WIDTH), 0, PARAPET),
  rooftop('PARAPET-SW', 'Parapeto lado SO', poly([southWest(ROOF_FRONT), southWest(AZOTEA_REAR - WALL),
    [AZOTEA_REAR - WALL, houseSouthWestEdge(AZOTEA_REAR - WALL) + WALL], [ROOF_FRONT, houseSouthWestEdge(ROOF_FRONT) + WALL]]), 0, PARAPET),
  rooftop('PARAPET-FRONT', 'Parapeto frontal', rect(ROOF_FRONT, ROOF_FRONT + WALL, houseSouthWestEdge(ROOF_FRONT) + WALL, HALF_WIDTH - WALL), 0, FRONT_PARAPET),
  // Three legs, as in the photo: one at the front, on the south-west side, and
  // two at the back against the rear parapet.
  rooftop('TANK-COLUMN-FR', 'Pata del tanque · frente derecha', rect(TANK_U[0] + .05, TANK_U[0] + .35, TANK_V[0] + .05, TANK_V[0] + .35), 0, .9),
  rooftop('TANK-COLUMN-RR', 'Pata del tanque · fondo derecha', rect(TANK_U[1] - .2, TANK_U[1] + .1, TANK_V[0] + .05, TANK_V[0] + .35), 0, .9),
  rooftop('TANK-COLUMN-RL', 'Pata del tanque · fondo izquierda', rect(TANK_U[1] - .2, TANK_U[1] + .1, TANK_V[1] - .35, TANK_V[1] - .05), 0, .9),
  rooftop('TANK-SLAB', 'Losa del tanque', rect(TANK_U[0] - .1, TANK_U[1] + .1, TANK_V[0] - .1, TANK_V[1] + .1), .9, 1.2),
  rooftop('TANK-BLOCK', 'Tanque de hormigón', rect(TANK_U[0], TANK_U[1], TANK_V[0], TANK_V[1]), 1.2, 2.25),
  rooftop('TANK-STEEL', 'Tanque de acero', octagon(tankCentre[0], tankCentre[1], .5), 2.25, 3.75),
];

// Where lot 7 (A) splits: a walled front patio next to the house, then the garage house.
const A_PATIO_END = 7.975;
const NEIGHBOUR_WALL = .15;
/**
 * Lot 7's front from the owner's photos: a brick wall 1.85 m high on the street line, an open
 * ground-floor patio 2 m deep behind it, and at its back the house's front, 3.4 m high, with a
 * 1.1 m wall on top that hides the windows of the first-floor terrace behind it. The tile-roofed
 * house stands at the back of the terrace.
 */
const A_WALL_HEIGHT = 1.85;
const A_FIRST_FLOOR = 3.4;
const A_PARAPET_TOP = 4.5;
const A_TERRACE_END = -.5;
const A_ROOF_RISE = .8;
/** Pitch of the sheet-metal roof of lot 7's garage: the owner says clearly more than 5 degrees. */
export const GARAGE_ROOF_DEGREES = 10;

export const SITE_BUILDINGS: BuildingFootprint[] = [
  // Ground floor and upper floor, with the entrance recess cut out of the front.
  building('HOUSE', 'Casa · azotea', poly([
    southWest(-5), southWest(AZOTEA_REAR), [AZOTEA_REAR, HALF_WIDTH],
    [-5, HALF_WIDTH], [-5, ENTRY_OUTER], [-5 + ENTRY_SETBACK, ENTRY_OUTER], [-5 + ENTRY_SETBACK, ENTRY_INNER], [-5, ENTRY_INNER],
  ]), 2 * FLOOR_HEIGHT, 2, true),
  // Upper floor only, over the recessed entrance (its ceiling is the ground floor's).
  building('HOUSE-ENTRY', 'Casa · planta alta sobre la entrada', rect(-5, -5 + ENTRY_SETBACK, ENTRY_INNER, ENTRY_OUTER), 2 * FLOOR_HEIGHT, 1, false, FLOOR_HEIGHT - .2),
  // The roof slab's 1 m cantilever in front of the facade, 0.5 m thick, level with the balcony below.
  building('HOUSE-CANTILEVER', 'Casa · voladizo de la azotea', poly([southWest(ROOF_FRONT), southWest(-5), [-5, HALF_WIDTH], [ROOF_FRONT, HALF_WIDTH]]), 2 * FLOOR_HEIGHT, 0, false, 2 * FLOOR_HEIGHT - .5),
  // The strip of the ground floor between the upper floor's rear wall and the wall that closes the light well.
  building('HOUSE-WELL-BACK', 'Casa · planta baja hasta el fondo del pulmón', rect(AZOTEA_REAR, WELL_BACK_U, TERRACE_INNER, LEFT_ARM_INNER), FLOOR_HEIGHT, 1),
  building('HOUSE-ARM', 'Casa · planta baja izquierda', rect(AZOTEA_REAR, REAR_NE, LEFT_ARM_INNER, HALF_WIDTH), FLOOR_HEIGHT, 1),
  // The laundry on the left arm and the stair to the azotea (owner's photos), at first-floor level.
  ...laundryVolumes(FLOOR_HEIGHT, HALF_WIDTH - PARTY_WALL, PARTY_WALL, AZOTEA_REAR, ROOF_LEVEL).map(item => {
    const volume = building(item.id, item.label, rect(item.u[0], item.u[1], item.v[0], item.v[1]), item.height, 0, false, item.base)
    return item.rise ? withSlope(volume, item.toward === 'azotea' ? [-REAR_DIRECTION[0], -REAR_DIRECTION[1]] : HOUSE_PLUS_V, item.rise) : volume
  }),
  building('HOUSE-TERRACE', 'Casa · terracita con parrilla', poly([southWest(AZOTEA_REAR), southWest(REAR_SW), [REAR_SW, TERRACE_INNER], [AZOTEA_REAR, TERRACE_INNER]]), FLOOR_HEIGHT, 1),
  // The terrace's roof is at first-floor level. Along the corner's party wall it has a 1.6 m wall, and on the
  // inner side, over the light well, a 1.1 m railing wall (owner).
  building('HOUSE-TERRACE-WALL', 'Casa · medianera de la terracita', poly([southWest(AZOTEA_REAR), southWest(REAR_SW),
    [REAR_SW, houseSouthWestEdge(REAR_SW) + TERRACE_WALL_THICKNESS], [AZOTEA_REAR, houseSouthWestEdge(AZOTEA_REAR) + TERRACE_WALL_THICKNESS]]),
    FLOOR_HEIGHT + TERRACE_PARTY_WALL, 0, false, FLOOR_HEIGHT),
  // The terrace's rear end, on the boundary with the lot behind: a wall as high as the one on the corner's side.
  building('HOUSE-TERRACE-WALL-REAR', 'Casa · medianera del fondo de la terracita', rect(REAR_SW - TERRACE_REAR_WALL, REAR_SW, houseSouthWestEdge(REAR_SW) + TERRACE_WALL_THICKNESS, TERRACE_INNER - TERRACE_WALL_THICKNESS),
    FLOOR_HEIGHT + TERRACE_PARTY_WALL, 0, false, FLOOR_HEIGHT),
  building('HOUSE-TERRACE-RAIL', 'Casa · baranda de la terracita', rect(AZOTEA_REAR, REAR_SW, TERRACE_INNER - TERRACE_WALL_THICKNESS, TERRACE_INNER),
    FLOOR_HEIGHT + TERRACE_RAILING, 0, false, FLOOR_HEIGHT),
  // The grill stands at the back of the terrace, against the rear, centred between the party-wall wall and the railing wall.
  building('HOUSE-TERRACE-GRILL', 'Casa · parrilla de la terracita', rect(REAR_SW - TERRACE_REAR_WALL - .05 - TERRACE_GRILL.depth, REAR_SW - TERRACE_REAR_WALL - .05, TERRACE_CENTRE_V - TERRACE_GRILL.width / 2, TERRACE_CENTRE_V + TERRACE_GRILL.width / 2),
    FLOOR_HEIGHT + TERRACE_GRILL.height, 0, false, FLOOR_HEIGHT),
  building('HOUSE-TERRACE-GRILL-GRATE', 'Casa · parrilla de la terracita · reja', rect(REAR_SW - TERRACE_REAR_WALL - .05 - TERRACE_GRILL.depth, REAR_SW - TERRACE_REAR_WALL - .05, TERRACE_CENTRE_V - TERRACE_GRILL.width / 2, TERRACE_CENTRE_V + TERRACE_GRILL.width / 2),
    FLOOR_HEIGHT + TERRACE_GRILL.height + TERRACE_GRILL.grate, 0, false, FLOOR_HEIGHT + TERRACE_GRILL.height),
  // The sink: a stone shelf from the railing wall to the grill, on the grill's left seen from the rear, with the basin in it.
  building('HOUSE-TERRACE-SHELF', 'Casa · estante de la terracita', rect(REAR_SW - TERRACE_REAR_WALL - .05 - TERRACE_SHELF.depth, REAR_SW - TERRACE_REAR_WALL - .05, TERRACE_CENTRE_V + TERRACE_GRILL.width / 2, TERRACE_INNER - TERRACE_WALL_THICKNESS),
    FLOOR_HEIGHT + TERRACE_SHELF.height, 0, false, FLOOR_HEIGHT + TERRACE_SHELF.height - TERRACE_SHELF.thickness),
  building('HOUSE-TERRACE-SINK-BASIN', 'Casa · pileta de la terracita', rect(REAR_SW - TERRACE_REAR_WALL - .05 - TERRACE_SHELF.depth / 2 - TERRACE_SHELF.basinDepth / 2, REAR_SW - TERRACE_REAR_WALL - .05 - TERRACE_SHELF.depth / 2 + TERRACE_SHELF.basinDepth / 2, (TERRACE_CENTRE_V + TERRACE_GRILL.width / 2 + TERRACE_INNER - TERRACE_WALL_THICKNESS) / 2 - TERRACE_SHELF.basinWidth / 2, (TERRACE_CENTRE_V + TERRACE_GRILL.width / 2 + TERRACE_INNER - TERRACE_WALL_THICKNESS) / 2 + TERRACE_SHELF.basinWidth / 2),
    FLOOR_HEIGHT + TERRACE_SHELF.height + TERRACE_SHELF.basin, 0, false, FLOOR_HEIGHT + TERRACE_SHELF.height),
  // Lot 7 (A), 9.00 m of front. Street View (Aug 2025): next to the house a brick wall with a
  // green railing on the street line, a front patio about 2 m deep and a one-floor house behind
  // it; then a garage with green doors under a sheet-metal roof.
  // Its tile roof (owner's photos) is a single pitch like the garage's, gentler, rising toward the back.
  // The house stands on the first-floor terrace, over a ground floor.
  building('NEIGHBOR-A', 'Vecino A (NE)', rect(-3, 8.3, HALF_WIDTH, A_PATIO_END), A_FIRST_FLOOR, 1),
  withSlope(building('NEIGHBOR-A-UPPER', 'Vecino A · casa de tejas del P1', rect(A_TERRACE_END, 8.3, HALF_WIDTH, A_PATIO_END), A_FIRST_FLOOR + 2.6, 1, false, A_FIRST_FLOOR),
    REAR_DIRECTION, A_ROOF_RISE),
  building('NEIGHBOR-A-PARAPET', 'Vecino A · pared de la terracita', rect(-3, -3 + NEIGHBOUR_WALL, HALF_WIDTH, A_PATIO_END), A_PARAPET_TOP, 0, false, A_FIRST_FLOOR),
  building('NEIGHBOR-A-PARAPET-SIDE', 'Vecino A · pared lateral de la terracita', rect(-3 + NEIGHBOUR_WALL, A_TERRACE_END, A_PATIO_END - NEIGHBOUR_WALL, A_PATIO_END), A_PARAPET_TOP, 0, false, A_FIRST_FLOOR),
  building('NEIGHBOR-A-WALL', 'Vecino A · muro de calle', rect(-5, -5 + NEIGHBOUR_WALL, HALF_WIDTH, A_PATIO_END), A_WALL_HEIGHT, 0),
  // The garage is two cars deep, about 9 m, under a sheet-metal roof that rises about 10 degrees from
  // its 2.7 m eave at the street toward the back; behind it stands a taller two-level volume.
  withSlope(building('NEIGHBOR-A-GARAGE', 'Vecino A · garaje de chapa', rect(-5, 4, A_PATIO_END, 13.475), 2.7, 1),
    REAR_DIRECTION, 9 * Math.tan(GARAGE_ROOF_DEGREES * Math.PI / 180)),
  building('NEIGHBOR-A-REAR', 'Vecino A · volumen trasero', rect(4, 8.3, A_PATIO_END, 13.475), 5.6, 2),
  // Lot 10, behind: 7.80 m by 28.40 m, a one-floor house. It shares its front wall with the
  // rear boundary of lots 7, 8 and 9.
  building('NEIGHBOR-B', 'Vecino del fondo', poly(lotPolygon(10)), 3.3, 1),
  // Lot 9, the corner: three flats in horizontal property, each with its own door. Street
  // View shows a two-floor block next to the house, and a one-floor front toward the cross street.
  building('NEIGHBOR-C-UPPER', 'Vecino C · bloque de 2 plantas', poly([[-5, -8.9], [4, -8.9], southWest(4), southWest(-5)]), 6.6, 2),
  // The condenser of an air conditioner on the red azotea (owner's photo): about 0.8 m wide, 0.3 m deep and
  // 0.55 m tall on two bricks, in the middle of the block, 2.5 m from the party wall with the house.
  building('NEIGHBOR-C-AC', 'Vecino C · equipo de aire acondicionado', rect(-.4, .4, -7.15, -6.85), 6.6 + .75, 0, false, 6.6),
  building('NEIGHBOR-C-REAR', 'Vecino C · planta baja trasera', poly([[4, -8.9], [8.5, -8.9], southWest(8.5), southWest(4)]), 3, 1),
  building('NEIGHBOR-C-FRONT', 'Vecino C · esquina',
    poly([[-5, -8.9], OCHAVA_START, OCHAVA_END, CROSS_STREET_END, [8.5, -8.9]]), 3, 1),
  // Above the corner's ground floor (Street View): a terrace with a parapet over the chamfer, an upper
  // room under a sheet roof, and a lower parapet toward the rear.
  building('NEIGHBOR-C-TERRACE', 'Vecino C · terraza sobre la ochava', poly([OCHAVA_START, OCHAVA_END, [OCHAVA_END[0], CORNER_UPPER.terraceBackV], [OCHAVA_START[0], CORNER_UPPER.terraceBackV]]), CORNER_UPPER.terraceHeight, 1, false, 3),
  building('NEIGHBOR-C-TANK-ROOM', 'Vecino C · cuarto del tanque', poly(squareAround(cornerTankCentre(), CORNER_TANK.roomSide)), CORNER_TANK.roomTop, 1, false, CORNER_UPPER.terraceHeight),
  building('NEIGHBOR-C-TANK', 'Vecino C · tanque de fibrocemento', poly(circleAround(cornerTankCentre(), CORNER_TANK.diameter / 2, CORNER_TANK.sides)), CORNER_TANK.top, 0, false, CORNER_TANK.roomTop),
  building('NEIGHBOR-C-ROOM', 'Vecino C · habitación alta', poly([OCHAVA_END, crossStreetAt(CORNER_UPPER.roomEndU), [CORNER_UPPER.roomEndU, -11.5], [OCHAVA_END[0], -11.5]]), CORNER_UPPER.roomHeight, 1, false, 3),
  building('NEIGHBOR-C-PARAPET', 'Vecino C · pared blanca sobre la calle transversal', poly([crossStreetAt(CORNER_UPPER.roomEndU), CROSS_STREET_END, [CROSS_STREET_END[0], CROSS_STREET_END[1] + CORNER_UPPER.parapetThickness], [CORNER_UPPER.roomEndU, crossStreetAt(CORNER_UPPER.roomEndU)[1] + CORNER_UPPER.parapetThickness]]), CORNER_UPPER.parapetHeight, 1, false, 3),
  // The other lots of the block, from the block plan: one prism each, in the band by the street.
  ...genericBuildings().map(({ lot, footprint }) =>
    building(`LOT-${String(lot.number).padStart(2, '0')}`, `Lote ${lot.number}`, poly(footprint), lot.height, lot.floors)),
  // The block across the street, from its block plan; lot 24, opposite the house, from its survey sketch.
  ...OPPOSITE_LOTS.flatMap(item => {
    const id = `OPP-${String(item.number).padStart(2, '0')}`, label = `Manzana de enfrente · lote ${item.number}`
    return [
      building(id, label, poly(item.building), item.height, item.floors ?? 1),
      ...(item.extras ?? []).map(extra => {
        const volume = building(`${id}-${extra.suffix}`, `${label} · ${extra.label}`, poly(extra.ring), extra.height, 1, false, extra.base)
        return extra.rise ? withSlope(volume, [-HOUSE_PLUS_V[0], -HOUSE_PLUS_V[1]], extra.rise) : volume
      }),
    ]
  }),
  ...ROOFTOP_OBSTACLES,
];

/** The streets around the block, drawn from the widths on the block plan. */
export const SITE_ROADS: SiteRoad[] = blockStreets().map(street => ({
  id: `road-${street.id}`,
  name: street.id === 'front' ? 'Tapalque' : 'Calle',
  points: planToSite(street.points),
  width: street.width,
  isPath: false,
}));

/** The lot of the house, from its municipal survey sketch. */
export const SITE_PARCEL: { id: string; label: string; area: number; footprint: SitePoint[] } = {
  "id": "HOUSE",
  "label": "Tapalque",
  "area": Math.round(Math.abs(polygonArea(lotPolygon(8))) * 100) / 100,
  "footprint": poly(lotPolygon(8)),
};

/** Every lot of the block, with where its outline comes from. */
export const SITE_LOTS: { number: number; source: 'survey' | 'block-plan'; footprint: SitePoint[] }[] =
  [
    ...LOTS.map(item => ({ number: item.number, source: item.source, footprint: poly(item.polygon) })),
    // Numbered 100 + n so they do not collide with the house block's lots.
    ...OPPOSITE_LOTS.map(item => ({ number: 100 + item.number, source: (item.number === 24 ? 'survey' : 'block-plan') as 'survey' | 'block-plan', footprint: poly(item.polygon) })),
  ];
