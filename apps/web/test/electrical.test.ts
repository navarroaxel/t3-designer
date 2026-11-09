import assert from 'node:assert/strict'
import test from 'node:test'
import { PHASE_VOLTAGE, AC_CURRENT_A, WATER_HEATER_A, PHASE_NAME, AC_LOAD_W, BOXES, METER_DROP, MAIN_BOARD_ITEMS, VOLTAGE_PROTECTOR, SURGE_AC, TAGS, onUpsOutput, boardCircuits, boardDevices, boardModules, boxModules, CIRCUITS, rowItems, DEVICES, OUTLET_LOAD_W, PHASES, phaseCurrentA, phaseDemandA, phaseLoadW, SIMULTANEITY, SAUNA_W, WATER_HEATER_W, singleLine, groupNoUps, type Phase } from '../src/data/electrical.ts'

const circuit = (id: string) => { const found = CIRCUITS.find(item => item.id === id); assert.ok(found, id); return found }
const phase = (id: string): Phase => { const { phases } = circuit(id); assert.equal(phases.length, 1, `${id} is on one phase`); return phases[0] }

test('the owner\'s circuits are all there: the upper floor on the PA board, the ground floor on the pantry\'s', () => {
  assert.equal(new Set(CIRCUITS.map(item => item.id)).size, CIRCUITS.length, 'every circuit has its own id')
  assert.equal(boardCircuits('pa').length, 10, 'two lights, three outlets, outdoor, azotea and three air conditioners')
  assert.equal(boardCircuits('pantry').length, 7, 'two lights, two outlets, the office\'s air conditioner, the water heater and the sauna')
  for (const item of CIRCUITS) assert.equal(item.board === 'pa', item.floor === 'upper' && !item.noUps, `${item.id} is on its floor's board, but for the Smart Load ones, which are in the pantry's`)
})

test('the sauna is the only three-phase load; every other circuit is on one phase', () => {
  for (const item of CIRCUITS) assert.equal(item.phases.length, item.id === 'ground-sauna' ? 3 : 1, item.id)
  assert.deepEqual([...circuit('ground-sauna').phases], [...PHASES])
})

test('the loads that run together are on different phases', () => {
  assert.notEqual(phase('ground-ac-office'), phase('upper-ac-living'), 'the two daytime air conditioners')
  assert.notEqual(phase('upper-water-heater'), phase('upper-outlets-kitchen'), 'the water heater and the kettle')
})

test('the connected power is not balanced further than the owner asked: what hangs from a two-pole residual-current device is on one phase', () => {
  const load = phaseLoadW()
  assert.equal(load.L1 + load.L2 + load.L3, 4 * AC_LOAD_W + WATER_HEATER_W + 7 * OUTLET_LOAD_W + SAUNA_W)
  for (const board of ['pa', 'pantry'] as const) {
    for (const group of singleLine(board).groups) {
      if (group.rcd?.poles !== 2) continue
      assert.equal(new Set(group.circuits.map(item => item.phases[0])).size, 1, `${group.rcd.id}: one phase`)
    }
  }
  for (const id of ['rcd-garage', 'rcd-garage-2', 'rcd-garage-3', 'rcd-pantry', 'rcd-pantry-2']) assert.equal(DEVICES.find(item => item.id === id)?.poles, 2, id)
  assert.equal(DEVICES.find(item => item.id === 'rcd-pantry-3')?.poles, 4, 'the sauna\'s is four-pole')
  assert.ok(Math.max(...PHASES.map(name => load[name])) / Math.min(...PHASES.map(name => load[name])) < 1.3, 'the exterior\'s device on the lightest phase leaves them within 30 %')
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
  assert.ok(Math.abs(living[circuit('upper-ac-living').phases[0]] - 8.73) < 1e-9, 'not 1890 W over 220 V')
  assert.ok(AC_LOAD_W / PHASE_VOLTAGE < AC_CURRENT_A, 'the power factor makes the maker\'s current the larger one')
})

test('every breaker is above the current its circuit carries, the maker\'s where it is stated', () => {
  for (const item of CIRCUITS) if (item.currentA) assert.ok(item.ratingA > item.currentA, item.id)
})

test('every circuit of outlets counts as 10 A', () => {
  const outlets = CIRCUITS.filter(item => item.kind === 'outlets')
  assert.equal(outlets.length, 7, 'TUG R, K, L, O, D and the circuits EXT and AZO, which count as outlets although they carry lights')
  for (const item of outlets) assert.equal(item.loadW, 10 * PHASE_VOLTAGE, item.id)
})

test('a three-phase load shares its power equally', () => {
  const [sauna] = CIRCUITS.filter(item => item.id === 'ground-sauna')
  assert.deepEqual(phaseLoadW([sauna]), { L1: SAUNA_W / 3, L2: SAUNA_W / 3, L3: SAUNA_W / 3 })
  assert.ok(Math.abs(phaseCurrentA([sauna]).L1 - SAUNA_W / 3 / PHASE_VOLTAGE) < 1e-9)
})

test('every breaker protects its cable, and covers the load it carries', () => {
  const rated = new Map([[1.5, 10], [2.5, 16], [4, 20], [6, 32]])
  for (const item of CIRCUITS) {
    assert.ok(item.ratingA <= (rated.get(item.cableMm2) ?? 0), `${item.id}: ${item.ratingA} A on ${item.cableMm2} mm²`)
    if (item.loadW) assert.ok(item.ratingA > item.loadW / item.phases.length / PHASE_VOLTAGE, `${item.id} is not below its load`)
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

test('the PA board takes the upper floor in 33 modules, the TSINV 20, the pantry\'s 34', () => {
  assert.equal(boardModules('pa'), 33, 'ten circuits, three two-pole residual-current devices, the living room air conditioner\'s meter and the floor\'s main breaker')
  assert.equal(boardModules('solar'), 20, 'the changeover switch, the inverter\'s AC IN and AC OUT breakers, two DC breakers and two DC surge arresters')
  assert.equal(boardModules('pantry'), 34, 'the feeder\'s breaker, three residual-current devices (two of them two-pole), seven circuits (the sauna\'s breaker is four-pole) and two smart switches, the water heater\'s and the office air conditioner\'s, three modules wide each')
})

test('the PA board and the pantry\'s are 48-module boxes and the TSINV is 24 modules, two rows of twelve; every one has room for what it holds', () => {
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

test('the TSINV has the changeover switch and the inverter\'s breaker in its first row and the strings\' DC breakers and a DC surge arrester each in its second', () => {
  const [first, second] = BOXES.solar.rows
  for (const id of ['selector', 'inverter-ac', 'inverter-out']) assert.ok(first.includes(id), id)
  for (const id of ['string-dc-1', 'string-dc-2', 'surge-dc-1', 'surge-dc-2']) assert.ok(second.includes(id), id)
})

test('the water heater and the sauna heater are on the inverter\'s Smart Load output; the rest hangs from the one with UPS', () => {
  assert.deepEqual(CIRCUITS.filter(item => item.noUps).map(item => item.id).sort(), ['ground-sauna', 'upper-water-heater'])
  assert.equal(onUpsOutput().length, CIRCUITS.length - 2)
})

test('the Smart Load output has a type A device of its own, in the pantry\'s last row, with the water heater and the sauna', () => {
  const row = BOXES.pantry.rows.find(item => item.includes('rcd-pantry-3'))
  assert.deepEqual([...row ?? []], ['rcd-pantry-3', 'upper-water-heater', 'water-heater-switch', 'ground-sauna'])
  const smart = DEVICES.find(item => item.id === 'water-heater-switch')
  assert.equal(smart?.modules, 3, 'the Sonoff POW is three modules wide')
  assert.equal(smart?.ratingA, 20)
  assert.equal(smart?.inlineOf, 'upper-water-heater')
  for (const [id, circuit] of [['ac-office-meter', 'ground-ac-office'], ['ac-living-meter', 'upper-ac-living']]) {
    const meter = DEVICES.find(item => item.id === id)
    assert.equal(meter?.inlineOf, circuit, id)
    assert.equal(meter?.modules, 3, id)
  }
  assert.equal(DEVICES.find(item => item.id === 'rcd-pantry-3')?.rcdType, 'A')
})

test('the TSPA has no AC surge arrester of its own: the main board\'s protects the installation', () => {
  assert.equal(DEVICES.find(item => item.id === 'surge-ac-pa'), undefined)
})

test('the PA board\'s general breaker is the upper floor\'s: four-pole, in its first row with the exterior\'s device and its circuits, and no larger than the residual-current devices it feeds; the changeover switch it hangs from is in the TSINV', () => {
  const main = DEVICES.find(item => item.id === 'main')
  assert.equal(main?.poles, 4)
  assert.ok(main?.ratingA && main.ratingA <= Math.min(...DEVICES.filter(item => item.id.startsWith('rcd-garage')).map(item => item.ratingA ?? 0)))
  assert.deepEqual([...BOXES.pa.rows[0]], ['main', 'rcd-garage-3', 'upper-outdoor', 'upper-azotea'])
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
  assert.ok(rows[1].includes('rcd-garage') && rows[1].includes('upper-lights-1') && rows[1].includes('upper-outlets-kitchen') && rows[1].includes('upper-outlets-living'), 'lights and outlets under the type A one')
  assert.ok(rows[2].includes('rcd-garage-2') && ['upper-ac-living', 'upper-ac-main-room', 'upper-ac-guest-room'].every(id => rows[2].includes(id)), 'the air conditioners under the type F one')
  assert.ok(BOXES.pantry.rows[1].includes('rcd-pantry-2') && BOXES.pantry.rows[1].includes('ground-ac-office'))
})

test('each string has its own two-pole DC breaker, in the TSINV with the changeover switch', () => {
  for (const id of ['string-dc-1', 'string-dc-2', 'selector']) assert.equal(DEVICES.find(item => item.id === id)?.board, 'solar', id)
  for (const id of ['string-dc-1', 'string-dc-2']) assert.equal(DEVICES.find(item => item.id === id)?.poles, 2, id)
  assert.equal(boardDevices('pantry').length, 6, 'the pantry\'s board has its main breaker, three residual-current devices, two of type A and one of type F, and two smart switches, with the circuits')
})

test('the battery has no DC breaker of its own: the inverter\'s is built in', () => {
  assert.equal(DEVICES.find(item => item.id === 'battery-dc'), undefined)
  assert.ok(!BOXES.solar.rows.flat().includes('battery-dc'))
})

test('the single-line diagram has every circuit once, under its residual-current device, and the no-UPS group apart', () => {
  for (const board of ['pa', 'pantry'] as const) {
    const { groups } = singleLine(board)
    assert.deepEqual(groups.flatMap(group => group.circuits.map(item => item.id)).sort(), boardCircuits(board).map(item => item.id).sort(), board)
  }
  const pantryGroups = singleLine('pantry').groups
  assert.deepEqual(singleLine('pa').groups.filter(groupNoUps), [], 'the TSPA has nothing on the Smart Load output')
  assert.deepEqual(pantryGroups.filter(groupNoUps).map(group => group.rcd?.id), ['rcd-pantry-3'], 'the pantry\'s device of the Smart Load output')
  assert.deepEqual(pantryGroups.find(groupNoUps)?.circuits.map(item => item.id), ['upper-water-heater', 'ground-sauna'], 'the water heater and the sauna hang from that device')
})
