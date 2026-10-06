import { segmentWall, wallLength, wallRotation } from '@t3-designer/geometry'
import { PROJECT_SNAPSHOT_VERSION, ProjectSnapshotSchema, type Fixture, type ProjectSnapshot } from '@t3-designer/scene-schema'
import { BUILDING_SITE, FLOOR_HEIGHT, SITE_PARCEL, SITE_ROADS } from '../data/building-site.ts'
import { demoAssets } from '../data/demo-catalog.ts'
import { HOUSE_FLOORS, floorOfRoom } from '../data/house-interior.ts'
import { GROUND_OUTLINE, type Floor } from '../data/house-plan.ts'
import { housePlacement } from '../data/house-placement.ts'
import { planToSite } from '../data/frame.ts'
import { buildSiteSolarSnapshot } from './solar-snapshot.ts'

const SNAPSHOT_DATE = '2026-09-26'
const SNAPSHOT_MINUTES = 15 * 60
// The solar part is fixed per page load; the walkthrough keeps its own moment and recomputes the sun from the site.
const solar = buildSiteSolarSnapshot(BUILDING_SITE, { date: SNAPSHOT_DATE, minutes: SNAPSHOT_MINUTES })
const houseFootprint = planToSite(GROUND_OUTLINE)

/** The floor as a renderer-neutral project: the walkthrough reads one of these, never the plan modules themselves. */
export function publicScene(floor: Floor, fixtures: Fixture[]): ProjectSnapshot {
  const apartment = HOUSE_FLOORS[floor]
  const placement = housePlacement(floor)
  const walls = apartment.walls.map(wall => {
    const length = wallLength(wall)
    const ux = (wall.to[0] - wall.from[0]) / length, uz = (wall.to[1] - wall.from[1]) / length
    const apertures = [...apartment.doors, ...apartment.windows].filter(opening => opening.wallId === wall.id)
    return {
      wallId: wall.id,
      solids: segmentWall(wall, apertures).map(segment => ({
        position: [wall.from[0] + ux * (segment.offset + segment.length / 2), segment.bottom + segment.height / 2, wall.from[1] + uz * (segment.offset + segment.length / 2)],
        scale: [segment.length, segment.height, wall.thickness],
        rotationY: wallRotation(wall) || 0,
      })),
    }
  })
  return ProjectSnapshotSchema.parse({
    schemaVersion: PROJECT_SNAPSHOT_VERSION,
    project: { id: 'tapalque-house', name: `Tapalque · ${apartment.name}` },
    units: 'meters',
    coordinates: {
      apartment: 'local plan X/right,Y/up,Z/down', site: 'X/east,Y/up,Z/south', blender: 'X/east,Y/north,Z/up',
      siteToBlender: [['x', 1], ['z', -1], ['y', 1]],
    },
    apartment,
    assets: demoAssets.map(asset => ({ ...asset, repoPath: `apps/web/public${asset.url}` })),
    fixtures: fixtures.filter(fixture => floorOfRoom(fixture.roomId) === floor),
    placement,
    geometry: {
      walls,
      floor: { polygon: apartment.perimeter, elevation: 0, thickness: .14 },
      ceiling: { polygon: apartment.perimeter, elevation: placement.wallHeight, thickness: .2 },
      contextSections: {
        before: [], apartmentBand: houseFootprint, after: [],
        belowTop: placement.floorElevation - .14, ceilingBase: placement.floorElevation + placement.wallHeight,
      },
    },
    site: {
      ...BUILDING_SITE, rnbUrl: null, mapUrl: 'https://www.openstreetmap.org/',
      // Only the house itself: the neighbours are drawn by the building context, not from the snapshot.
    },
    buildings: [{
      id: BUILDING_SITE.targetId, rnbId: null, isTarget: true, label: 'House', footprint: houseFootprint,
      height: 2 * FLOOR_HEIGHT, roofHeight: 0, groundAltitude: null, groundOffset: 0, floors: 2,
      planarAccuracy: null, verticalAccuracy: null, source: 'estimated',
    }],
    roads: SITE_ROADS,
    parcel: SITE_PARCEL,
    solar,
  })
}
