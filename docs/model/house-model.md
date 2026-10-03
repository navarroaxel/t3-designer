# House model

The site at Tapalque, Buenos Aires, is defined in
`apps/web/src/data/building-site.ts`. Every dimension is in metres and carries
one of three provenances.

| Provenance | Meaning |
| --- | --- |
| **Owner** | Stated by the owner: lot depth, azotea size, terrace, light well, floor counts, tank footprint, balcony door width |
| **Measured** | Read from imagery: Google Earth (2021-09-24) for footprints and rotation, Street View (August 2025) for the front elevation, the owner's photo of the azotea for parapets and tank |
| **Estimated** | Judged from a photo without a scale: neighbouring footprints and heights, tank heights, parapet height |

## Lot width and party walls

The lot is **8.66 m wide** at the front (owner), not the 8.95 m of the first survey reading. The party walls, the medianeras, are **30 cm and shared: 15 cm stand on each lot** (owner). The house's side walls and its rear wall, which the lot behind shares, are therefore 15 cm thick on this lot; the street front, the entrance recess and the light well's walls stay 30 cm (assumed). That leaves 8.36 m between the party walls, which agrees with the owner's rooms (5.12 m + 0.12 m + 3.09 m at the front, and a 3.7 m hall with a 4.43 m garage and a wall of about 18 cm between them). The lots of neighbour A and of the corner keep their rears and sides from the surveys; their fronts grow by 14.5 cm each to meet the house lot's boundaries.

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
| Lot | 8.66 m of front (owner), 13.50 m deep on the north-east side, 13.70 m on the south-west side, 8.70 m at the rear: 118.06 m2. The south-west boundary leans 0.10 m, and the house's wall stands on it | | Owner for the front; municipal survey sketch for the rest |
| Side and rear parapets | 0.15 m thick | 1.1 m above the roof | Estimated from the azotea photo |
| Front parapet | 0.15 m thick, tiled | 0.8 m above the roof | Estimated from Street View |
| Concrete tank block | 1.6 m by 1.6 m, against the rear wall, south-west of centre | 1.2 to 2.25 m above the roof, on a slab at 0.9 to 1.2 m, held up by three legs (one at the front on the south-west side, two at the back against the rear parapet) | Footprint: owner. Heights and position: estimated |
| Steel tank | 1 m diameter, on the concrete block | up to 3.75 m above the roof | Estimated |
| Utility shed | 1.5 m deep (owner) from the rear parapet toward the street, in the south-west corner, from the parapet to 0.1 m short of the tank slab (about 2 m wide). Walls 2.3 m high under a sheet roof rising 0.2 m toward the rear, so it drains to the azotea | 2.3 to 2.4 m above the roof | Depth: owner. Width follows the tank; heights are a proposal |
| Shed openings | On the street face: a 0.8 m by 2 m door, 0.15 m from the tank side, and two vents of 0.4 m by 0.2 m for the boiler (owner), one at 0.15 m and one at 2 m, over the south-west half | Street face of the shed | Proposal until the gas fitter sizes them |
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
them: the exterior walls with their doors and windows, the slabs, the interior
walls, the doors and their swings, the stair, the floors, the fixtures and the
furniture the owner described. The sections below say what each room holds and
where each measure comes from.

- The street front, the recess and the light well's walls are assumed to be 0.3 m thick and slabs 0.2 m. Neither is measured. The party walls are 0.3 m and shared, 0.15 m on this lot (owner). The interior walls are 0.12 m (the owner says 12 to 14 cm), and the wall that closes the light well 0.18 m.
- The ground-floor outline includes the rooms under the rear terrace and the left arm, with the entrance recess and the light well left open. It is 103.1 m2.
- The first floor is the 9 m by 8.66 m block, 77.5 m2, with the 3 m balcony door and the window on the street side, and the balcony in front. The roof's 1 m cantilever is not a floor.
- The ground floor's interior is modelled from the front to the light well: the garage, the hall, the pantry, the bathroom, the living, the office, the stair and the stairwell in the first-floor slab. The first floor's is modelled too: the bedrooms and their closet, the bathroom, the corridor and the kitchen-living, with the terrace and the laundry beyond it.
- The cut hides the upper floors, but they still cast their shadows on the cut floor, because the sunlight pass always uses the whole house. That pass uses a hollow shell of the house, so light enters only through its openings (see "How light sees the house").
- **Not modelled yet:** the hall beyond the living's 0.80 m door and the two other rooms of that side of the ground floor; the small closet under the stair; the leaf of every door that has only its opening drawn (the garage and hall doorways, the pantry's, the ground bathroom's and the living's 0.80 m door); the upper kitchen cabinets, which hang above the cut; railings along the stair and the stairwell; and anything in a room that the owner has not described. Rooms without furniture listed in this document are empty.

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

Seen from the street, the **main bedroom** is on the left (north-east) with the 3 m balcony door: 5.12 m wide and 4.54 m deep inside. The **secondary room** is on the right (south-west): 3.09 m wide and 3.41 m deep, with a window of exactly 2.04 m (owner). The party walls are 0.15 m on this lot and 0.12 m separates the rooms, which with the 8.66 m front leaves the 8.33 m of the two rooms. The party wall is drawn at its mean position because the lot leans, so the secondary room draws about 0.1 m narrower (3.0 m) and everything on that side is placed against the wall's inner face. The secondary room has a **built-in wardrobe** 0.60 m deep and 2.16 m wide, recessed into the wall behind its back face, facing the window and flush with the party wall with the corner; the room keeps its size and the wardrobe takes its depth from the bathroom (owner). Its wardrobe has three doors of two leaves each (owner). It also has a single bed (1 plaza, 0.90 m by 1.90 m; owner), with its head against the party wall, centred on it (owner). The room's **door** is 0.70 m wide, wenge-textured, on its back wall to the left of the wardrobe seen from the window (owner). Behind the wardrobe, against the same party wall, is the **bathroom**: 2.16 m by 1.50 m inside, after the wardrobe's depth, with a 0.70 m natural-oak door on its north-east wall, toward the wardrobe end (5 cm from it), looking onto the hall, and a travertine-coloured porcelain floor. It opens inward with the right hand: hinged at the wardrobe end, swinging into the bathroom (owner). Along the bathroom's wall shared with the living, from the door to the back wall, are a **60 cm vanity**, the **toilet** and the **shower** (owner). The toilet is the smart one-piece unit of the owner's link (Tieri): white, floor-standing, 77 cm long, 48 cm wide and 58 cm high, with an integrated bidet, and no cistern: everything is built into the unit. It is drawn as in the owner's photo: one smooth egg-shaped body, a little narrower at the floor, with its lid and a dark control panel with a light at the back. The shower is 75 cm wide, not enclosed and with no tray: it has the same floor as the bathroom, and a single fixed glass panel separates it. The vanity is the unit of the owner's photo, but hung on the wall and floating, without its legs (owner): a wood-look body with an open shelf and a white drawer, its underside 0.25 m off the floor (assumed), a ceramic top with the basin, and a mirror above with a side shelf. Only the vanity's width is stated; the other sizes are typical and assumed (`apps/web/src/data/bathroom.ts`). The cutaway shows these partitions and the wardrobe; the wall of the bathroom's back runs from party wall to party wall, and behind it, up to the rear wall, is the **kitchen-living**: one long room, about 8.2 m by 2.7 m, that holds the terrace door and the light-well window (owner). The main room's wall along the hall steps back 20 cm, so the hall is wider next to that wall and the bathroom (owner). The main room's door is 0.80 m wide and wenge, on that stepped-back wall; the three doors (main room, secondary room, bathroom) all open with the right hand, seen from the hall, into their rooms (owner). The main room has a **55 inch Samsung OLED S90** hung on a wall bracket, hung on the wall it shares with the secondary room, centred between the front wall and the hall-side wall, facing into the main room (owner); its centre is assumed at 1.1 m above the floor. A **drywall (durlock) wall**, 0.10 m thick, divides the main room in two, parallel to the party wall with neighbour A and 1.5 m from it (owner; measured from the party wall's inner face to the drywall's near face). It runs from the back wall toward the street and stops 0.70 m short of the front wall, next to the balcony door: that gap is the only way into the room's **walk-in closet**, the 1.5 m strip along the party wall, which has no door. Along the whole party wall inside it runs a built-in **wardrobe** 0.60 m deep, leaving 0.90 m to walk, with sliding doors (owner; five panels on two tracks, the number is assumed). The main room has a **queen bed** (1.60 m by 2.00 m) with its head on the drywall wall, centred like the TV (owner). The living has a **65 inch Samsung OLED** hung on the party wall with the corner, on the bathroom's side, centred on the living's depth (owner; its centre height, 1.05 m, is assumed). The floors are porcelain tile (owner): **Saing almendra** in the bedrooms (taken to mean both, the main one with its closet) and **Saing miel** in the living, both San Lorenzo Design wood-look planks of 20 cm by 120 cm, satin, drawn laid along the house's depth in a third-staggered pattern (the laying direction is assumed), and **Navona natural** in the bathroom, on the first-floor terrace and in the laundry, a beige travertine-look porcelain of 80 cm by 80 cm, satin and rectified (San Lorenzo Design); the hall has the living's floor (owner). The living's **kitchen** comes from the owner's render, which has no dimensions, so its sizes are assumed and scaled to the living's 2.65 m depth (`apps/web/src/data/kitchen.ts`): along the party wall with neighbour A, facing the 65 inch TV, from the rear wall a tall dark column (0.45 m), the fridge, the owner's Samsung RT29K577JS8 (a 299 L top-freezer with a water dispenser, silver stainless steel with grey sides, 0.60 m wide, 0.672 m deep and 1.635 m high; drawn up to the 1.5 m cut) and base cabinets with the oven and the cooktop (45 cm from the wall on the hall side, owner) under a worktop of **Purastone Toscana Vena** (a warm ivory sintered slab with golden ochre veins, 3.20 m by 1.60 m, 1.2 cm thick; the thicker edge is assumed) and, in front of it, a second counter of 2.20 m by 1.00 m, against the wall behind the bathroom, with the same top, the sink and its tap (owner), three oak stools on the living side and 1.1 m of aisle: a parallel kitchen (owner). The laundry is continuous with the kitchen, through a 0.80 m single-leaf door of the same white aluminium and glass as the living door, on the rear wall, 1.30 m from the party wall with neighbour A (inner face to the door's nearer edge), opening with the right hand into the laundry (owner); the laundry is taken to be the roof of the left ground-floor band, at first-floor level, which is an assumption. The hall reaches the living through a white-painted aluminium door with glass, of one and a half leaves (a wide leaf of 0.80 m and a narrow one of 0.40 m, 1.20 m in all; the look is from the owner's photo), standing 30 cm from the bathroom (owner) so that it only partly faces the secondary room's door, and opening with the right hand into the living. Upper cabinets are not drawn (above the cut).

## The balcony

The first-floor balcony is **7.94 m wide by 0.86 m deep** in front of the street line (owner); its position, centred on the 8.95 m facade, and its 0.3 m slab edge are assumed. It stays in the first-floor cutaway, with its railing.

## The terrace and the rear wall

The terrace over the rear ground-floor band has its roof at first-floor level (3.2 m). Along the corner's party wall it has a **1.6 m wall** and, on the light-well side, a **1.1 m railing wall** (owner), a masonry **grill** at its back and, to the left of the grill seen from the rear (toward the railing wall), a **sink**, which is a shelf of Purastone Toscana Vena from the railing wall to the grill with the basin set into it (owner; the shelf's 0.5 m depth, its 3 cm edge, its 0.85 m height and the basin's size are assumed), and centred between the two walls (owner; its size, 1.2 m by 0.55 m and 0.85 m high, is assumed). The rear wall of the first floor (u = 4) has a **1.78 m balcony door** centred on the terrace and a **2.3 m wide, 1.64 m high window** centred on the ground-floor light well (owner). The window's sill (0.9 m) is assumed.

## The ground floor's front block

The **garage**, under the secondary room, is 5.69 m deep inside (owner), against the party wall with the corner. To its left seen from the street is the **hall** (the recibidor), behind the entrance recess, with a **1.2 m doorway without a leaf**, 8 cm from the garage's wall, in the back wall (owner; the wall it is in is assumed), **3.7 m wide** inside and the garage **4.43 m wide** (owner), with a wall of about 18 cm between them. Both end at the same back wall, the **contrafrente**, which runs from party wall to party wall; it is drawn 5.69 m from the front wall's inner face, which falls in line with the first floor's wall behind the bathroom. The wall on the garage's side of the entrance recess continues to the back wall and separates the garage from the hall: the recess's width was corrected so that this wall falls where the hall's 3.7 m puts it (the recess is now 3.35 m wide, from 3.1 m). What lies behind the contrafrente wall is not modelled yet. The ground floor's light well has a **1.80 m balcony door**, centred on the well, on the wall that closes it (owner; the 2.10 m height is assumed). The wall of that door **continues to the left**, to the party wall with neighbour A, and behind it, in the left band, is the **office** (owner); the office's size, about 4.2 m by 2.4 m inside, is what the band leaves and is an assumption. The office's door is wenge and opens with the right hand (owner); it stands 5 cm from the wall on the patio's side, not centred (owner); its 0.80 m width is assumed, and it swings into the office. The garage has a **0.70 m doorway to the hall** (owner), 35 cm from the back wall, with no door for now, only the opening. The office has a **1.5 m window onto the light well**, centred, in the wall that runs along the well (owner); its 0.9 m sill and 1.2 m height are assumed. The right arm of the well, on the south-west, has a **1.8 m window** onto it (owner; assumed centred on that room, with the same sill and height).

## The ground floor's living

The ground floor has a **living that is its distributor** (owner): from it one goes into the kitchen, the hall and the rest. It lies behind the back wall (the contrafrente), up to the wall shared with the light well, and it is **4.97 m wide and 3.17 m deep** inside (owner); the office behind that wall is 3.89 m deep, with a wall of 0.18 m between them, and the light well starts 0.46 m past the upper floor's rear wall. It is measured from the party wall with neighbour A (v = -0.80 to 4.175), which takes in the hall's doorway and the well's balcony door; measured from the other side it would cut through that door. A wall closes it on its right, the south-west, with a **0.80 m door, 20 cm from the wall the living shares with the light well** (owner), which opens onto the hall beyond, past the pantry; only the opening is drawn, because the leaf's colour and hand are not known. The other rooms' doors are not drawn yet either.

## The pantry

Beyond the living's 0.80 m door there is a hall and three rooms (owner). The one against the garage's wall, which is the contrafrente, the owner calls the **pantry** (despensa): **1.73 m deep** from that wall toward the rear and **3.14 m wide** (owner), which is all the width between the living's wall and the south-west party wall. Its door to the hall is in the wall perpendicular to the living; the door's 0.7 m width and its centring are assumed, and only the opening is drawn. The hall lies on the other side of that wall. The hall and the other two rooms are not drawn yet. The living's 0.80 m door is beyond the pantry, in the hall.

## The ground floor's bathroom

The bathroom of the ground floor (owner) is **1.75 m deep and 2.06 m wide**, against the pantry's far wall and against the south-west party wall (the medianera); its depth is taken out from the pantry's wall and its width along the party wall. It has a **0.70 m door to the hall** (owner), in its north-east wall, 10 cm from the bathroom's back wall; only the opening is drawn. Because it takes the south-west end of the pantry's far wall, the pantry's door is in the rest of that wall (the pantry door's position is assumed) and leads to the hall that runs beside the bathroom, onto which the living's 0.80 m door opens. The bathroom's floor is the first floor's bathroom tile (Navona natural), the ground floor's living has the first floor's living floor (Saing miel), the office the first floor's bedroom floor (Saing almendra), and the light well the bathroom's tile (owner). The other two rooms of that side are not drawn yet.

## The living's gas fireplace

The ground floor's living has a **gas fireplace** (owner's photo) against the party wall with neighbour A: a black steel box open at the front, with a plinth, a stone top and a set of logs on a burner (`apps/web/src/data/fireplace.ts`). Its sizes are read from the photo and assumed (0.95 m wide, 0.38 m deep, 0.85 m high), and so is centring it on the living's depth.

## The garage's solar equipment

On the garage's south-west wall hangs the **three-phase 10 kW Deye hybrid inverter**, model SUN-10K-SG05LP3-EU-SM2, its nearer edge 1 m from the garage's back wall, the one the pantry is behind, and to its right, seen facing the wall, the **electrical board** (owner's photos; `apps/web/src/data/garage-equipment.ts`). The inverter's sizes are the model's: 0.386 m wide, 0.66 m high and 0.25 m deep. The board is a surface-mounted, three-row unit, white with a smoked black door, drawn 0.45 m by 0.55 m and 0.12 m deep with 0.10 m from the inverter (assumed). Both hang 0.8 m off the floor, assumed, so they show whole under the cut.

## The doorbell

A **UniFi doorbell**, model UVC-Doorbell-B (owner's photo), stands out from the recess's back wall beside the entrance door (`apps/web/src/data/doorbell.ts`): a slim black unit with the camera lens at the top and a textured button in the middle. Its size is the model's, 5.4 by 1.6 by 1 inches (13.7 by 4.1 by 2.5 cm; owner). Its place on the door's south-west side, 15 cm from it, and its height, 1.4 m, are assumed.

## The stair

The stair from the hall to the first floor (`apps/web/src/data/stair.ts`) is L-shaped in three flights, with steps 1 m wide (owner). The base of the L, **3 steps**, starts 2.13 m from the front window's wall and climbs to the left, toward the party wall with neighbour A, to a landing of 1 m by 0.96 m, the 0.96 m perpendicular to that wall. The base of the L, the 3 steps and the landing, measures **1.74 m**, so each tread is 26 cm (owner). There it turns right, facing the office: **2 steps** toward the rear. Then it turns right again, onto a second landing as wide as the corridor above, and the remaining **10 steps** climb back toward the garage side, under the first floor's corridor. That makes 18 risers of 17.8 cm; the second landing is assumed. The stair is **floating concrete** (owner): each step and each landing is a slab with nothing under it (0.15 m thick, assumed), so the floor beneath and the doors stay clear, and a small closet stands under it (owner; its place and size are not known yet, so it is not drawn).

The **stairwell** in the first-floor slab coincides with that corridor (owner), the strip between the main room's back wall and the wall behind the bathroom, from the hall's wall on the garage side to the party wall. The last flight and the second landing climb under it; the base of the L and its 2 steps are low enough to pass under the slab.

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
6. The rest of the ground floor's plan: the hall beyond the living's door and the two other rooms of that side, the closet under the stair, and the leaves of the doors that have only their opening.
7. The real thickness of the exterior walls.
8. The panel layout: see [solar-array.md](solar-array.md).

## How light sees the house

The shadow pass does not use the house's solid prisms. It uses a hollow shell (`HouseShellPhysical` in `HouseShell.tsx`): both floors' exterior walls with their windows and doors, the first-floor slab over the recess, the roof slab and the first floor's interior walls. Sunlight therefore reaches the rooms only through the openings (owner's request: light cannot cross a wall). The prisms are still used for the rooftop obstacles, the cantilever, the terrace walls and the panels' own shading calculation. Closed doors are not modelled as blockers: their openings let light through.
