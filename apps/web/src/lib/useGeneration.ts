import { useEffect, useMemo, useState } from 'react'
import type { SolarStudy } from './useSolarStudy'
import { simulateDay, simulateYear, type DayResult, type YearResult } from './pv/model'
import { litFractions, sitePanelsFor } from './pv/shading'
import type { Vec3 } from './pv/plane'

const DAY_STEP = 10

/**
 * What the array produces for the date and time chosen in the solar study. The day is simulated
 * whenever the date changes; the year is simulated once, after the first paint, so it does not
 * hold up the opening of the page. `panelShade` is each panel's lit share of the beam at the chosen
 * moment, under a clear sky, for colouring the panels in 3D.
 */
export function useGeneration(solar: SolarStudy, factor: number, installed: ReadonlySet<string> | null) {
  const date = solar.moment.date
  const day: DayResult = useMemo(() => simulateDay(date, DAY_STEP, factor, installed), [date, factor, installed])
  const [year, setYear] = useState<YearResult | null>(null)
  useEffect(() => {
    // The first year waits for the first paint; a change of factor waits for the slider to rest.
    const timer = window.setTimeout(() => setYear(simulateYear(undefined, factor, installed)), 60)
    return () => window.clearTimeout(timer)
  }, [factor, installed])
  // What the whole planned array would make, to compare with a partial installation.
  const [fullYear, setFullYear] = useState<YearResult | null>(null)
  useEffect(() => {
    if (!installed) return
    const timer = window.setTimeout(() => setFullYear(simulateYear(undefined, factor, null)), 120)
    return () => window.clearTimeout(timer)
  }, [factor, installed])
  const panelShade = useMemo(() => solar.sun.altitude > 0 ? litFractions(solar.sun.direction as Vec3, { panels: sitePanelsFor(installed) }) : null, [solar.sun, installed])
  const index = Math.min(day.typical.acW.length - 1, Math.round(solar.moment.minutes / DAY_STEP))
  return {
    day, year, panelShade, installed,
    /** The whole planned array's year: the year itself while everything is installed. */
    fullYear: installed ? fullYear : year,
    nowTypicalKw: day.typical.acW[index] / 1000,
    nowClearKw: day.clear.acW[index] / 1000,
  }
}

export type Generation = ReturnType<typeof useGeneration>
