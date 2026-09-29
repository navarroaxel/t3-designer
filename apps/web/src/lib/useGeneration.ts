import { useEffect, useMemo, useState } from 'react'
import type { SolarStudy } from './useSolarStudy'
import { simulateDay, simulateYear, type DayResult, type YearResult } from './pv/model'
import { litFractions } from './pv/shading'
import type { Vec3 } from './pv/plane'

const DAY_STEP = 10

/**
 * What the array produces for the date and time chosen in the solar study. The day is simulated
 * whenever the date changes; the year is simulated once, after the first paint, so it does not
 * hold up the opening of the page. `panelShade` is each panel's lit share of the beam at the chosen
 * moment, under a clear sky, for colouring the panels in 3D.
 */
export function useGeneration(solar: SolarStudy) {
  const date = solar.moment.date
  const day: DayResult = useMemo(() => simulateDay(date, DAY_STEP), [date])
  const [year, setYear] = useState<YearResult | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setYear(simulateYear()), 60)
    return () => window.clearTimeout(timer)
  }, [])
  const panelShade = useMemo(() => solar.sun.altitude > 0 ? litFractions(solar.sun.direction as Vec3) : null, [solar.sun])
  const index = Math.min(day.typical.acW.length - 1, Math.round(solar.moment.minutes / DAY_STEP))
  return {
    day, year, panelShade,
    nowTypicalKw: day.typical.acW[index] / 1000,
    nowClearKw: day.clear.acW[index] / 1000,
  }
}

export type Generation = ReturnType<typeof useGeneration>
