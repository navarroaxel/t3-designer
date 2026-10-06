import type { Asset, Fixture } from '@t3-designer/scene-schema'
import { assetCatalog, currentFixtures } from './current-state.ts'

type DemoCatalogEntry = { fixture: Fixture; asset: Asset; previewUrl: string }

/** The objects the house offers: every fixture it has, with its model and preview. */
export const demoFixtureCatalog: DemoCatalogEntry[] = currentFixtures.map(fixture => ({
  fixture, asset: assetCatalog.find(asset => asset.id === fixture.assetId)!,
  previewUrl: `/models/current/previews/${fixture.assetId}.png`,
}))

export const demoAssets: Asset[] = assetCatalog
export const demoFixtures: Fixture[] = demoFixtureCatalog.map(entry => entry.fixture)
