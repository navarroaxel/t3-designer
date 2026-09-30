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

## Reading the monthly bars

Each bar shows the energy of a typical day of that month. Hovering or focusing a bar (mouse or keyboard) opens a tooltip with the month's estimate, in kWh a month and kWh a day; the same text is the bar's accessible name.

## Calibration with a measurement

The owner measures **12 to 14 kWh a day on average in January** with six 450 Wp panels (2.7 kWp) that have the same tilt and orientation as the planned array. That is 4.81 kWh per kWp a day at the middle of the range; the uncalibrated model gave 5.78 (the mean of January's days), so the model was about 17% optimistic. `PV_SYSTEM.calibration.factor = 0.83` (`apps/web/src/data/pv-system.ts`) multiplies the panels' power before the inverter, and a test keeps a January of six panels between 12 and 14 kWh.

The factor stands in for whatever the typical values miss: NASA POWER's irradiation, which runs above ground stations, hotter modules and longer cables. One month is one data point, so the same factor is used for the whole year, clear days included. More measurements, in other seasons, would show whether it should change with the season.

## Result (current data)

About 1.23 MWh per kWp per year (~12.2 MWh for 9.92 kWp) after the calibration, ~6.1 kWh/kWp on a clear December day and ~2.3 in June. Before it, the yield was 1.48 MWh per kWp. Shading costs well under 1% because the panels sit above the parapets and the neighbours are low.

## Limits

- Expect ±10–15% on the year. Weather of a specific day is not known.
- Distant buildings beyond the modelled block are not included.
- Neighbour heights on unsurveyed lots are a default of 3.3 m.
- Losses and temperature coefficients are typical values for the panel class, not the datasheet of the chosen model.

## The generation panels

The sidebar shows the day's figure, the power curve, the months as bars and the **efficiency factor**. The factor is the calibration above (0.83) made editable: a slider and a number box from 50% to 110%, remembered in the browser (`localStorage`, optional) and applied to the panels' power before the inverter, so the day, the year and the tables all follow it. It is a user setting, not data: `PV_SYSTEM.calibration.factor` stays the default, and "Back to the calibrated value" returns to it.

- **Hovering the power curve** reads the moment under the pointer (typical day, clear sky, overcast and the energy so far today); a click, or Enter with the keyboard, moves the solar study to that time. Clicking a month bar moves it to that month's 15th.
- **Expand** opens a wide panel over the 3D scene, which stays visible and follows the same date and time. *Day*: the large curve, the peak and its share of the inverter, the yield per kWp, the producing hours, the longest stretch of shade on the useful hours, and the irradiation. *Year*: the months in kWh a day, a month or per kWp a day, the year's mean, a table by month and a CSV download.
- **Panels** (in the expanded panel): the array seen from the street, each panel coloured by its energy on the typical day or by the shade it loses on a clear day, with the two strings marked and a tooltip for each panel. A string's energy follows its own DC output, which the bypass diodes already limit to its weakest panels (`stringDcKwh` in `model.ts`). A panel's energy is its share of the day's AC energy in proportion to the light on its plane (`panelPoaKwhM2`), since every panel has the same rating, so it does not show the string's clipping of a shaded panel. With the modelled surroundings the panels differ by about 1% at most: shade is not the issue at this roof.
- **Bill** (in the expanded panel): the electricity bill month by month with and without the array, for a two-way meter (`lib/pv/billing.ts`). Each month the array's energy splits into what the house uses as it is made (an editable share, 35% by default, never more than the house consumes) and the rest, sent to the grid. The grid pays that export at an editable share of the price per kWh, **70% by default**, since the generation and distribution costs are not paid back; it is a credit on the bill. A credit larger than the month's energy charge carries over to the next month, what is left at the end of the year is reported but not counted, and the fixed charge is always paid. The price per kWh (taxes included), the fixed charge and each month's consumption are the owner's to enter: the defaults (130 a kWh, no fixed charge, 500 kWh a month) are placeholders, not data. Settings are kept in the browser.
