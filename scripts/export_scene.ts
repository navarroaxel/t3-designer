import { writeFileSync } from 'node:fs'
import { t3Apartment } from '../apps/web/src/data/t3.ts'
import { currentFixtures, assetCatalog } from '../apps/web/src/data/current-state.ts'
writeFileSync(new URL('../docs/t3-apartment.json', import.meta.url), JSON.stringify(t3Apartment, null, 2) + '\n')
writeFileSync(new URL('../docs/current-fixtures.json', import.meta.url), JSON.stringify({ assets: assetCatalog, fixtures: currentFixtures }, null, 2) + '\n')
console.log(`Exported ${t3Apartment.rooms.length} zones and ${currentFixtures.length} fixture instances.`)
