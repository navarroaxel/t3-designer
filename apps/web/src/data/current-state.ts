import { AssetSchema, FixtureSchema, type Asset, type Fixture, type Mobility } from '@t3-designer/scene-schema'
import { BATHROOM_RUN, BATHROOM_SIZES } from './bathroom.ts'
import { HOUSE_HALF_WIDTH, PARTY_WALL } from './building-site.ts'
import { FIRST_FLOOR_BATHROOM, KITCHEN_LIVING } from './house-plan.ts'
import { KITCHEN_SIZES } from './kitchen.ts'

// Visual replicas, never manufacturer-verified dimensions. Individual GLBs remain
// replaceable while the architectural source of truth stays in house-plan.ts.
const catalog: [string, string, [number, number, number], string, Mobility][] = [
  ['fridge-freezer', 'Heladera / freezer', [0.60, 1.85, 0.64], 'Visual replica of a typical unit; the house\'s own is not modelled', 'movable'],
  ['washing-machine', 'Lavarropas frontal', [0.60, 0.85, 0.60], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['oven-cooktop', 'Horno y placa', [0.60, 0.88, 0.60], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['microwave', 'Microondas', [0.48, 0.29, 0.38], 'Visual replica of a typical unit; the house\'s own is not modelled', 'movable'],
  ['extractor-hood', 'Campana extractora', [0.60, 0.65, 0.48], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['boiler', 'Caldera mural', [0.40, 0.75, 0.30], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['base-cabinet', 'Mueble bajo de cocina', [0.60, 0.90, 0.60], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['sink-cabinet', 'Mueble con pileta y escurridor', [0.90, 1.05, 0.60], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['wall-cabinet', 'Alacena', [0.80, 0.70, 0.32], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['bathroom-vanity', 'Vanitory y lavabo', [0.60, 0.88, 0.50], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['toilet', 'Inodoro', [0.38, 0.78, 0.65], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['radiator', 'Radiador', [0.90, 0.60, 0.10], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['towel-rail', 'Toallero radiador', [0.45, 0.70, 0.10], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['glass-block-screen', 'Mampara de ladrillos de vidrio', [0.80, 2.10, 0.08], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['shower-tray', 'Receptor de ducha', [0.80, 0.12, 0.80], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['electrical-panel', 'Tablero eléctrico', [0.38, 0.52, 0.09], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
  ['low-table', 'Mesa baja de madera', [0.65, 0.48, 0.65], 'Visual replica of a typical unit; the house\'s own is not modelled', 'movable'],
  ['wall-mirror', 'Espejo de baño', [1.20, 1.00, 0.035], 'Visual replica of a typical unit; the house\'s own is not modelled', 'fixed'],
]
export const assetCatalog: Asset[] = catalog.map(([id, label, dimensions, evidence, mobility]) => AssetSchema.parse({
  id, label, dimensions, evidence, mobility, url: `/models/current/${id}.glb`, dimensionalStatus: 'estimated',
}))

const S = KITCHEN_SIZES
const NE_INNER = HOUSE_HALF_WIDTH - PARTY_WALL
const facingStreet = -Math.PI / 2
// Viewer frame: x = u, z = -v. A model faces +z at rotation 0, with its back to -z; at -pi/2 it faces the street (-x).
const at = (u: number, v: number, y = 0.015): [number, number, number] => [u, y, -v]

// The kitchen's run along the party wall: the fridge at the rear, the oven from the hall, base cabinets between. Positions follow kitchen.ts.
const fridgeU = KITCHEN_LIVING.u[1] - S.columnWidth - S.fridgeWidth / 2
const stoveStart = KITCHEN_LIVING.u[0] + S.stoveFromHall
const cabinetEnd = KITCHEN_LIVING.u[1] - S.columnWidth - S.fridgeWidth
const cabinets = Array.from({ length: Math.max(0, Math.floor((cabinetEnd - (stoveStart + S.ovenWidth)) / S.baseDepth)) }, (_, index) => ({
  id: `k-cabinet-${index + 1}`, assetId: 'base-cabinet', roomId: 'kitchen-living',
  position: at(stoveStart + S.ovenWidth + S.baseDepth * (index + .5), NE_INNER - S.baseDepth / 2), rotation: 0,
}))
// The first floor's bathroom: the run along its back wall, which the kitchen shares, with its back to that wall. See bathroom.ts.
const wall = FIRST_FLOOR_BATHROOM.u[1]
const middle = ([a, b]: [number, number]) => (a + b) / 2
const raw: Omit<Fixture, 'placementStatus' | 'evidence' | 'label'>[] = [
  { id: 'k-fridge', assetId: 'fridge-freezer', roomId: 'kitchen-living', position: at(fridgeU, NE_INNER - S.fridgeDepth / 2), rotation: 0 },
  { id: 'k-oven', assetId: 'oven-cooktop', roomId: 'kitchen-living', position: at(stoveStart + S.ovenWidth / 2, NE_INNER - S.baseDepth / 2), rotation: 0 },
  ...cabinets,
  { id: 'b-vanity', assetId: 'bathroom-vanity', roomId: 'bathroom', position: at(wall - BATHROOM_SIZES.vanityDepth / 2, middle(BATHROOM_RUN.vanity)), rotation: facingStreet },
  { id: 'b-toilet', assetId: 'toilet', roomId: 'bathroom', position: at(wall - .325, middle(BATHROOM_RUN.toilet)), rotation: facingStreet },
  { id: 'b-shower', assetId: 'shower-tray', roomId: 'bathroom', position: at(wall - .4, middle(BATHROOM_RUN.shower)), rotation: 0 },
]
export const currentFixtures: Fixture[] = raw.map(fixture => {
  const asset = assetCatalog.find(a => a.id === fixture.assetId)!
  return FixtureSchema.parse({ ...fixture, label: asset.label, evidence: asset.evidence, mobility: asset.mobility, placementStatus: 'estimated' })
})
