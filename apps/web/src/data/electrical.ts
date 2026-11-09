import { PV_SYSTEM } from './pv-system.ts'

/**
 * The house's electrical design: three boards, the solar one in the garage (the inverter's and the strings' protections and the changeover switch), the PA one in the garage (the upper floor) and the pantry's (the ground floor), on a three-phase supply behind the Deye hybrid
 * inverter. This is the owner's plan, not what is built: which circuits there are, which board each is on, the supply's order (the three-position changeover switch that can leave the inverter out) and the
 * three-phase sauna are the owner's; the phase of each circuit, the ratings and the cable sizes are proposals (`assumed`) for the electrician to confirm. The reasons are in docs/model/electrical.md.
 */
export type Phase = 'L1' | 'L2' | 'L3'
export type BoardId = 'pa' | 'pantry' | 'solar'
export type CircuitKind = 'lights' | 'outlets' | 'ac' | 'heater' | 'sauna'
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

/** Phase-to-neutral voltage, volts: the nominal one in Argentina, 220 V (380 V line-to-line, as on the single-line diagram). */
export const PHASE_VOLTAGE = 220
/** The 553GIQ2201F's electrical consumption in cooling (the maker's table: 1.89 kW, 8.73 A); the power display counts the air conditioners at it, and the current checks at its 8.73 A. */
export const AC_LOAD_W = 1890
export const AC_CURRENT_A = 8.73
/** Both elements of the Señorial Family electric water heater (1 500 W each; the maker's sheet: 6.8 / 13.6 A). */
export const WATER_HEATER_W = 3000
export const WATER_HEATER_A = 13.6
/** What a circuit of outlets is counted at: 10 A, the owner's figure and the rating of the Argentine outlet's plug. The kitchen's kettle (2.2 kW; the air fryer is used instead of it, not with it) fits in it. */
export const OUTLET_LOAD_W = 10 * PHASE_VOLTAGE
export const SAUNA_W = 5000

const circuit = (id: string, board: BoardId, floor: Circuit['floor'], kind: CircuitKind, phase: Phase | readonly Phase[], ratingA: number, cableMm2: number, extra: { modules?: number; loadW?: number; currentA?: number; noUps?: true } = {}): Circuit =>
  ({ id, board, floor, kind, phases: typeof phase === 'string' ? [phase] : phase, ratingA, cableMm2, modules: extra.modules ?? (typeof phase === 'string' ? 1 : phase.length), loadW: extra.loadW, currentA: extra.currentA, noUps: extra.noUps })

/**
 * The circuits. The daytime air conditioners (the office's and the living room's) are on different phases; the water heater is not on the kettle's phase.
 * Every circuit on one phase is 2P (the owner's choice, but for the water heater's): the phase and the neutral are both cut.
 * Every circuit of lights is on 2.5 mm² (the owner's choice): 1.5 mm² is kept for the switches' returns.
 * The lights and outlets of each board are all on the same phase, and so are the air conditioners of the TSPA, behind two-pole residual-current devices (the teacher's advice: no more balancing; and the comb for the board's row is two-pole).
 */
export const CIRCUITS: readonly Circuit[] = [
  circuit('upper-lights-1', 'pa', 'upper', 'lights', 'L3', 10, 2.5, { modules: 2 }),
  circuit('upper-lights-2', 'pa', 'upper', 'lights', 'L3', 10, 2.5, { modules: 2 }),
  circuit('upper-outlets-kitchen', 'pa', 'upper', 'outlets', 'L3', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-outlets-living', 'pa', 'upper', 'outlets', 'L3', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-outlets-rooms', 'pa', 'upper', 'outlets', 'L3', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-outdoor', 'pa', 'upper', 'outlets', 'L1', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-azotea', 'pa', 'upper', 'outlets', 'L1', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('upper-ac-living', 'pa', 'upper', 'ac', 'L2', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-ac-main-room', 'pa', 'upper', 'ac', 'L2', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-ac-guest-room', 'pa', 'upper', 'ac', 'L2', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('upper-water-heater', 'pantry', 'upper', 'heater', 'L1', 20, 4, { modules: 2, loadW: WATER_HEATER_W, currentA: WATER_HEATER_A, noUps: true }),
  circuit('ground-lights-1', 'pantry', 'ground', 'lights', 'L2', 10, 2.5, { modules: 2 }),
  circuit('ground-lights-2', 'pantry', 'ground', 'lights', 'L2', 10, 2.5, { modules: 2 }),
  /** The bathroom's and the onsen's lights: a circuit of their own under the wet zone's device (ID D), so that a leak of a luminaire does not cut the rest, nor an outlet's overload the light. */
  circuit('ground-lights-3', 'pantry', 'ground', 'lights', 'L1', 10, 2.5, { modules: 2 }),
  /** The ground floor's three outlet circuits (owner): the garage, the reception and the office's kitchenette (the kettle and the Nespresso); the living, the office's laptops, the rack and the freezer (under the same type A device as the lights); the bathroom and the onsen (under a device of their own, as they are wet). */
  circuit('ground-outlets-1', 'pantry', 'ground', 'outlets', 'L2', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('ground-outlets-2', 'pantry', 'ground', 'outlets', 'L2', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('ground-outlets-3', 'pantry', 'ground', 'outlets', 'L1', 16, 2.5, { modules: 2, loadW: OUTLET_LOAD_W }),
  circuit('ground-ac-office', 'pantry', 'ground', 'ac', 'L3', 16, 4, { modules: 2, loadW: AC_LOAD_W, currentA: AC_CURRENT_A }),
  circuit('ground-sauna', 'pantry', 'ground', 'sauna', PHASES, 10, 4, { loadW: SAUNA_W, noUps: true, modules: 4 }),
]

/** A protective or switching device that is not a circuit of its own. `ratingA` is null where it follows the supply or the maker's manual, which the model does not have. */
export type Device = { id: string; board: BoardId; poles: number; modules: number; ratingA: number | null; /** The residual-current devices' type: A for the lights and the outlets, F for what has an inverter. */ rcdType?: 'A' | 'F'; /** The circuit it is in series with, when it is not one of the board's own devices but part of that circuit's line (the water heater's smart switch). */ inlineOf?: string }

export const DEVICES: readonly Device[] = [
  /** The PA board's general breaker, for PA only: it is after the changeover switch (in the TSINV), and the feeder to the pantry leaves before it. At 40 A, no larger than the residual-current devices it feeds. */
  { id: 'main', board: 'pa', poles: 4, modules: 4, ratingA: 40 },
  /** A four-pole changeover switch such as the 63 A TX419G of the owner's picture: 72 mm wide, four modules. Its load terminals are the odd ones on top, the normal (the grid) and the standby (the inverter) the even ones below. */
  { id: 'selector', board: 'solar', poles: 4, modules: 4, ratingA: 40 },
  /** AC IN: the breaker of the inverter's grid input, from the main board. */
  { id: 'inverter-ac', board: 'solar', poles: 4, modules: 4, ratingA: 32 },
  /** AC OUT: cuts the inverter's output with UPS, before the changeover switch. */
  { id: 'inverter-out', board: 'solar', poles: 4, modules: 4, ratingA: 32 },
  { id: 'string-dc-1', board: 'solar', poles: 2, modules: 2, ratingA: 20 },
  { id: 'string-dc-2', board: 'solar', poles: 2, modules: 2, ratingA: 20 },
  { id: 'surge-dc-1', board: 'solar', poles: 2, modules: 2, ratingA: null },
  { id: 'surge-dc-2', board: 'solar', poles: 2, modules: 2, ratingA: null },
  { id: 'rcd-garage', board: 'pa', poles: 2, modules: 2, ratingA: 40, rcdType: 'A' },
  { id: 'rcd-garage-2', board: 'pa', poles: 2, modules: 2, ratingA: 40, rcdType: 'F' },
  /** The exterior's own device: the exterior lights and the azotea's outlets, which get wet, so that their leaks do not cut the kitchen and the living (it is in the first row, next to the main breaker, as the pantry's ID A is). */
  { id: 'rcd-garage-3', board: 'pa', poles: 2, modules: 2, ratingA: 40, rcdType: 'A' },
  /** The device of the inverter's Smart Load output: it covers the water heater and the sauna heater, both in the pantry board. Both are resistive, so type A. */
  { id: 'rcd-pantry-3', board: 'pantry', poles: 4, modules: 4, ratingA: 40, rcdType: 'A' },
  /** The pantry board's main breaker, at the end of the feeder (the owner's choice): the feeder's cable has no breaker of its own at its origin, so the supply's main one has to be at most what the 6 mm² takes. */
  /** The Sonoff POW of the water heater: a smart switch and meter, 20 A, three modules wide, in series with its circuit, right after its breaker. */
  { id: 'water-heater-switch', board: 'pantry', poles: 2, modules: 3, ratingA: 20, inlineOf: 'upper-water-heater' },
  /** The same Sonoff POWR320D after the office's air conditioner's breaker, and after the living room's. */
  { id: 'ac-office-meter', board: 'pantry', poles: 2, modules: 3, ratingA: 20, inlineOf: 'ground-ac-office' },
  { id: 'ac-living-meter', board: 'pa', poles: 2, modules: 3, ratingA: 20, inlineOf: 'upper-ac-living' },
  { id: 'feeder', board: 'pantry', poles: 4, modules: 4, ratingA: 32 },
  { id: 'rcd-pantry', board: 'pantry', poles: 2, modules: 2, ratingA: 40, rcdType: 'A' },
  { id: 'rcd-pantry-2', board: 'pantry', poles: 2, modules: 2, ratingA: 40, rcdType: 'F' },
  /** The wet zone's own device: the bathroom's and the onsen's outlets, so that their humidity does not cut the rest. */
  { id: 'rcd-pantry-4', board: 'pantry', poles: 2, modules: 2, ratingA: 40, rcdType: 'A' },
]

/**
 * The main board, the meter's drop (the owner's): a Genrod of one row of sixteen modules that holds the protections of the supply, from which the changeover switch and the inverter's grid input are fed: the four-pole breaker,
 * the AC surge arrester after it, and the three-phase voltage protector. It is not one of the boards with rows: the breaker's rating follows the supply, and what it protects first is the cable to the garage, so it is 32 A or
 * less while the pantry's feeder, which has no breaker of its own at its origin, hangs from that cable. The strings' DC surge arresters, one per string, are in the TSINV.
 */
export const METER_DROP = { id: 'meter-itm', poles: 4, modules: 4, ratingA: 32 as number | null, curve: 'C', breakingKA: 6, boxModules: 16 }
/** The AC surge arrester, 3+1: a varistor from each phase to neutral and a spark gap from neutral to earth, four modules. It sits next to the earth bar and the rod. The maker says what back-up breaker or fuse it needs. */
export const SURGE_AC = { id: 'surge-ac', poles: 4, modules: 4, ratingA: null as number | null }
/** A BAW RU400F63 Plus type of protector (the owner's picture), five modules: it reads each phase's voltage and current and opens its contactors, in series with the load, when a voltage is out of range. 63 A a phase. */
export const VOLTAGE_PROTECTOR = { id: 'voltage-protector', poles: 4, modules: 5, ratingA: 63 as number | null }
/** What is in the main board, left to right: the breaker, the AC arrester that is next to it, and the protector. */
export const MAIN_BOARD_ITEMS = [METER_DROP, SURGE_AC, VOLTAGE_PROTECTOR] as const

/**
 * Short tags for the cells of the boards' rows, where a one-module breaker is 18 mm wide and a name does not fit. IUG and TUG are the Argentine names of the general-use lighting and
 * outlet circuits (the standard's); the rest are the usual short forms.
 */
export const TAGS: Readonly<Record<string, string>> = {
  'meter-itm': 'ITM', 'voltage-protector': 'PROT', 'surge-dc-1': 'SPD D1', 'surge-dc-2': 'SPD D2', main: 'TMPA', selector: 'CON', 'inverter-ac': 'AC IN', 'inverter-out': 'AC OUT', 'string-dc-1': 'DC1', 'string-dc-2': 'DC2', 'rcd-garage': 'ID A', 'rcd-garage-2': 'ID C', 'rcd-pantry-3': 'ID SU',
  feeder: 'TMPB', 'surge-ac': 'SPD AC', 'rcd-pantry': 'ID B', 'rcd-pantry-2': 'ID F', 'rcd-pantry-4': 'ID D', 'rcd-garage-3': 'ID E',
  'upper-lights-1': 'IUG L', 'upper-lights-2': 'IUG R', 'upper-outlets-kitchen': 'TUG K', 'upper-outlets-living': 'TUG L', 'upper-outlets-rooms': 'TUG R', 'upper-outdoor': 'EXT', 'upper-azotea': 'AZO',
  'upper-ac-living': 'AC L', 'upper-ac-main-room': 'ACMR', 'upper-ac-guest-room': 'ACGR', 'upper-water-heater': 'TERMO', 'water-heater-switch': 'MTERMO', 'ac-office-meter': 'MACOF', 'ac-living-meter': 'MACL',
  'ground-lights-1': 'IUG G', 'ground-lights-2': 'IUG O', 'ground-lights-3': 'IUG B', 'ground-outlets-1': 'TUG G', 'ground-outlets-2': 'TUG O', 'ground-outlets-3': 'TUG B', 'ground-ac-office': 'ACOF', 'ground-sauna': 'SAUNA',
}

/**
 * The boxes and what goes in which row, left to right, as the installer sets them. The PA board and the pantry's are the owner's 48-module Genrod; that it is three rows of sixteen follows from the owner's photo
 * of it (three rows) and is assumed. TSINV is a new 24-module box of two rows of twelve (the owner's, the rows assumed) in the garage, next to the inverter: its first row has the changeover switch and the inverter's
 * breaker, its second the strings' DC breakers and their DC surge arresters, one per string. The battery has no breaker of its own: the inverter's is built in. The PA board takes what hangs from the changeover switch for the upper floor: its first row is the floor's main breaker and its AC surge arrester, and the other two
 * each have their own residual-current device, type A for the lights and the outlets and type F for what has an inverter (the air conditioners); the water heater and the sauna come from the inverter's Smart Load output, under a type A device
 * of their own, in the last row of the pantry's board. The ids are those of `CIRCUITS` and `DEVICES`.
 */
export const BOXES: Record<BoardId, { perRow: number; rows: readonly (readonly string[])[] }> = {
  solar: {
    perRow: 12,
    rows: [
      ['selector', 'inverter-ac', 'inverter-out'],
      ['string-dc-1', 'string-dc-2', 'surge-dc-1', 'surge-dc-2'],
    ],
  },
  pa: {
    perRow: 16,
    rows: [
      ['main', 'rcd-garage-3', 'upper-outdoor', 'upper-azotea'],
      ['rcd-garage', 'upper-lights-1', 'upper-lights-2', 'upper-outlets-rooms', 'upper-outlets-kitchen', 'upper-outlets-living'],
      ['rcd-garage-2', 'upper-ac-living', 'ac-living-meter', 'upper-ac-main-room', 'upper-ac-guest-room'],
    ],
  },
  pantry: {
    perRow: 16,
    rows: [
      ['feeder', 'rcd-pantry', 'ground-lights-1', 'ground-lights-2', 'ground-outlets-1', 'ground-outlets-2'],
      ['rcd-pantry-2', 'ground-ac-office', 'ac-office-meter', 'rcd-pantry-4', 'ground-outlets-3', 'ground-lights-3'],
      ['rcd-pantry-3', 'upper-water-heater', 'water-heater-switch', 'ground-sauna'],
    ],
  },
}

/** A row's items with what they are and how many modules they take; the phases are those of the circuit, or of the circuit that a device is in series with (the water heater's smart switch). */
export const rowItems = (ids: readonly string[]) => ids.map(id => {
  const found = CIRCUITS.find(item => item.id === id) ?? DEVICES.find(item => item.id === id)
  if (!found) throw new Error(`Unknown item ${id}`)
  return { id, modules: found.modules, phases: 'phases' in found ? found.phases : found.inlineOf ? CIRCUITS.find(item => item.id === found.inlineOf)?.phases : undefined }
})

/** One residual-current device of a board and the circuits under it; `rcd` is null for circuits that are on no device of their own board (the sauna's line comes from the TSPA's). */
export type SingleLineGroup = { rcd: Device | null; circuits: readonly Circuit[] }

/**
 * A board for its single-line diagram: what the supply meets first (the general breaker, the surge arrester), then each residual-current device with the circuits that hang from it. It is read from `BOXES`: a row is
 * electrically separate from the next, so a device protects the circuits to its right in its own row. The groups whose circuits are all on the inverter's output without UPS do not hang from the board's supply.
 */
export function singleLine(board: BoardId): { head: readonly Device[]; groups: readonly SingleLineGroup[] } {
  const head: Device[] = [], groups: { rcd: Device | null; circuits: Circuit[] }[] = []
  for (const row of BOXES[board].rows) {
    let current: (typeof groups)[number] | null = null
    for (const id of row) {
      const device = DEVICES.find(item => item.id === id), found = CIRCUITS.find(item => item.id === id)
      if (device?.rcdType) groups.push(current = { rcd: device, circuits: [] })
      else if (device && !device.inlineOf) head.push(device)
      else if (found) {
        if (!current) groups.push(current = { rcd: null, circuits: [] })
        current.circuits.push(found)
      }
    }
  }
  return { head, groups }
}
/** A group is on the inverter's output without UPS when every circuit under it is: it does not take the TSPA's main breaker's supply. */
export const groupNoUps = (group: SingleLineGroup) => group.circuits.length > 0 && group.circuits.every(item => item.noUps)

/** The feeder from TSINV's changeover switch to the pantry's board: four conductors and the earth in one thick conduit, a second one empty for later. */
/** The cable from the main board to the changeover switch, and from the inverter's AC OUT breaker to it: four conductors of 10 mm² and the earth (owner). */
export const SUPPLY_CABLE_MM2 = 10
/** The cable from the inverter's Smart load output to the group of the TSPA that hangs from it: 6 mm² (owner). */
export const SMART_LOAD_CABLE_MM2 = 6
/** The cable from the meter box to the main board's ITM: 6 mm², what the company asks for. */
export const METER_CABLE_MM2 = 6
/** The conduit that takes that cable from the main board (TP) to the solar board (TSINV), in millimetres (owner). */
export const SUPPLY_CONDUIT_MM = 50

/** The inverter's battery (owner): an SE-F12, 51.2 V nominal (low voltage), 11.8 kWh, 230 Ah. It has no breaker of its own: the inverter's is built in. */
export const BATTERY = { model: 'SE-F12', voltageV: 51.2, energyKWh: 11.8, capacityAh: 230 }

/** What each of the two strings is, for the single-line diagram (owner): nine panels of 620 Wp, 5.58 kWp. */
export const STRING_PANELS = { panels: 9, wp: 620 }

export const FEEDER = { cableMm2: 6, conductors: 'R S T N + PE', conduitMm: 50, conduits: 2 }

/** The breaking capacity of every circuit's breaker, kA (owner). */
export const CIRCUIT_BREAKING_KA = 4.5
/** The smart switch with power metering that the water heater's circuit goes through, after its breaker, and the air conditioners of the office and the living room too (owner): a Sonoff POWR320D, 20 A, three modules wide (`water-heater-switch`, `ac-office-meter` and `ac-living-meter` in `DEVICES`). */
export const SMART_SWITCH = { brand: 'Sonoff', model: 'POWR320D' }
/** The residual-current devices' trip time, ms: 30 ms is what the regulation asks. */
export const RCD_TRIP_MS = 30

export const boardCircuits = (board: BoardId) => CIRCUITS.filter(item => item.board === board)
export const boardDevices = (board: BoardId) => DEVICES.filter(item => item.board === board)

/** The modules a board needs. */
export const boardModules = (board: BoardId) =>
  boardCircuits(board).reduce((sum, item) => sum + item.modules, 0) + boardDevices(board).reduce((sum, item) => sum + item.modules, 0)

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
