/**
 * Monthly climate of the site, from the NASA POWER climatology (MERRA-2 and SYN1DEG,
 * January 2001 to December 2020), queried at the site's coordinates rounded to two
 * decimals. Downloaded once; the app makes no request. Irradiance is global
 * horizontal, in kWh/m2 per day; temperature is the 24 h mean at 2 m, in degrees C.
 * Months run from January to December.
 *
 * Source: https://power.larc.nasa.gov (Climatology API, community RE).
 * Fields: ALLSKY_SFC_SW_DWN, CLRSKY_SFC_SW_DWN, T2M.
 */
export const CLIMATE = {
  source: 'NASA POWER climatology, 2001-2020',
  allSkyGhi: [7.21, 6.34, 5.25, 3.86, 2.73, 2.26, 2.39, 3.25, 4.44, 5.55, 6.8, 7.48],
  clearSkyGhi: [8.71, 7.8, 6.45, 4.89, 3.61, 3.04, 3.29, 4.3, 5.8, 7.34, 8.51, 9.03],
  temperature: [24.81, 23.56, 20.98, 17.01, 13.24, 10.05, 9.29, 11.21, 13.38, 16.61, 20.09, 23.03],
} as const

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const
