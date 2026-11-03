import assert from 'node:assert/strict'
import test from 'node:test'
import { AC_CURRENT_A, WATER_HEATER_A, PHASE_NAME, AC_LOAD_W, BOXES, METER_DROP, MAIN_BOARD_ITEMS, VOLTAGE_PROTECTOR, SURGE_AC, TAGS, onUpsOutput, boardCircuits, boardDevices, boardModules, boxModules, CIRCUITS, rowItems, DEVICES, OUTLET_LOAD_W, PHASES, phaseCurrentA, phaseDemandA, phaseLoadW, SIMULTANEITY, SAUNA_W, WATER_HEATER_W, type Phase } from '../src/data/electrical.ts'

const circuit = (id: string) => { const found = CIRCUITS.find(item => item.id === id); assert.ok(found, id); return found }
const phase = (id: string): Phase => { const { phases } = circuit(id); assert.equal(phases.length, 1, `${id} is on one phase`); return phases[0] }

test('the owner\'s circuits are all there: the upper floor on the PA board, the ground floor on the pantry\'s', () => {
  assert.equal(new Set(CIRCUITS.map(item => item.id)).size, CIRCUITS.length, 'every circuit has its own id')
  assert.equal(boardCircuits('pa').length, 10, 'two lights, two outlets, outdoor, azotea, three air conditioners and the water heater')
  assert.equal(boardCircuits('pantry').length, 6, 'two lights, two outlets, the office\'s air conditioner and the sauna')
  for (const item of CIRCUITS) assert.equal(item.board === 'pa', item.floor === 'upper', `${item.id} is on its floor's board`)
})

test('the sauna is the only three-phase load; every other circuit is on one phase', () => {
  for (const item of CIRCUITS) assert.equal(item.phases.length, item.id === 'ground-sauna' ? 3 : 1, item.id)
  assert.deepEqual([...circuit('ground-sauna').phases], [...PHASES])
})

test('the loads that run together are on different phases', () => {
  assert.notEqual(phase('ground-ac-office'), phase('upper-ac-living'), 'the two daytime air conditioners')
  assert.notEqual(phase('upper-ac-main-room'), phase('upper-ac-guest-room'), 'the two night-time air conditioners')
  assert.notEqual(phase('upper-water-heater'), phase('upper-outlets-kitchen'), 'the water heater and the kettle')
})

test('the phases carry about the same connected power, with the sauna and without it', () => {
  const spread = (load: Record<Phase, number>) => { const values = PHASES.map(name => load[name]); return (Math.max(...values) - Math.min(...values)) / (values.reduce((a, b) => a + b) / 3) }
  const load = phaseLoadW()
  assert.equal(load.L1 + load.L2 + load.L3, 4 * AC_LOAD_W + WATER_HEATER_W + 4 * OUTLET_LOAD_W + SAUNA_W)
  assert.ok(spread(load) < .25, `with the sauna: ${spread(load).toFixed(2)}`)
  assert.ok(spread(phaseLoadW(CIRCUITS.filter(item => item.id !== 'ground-sauna'))) < .35, 'without it')
})

test('the demand is 60 % of what is connected, the AEA\'s simultaneity factor for a house with superior electrification', () => {
  assert.equal(SIMULTANEITY, .6)
  const connected = phaseCurrentA(), demand = phaseDemandA()
  for (const name of PHASES) assert.ok(Math.abs(demand[name] - connected[name] * .6) < 1e-9, name)
})

test('the phases are called R, S and T on the page', () => {
  assert.deepEqual(PHASES.map(name => PHASE_NAME[name]), ['R', 'S', 'T'])
})

test('the current checks use the currents the makers state: 8.73 A for each air conditioner, 13.6 A for the water heater', () => {
  for (const item of CIRCUITS.filter(item => item.kind === 'ac')) assert.equal(item.currentA, AC_CURRENT_A, item.id)
  assert.equal(circuit('upper-water-heater').currentA, WATER_HEATER_A)
  const living = phaseCurrentA([circuit('upper-ac-living')])
  assert.ok(Math.abs(living.L2 - 8.73) < 1e-9, 'not 1890 W over 230 V')
  assert.ok(AC_LOAD_W / 230 < AC_CURRENT_A, 'the power factor makes the maker\'s current the larger one')
})

test('every breaker is above the current its circuit carries, the maker\'s where it is stated', () => {
  for (const item of CIRCUITS) if (item.currentA) assert.ok(item.ratingA > item.currentA, item.id)
})

test('every circuit of outlets counts as 10 A', () => {
  const outlets = CIRCUITS.filter(item => item.kind === 'outlets')
  assert.equal(outlets.length, 4)
  for (const item of outlets) assert.equal(item.loadW, 10 * 230, item.id)
})

test('a three-phase load shares its power equally', () => {
  const [sauna] = CIRCUITS.filter(item => item.id === 'ground-sauna')
  assert.deepEqual(phaseLoadW([sauna]), { L1: SAUNA_W / 3, L2: SAUNA_W / 3, L3: SAUNA_W / 3 })
  assert.ok(Math.abs(phaseCurrentA([sauna]).L1 - SAUNA_W / 3 / 230) < 1e-9)
})

test('every breaker protects its cable, and covers the load it carries', () => {
  const rated = new Map([[1.5, 10], [2.5, 16], [4, 20], [6, 32]])
  for (const item of CIRCUITS) {
    assert.ok(item.ratingA <= (rated.get(item.cableMm2) ?? 0), `${item.id}: ${item.ratingA} A on ${item.cableMm2} mm²`)
    if (item.loadW) assert.ok(item.ratingA > item.loadW / item.phases.length / 230, `${item.id} is not below its load`)
  }
})

test('the air conditioners and the water heater are on 4 mm² cable, as the owner has it', () => {
  for (const item of CIRCUITS.filter(item => item.kind === 'ac' || item.kind === 'heater')) assert.equal(item.cableMm2, 4, item.id)
})

test('the water heater has the 20 A its maker asks for, on the 4 mm² cable that carries it', () => {
  const heater = circuit('upper-water-heater')
  assert.equal(heater.ratingA, 20)
  assert.equal(heater.cableMm2, 4)
  assert.equal(heater.loadW, 3000)
})

test('the changeover switch is a four-pole switch of four modules, 72 mm wide', () => {
  const selector = DEVICES.find(item => item.id === 'selector')
  assert.equal(selector?.poles, 4)
  assert.equal(selector?.modules, 72 / 18)
})

test('every circuit on one phase is bipolar, as the owner chose, and cuts the phase and the neutral', () => {
  for (const item of CIRCUITS.filter(item => item.phases.length === 1)) assert.equal(item.modules, 2, item.id)
})

test('the PA board takes the upper floor in 36 modules, the solar board 16, the pantry\'s 25', () => {
  assert.equal(boardModules('pa'), 36, 'ten circuits, three residual-current devices and the floor\'s main breaker')
  assert.equal(boardModules('solar'), 16, 'the changeover switch, the inverter\'s breaker, two DC breakers and two DC surge arresters')
  assert.equal(boardModules('pantry'), 25)
})

test('the PA board and the pantry\'s are 48-module boxes and the solar board is 24 modules, two rows of twelve; every one has room for what it holds', () => {
  assert.equal(boxModules('pa'), 48)
  assert.equal(boxModules('pantry'), 48)
  assert.equal(boxModules('solar'), 24)
  assert.equal(BOXES.solar.perRow, 12)
  assert.equal(BOXES.solar.rows.length, 2)
  for (const board of ['pa', 'pantry', 'solar'] as const) assert.ok(boardModules(board) <= boxModules(board), board)
})

test('the pantry\'s main breaker, the feeder\'s, is in the pantry board, in the first row, and is a four-pole 32 A', () => {
  const feeder = DEVICES.find(item => item.id === 'feeder')
  assert.equal(feeder?.board, 'pantry')
  assert.equal(feeder?.poles, 4)
  assert.equal(feeder?.ratingA, 32)
  assert.equal(BOXES.pantry.rows[0][0], 'feeder')
})

test('every circuit and device is in exactly one row of its board, and no row is longer than the box\'s', () => {
  for (const board of ['pa', 'pantry', 'solar'] as const) {
    const placed = BOXES[board].rows.flat()
    const expected = [...boardCircuits(board), ...boardDevices(board)].map(item => item.id)
    assert.deepEqual([...placed].sort(), [...expected].sort(), `${board}: what is placed is what the board holds`)
    for (const row of BOXES[board].rows) assert.ok(rowItems(row).reduce((sum, item) => sum + item.modules, 0) <= BOXES[board].perRow, `${board}: a row fits`)
  }
})

test('the solar board has the changeover switch and the inverter\'s breaker in its first row and the strings\' DC breakers and a DC surge arrester each in its second', () => {
  const [first, second] = BOXES.solar.rows
  for (const id of ['selector', 'inverter-ac']) assert.ok(first.includes(id), id)
  for (const id of ['string-dc-1', 'string-dc-2', 'surge-dc-1', 'surge-dc-2']) assert.ok(second.includes(id), id)
})

test('the water heater and the sauna heater are on the inverter\'s output without UPS; the rest hangs from the one with UPS', () => {
  assert.deepEqual(CIRCUITS.filter(item => item.noUps).map(item => item.id).sort(), ['ground-sauna', 'upper-water-heater'])
  assert.equal(onUpsOutput().length, CIRCUITS.length - 2)
})

test('the output without UPS has a type A device of its own, in the row of the water heater, and the sauna has a row to itself in the pantry', () => {
  const row = BOXES.pa.rows.find(item => item.includes('rcd-garage-3'))
  assert.ok(row?.includes('upper-water-heater'))
  assert.ok(!BOXES.pantry.rows.some(item => item.includes('ground-sauna') && item.includes('rcd-pantry-2')))
})

test('the PA board\'s general breaker is the upper floor\'s: four-pole, alone in its first row, and no larger than the residual-current devices it feeds; the changeover switch it hangs from is in the solar board', () => {
  const main = DEVICES.find(item => item.id === 'main')
  assert.equal(main?.poles, 4)
  assert.ok(main?.ratingA && main.ratingA <= Math.min(...DEVICES.filter(item => item.id.startsWith('rcd-garage')).map(item => item.ratingA ?? 0)))
  assert.deepEqual([...BOXES.pa.rows[0]], ['main'])
  assert.equal(DEVICES.find(item => item.id === 'selector')?.board, 'solar')
})

test('the main board is the meter\'s drop: a sixteen-module box with the breaker, the AC surge arrester and the voltage protector, and none of them on the other boards', () => {
  assert.equal(METER_DROP.poles, 4)
  assert.equal(TAGS[METER_DROP.id], 'ITM')
  assert.equal(METER_DROP.boxModules, 16, 'one row of sixteen')
  assert.deepEqual(MAIN_BOARD_ITEMS.map(item => item.id), [METER_DROP.id, SURGE_AC.id, VOLTAGE_PROTECTOR.id])
  assert.equal(VOLTAGE_PROTECTOR.modules, 5)
  assert.equal(VOLTAGE_PROTECTOR.ratingA, 63)
  assert.equal(SURGE_AC.modules, 4, '3+1 is four poles')
  const used = MAIN_BOARD_ITEMS.reduce((sum, item) => sum + item.modules, 0)
  assert.equal(used, 13)
  assert.ok(used <= METER_DROP.boxModules)
  assert.ok(used > 12, 'a box of twelve would be too small')
  for (const item of MAIN_BOARD_ITEMS) {
    assert.ok(!DEVICES.some(other => other.id === item.id))
    assert.ok(!BOXES.pa.rows.flat().includes(item.id) && !BOXES.pantry.rows.flat().includes(item.id) && !BOXES.solar.rows.flat().includes(item.id))
  }
})

test('each residual-current device is in the row of the circuits it protects', () => {
  const rows = BOXES.pa.rows
  assert.ok(rows[1].includes('rcd-garage') && rows[1].includes('upper-lights-1') && rows[1].includes('upper-outlets-kitchen'), 'lights and outlets under the type A one')
  assert.ok(rows[2].includes('rcd-garage-2') && ['upper-ac-living', 'upper-ac-main-room', 'upper-ac-guest-room'].every(id => rows[2].includes(id)), 'the air conditioners under the type F one')
  assert.ok(BOXES.pantry.rows[1].includes('rcd-pantry-2') && BOXES.pantry.rows[1].includes('ground-ac-office'))
})

test('each string has its own two-pole DC breaker, in the solar board with the changeover switch', () => {
  for (const id of ['string-dc-1', 'string-dc-2', 'selector']) assert.equal(DEVICES.find(item => item.id === id)?.board, 'solar', id)
  for (const id of ['string-dc-1', 'string-dc-2']) assert.equal(DEVICES.find(item => item.id === id)?.poles, 2, id)
  assert.equal(boardDevices('pantry').length, 3, 'the pantry\'s board has its main breaker, two residual-current devices, type A and type F, and the circuits')
})
