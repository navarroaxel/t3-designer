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
| Lot 7, north-east neighbour (A) | 9.00 m of front. Next to the house, a brick street wall (2.1 m) with a green railing on the street line, a front patio about 2 m deep and a one-floor house (3.8 m); then a garage with green doors, two cars deep (about 9 m), under a sheet-metal roof pitched about 10 degrees, rising from 2.7 m at the street to 4.3 m, and a taller two-level volume behind it (about 5.6 m) | 3.8 m, 2.7 to 4.3 m and 5.6 m | Lot: municipal survey sketch. Buildings: estimated from Street View |
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

## Front rooms of the first floor

Seen from the street, the **main bedroom** is on the left (north-east) with the 3 m balcony door: 5.12 m wide and 4.54 m deep inside. The **secondary room** is on the right (south-west): 3.09 m wide and 3.41 m deep, with a window of exactly 2.04 m (owner). The walls are 0.3 m outside and 0.12 m between the rooms, which adds up to the 8.95 m front. The party wall is drawn at its mean position because the lot leans, so the secondary room draws about 0.1 m narrower (2.99 m) and everything on that side is placed against the wall's inner face. The secondary room has a **built-in wardrobe** 0.60 m deep and 2.16 m wide, recessed into the wall behind its back face, facing the window and flush with the party wall with the corner; the room keeps its size and the wardrobe takes its depth from the bathroom (owner). Its wardrobe has three doors of two leaves each (owner). It also has a single bed (1 plaza, 0.90 m by 1.90 m; owner), with its head against the party wall, centred on it (owner). The room's **door** is 0.70 m wide, wenge-textured, on its back wall to the left of the wardrobe seen from the window (owner). Behind the wardrobe, against the same party wall, is the **bathroom**: 2.16 m by 1.50 m inside, after the wardrobe's depth (owner). The cutaway shows these partitions and the wardrobe; the wall of the bathroom's back runs from party wall to party wall, and behind it, up to the rear wall, is the **kitchen-living**: one long room, about 8.2 m by 2.7 m, that holds the terrace door and the light-well window (owner). The space between the main room's back wall and that wall (stairs, hall) is not modelled yet.

## The terrace and the rear wall

The terrace over the rear ground-floor band has its roof at first-floor level (3.2 m). Along the corner's party wall it has a **1.6 m wall** and, on the light-well side, a **1.1 m railing wall** (owner). The rear wall of the first floor (u = 4) has a **1.78 m balcony door** centred on the terrace and a **2.3 m wide, 1.64 m high window** centred on the ground-floor light well (owner). The window's sill (0.9 m) is assumed.

## The corner's fronts

The corner lot beside the house shows two more faces (`apps/web/src/data/corner-front.ts`): the chamfer (5.95 m) and the face on the cross street (9.07 m). Doors, brick panels, windows, the cornice and the air conditioners are placed from Street View (August 2025), scaled to the doors, so expect about 0.3 m. Above the ground floor stand a terrace with a 4.3 m parapet over the chamfer, an upper room under a sheet roof (5.4 m) and a lower parapet toward the rear (3.7 m). A fibre-cement water tank, about 1 m across and 1.2 m tall, stands on a plastered room 1.6 m square on the terrace (7.4 m in all).

## The block across the street

`apps/web/src/data/opposite-block.ts` draws the block facing the house, from its municipal block plan (hand sketch; 86.28 m along the street, 140.16 m deep). Its lots are digitised by eye, good to a metre or two, and each building is a prism in the band nearest its street (3.3 m by default). Three lots have their survey sketch and are exact:

- **Lot 24**, opposite the house: 8.50 m of front, 15.4 m deep. Two floors (6.4 m) set back about 3 m behind a fenced garden, with a small room on the roof (9 m) (Street View).
- **Lot 23**, the corner: 9.74 m of front on the cross street, a 5.98 m chamfer. The sketch is old; Street View shows a one-floor house (3.4 m) along the street, with a small fibre-cement tank on the roof.
- **Lot 25**: 8.66 m of front, 24 m deep, a building on the south-west side that reaches the rear. Its height is not known. Its front (Street View) is a 3.4 m brick wall on the street line with stone panels and a barred window, and a black garage gate under a sloped metal visor.

## Left out on purpose

The clothesline post, vents, the air-conditioning unit under the tank slab,
trees, wires and the terrace grill. None of them shades the azotea noticeably.

## Open questions for the owner

- Heights of the lots across the street other than lots 23 and 24, and of lot 25.
- The exact depth of the setback and of the roof room of lot 24, and the depth of lot 23's building.

1. Height of the tank slab above the roof, and the total height including the steel tank.
2. Parapet height on the sides and rear, and whether the front parapet is 0.8 m.
3. Distance from the tank block to the rear wall and to the south-west wall.
4. Whether the light well is open to the sky and where its edges are.
5. Whether lot 7 and the lots beyond it have an upper level set back behind their fronts, as the photos suggest, and the real heights of the buildings of the other lots.
6. The plans of both floors: interior walls, stairs, and the windows on the side and rear walls.
7. The real thickness of the exterior walls.
8. The panel layout: see [solar-array.md](solar-array.md).
