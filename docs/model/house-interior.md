# House interior

The **Interior** and **Walkthrough** tabs read the house as two `Apartment` records, one per floor, built from the plan in
`apps/web/src/data/house-plan.ts`. The plan stays the only source of the measurements; nothing is copied by hand.

## Frame

The viewer's local frame is the house frame turned to its axes:

| Local | House | Meaning |
| --- | --- | --- |
| x | u | toward the rear (south-east); the street front faces -x |
| z | -v | v runs north-east, so north-east is -z (the top of the plan view) |
| y | y | up from the floor's own level (0 for the ground floor, 3.2 m for the first) |

Site to local is one rotation about y (`HOUSE_YAW`) and a translation to the house's origin (`src/data/house-placement.ts`). The sun's
direction uses the same rotation, without the translation.

## How the plan becomes walls

`src/data/house-interior.ts`:

- **Exterior walls** are the strips the floor cutaway already draws, here as centre lines: 0.30 m at the street and the light well, 0.15 m on
  the party walls (owner). Openings come from `OPENINGS` and `SIDE_OPENINGS`.
- **Partitions** are the plan's `[u0, u1, v0, v1]` boxes; the long side is the wall, the short side its thickness.
- **Doors**: the plan leaves a gap in the partition wherever a door goes. Each gap becomes a short wall that holds the door, so the
  walkthrough can open it. A door with a swing in the plan keeps its hinge and direction; a doorway without a leaf is a `passage`.
- **Rooms** are rectangles from the plan's constants; the area of each is its polygon's.

Wall height is 3.0 m (the 3.2 m storey less the 0.2 m slab) and door height 2.1 m: both assumed.

## What is not there yet

- The stair is drawn but cannot be climbed: the walkthrough is one floor at a time.
- The rooms behind the ground floor's back wall, and the built-in wardrobes.
- The balcony and the laundry are walkable; the balcony railing is a solid 1 m wall.


## Tests

`apps/web/test/house-interior.test.ts` checks that both floors parse, that the owner's sizes survive the conversion, that the frames agree
with `houseToSite`, that each fixture stands in its room and that the walkthrough can start on both floors.

## One source for the walls

The **House and sun** floor cutaway no longer builds its own walls. `HouseShell` draws `shellWallBoxes(floor, top)` from `house-interior.ts`: the same
walls, doors and windows the walkthrough walks through, sawn off at the cut. A test compares their volume with the plan's own `wallBoxes` plus the
partitions, so the two views cannot drift apart. The balcony and the laundry stay out of it: the cutaway draws them from the facade and the laundry volumes.
The furniture comes from the same data files in both views.

## Doors, floors and where the visit starts

- Each door keeps the colour the plan gives it (the main room's wenge, the bathroom's, the office's), through the optional `color` of a door.
- The main room's 3 m door onto the balcony and the kitchen-living's 1.78 m door onto the terrace are the same white aluminium **sliding** door (two panels, one fixed, one that slides over it). It starts closed and `E` opens and closes it.
- The floors are the plan's own tiling, the same patches the cutaway lays (Saing planks, Navona tiles); the balcony is Navona natural too.
- The terrace with the grill and the laundry are walkable; the terrace is open to the sky, so it has no ceiling.
- The first floor starts in the middle of the living, facing the kitchen.

## The TVs and the street door

- Look at a TV and press `E`: it switches on and shows a Plex-style splash (drawn in `HouseFurnishings.tsx`; an approximation, not the brand's artwork). A TV is aimed at like a door and keeps its state in the same visit record.
- The street door in the entrance recess opens inward with the right hand: hinged on the lower v, seen from the street.

## One world for both floors: the stair

The walkthrough is one visit over both floors, joined by the owner's stair. `buildWalkWorld(ground, states, first)` stacks them:

- Each floor has its own **level** (elevation and outline). A body belongs to the level whose floor it can step onto; the stairwell is part of the first
  floor's outline, a way down rather than a wall.
- The floor between them is a slab with the stairwell as a notch: the ceiling of the ground floor and the floor of the first.
- The stair's steps and landings are **climbable** blockers: anything within a riser (0.3 m) of the feet is stepped onto or off without jumping. A step
  waits until the head has room under the slab (a standing visitor needs 1.70 m).
- Walking off the first floor into the stairwell drops the visitor onto the stair. The chosen floor above the view is only where the visit begins.

## The fridge and the freezer

Looking at the fridge and pressing `E` opens its two doors (right-hand hinges), showing the cabinet with its shelves, the ice maker, the vegetable drawer
and the door bins. The fridge is the owner's: 0.675 m wide, 0.668 m deep with its handle, 1.785 m high. The freezer holds 89 L net, 101 L gross; from
the gross volume and an assumed section (4 cm walls, 4.5 cm door and back) its liner is 0.31 m high and the freezer, with its top wall and the
partition, 0.40 m (`FREEZER` in `kitchen.ts`).

## The patio and the rack

- The ground floor's way out to the light well, the pulmón, is a white aluminium **sliding door** of two leaves (1.8 m, owner), like the first floor's: one fixed, one that slides over it, opened with `E`. The
  patio is a room of its own, with a wall at the lot behind; it is open to the sky.
- The pantry beside the garage has a wall-mounted 6U **network rack** (`rack.ts`), high on the south-west party wall, the medianera: a UniFi Dream Machine Pro and a 24-port patch panel, with
  blank panels below. It is above the floor cutaway's 1.5 m cut, so only the walkthrough shows it.
