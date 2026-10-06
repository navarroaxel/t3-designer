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

- The stair between the floors, the terrace and the laundry: the walkthrough is one floor at a time.
- The rooms behind the ground floor's back wall, and the built-in wardrobes.
- The balcony, which the first-floor cutaway draws but the interior does not.
- The laundry (washing machine, spin dryer) and the stair, which lie outside the floors' outlines.

## Tests

`apps/web/test/house-interior.test.ts` checks that both floors parse, that the owner's sizes survive the conversion, that the frames agree
with `houseToSite`, that each fixture stands in its room and that the walkthrough can start on both floors.
