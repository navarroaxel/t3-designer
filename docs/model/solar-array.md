# Solar array

The planned array is defined in `apps/web/src/data/solar-array.ts` and drawn by
`SolarPanels.tsx`. Every value carries one of two provenances.

| Provenance | Meaning |
| --- | --- |
| **Owner** | Stated by the owner |
| **Assumed** | A working value to be confirmed; change it in `solar-array.ts` |

## What is fixed

| Item | Value | Provenance |
| --- | --- | --- |
| Panels | 18 of 620 Wp, 11.16 kWp in total: the 16 first put on the azotea, and two more to complete the rectangle | Owner |
| Panel size | 2465 by 1134 mm, laid with the long side along the slope | Owner (size); portrait is assumed |
| Rows | Three rows of 6, a full rectangle | Owner |
| Position | Toward the street, with the front row cantilevered past the front wall, and in the middle of the azotea's width, leaving a walkway along each side wall | Owner |
| Tilt | 5 degrees, so the rain runs off | Owner |
| Mounting | Raised, on galvanized steel C-beams resting on the azotea walls, not on the floor | Owner |
| Electrical | Two series of 9 panels, one 10 kW Deye inverter ([SUN-10K-SG05LP3-EU-SM2](inverter-datasheet.md)) | Owner (the series' size follows from the 18 panels and the 10-panel limit) |

## What is assumed

| Item | Value | Why it matters |
| --- | --- | --- |
| Height of the low edge above the azotea slab | 1.25 m | The 1.1 m parapets shade panels below their top, so the height sets how much the parapets matter. |
| Direction of the slope | Faces the street (north-west), low edge at the front | Sets the angle to the sun. |
| Row gap and panel gap | 0.01 m for both: the rows touch, with no walkway between them (owner) | Sets how much one row shades the next in low winter sun. |
| Front overhang | The front row projects 0.775 m past the front wall, to the inner face of the front parapet on the roof's front edge | The owner says it is cantilevered; the amount is assumed. It moves the whole array. |
| Side walkways | Each row is centred between the walls' outer faces, about 0.9 m free on each side | Sets which rows the side sun reaches. |
| Space behind | About 3.2 m between the back row and the rear parapet, in front of the tank block, which is not under any row | Access; the tank does not shade the rows in front of it. |
| Which panels form each series | Not decided | With one inverter input per series, a shaded panel limits its whole series. |

## What the model checks

Unit tests assert the counts, the power, the tilt and facing, the gaps between
panels and rows, that the array stays inside the azotea, that it clears the
parapets, and that no panel collides with the tank or its slab.

## Not yet modelled

Shading of each panel through the day and year, irradiance, temperature, inverter
and cable losses, and the daily and monthly energy. They come next.

## Open questions for the owner

1. How far the front row projects past the front wall, and the height of the panels' low edge above the azotea slab.
2. Whether the C-beams run along the side walls or across.
3. Which way the 5 degree slope goes: toward the street, as assumed, or toward the rear.
4. Which panels make each series of 8: by row, or mixed.
5. The exact position of the water tank and the panel rows against the walls, with a tape measure.
