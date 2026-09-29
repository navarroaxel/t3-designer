# House model

The site at Tapalque, Buenos Aires, is defined in
`apps/web/src/data/building-site.ts`. Every dimension is in metres and carries
one of three provenances.

| Provenance | Meaning |
| --- | --- |
| **Owner** | Stated by the owner: lot depth, azotea size, terrace, light well, floor counts, tank footprint, balcony door width |
| **Measured** | Read from imagery: Google Earth (2021-09-24) for footprints and rotation, Street View (August 2025) for the front elevation, the owner's photo of the azotea for parapets and tank |
| **Estimated** | Judged from a photo without a scale: neighbouring footprints and heights, tank heights, parapet height |

## Frame

`u` runs toward the rear (south-east, away from the street) and `v` toward the
north-east, which is the left side seen from the street. The house is rotated
45 degrees from north. The origin of the site is the centre of the Google Earth
view that framed the house; the origin of the house frame is the centre of the
upper block.

## Volumes

| Volume | Size | Level | Provenance |
| --- | --- | --- | --- |
| Upper block | 9 m deep, 8.5 m wide, two floors | roof slab at 6.4 m | Owner (the 10 m of the azotea include a 1 m cantilever) |
| Roof cantilever | 1 m past the street line, 8.5 m wide, 0.5 m thick; it ends level with the first-floor balcony, and the front parapet stands on its edge | slab top at 6.4 m | Owner |
| Rear ground-floor band | 4.5 m deep outside: left arm 2.75 m, light well 2.5 m, terrace 3.25 m | 3.2 m | Owner (3.95 m inside, plus the walls, to fit the 13.5 m lot) |
| Lot | 8.95 m of front, 13.50 m deep on the north-east side, 13.70 m on the south-west side, 8.70 m at the rear: 120.03 m2. The south-west boundary leans 0.25 m, and the house's wall stands on it | | Municipal survey sketch |
| Side and rear parapets | 0.15 m thick | 1.1 m above the roof | Estimated from the azotea photo |
| Front parapet | 0.15 m thick, tiled | 0.8 m above the roof | Estimated from Street View |
| Concrete tank block | 1.6 m by 1.6 m, against the rear wall, south-west of centre | 1.2 to 2.25 m above the roof, on a slab at 0.9 to 1.2 m, held up by three legs (one at the front on the south-west side, two at the back against the rear parapet) | Footprint: owner. Heights and position: estimated |
| Steel tank | 1 m diameter, on the concrete block | up to 3.75 m above the roof | Estimated |
| Lot 7, north-east neighbour (A) | 9.00 m of front. Next to the house, a brick street wall (2.1 m) with a green railing on the street line, a front patio about 2 m deep and a one-floor house (3.8 m); then a garage house with green doors and a sheet-metal canopy (3.3 m) | 3.8 m and 3.3 m | Lot: municipal survey sketch. Buildings: estimated from Street View |
| Lot 9, the corner (C) | Three flats in horizontal property, each with its own door. 10.70 m of front to the corner, a 5.95 m ochava. A two-floor block (6.6 m) next to the house and a one-floor front (3 m) toward the cross street | 6.6 m and 3 m | Lot: municipal survey sketch. Buildings: estimated from Street View |
| Lot 10, behind | 7.80 m wide and 28.40 m long, a one-floor house with a garage door on the cross street. It shares its front wall with the rear boundary of lots 7, 8 and 9. Drawn in blue so it never reads as part of the house | 3.3 m | Lot: municipal survey sketch. Building: estimated from Street View |

## Front elevation

`HouseFacade.tsx` draws what Street View shows, scaled to the 8.5 m frontage
(about 93 px per metre, roughly 0.2 m of error):

- Ground floor, from the left seen from the street: barred window and wooden door, both in an entrance recessed 1 m from the street line. The recess is 2.9 m wide, between a 0.5 m wall that stays on the line next to the neighbour and a 0.7 m pier. The garage door, about 4 m wide, stands on the line. The upper floor overhangs the recess.
- First floor: a 3 m balcony door with its white shutter down to the floor (owner), and a smaller window on the right.
- A balcony slab projecting about 1 m and a roof fascia projecting about 0.8 m. Both cast shadows.
- Open railings at the balcony edge and above the front parapet, drawn without shadows.

All the fronts on the block stand on the same street line (`u = -5`), as the
owner pointed out. The house of neighbour A is the exception only because it sits
behind a 2 m patio; its street wall is on the line. The neighbouring fronts are drawn by `NeighborFacades.tsx`
from two Street View photos, at about 0.3 m of accuracy.

## Floors and cutaway

The floor selector shows the house sectioned 1.5 m above the ground floor or the
first floor. `src/data/house-plan.ts` holds the plans and `HouseShell.tsx` draws
them. Only the exterior walls are modelled, so the rooms are empty.

- Exterior walls are assumed to be 0.3 m thick and slabs 0.2 m. Neither is measured.
- The ground-floor outline includes the rooms under the rear terrace and the left arm, with the entrance recess and the light well left open. It is 100.6 m2.
- The first floor is the 9 m by 8.5 m block, 76.5 m2, with the 3 m balcony door and the window on the street side. The roof's 1 m cantilever is not a floor.
- The cut hides the upper floors, but they still cast their shadows on the cut floor, because the sunlight pass always uses the whole house.
- Interior walls, stairs, doors and windows other than the ones on the street front are not modelled yet.

## Finishes

The azotea floor, the inside of the parapets and the concrete tank block are painted
white. The owner's photo of the azotea predates the repaint (red floor membrane,
green tank), so trust the owner over the photo for colour. The steel tank is
stainless steel. The house roofs are white (azotea) and sand (rear wings), and neighbour B is blue. The facade is exposed brick with tan tiled slabs.

## The block

The whole block is drawn: 24 lots around a free courtyard, with the four streets around it.
The lots come from the block plan, a hand sketch at about 5.6 pixels per metre, with the
lengths of the street fronts and the widths of the streets.

| Part | Provenance |
| --- | --- |
| Lots 7, 8, 9 and 10 | Their municipal survey sketches, exact. Their sides agree with each other to the centimetre: the house's 13.50 m side is lot 7's, its 13.70 m side is the corner's, and the lot behind is 28.40 m long, the sum of the three rear boundaries |
| The other 20 lots | The block plan, digitised by eye, good to a metre or two |
| Streets and their widths, the block's outer dimensions | The block plan |
| Buildings of the other 20 lots | Not known. Each is one prism standing in the band nearest its street, 13.5 m deep, 3.3 m high (6.4 m for lot 11, which Street View shows with two floors). The rest of each lot stays free |

Buildings shorter than the panels cannot shade them, so these heights only matter for a
building that turns out to be three floors or more. The data is in `apps/web/src/data/block.ts`.

## Left out on purpose

The clothesline post, vents, the air-conditioning unit under the tank slab,
trees, wires and the terrace grill. None of them shades the azotea noticeably.

## Open questions for the owner

1. Height of the tank slab above the roof, and the total height including the steel tank.
2. Parapet height on the sides and rear, and whether the front parapet is 0.8 m.
3. Distance from the tank block to the rear wall and to the south-west wall.
4. Whether the light well is open to the sky and where its edges are.
5. Whether lot 7 and the lots beyond it have an upper level set back behind their fronts, as the photos suggest, and the real heights of the buildings of the other lots.
6. The plans of both floors: interior walls, stairs, and the windows on the side and rear walls.
7. The real thickness of the exterior walls.
8. The panel layout: see [solar-array.md](solar-array.md).
