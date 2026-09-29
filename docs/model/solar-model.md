# Solar model

The exterior viewer uses a local, dependency-free solar geometry module in `apps/web/src/lib/solar.ts`. There is no weather service or remote request when changing the date or time.

## Geometry and lighting

The implementation evaluates the Julian-century equations used by the [NOAA Solar Calculator](https://gml.noaa.gov/grad/solcalc/calcdetails.html): orbital longitude and anomaly, obliquity, solar declination, equation of time, then the observer's local hour angle. The [published NOAA implementation](https://gml.noaa.gov/grad/solcalc/main.js) was consulted on 2026-09-26. The arithmetic is implemented here without installing a package. NOAA attributes this method to Jean Meeus, *Astronomical Algorithms*; their calculator is no longer actively maintained.

`getSolarPosition(instant, latitude, longitude)` takes an absolute `Date` and WGS84 coordinates with east-positive longitude. It returns geometric altitude, azimuth measured clockwise from true north, and a unit direction **toward** the sun in the site's axes: **x east, y up, z south**. A Three.js directional light should be placed at `direction × distance` relative to its target. The apartment view uses the inverse rotation of the shared, explicitly estimated apartment-to-site placement to express this same physical direction in plan coordinates. This basis change is not a second solar calculation or a measured validation of the plan's orientation.

The direct solar light must turn off below altitude zero. Ambient or sky illumination can remain for navigation at night. Brightness, atmospheric colour and shadow softness in the viewer are artistic controls, not calculated irradiance. A facade's illumination and neighbouring-building shadows depend on the model geometry and real-world orientation, so approximate heights and unverified windows remain meaningful sources of uncertainty.

## Calendar and civil time

The UI's date and time are **Europe/Paris**, irrespective of the computer's current timezone. The [ECMAScript Internationalization API](https://tc39.es/ecma402/#sec-intl.datetimeformat.prototype.formattoparts) resolves local calendar components using the browser's [IANA time zone data](https://www.iana.org/time-zones). Future legal timezone changes require updated browser/OS timezone data. The supported civil-date range is 1900–2100.

`resolveLocalDateTime(date, minutes)` exposes the status and zero, one, or two matching UTC instants. A nonexistent spring time must be visibly rejected or explicitly moved by the UI; the library does not invent a timestamp. A repeated autumn time exposes both occurrences in UTC order. `localDateTimeToDate` rejects ambiguous values by default; callers can explicitly choose `earlier` or `later`. `getLocalDate` and `getLocalMinutes` convert an instant back to the location's calendar.

For example, Paris `2026-03-29 02:30` does not exist. Paris `2026-10-25 02:30` occurs at both `00:30Z` and `01:30Z`. The daily path walks actual instants, so these days contain 23 and 25 hours respectively.

## Daily events and accuracy

`getSolarDay` returns apparent sunrise and sunset, solar noon, daylight duration, and the full day's position samples every ten elapsed minutes. Sunrise and sunset use centre altitude **−0.833°** at a flat horizon, matching the standard allowance for refraction and the solar disc. See the [US Naval Observatory's definitions](https://aa.usno.navy.mil/faq/RST_defs). They describe the astronomical horizon, not the instant sunlight clears the neighbour's roof. The direct-light direction itself remains geometric and uses a zero-degree cutoff; apparent sunrise and the rendering cutoff therefore differ by a few minutes.

Crossings are bracketed at five-minute intervals and refined to less than one second. That is numerical resolution, not a claim about physical accuracy. Terrain, observer height, weather, atmospheric refraction, glazing, reflected light and measured radiation are not simulated. At high latitudes, a day with no crossing returns null events rather than a fabricated time.

The tests compare daytime angles against the [NREL/NLR SPA reference example](https://midcdmz.nlr.gov/spa/spa_tester.c), allowing 0.1° because that reference includes atmospheric and observer-height corrections. Its sunrise and sunset provide independent comparisons within two minutes. Tests also cover Quimper's seasonal altitude/day-length contrast, direction signs, night, leap dates, invalid values and both Paris DST transitions. This is a visual sun-and-shadow study, not a certified insolation or energy report.
