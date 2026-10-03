import { FLOOR_HEIGHT } from './building-site.ts'
import { WASHING_MACHINE_U, WASHING_MACHINE_V } from './washing-machine.ts'

/**
 * The Koh-i-Noor spin dryer (centrifuge) beside the washing machine (owner): a stainless-steel drum 0.35 m across and 0.64 m high, with a black lid,
 * a black drain spout low on the front and black feet. It stands to the right of the washing machine seen from the front, that is toward the rear
 * of the house (+u), against the party wall, 3 cm from the machine, and its spout faces the same way as the machine's door. House frame [u, v], absolute heights.
 */
export type DryerPart = { id: string; shape: 'cylinder' | 'box'; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number }

export const SPIN_DRYER = { diameter: .35, height: .64, gap: .03, lid: .06, base: .03 }
const { diameter, height, gap, lid, base } = SPIN_DRYER
const radius = diameter / 2
const floor = FLOOR_HEIGHT
export const SPIN_DRYER_CENTRE: [number, number] = [WASHING_MACHINE_U[1] + gap + radius, WASHING_MACHINE_V[1] - radius]
const [cu, cv] = SPIN_DRYER_CENTRE
const round = (id: string, r: number, y: [number, number], color: string, metalness = 0): DryerPart =>
  ({ id, shape: 'cylinder', u: [cu - r, cu + r], v: [cv - r, cv + r], y, color, metalness })

export const SPIN_DRYER_PARTS: DryerPart[] = [
  round('dryer-base', radius - .01, [floor, floor + base], '#17181a'),
  round('dryer-drum', radius, [floor + base, floor + height - lid], '#b9bdc0', .7),
  round('dryer-lid', radius + .005, [floor + height - lid, floor + height], '#141517'),
  // The drain spout, a black wedge low on the front.
  { id: 'dryer-spout', shape: 'box', u: [cu - .07, cu + .07], v: [cv - radius - .035, cv - radius + .03], y: [floor + .13, floor + .2], color: '#141517' },
  // The label's black band across the front.
  { id: 'dryer-label', shape: 'box', u: [cu - .1, cu + .1], v: [cv - radius - .004, cv - radius + .02], y: [floor + .38, floor + .46], color: '#1b1e22' },
]
