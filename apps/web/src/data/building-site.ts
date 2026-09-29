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
 * municipal survey sketches (8.95 m of front, 13.50 m and 13.70 m deep), and so do
 * the neighbouring lots 7, 9 and 10; the rest of the block comes from the block plan,
 * digitised by eye (see block.ts). The rear ground-floor band, terrace and light well
 * follow the owner's dimensions. Heights follow floor counts given by the
 * owner (3.2 m per floor), and neighbouring footprints are estimated from the
 * same view. This is a shading model, not a survey.
 */
import { houseToSite, planToSite, polygonArea, type PlanPoint, type SitePoint } from './frame.ts'
import { LOTS, blockStreets, genericBuildings } from './block.ts'

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
const lotPolygon = (number: number): PlanPoint[] => LOTS.find(item => item.number === number)!.polygon;

/** Half the width of the house: the lot has 8.95 m of front and the house fills it. */
export const HOUSE_HALF_WIDTH = 4.475;
const HALF_WIDTH = HOUSE_HALF_WIDTH;
/**
 * The south-west boundary of the lot leans toward the house: it is 13.70 m deep against 13.50 m
 * on the other side, and the rear is 8.70 m wide against 8.95 m at the front. The house's
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
const TERRACE_INNER = -1;
// The entrance is set back 1 m from the street line, between a 0.5 m wall that
// stays on the line next to the neighbour (north-east) and a 0.7 m pier next to
// the garage. The garage stands on the line. The upper floor overhangs the recess.
const ENTRY_SETBACK = 1;
const ENTRY_WALL = .5; // flush wall at the north-east end
const ENTRY_OUTER = HALF_WIDTH - ENTRY_WALL; // v of the recess's north-east return wall
const ENTRY_INNER = .85; // v of the recess's south-west end, beside the pier
/** The entrance recess, shared with the floor plans. */
export const ENTRY_RECESS = { setback: ENTRY_SETBACK, outer: ENTRY_OUTER, inner: ENTRY_INNER } as const;
/** Depth of the rear ground-floor band on each side, from the street line at u = -5 to the rear boundary. */
export const HOUSE_REAR = { northEast: REAR_NE, southWest: REAR_SW } as const;

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
const FRONT_PARAPET = .8; // tiled band on the street side
/**
 * Thickness of the parapets: the roof is 8.95 m wide outside and the azotea 8.5 m wide
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

const ROOFTOP_OBSTACLES: BuildingFootprint[] = [
  rooftop('PARAPET-REAR', 'Parapeto trasero', poly([southWest(AZOTEA_REAR - WALL), southWest(AZOTEA_REAR), [AZOTEA_REAR, HALF_WIDTH], [AZOTEA_REAR - WALL, HALF_WIDTH]]), 0, PARAPET),
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
  building('HOUSE-ARM', 'Casa · planta baja izquierda', rect(AZOTEA_REAR, REAR_NE, LEFT_ARM_INNER, HALF_WIDTH), FLOOR_HEIGHT, 1),
  building('HOUSE-TERRACE', 'Casa · terracita con parrilla', poly([southWest(AZOTEA_REAR), southWest(REAR_SW), [REAR_SW, TERRACE_INNER], [AZOTEA_REAR, TERRACE_INNER]]), FLOOR_HEIGHT, 1),
  // Lot 7 (A), 9.00 m of front. Street View (Aug 2025): next to the house a brick wall with a
  // green railing on the street line, a front patio about 2 m deep and a one-floor house behind
  // it; then a garage house with green doors and a sheet-metal canopy.
  building('NEIGHBOR-A', 'Vecino A (NE)', rect(-3, 8.3, HALF_WIDTH, A_PATIO_END), 3.8, 1),
  building('NEIGHBOR-A-WALL', 'Vecino A · muro de calle', rect(-5, -5 + NEIGHBOUR_WALL, HALF_WIDTH, A_PATIO_END), 2.1, 0),
  building('NEIGHBOR-A-GARAGE', 'Vecino A · casa del garaje', rect(-5, 8.3, A_PATIO_END, 13.475), 3.3, 1),
  // Lot 10, behind: 7.80 m by 28.40 m, a one-floor house. It shares its front wall with the
  // rear boundary of lots 7, 8 and 9.
  building('NEIGHBOR-B', 'Vecino del fondo', poly(lotPolygon(10)), 3.3, 1),
  // Lot 9, the corner: three flats in horizontal property, each with its own door. Street
  // View shows a two-floor block next to the house, and a one-floor front toward the cross street.
  building('NEIGHBOR-C-UPPER', 'Vecino C · bloque de 2 plantas', poly([[-5, -8.9], [4, -8.9], southWest(4), southWest(-5)]), 6.6, 2),
  building('NEIGHBOR-C-REAR', 'Vecino C · planta baja trasera', poly([[4, -8.9], [8.5, -8.9], southWest(8.5), southWest(4)]), 3, 1),
  building('NEIGHBOR-C-FRONT', 'Vecino C · esquina',
    poly([[-5, -8.9], [-5, -10.965], [-0.79, -15.175], [8.28, -14.825], [8.5, -8.9]]), 3, 1),
  // The other lots of the block, from the block plan: one prism each, in the band by the street.
  ...genericBuildings().map(({ lot, footprint }) =>
    building(`LOT-${String(lot.number).padStart(2, '0')}`, `Lote ${lot.number}`, poly(footprint), lot.height, lot.floors)),
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
  LOTS.map(item => ({ number: item.number, source: item.source, footprint: poly(item.polygon) }));
