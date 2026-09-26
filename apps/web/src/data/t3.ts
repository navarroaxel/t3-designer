import {
  ApartmentSchema,
  SCENE_SCHEMA_VERSION,
  type Point2D,
  type Wall,
} from '@t3-designer/scene-schema'

// The screenshot provides AREAS only. None of the lengths below are surveyed.
// These five chosen dimensions approximate the drawing's proportions. All other
// boundaries are solved from the reported areas, retaining full precision so
// adjacent room polygons meet. Wall thickness is an overlay on these area zones;
// the resulting clear floor area must not be presented as a Carrez measurement.
const estimated = {
  bedroomDepth: 3.5,
  westStripWidth: 2.65,
  closetWidth: 1.1,
  wcWidth: 0.82,
  balconyWidth: 2.4,
  wallHeight: 2.5,
  exteriorThickness: 0.18,
  interiorThickness: 0.1,
}

// Values transcribed from the supplied image, not independently verified against
// the diagnostic report referenced in its footer. Areas are square meters.
const reported = {
  living: 16.39,
  kitchen: 4.26,
  bedroom1: 11.81,
  bedroom2: 9.32,
  bathroom: 3.21,
  entrance: 2.26,
  wc: 0.87,
  closet: 1.06,
  balcony: 1.26,
  basement: 8.54,
  carrez: 49.18,
}

// Plan coordinates are [X, Z]: right/east is +X, down/south is +Z.
// The origin is the northwest corner of the bounding rectangle, outside the
// stepped footprint. North is -Z; Y is height above the finished floor.
const xService = estimated.westStripWidth
const zBedroomsSouth = estimated.bedroomDepth
const lowerDepth =
  (reported.entrance + reported.bathroom + reported.wc + reported.kitchen) /
  xService
const zSouth = zBedroomsSouth + lowerDepth
const xLivingEast = xService + reported.living / lowerDepth
const xEast = xLivingEast + estimated.closetWidth
const xBedroomsWest =
  xEast - (reported.bedroom1 + reported.bedroom2) / estimated.bedroomDepth
const xBedroomDivider = xBedroomsWest + reported.bedroom1 / estimated.bedroomDepth
const zEntranceSouth = zBedroomsSouth + reported.entrance / xService
const zBathroomSouth = zEntranceSouth + (reported.bathroom + reported.wc) / xService
const zWcSouth = zEntranceSouth + reported.wc / estimated.wcWidth
const zClosetSouth = zBedroomsSouth + reported.closet / estimated.closetWidth

function rectangle(west: number, north: number, east: number, south: number): Point2D[] {
  return [[west, north], [east, north], [east, south], [west, south]]
}

const perimeter: Point2D[] = [
  [xBedroomsWest, 0],
  [xEast, 0],
  [xEast, zClosetSouth],
  [xLivingEast, zClosetSouth],
  [xLivingEast, zSouth],
  [0, zSouth],
  [0, zBedroomsSouth],
  [xBedroomsWest, zBedroomsSouth],
]

function wall(id: string, from: Point2D, to: Point2D, kind: Wall['kind']): Wall {
  return {
    id, from, to, kind,
    height: estimated.wallHeight,
    thickness: kind === 'exterior' ? estimated.exteriorThickness : estimated.interiorThickness,
    estimated: true,
  }
}

const exteriorWallIds = [
  'exterior-north', 'exterior-east', 'exterior-closet-south',
  'exterior-living-east', 'exterior-south', 'exterior-west',
  'exterior-entrance-north', 'exterior-bedroom-west',
]

export const t3Apartment = ApartmentSchema.parse({
  schemaVersion: SCENE_SCHEMA_VERSION,
  id: 'quimper-t3',
  name: 'Quimper · Appartement T3',
  units: 'meters',
  coordinateSystem: { x: 'east', y: 'up', z: 'south' },
  perimeter,
  rooms: [
    {
      id: 'bedroom-1', name: 'Chambre 1', reportedArea: reported.bedroom1,
      polygon: rectangle(xBedroomsWest, 0, xBedroomDivider, zBedroomsSouth),
      color: '#dfc7bf',
    },
    {
      id: 'bedroom-2', name: 'Chambre 2', reportedArea: reported.bedroom2,
      polygon: rectangle(xBedroomDivider, 0, xEast, zBedroomsSouth),
      color: '#c9d2bd',
    },
    {
      id: 'living', name: 'Salon / séjour', reportedArea: reported.living,
      polygon: rectangle(xService, zBedroomsSouth, xLivingEast, zSouth),
      color: '#e3d5bd',
    },
    {
      id: 'entrance', name: 'Entrée', reportedArea: reported.entrance,
      polygon: rectangle(0, zBedroomsSouth, xService, zEntranceSouth),
      color: '#ded6c3',
    },
    {
      id: 'wc', name: 'WC', reportedArea: reported.wc,
      polygon: rectangle(0, zEntranceSouth, estimated.wcWidth, zWcSouth),
      color: '#c9dadb',
    },
    {
      id: 'bathroom', name: 'Salle d’eau', reportedArea: reported.bathroom,
      // L-shaped: the WC occupies the northwest corner of this service block.
      polygon: [
        [estimated.wcWidth, zEntranceSouth], [xService, zEntranceSouth],
        [xService, zBathroomSouth], [0, zBathroomSouth],
        [0, zWcSouth], [estimated.wcWidth, zWcSouth],
      ],
      color: '#c1d3d2',
    },
    {
      id: 'kitchen', name: 'Cuisine', reportedArea: reported.kitchen,
      polygon: rectangle(0, zBathroomSouth, xService, zSouth),
      color: '#cfbea3',
    },
    {
      id: 'closet', name: 'Placard', reportedArea: reported.closet,
      polygon: rectangle(xLivingEast, zBedroomsSouth, xEast, zClosetSouth),
      color: '#ccc9bc',
    },
  ],
  walls: [
    ...perimeter.map((from, index) => wall(
      exteriorWallIds[index], from, perimeter[(index + 1) % perimeter.length], 'exterior',
    )),
    wall('bedroom-divider', [xBedroomDivider, 0], [xBedroomDivider, zBedroomsSouth], 'interior'),
    wall('bedroom-1-south', [xBedroomsWest, zBedroomsSouth], [xBedroomDivider, zBedroomsSouth], 'interior'),
    wall('bedroom-2-south', [xBedroomDivider, zBedroomsSouth], [xEast, zBedroomsSouth], 'interior'),
    wall('service-spine', [xService, zBedroomsSouth], [xService, zBathroomSouth], 'interior'),
    wall('entrance-service', [0, zEntranceSouth], [xService, zEntranceSouth], 'interior'),
    wall('wc-east', [estimated.wcWidth, zEntranceSouth], [estimated.wcWidth, zWcSouth], 'interior'),
    wall('wc-south', [0, zWcSouth], [estimated.wcWidth, zWcSouth], 'interior'),
    wall('bathroom-south', [0, zBathroomSouth], [xService, zBathroomSouth], 'interior'),
    wall('closet-west', [xLivingEast, zBedroomsSouth], [xLivingEast, zClosetSouth], 'interior'),
    // No kitchen/living partition: the drawing shows an open shared boundary.
  ],
  // The six visible door swings are schematic. Positions, widths, heights, and
  // the renderer's open angle are estimates. Offsets follow each wall's direction.
  doors: [
    {
      id: 'main-entry', wallId: 'exterior-west',
      // Leave room for both perpendicular wall thicknesses in this narrow zone.
      offset: zSouth - (zBedroomsSouth + 0.11 + 0.68), width: 0.68, height: 2.04,
      hinge: 'end', opensToward: 1, locationConfidence: 'schematic', estimated: true,
    },
    {
      id: 'entrance-living', wallId: 'service-spine',
      offset: 0.08, width: 0.68, height: 2.04,
      hinge: 'end', opensToward: 1, locationConfidence: 'schematic', estimated: true,
    },
    {
      id: 'bedroom-1-entry', wallId: 'bedroom-1-south',
      offset: xBedroomDivider - xBedroomsWest - 0.15 - 0.73, width: 0.73, height: 2.04,
      hinge: 'end', opensToward: -1, locationConfidence: 'schematic', estimated: true,
    },
    {
      id: 'bedroom-2-entry', wallId: 'bedroom-2-south',
      offset: 0.15, width: 0.73, height: 2.04,
      hinge: 'start', opensToward: -1, locationConfidence: 'schematic', estimated: true,
    },
    {
      id: 'bathroom-entry', wallId: 'entrance-service',
      offset: xService - 0.14 - 0.68, width: 0.68, height: 2.04,
      hinge: 'end', opensToward: 1, locationConfidence: 'schematic', estimated: true,
    },
    {
      id: 'closet-entry', wallId: 'closet-west',
      offset: 0.08, width: 0.73, height: 2.04,
      hinge: 'start', opensToward: 1, locationConfidence: 'schematic', estimated: true,
    },
    {
      // No unambiguous WC swing is drawn. This proposed opening provides access
      // from the adjacent entrance; location and swing require on-site checking.
      id: 'wc-entry-inferred', wallId: 'entrance-service',
      offset: 0.11, width: 0.6, height: 2.04,
      hinge: 'start', opensToward: 1, locationConfidence: 'inferred', estimated: true,
    },
  ],
  // The image explicitly says windows and balcony access are unspecified.
  // Empty means unknown, not that the real apartment has no windows.
  windows: [],
  balcony: {
    id: 'balcony', name: 'Balcon', reportedArea: reported.balcony,
    polygon: rectangle(
      xLivingEast - estimated.balconyWidth, zSouth,
      xLivingEast, zSouth + reported.balcony / estimated.balconyWidth,
    ),
  },
  metadata: {
    source: 'User-provided proportional-plan screenshot, preserved at docs/reference/t3-plan.png. Its footer cites DIO AGENDA, diagnostic dated 06/07/2026, dossier M-2026-07-002, pages 62 and 65; those original pages were not provided.',
    description: 'Area-consistent reconstruction of an already estimated drawing. All linear coordinates and dimensions are estimates, not measurements of the apartment.',
    reportedCarrezArea: reported.carrez,
    reportedBasementArea: reported.basement,
    assumptions: [
      'All polygon coordinates, wall lengths, thicknesses, heights, opening sizes, offsets, door swings, and balcony dimensions are estimated.',
      'Estimated anchors: bedroom depth 3.50 m, west strip width 2.65 m, closet width 1.10 m, WC width 0.82 m, balcony width 2.40 m. Remaining dimensions follow from reported areas.',
      'Conceptual room polygons preserve the eight reported areas, totaling 49.18 m². Walls are centered on zone boundaries and overlap the floor polygons; wall thickness is not deducted. This is not a measured net-area or Carrez model.',
      'Wall height 2.50 m, exterior thickness 0.18 m, interior thickness 0.10 m, door height 2.04 m, and door widths 0.60–0.73 m are assumptions.',
      'Six door positions and hinge sides follow the schematic swing symbols. WC access is inferred from entrance adjacency and is visually distinguished.',
      'The kitchen is open to the living room. The balcony is a separate estimated slab without invented access, railing, or window details.',
      'The north arrow is accepted as drawn: +X is right/east, +Z is down/south, +Y is up. Origin is the northwest corner of the overall bounding rectangle.',
    ],
    unresolved: [
      'Surveyed wall lengths, angles, thicknesses, ceiling heights, and true room shapes are unavailable.',
      'Window positions, dimensions, and sill heights are not specified; windows: [] represents unknown information.',
      'Balcony access, railing, exact shape, and level are not specified; no balcony door is modeled.',
      'Door dimensions and exact positions need measurement. WC door position and swing are inferred.',
      'The 8.54 m² basement is reported outside Carrez but has no plan, location, or level data; it is not reconstructed.',
    ],
  },
})
