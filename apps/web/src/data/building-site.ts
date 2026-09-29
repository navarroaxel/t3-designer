/**
 * Tapalque, Buenos Aires. Measured from Google Earth 3D imagery (captured
 * 2021-09-24) and reviewed on 2026-09-29.
 * Units: metres. x = true east, z = true south, y = up. Origin is the centre
 * of the Google Earth view that frames the house.
 * Street View imagery (August 2025) refines the front elevation and the height
 * of the neighbours' fronts.
 * The roof (10 m x 8.5 m, rotated 45 deg from north) was measured from the scale
 * bar of a top-down view. It spans 9 m of house plus a 1 m cantilever over the
 * pavement, ending on the same line as the first-floor balcony. The rear
 * ground-floor band, terrace and light well follow the owner's dimensions. Heights follow floor counts given by the
 * owner (3.2 m per floor), and neighbouring footprints are estimated from the
 * same view. This is a shading model, not a survey.
 */
export type SitePoint = [number, number];

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

/**
 * House frame: u runs toward the rear (south-east, away from the street),
 * v toward the north-east (the left side seen from the street). The street line,
 * where the facade and the neighbours' fronts stand, is u = -5. The roof slab spans
 * u from -6 (its front edge, 1 m past the street line) to 4, so its centre is u = -1
 * and the origin is 1 m behind it.
 */
const S = Math.SQRT1_2;
export const HOUSE_CENTER: SitePoint = [-0.74 + S, -1.0 + S];
/** Three.js yaw that maps a group's local +x to the house's rear axis (u) and +z to -v. */
export const HOUSE_YAW = -Math.PI / 4;
/** A point of the house frame in site coordinates (metres, x east, z south). */
export const houseToSite = (u: number, v: number): SitePoint => [
  HOUSE_CENTER[0] + S * (u + v),
  HOUSE_CENTER[1] + S * (u - v),
];
const fromHouse = houseToSite;
/** A site point in the house frame, as [u, v]. */
export const siteToHouse = ([x, z]: SitePoint): [number, number] => {
  const dx = x - HOUSE_CENTER[0], dz = z - HOUSE_CENTER[1]
  return [S * (dx + dz), S * (dx - dz)]
};
const rect = (u0: number, u1: number, v0: number, v1: number): SitePoint[] =>
  [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => fromHouse(u, v));

const HALF_WIDTH = 4.25; // 8.5 m wide
const AZOTEA_REAR = 4; // upper block: 9 m deep, u in [-5, 4]
/** Front edge of the roof slab: a 1 m cantilever past the street line, level with the balcony. */
export const ROOF_FRONT = -6;
const LOT_REAR = 8.5; // lot: 13.5 m deep, u in [-5, 8.5]
// Rear ground-floor band, 4.5 m outside (3.95 m inside, between the walls): left arm 2.75 m | light well 2.5 m | terrace 3.25 m.
const LEFT_ARM_INNER = 1.5;
const TERRACE_INNER = -1;
// The entrance is set back 1 m from the street line, between a 0.5 m wall that
// stays on the line next to the neighbour (north-east) and a 0.7 m pier next to
// the garage. The garage stands on the line. The upper floor overhangs the recess.
const ENTRY_SETBACK = 1;
const ENTRY_WALL = .5; // flush wall at the north-east end
const ENTRY_OUTER = HALF_WIDTH - ENTRY_WALL; // v of the recess's north-east return wall
const ENTRY_INNER = .85; // v of the recess's south-west end, beside the pier

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
const WALL = .15;
// Concrete tank block, 1.6 m x 1.6 m, against the rear wall of the azotea and
// slightly towards the south-west side. Its slab touches the rear parapet. The
// heights are estimates from the photo.
const TANK_U: [number, number] = [AZOTEA_REAR - 1.85, AZOTEA_REAR - .25];
const TANK_V: [number, number] = [-2, -.4];
const rooftop = (id: string, label: string, footprint: SitePoint[], base: number, top: number) =>
  building(`HOUSE-${id}`, label, footprint, ROOF + top, 1, false, ROOF + base);
const tankCentre: [number, number] = [(TANK_U[0] + TANK_U[1]) / 2, (TANK_V[0] + TANK_V[1]) / 2];
const octagon = (u: number, v: number, radius: number): SitePoint[] =>
  Array.from({ length: 8 }, (_, i) => fromHouse(u + radius * Math.cos(Math.PI / 8 + i * Math.PI / 4), v + radius * Math.sin(Math.PI / 8 + i * Math.PI / 4)));

const ROOFTOP_OBSTACLES: BuildingFootprint[] = [
  rooftop('PARAPET-REAR', 'Parapeto trasero', rect(AZOTEA_REAR - WALL, AZOTEA_REAR, -HALF_WIDTH, HALF_WIDTH), 0, PARAPET),
  rooftop('PARAPET-NE', 'Parapeto lado NE', rect(ROOF_FRONT, AZOTEA_REAR - WALL, HALF_WIDTH - WALL, HALF_WIDTH), 0, PARAPET),
  rooftop('PARAPET-SW', 'Parapeto lado SO', rect(ROOF_FRONT, AZOTEA_REAR - WALL, -HALF_WIDTH, -HALF_WIDTH + WALL), 0, PARAPET),
  rooftop('PARAPET-FRONT', 'Parapeto frontal', rect(ROOF_FRONT, ROOF_FRONT + WALL, -HALF_WIDTH + WALL, HALF_WIDTH - WALL), 0, FRONT_PARAPET),
  // Three legs, as in the photo: one at the front, on the south-west side, and
  // two at the back against the rear parapet.
  rooftop('TANK-COLUMN-FR', 'Pata del tanque · frente derecha', rect(TANK_U[0] + .05, TANK_U[0] + .35, TANK_V[0] + .05, TANK_V[0] + .35), 0, .9),
  rooftop('TANK-COLUMN-RR', 'Pata del tanque · fondo derecha', rect(TANK_U[1] - .2, TANK_U[1] + .1, TANK_V[0] + .05, TANK_V[0] + .35), 0, .9),
  rooftop('TANK-COLUMN-RL', 'Pata del tanque · fondo izquierda', rect(TANK_U[1] - .2, TANK_U[1] + .1, TANK_V[1] - .35, TANK_V[1] - .05), 0, .9),
  rooftop('TANK-SLAB', 'Losa del tanque', rect(TANK_U[0] - .1, TANK_U[1] + .1, TANK_V[0] - .1, TANK_V[1] + .1), .9, 1.2),
  rooftop('TANK-BLOCK', 'Tanque de hormigón', rect(TANK_U[0], TANK_U[1], TANK_V[0], TANK_V[1]), 1.2, 2.25),
  rooftop('TANK-STEEL', 'Tanque de acero', octagon(tankCentre[0], tankCentre[1], .5), 2.25, 3.75),
];

export const SITE_BUILDINGS: BuildingFootprint[] = [
  // Ground floor and upper floor, with the entrance recess cut out of the front.
  building('HOUSE', 'Casa · azotea', [
    [-5, -HALF_WIDTH], [AZOTEA_REAR, -HALF_WIDTH], [AZOTEA_REAR, HALF_WIDTH],
    [-5, HALF_WIDTH], [-5, ENTRY_OUTER], [-5 + ENTRY_SETBACK, ENTRY_OUTER], [-5 + ENTRY_SETBACK, ENTRY_INNER], [-5, ENTRY_INNER],
  ].map(([u, v]) => fromHouse(u, v)), 2 * FLOOR_HEIGHT, 2, true),
  // Upper floor only, over the recessed entrance (its ceiling is the ground floor's).
  building('HOUSE-ENTRY', 'Casa · planta alta sobre la entrada', rect(-5, -5 + ENTRY_SETBACK, ENTRY_INNER, ENTRY_OUTER), 2 * FLOOR_HEIGHT, 1, false, FLOOR_HEIGHT - .2),
  // The roof slab's 1 m cantilever in front of the facade, 0.5 m thick, level with the balcony below.
  building('HOUSE-CANTILEVER', 'Casa · voladizo de la azotea', rect(ROOF_FRONT, -5, -HALF_WIDTH, HALF_WIDTH), 2 * FLOOR_HEIGHT, 0, false, 2 * FLOOR_HEIGHT - .5),
  building('HOUSE-ARM', 'Casa · planta baja izquierda', rect(AZOTEA_REAR, LOT_REAR, LEFT_ARM_INNER, HALF_WIDTH), FLOOR_HEIGHT, 1),
  building('HOUSE-TERRACE', 'Casa · terracita con parrilla', rect(AZOTEA_REAR, LOT_REAR, -HALF_WIDTH, TERRACE_INNER), FLOOR_HEIGHT, 1),
  // Street View (Aug 2025). Every front stands on the same street line, u = -5.
  // A: the lot next door has a brick wall with a green railing on that line, a
  // front patio about 2 m deep, and then a one-floor house.
  building('NEIGHBOR-A', 'Vecino A (NE)', rect(-3, 8, HALF_WIDTH, 9.1), 3.8, 1),
  building('NEIGHBOR-A-WALL', 'Vecino A · muro de calle', rect(-5, -5 + WALL, HALF_WIDTH, 9.1), 2.1, 0),
  building('NEIGHBOR-B', 'Vecino B (SE)', rect(LOT_REAR, 14.8, -5, HALF_WIDTH), FLOOR_HEIGHT, 1),
  // C: corner house on the south-west side, flush with the street. The two-floor
  // block is in front; the rest of the frontage is one floor with a roof terrace.
  building('NEIGHBOR-C-UPPER', 'Vecino C · bloque de 2 plantas', rect(-5, 4, -8.6, -HALF_WIDTH), 6.6, 2),
  building('NEIGHBOR-C-REAR', 'Vecino C · planta baja trasera', rect(4, LOT_REAR, -8.6, -HALF_WIDTH), 3, 1),
  building('NEIGHBOR-C-FRONT', 'Vecino C · esquina',
    [[-5, -8.6], [LOT_REAR, -8.6], [LOT_REAR, -14], [-3.8, -14], [-5, -12.8]].map(([u, v]) => fromHouse(u, v)), 3, 1),
  // D: the garage house beyond A, with green doors and a sheet-metal canopy.
  building('NEIGHBOR-D', 'Vecino D (NE)', rect(-5, 8, 9.1, 16.6), 3.3, 1),
  ...ROOFTOP_OBSTACLES,
];

export const SITE_ROADS: SiteRoad[] = [
  { id: 'road-tapalque', name: 'Tapalque', points: [fromHouse(-14, -35), fromHouse(-14, 35)], width: 10, isPath: false },
  { id: 'road-cross', name: 'Calle transversal', points: [fromHouse(-30, -20), fromHouse(30, -20)], width: 10, isPath: false },
];

export const SITE_PARCEL: { id: string; label: string; area: number; footprint: SitePoint[] } = {
  "id": "HOUSE",
  "label": "Tapalque",
  "area": 114.75,
  "footprint": rect(-5, LOT_REAR, -HALF_WIDTH, HALF_WIDTH)
};
