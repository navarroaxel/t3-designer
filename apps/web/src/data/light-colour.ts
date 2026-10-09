/**
 * The colour of the kitchen's lights, warm or cool (owner: a panel to edit it). A colour temperature in kelvin is turned into the colour of a black body at that temperature, with the usual
 * approximation (Tanner Helland's): 2200 K is the orange of a candle, 2700 K the warm white of an incandescent bulb, 4000 K a neutral white, 6500 K daylight (pure white) and, from 7000 K up, a cool, bluish white.
 */
export const KELVIN = { min: 2200, max: 8000, step: 100, warm: 2700, neutral: 4000, cool: 7000 } as const

/** The groups of lights of the kitchen that the panel edits, and what each starts at. */
export const KITCHEN_LIGHT_GROUPS = ['pendants', 'line', 'conduit'] as const
export type KitchenLightGroup = typeof KITCHEN_LIGHT_GROUPS[number]
export type KitchenLightKelvin = Record<KitchenLightGroup, number>
export const DEFAULT_KITCHEN_KELVIN: KitchenLightKelvin = { pendants: 2700, line: 2700, conduit: 3000 }

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)))

/** The [red, green, blue] of a black body at `kelvin`, each 0 to 255. */
export function kelvinRgb(kelvin: number): [number, number, number] {
  const temperature = Math.max(KELVIN.min, Math.min(KELVIN.max, kelvin)) / 100
  const red = temperature <= 66 ? 255 : 329.698727446 * (temperature - 60) ** -.1332047592
  const green = temperature <= 66 ? 99.4708025861 * Math.log(temperature) - 161.1195681661 : 288.1221695283 * (temperature - 60) ** -.0755148492
  const blue = temperature >= 66 ? 255 : temperature <= 19 ? 0 : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307
  return [clamp(red), clamp(green), clamp(blue)]
}

/** The same as a `#rrggbb` string. */
export const kelvinColour = (kelvin: number) => `#${kelvinRgb(kelvin).map(channel => channel.toString(16).padStart(2, '0')).join('')}`

/** The time of day the light panel offers to test the lights at (owner: the sun control at hand), in minutes from midnight: a bright afternoon, dusk and night. */
export const TEST_TIMES = { day: 13 * 60, dusk: 19 * 60 + 30, night: 23 * 60 } as const

/** Minutes from midnight as `HH:MM`. */
export const clockLabel = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * How much brighter the lights are in the dark (owner: they were left at a quarter for the day, and are too weak at night). 1 in daylight, where the lights are the weak ones the day wants, and
 * `NIGHT_GAIN` from the end of civil twilight (the sun 6 degrees under the horizon) on, with a smooth run between, over the twelve degrees from 6 above to 6 below.
 */
export const NIGHT_GAIN = 4
export function lightGain(sunAltitudeDegrees: number): number {
  const darkness = Math.max(0, Math.min(1, (6 - sunAltitudeDegrees) / 12))
  return 1 + (NIGHT_GAIN - 1) * darkness * darkness * (3 - 2 * darkness)
}
