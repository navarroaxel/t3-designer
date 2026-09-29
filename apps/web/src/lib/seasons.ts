export type SeasonKey = 'solar.spring' | 'solar.summer' | 'solar.autumn' | 'solar.winter'
export type SeasonPreset = { key: SeasonKey; date: string }

/** Equinox and solstice dates in calendar order. The season names swap between
 * hemispheres: 21 December is the start of summer in the south, of winter in the north. */
export function seasonPresets(latitude: number): SeasonPreset[] {
  const south = latitude < 0
  return [
    { key: south ? 'solar.autumn' : 'solar.spring', date: '03-20' },
    { key: south ? 'solar.winter' : 'solar.summer', date: '06-21' },
    { key: south ? 'solar.spring' : 'solar.autumn', date: '09-22' },
    { key: south ? 'solar.summer' : 'solar.winter', date: '12-21' },
  ]
}
