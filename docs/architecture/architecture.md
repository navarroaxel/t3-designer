# Architecture

The project is a single web application, `apps/web`, that renders one site: the
house at Tapalque and its surroundings. React provides the interface and
Three.js, through React Three Fiber, draws the scene.

## Ownership

| Path | Owns |
| --- | --- |
| `apps/web/src/data/building-site.ts` | Site data: house volumes, neighbouring buildings, streets and lot, in metres |
| `apps/web/src/lib/solar.ts` | Sun position, sunrise and sunset, civil-time conversion (NOAA / Meeus) |
| `apps/web/src/lib/useSolarStudy.ts` | Selected date and time, playback and derived sun values |
| `apps/web/src/components/BuildingScene.tsx` | Canvas, lighting, camera, solar orbit and labels |
| `apps/web/src/components/BuildingContext.tsx` | Volumes, ground, streets and lot |
| `apps/web/src/components/HouseFacade.tsx` | Front elevation: openings, balcony slab, roof fascia and railings |
| `apps/web/src/components/SolarControls.tsx` | Date, time, season and daily-path controls |
| `apps/web/src/i18n` | Spanish and English catalogs |

## Coordinate and visibility contracts

All geometry uses metres, with x east, y up and z south. The origin is the centre
of the Google Earth view that frames the house. Site data is written in a house
frame (`u` toward the rear, `v` toward the north-east) and converted once in
`building-site.ts`.

Hiding the neighbours or the solar path is a presentation choice. Every building
keeps casting shadows: the `ShadowOnly` helper renders the physical obstacles
into the shadow pass even when they are not visible.

Estimated dimensions stay marked as estimates (`source: 'estimated'`).
