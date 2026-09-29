# Generation estimate

How the app turns the array and the sun into kWh. Code: `apps/web/src/lib/pv/`, data in `apps/web/src/data/climate.ts` and `pv-system.ts`.

## Chain

1. **Sun**: position for the chosen date and time (the same solar model as the shadows).
2. **Clear sky**: Ineichen–Perez, Linke turbidity 3.0 (`clear-sky.ts`).
3. **Weather**: the clear-sky/overcast mix is anchored so each month's mean daily irradiation equals NASA POWER's all-sky value for this place (`climate.ts`). The "typical day" is that mix, the "clear" and "overcast" days are its extremes.
4. **Plane of array**: beam, sky-diffuse and ground-reflected light on the 5° panels facing 315°, with an incidence-angle modifier (`plane.ts`).
5. **Shading**: ray casting from 24 points per panel toward the sun against the house, tank, parapets, neighbours, block and other panels (`shading.ts`). The 3D panels grey out as their lit share drops.
6. **Cell temperature** (NOCT), **bypass-diode** behaviour along each series string of 8, losses, and **inverter clipping** at 10 kW (`model.ts`).
7. **Day and year**: `simulateDay` every 10 min; `simulateYear` sums the 12 mid-month days.

## Result (current data)

About 1.48 MWh per kWp per year (~14.7 MWh for 9.92 kWp), ~7.5 kWh/kWp on a clear December day, ~2.8 in June. Shading costs well under 1% because the panels sit above the parapets and the neighbours are low.

## Limits

- Expect ±10–15% on the year. Weather of a specific day is not known.
- Distant buildings beyond the modelled block are not included.
- Neighbour heights on unsurveyed lots are a default of 3.3 m.
- Losses and temperature coefficients are typical values for the panel class, not the datasheet of the chosen model.
