import { PV_SYSTEM } from './pv-system.ts'

/**
 * The house's electrical design: two boards, the garage's (the solar equipment and the upper floor) and the pantry's (the ground floor), on a three-phase supply behind the Deye hybrid
 * inverter. This is the owner's plan, not what is built: which circuits there are, which board each is on, the supply's order (the three-position changeover switch that can leave the inverter out) and the
 * three-phase sauna are the owner's; the phase of each circuit, the ratings and the cable sizes are proposals (`assumed`) for the electrician to confirm. The reasons are in docs/model/electrical.md.
 */
export type Phase = 'L1' | 'L2' | 'L3'
export type BoardId = 'garage' | 'pantry'
export type CircuitKind = 'lights' | 'outlets' | 'ac' | 'heater' | 'outdoor' | 'sauna'
export const PHASES: readonly Phase[] = ['L1', 'L2', 'L3']
/** What the phases are called on the page: R, S and T, as in Argentina. The ids stay L1, L2 and L3. */
export const PHASE_NAME: Readonly<Record<Phase, string>> = { L1: 'R', L2: 'S', L3: 'T' }

/** A circuit leaving a board: `loadW` is the connected power on it, when it has a load that counts (a big load, or a circuit of outlets at 10 A); the lights have none and are not counted. */
export type Circuit = {
  id: string; board: BoardId; floor: 'upper' | 'ground'; kind: CircuitKind
  phases: readonly Phase[]; ratingA: number; cableMm2: number; modules: number; loadW?: number
  /** The current the maker states, amps on each phase, where there is one; the current checks use it, not `loadW` over the voltage, which leaves out the power factor. */
  currentA?: number
  /** True where the circuit hangs from the inverter's output without UPS, not from the one with UPS that the changeover switch takes: the water heater and the sauna heater do. */
  noUps?: true
}

/** Phase-to-neutral voltage, volts; the line-to-line one is 400. */
export const PHASE_VOLTAGE = 230
/** The 553GIQ2201F's electrical consumption in cooling (the maker's table: 1.89 kW, 8.73 A); the power display counts the air conditioners at it, and the current checks at its 8.73 A. */
export const AC_LOAD_W = 1890
export const AC_CURRENT_A = 8.73
/** Both elements of the Señorial Family electric water heater (1 500 W each; the maker's sheet: 6.8 / 13.6 A). */
export const WATER_HEATER_W = 3000
export const WATER_HEATER_A = 13.6
/** What a circuit of outlets is counted at: 10 A, the owner's figure and the rating of the Argentine outlet's plug. The kitchen's kettle (2.2 kW; the air fryer is used instead of it, not with it) fits in it. */
export const OUTLET_LOAD_W = 10 * 230
export const SAUNA_W = 5000

const circuit = (id: string, board: BoardId, floor: Circuit['floor'], kind: CircuitKind, phase: Phase | readonly Phase[], ratingA: number, cableMm2: number, extra: { modules?: number; loadW?: number; currentA?: number; noUps?: true } = {}): Circuit =>
  ({ id, board, floor, kind, phases: typeof phase === 'string' ? [phase] : phase, ratingA, cableMm2, modules: extra.modules ?? (typeof phase === 'string' ? 1 : phase.length), loadW: extra.loadW, currentA: extra.currentA, noUps: extra.noUps })

/**
 * The circuits. The daytime air conditioners (the office's and the living room's) are on different phases, and so are the two bedrooms', which are used at night; the water heater is not on the kettle's phase.
 * Every circuit on one phase is 2P (the owner's choice, but for the water heater's): the phase and the neutral are both cut.
 */
export const CIRCUITS: readonly Circuit[] = [
  circuit('upper-lights-1', 'garage', 'upper', 'lights', 'L1', 10, 1.5, { modules: 2 }),
  circuit('upper-lights-2', 'garage', 'upper', 'lights', 'L2', 10, 1.5, { modules: 2 }),
  circuit('upper-outlets-kitchen', 'garage', 'upper', 'outlets', 'L3', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-outlets-rooms', 'garage', 'upper', 'outlets', 'L1', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-outdoor', 'garage', 'upper', 'outdoor', 'L2', 10, 1.5, { modules: 2 }),
  circuit('upper-azotea', 'garage', 'upper', 'outdoor', 'L3', 16, 2.5, { modules: 2 }),
  circuit('upper-ac-living', 'garage', 'upper', 'ac', 'L2', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-ac-main-room', 'garage', 'upper', 'ac', 'L1', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-ac-guest-room', 'garage', 'upper', 'ac', 'L2', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-water-heater', 'garage', 'upper', 'heater', 'L1', 20, 4, { modules: 2, loadW: WATER_HEATER_W, currentA: WATER_HEATER_A, noUps: true }),
  circuit('ground-lights-1', 'pantry', 'ground', 'lights', 'L3', 10, 1.5, { modules: 2 }),
  circuit('ground-lights-2', 'pantry', 'ground', 'lights', 'L1', 10, 1.5, { modules: 2 }),
  circuit('ground-outlets-office', 'pantry', 'ground', 'outlets', 'L2', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('ground-outlets-pantry', 'pantry', 'ground', 'outlets', 'L3', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('ground-ac-office', 'pantry', 'ground', 'ac', 'L3', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('ground-sauna', 'pantry', 'ground', 'sauna', PHASES, 10, 2.5, { loadW: SAUNA_W, noUps: true }),
]

/** A protective or switching device that is not a circuit of its own. `ratingA` is null where it follows the supply or the maker's manual, which the model does not have. */
export type Device = { id: string; board: BoardId; poles: number; modules: number; ratingA: number | null; optional?: true }

export const DEVICES: readonly Device[] = [
  /** The garage board's general breaker, for PA only: it is after the changeover switch, and the feeder to the pantry leaves before it. At 40 A, no larger than the residual-current devices it feeds. */
  { id: 'main', board: 'garage', poles: 4, modules: 4, ratingA: 40 },
  /** A four-pole changeover switch such as the 63 A TX419G of the owner's picture: 72 mm wide, four modules. Its load terminals are the odd ones on top, the normal (the grid) and the standby (the inverter) the even ones below. */
  { id: 'selector', board: 'garage', poles: 4, modules: 4, ratingA: null },
  { id: 'inverter-ac', board: 'garage', poles: 4, modules: 4, ratingA: 20 },
  { id: 'string-dc-1', board: 'garage', poles: 2, modules: 2, ratingA: 16 },
  { id: 'string-dc-2', board: 'garage', poles: 2, modules: 2, ratingA: 16 },
  { id: 'rcd-garage', board: 'garage', poles: 4, modules: 4, ratingA: 40 },
  { id: 'rcd-garage-2', board: 'garage', poles: 4, modules: 4, ratingA: 40 },
  /** The device of the output without UPS: it covers the water heater and the line to the sauna heater in the pantry. Both are resistive, so type A. */
  { id: 'rcd-garage-3', board: 'garage', poles: 4, modules: 4, ratingA: 40 },
  /** The pantry board's main breaker, at the end of the feeder (the owner's choice): the feeder's cable has no breaker of its own at its origin, so the supply's main one has to be at most what the 6 mm² takes. */
  { id: 'feeder', board: 'pantry', poles: 4, modules: 4, ratingA: 32 },
  { id: 'surge-dc', board: 'garage', poles: 2, modules: 2, ratingA: null, optional: true },
  { id: 'surge-ac', board: 'garage', poles: 4, modules: 4, ratingA: null, optional: true },
  { id: 'rcd-pantry', board: 'pantry', poles: 4, modules: 4, ratingA: 40 },
  { id: 'rcd-pantry-2', board: 'pantry', poles: 4, modules: 4, ratingA: 40 },
]

/**
 * The main board, the meter's drop (the owner's): a six-module box with a single four-pole breaker, from which the changeover switch and the inverter's grid input are fed. It is not one of the two boards with rows: its rating follows
 * the supply, and what it protects first is the cable to the garage, so it is 32 A or less while the pantry's feeder, which has no breaker of its own at its origin, hangs from that cable.
 */
export const METER_DROP = { id: 'meter-itm', poles: 4, modules: 4, ratingA: null as number | null, boxModules: 6 }

/**
 * Short tags for the cells of the boards' rows, where a one-module breaker is 18 mm wide and a name does not fit. IUG and TUG are the Argentine names of the general-use lighting and
 * outlet circuits (the standard's); the rest are the usual short forms.
 */
export const TAGS: Readonly<Record<string, string>> = {
  'meter-itm': 'ITM', main: 'TMPA', selector: 'CON', 'inverter-ac': 'INV', 'string-dc-1': 'DC1', 'string-dc-2': 'DC2', 'rcd-garage': 'ID A', 'rcd-garage-2': 'ID F', 'rcd-garage-3': 'ID SU',
  feeder: 'TMPB', 'surge-dc': 'SPD DC', 'surge-ac': 'SPD AC', 'rcd-pantry': 'ID A', 'rcd-pantry-2': 'ID F',
  'upper-lights-1': 'IUG1', 'upper-lights-2': 'IUG2', 'upper-outlets-kitchen': 'TUG K', 'upper-outlets-rooms': 'TUG R', 'upper-outdoor': 'EXT', 'upper-azotea': 'AZO',
  'upper-ac-living': 'AC L', 'upper-ac-main-room': 'ACMR', 'upper-ac-guest-room': 'ACGR', 'upper-water-heater': 'TERMO',
  'ground-lights-1': 'IUG3', 'ground-lights-2': 'IUG4', 'ground-outlets-office': 'TUG O', 'ground-outlets-pantry': 'TUG D', 'ground-ac-office': 'ACOF', 'ground-sauna': 'SAUNA',
}

/**
 * The boxes and what goes in which row, left to right, as the installer sets them. Both boxes are the owner's 48-module Genrod; that it is three rows of sixteen follows from the owner's photo
 * of it (three rows) and is assumed. The garage's last row has the solar circuit (the owner's choice): the inverter's breaker and the strings' DC breakers (the battery comes with a 100 A breaker of its own), and with them the supply's main
 * breaker and the changeover switch, because the other two rows are full with their groups; the first two rows each have their own residual-current device, type A for the lights and the outlets and
 * type F for what has an inverter (the air conditioners). The water heater and the line to the sauna come from the inverter's output without UPS, under a type A device of their own,
 * in the garage's second row with the air conditioners. The optional surge arresters are not in the rows: with them the garage's
 * board needs more than its 48 modules, so they go in a small box of their own. The ids are those of `CIRCUITS` and `DEVICES`.
 */
export const BOXES: Record<BoardId, { perRow: number; rows: readonly (readonly string[])[] }> = {
  garage: {
    perRow: 16,
    rows: [
      ['rcd-garage', 'upper-lights-1', 'upper-lights-2', 'upper-outdoor', 'upper-azotea', 'upper-outlets-rooms', 'upper-outlets-kitchen'],
      ['rcd-garage-2', 'upper-ac-living', 'upper-ac-main-room', 'upper-ac-guest-room', 'rcd-garage-3', 'upper-water-heater'],
      ['selector', 'main', 'inverter-ac', 'string-dc-1', 'string-dc-2'],
    ],
  },
  pantry: {
    perRow: 16,
    rows: [
      ['feeder', 'rcd-pantry', 'ground-lights-1', 'ground-lights-2', 'ground-outlets-office', 'ground-outlets-pantry'],
      ['rcd-pantry-2', 'ground-ac-office'],
      ['ground-sauna'],
    ],
  },
}

/** A row's items with what they are and how many modules they take. */
export const rowItems = (ids: readonly string[]) => ids.map(id => {
  const found = CIRCUITS.find(item => item.id === id) ?? DEVICES.find(item => item.id === id)
  if (!found) throw new Error(`Unknown item ${id}`)
  return { id, modules: found.modules, phases: 'phases' in found ? found.phases : undefined, optional: 'optional' in found ? found.optional : undefined }
})

/** The feeder from the garage board to the pantry's: four conductors and the earth in one thick conduit, a second one empty for later. */
export const FEEDER = { cableMm2: 6, conductors: 'R S T N + PE', conduitMm: 50, conduits: 2 }

export const boardCircuits = (board: BoardId) => CIRCUITS.filter(item => item.board === board)
export const boardDevices = (board: BoardId, withOptional = false) => DEVICES.filter(item => item.board === board && (withOptional || !item.optional))

/** The modules a board needs, with or without the optional surge arresters. */
export const boardModules = (board: BoardId, withOptional = false) =>
  boardCircuits(board).reduce((sum, item) => sum + item.modules, 0) + boardDevices(board, withOptional).reduce((sum, item) => sum + item.modules, 0)

/** The connected power on each phase, watts, from the circuits that have a big load on them: a three-phase load shares its power equally. It is what is connected, not what is on at once. */
export function phaseLoadW(circuits: readonly Circuit[] = CIRCUITS): Record<Phase, number> {
  const total: Record<Phase, number> = { L1: 0, L2: 0, L3: 0 }
  for (const item of circuits) for (const phase of item.phases) total[phase] += (item.loadW ?? 0) / item.phases.length
  return total
}

/** The connected current on each phase, amps, and the inverter's maximum AC output current on a phase, the limit if the house is on the inverter's own output. */
export function phaseCurrentA(circuits: readonly Circuit[] = CIRCUITS): Record<Phase, number> {
  const total: Record<Phase, number> = { L1: 0, L2: 0, L3: 0 }
  for (const item of circuits) for (const phase of item.phases) total[phase] += item.currentA ?? (item.loadW ?? 0) / item.phases.length / PHASE_VOLTAGE
  return total
}
/** The simultaneity factor the AEA gives a house with superior electrification (the owner's figure): 60 % of what is connected is taken to be on at once. */
export const SIMULTANEITY = .6
/** The demand on each phase, amps: the connected current times the simultaneity factor. */
export const phaseDemandA = (circuits: readonly Circuit[] = CIRCUITS): Record<Phase, number> => {
  const current = phaseCurrentA(circuits)
  return { L1: current.L1 * SIMULTANEITY, L2: current.L2 * SIMULTANEITY, L3: current.L3 * SIMULTANEITY }
}
export const INVERTER_MAX_OUTPUT_A = 16
/** The circuits that hang from the inverter's UPS output when the changeover switch is on Inverter: all but the water heater and the sauna heater, which are on its output without UPS (the owner's choice). */
export const onUpsOutput = (): readonly Circuit[] => CIRCUITS.filter(item => !item.noUps)

/** The model's inverter, so the diagram names the one that the generation page does. */
/** The modules of each box. */
export const boxModules = (board: BoardId) => BOXES[board].perRow * BOXES[board].rows.length

export const INVERTER_MODEL = PV_SYSTEM.inverter.model
