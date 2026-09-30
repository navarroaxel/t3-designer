/**
 * Parameters of the photovoltaic model. Each one is either stated by the owner or a
 * typical value that should be replaced by the datasheet or measurements; the
 * provenance is in docs/model/generation.md.
 */
export const PV_SYSTEM = {
  /** Atmosphere. Linke turbidity 3.0 reproduces NASA's clear-sky monthly totals within 3 %. */
  site: { altitudeM: 25, linkeTurbidity: 3 },
  /** Overcast sky: no direct beam; the diffuse light is this share of the clear-sky global. */
  overcastTransmittance: .25,
  /** Reflectance of the painted white azotea under the raised panels. It barely matters at 5 degrees. */
  albedo: .5,
  /** ASHRAE incidence-angle loss coefficient of the glass. */
  iamB0: .05,
  temperature: {
    /** Nominal operating cell temperature, degrees C. */
    noct: 45,
    /** Power change per kelvin above 25 degrees C. Typical of N-type modules. */
    coefficientPerK: -.003,
    /** Day and night swing around the monthly mean, peaking mid-afternoon. */
    dailySwingK: 4.5,
    peakHour: 15,
  },
  /**
   * Losses other than shading, temperature and the inverter, as factors. All are typical values:
   * dust on the glass, DC cables, mismatch between panels beyond the shading, first-year light
   * degradation, lower efficiency in weak light and spectrum, and the inverter's availability and tracking.
   */
  losses: { soiling: .98, wiring: .985, mismatch: .99, quality: .99, weakLight: .985, availability: .99 },
  /**
   * Calibration against the owner's measurements. Six 450 Wp panels (2.7 kWp) with the same tilt and
   * orientation give 12 to 14 kWh a day on average in January: 4.81 kWh per kWp a day at the middle of that range,
   * while the uncalibrated model gave 5.78 (the mean of January's days). The factor is 4.81 / 5.78 = 0.83, applied
   * to the panels' power before the inverter, so it also stands in for what the typical losses miss: NASA POWER's
   * irradiation, which runs above ground stations, hotter modules, longer cables. One month is one point: the same
   * factor is assumed for the whole year.
   */
  calibration: { factor: .83, measuredKwhPerDay: [12, 14], measuredKwp: 2.7, month: 0 },
  /** 10 kW Deye inverter. The efficiency is typical; the clipping limit is its rating. */
  inverter: { efficiency: .97, maxAcW: 10_000 },
  /**
   * How the panels are wired: taking the installed panels in this order, up to 10 go in one series and the second
   * series is not used; with more they are cut in half so the two series are as even as possible. The owner says two series; which panels form each one
   * is assumed. With all 16 panels the first series is the front row and the two south-west panels of the
   * middle row, the second the rest of the middle row and the back row (8 and 8); leaving the back row out
   * gives the front row and the middle row (6 and 6). See `stringsFor` in lib/pv/strings.ts.
   */
  /** The most panels a series takes (the owner's limit); with no more than this many panels, the second series is not used. */
  maxPanelsPerString: 10,
  wiringOrder: [
    'front-1', 'front-2', 'front-3', 'front-4', 'front-5', 'front-6',
    'middle-6', 'middle-5', 'middle-4', 'middle-3', 'middle-2', 'middle-1',
    'back-1', 'back-2', 'back-3', 'back-4',
  ],
} as const
