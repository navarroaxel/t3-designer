import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { PV_SYSTEM } from '../data/pv-system'
import {
  PHASE_NAME, BOXES, METER_DROP, boardCircuits, boardDevices, boardModules, onUpsOutput, boxModules, SIMULTANEITY, CIRCUITS, DEVICES, rowItems, TAGS, FEEDER, INVERTER_MAX_OUTPUT_A, INVERTER_MODEL, PHASES, phaseCurrentA, phaseLoadW,
  type BoardId, type Circuit, type Device, type Phase,
} from '../data/electrical'
import { useLocale } from '../i18n/useLocale'
import '../building.css'
import '../electrical.css'

const device = (id: string) => { const found = DEVICES.find(item => item.id === id); if (!found) throw new Error(`Unknown device ${id}`); return found }

function PhaseChips({ phases }: { phases: readonly Phase[] }) {
  return <span className="elec-phases">{phases.map(phase => <span key={phase} className={`elec-phase elec-${phase.toLowerCase()}`}>{PHASE_NAME[phase]}</span>)}</span>
}

/** The way the power goes, on one line: the strings to the inverter, the grid and the inverter's output to the changeover switch, and the garage board's feeder to the pantry's. The small squares are devices, filled when they are in the garage board. */
function SupplyDiagram({ circuits }: { circuits: Record<'garage' | 'pantry', { circuits: number; modules: number }> }) {
  const { t } = useTranslation('workspace')
  const node = (key: keyof typeof nodes) => nodes[key]
  const nodes = t('electrical.node', { returnObjects: true })
  const square = (x: number, y: number) => <rect className="elec-device" x={x} y={y} width={22} height={22} rx={3} />
  const text = (x: number, y: number, label: string, className = 'elec-label', anchor: 'start' | 'middle' = 'middle') => <text className={className} x={x} y={y} textAnchor={anchor}>{label}</text>
  const count = (board: 'garage' | 'pantry') => t('electrical.node.count', { circuits: circuits[board].circuits, modules: circuits[board].modules })
  return <svg className="elec-diagram" viewBox="0 0 1000 600" role="img" aria-label={t('electrical.diagramAria')}>
    {/* Wires first, so the boxes and devices sit over them. DC is the warm line, AC the green one. */}
    <g className="elec-wire elec-wire-dc"><path d="M150 53H330M150 123H330M530 82H640" /></g>
    <g className="elec-wire elec-wire-ac"><path d="M120 290H160M280 290H560M400 170V290M500 170V205H615V240M670 290H752M700 290V490H752M530 140H800V200M800 140H990V520H970" /></g>
    <circle className="elec-dot" cx={400} cy={290} r={4} /><circle className="elec-dot" cx={700} cy={290} r={4} />

    {[['string1', 30], ['string2', 100]].map(([key, y]) => <g key={key}>
      <rect className="elec-node" x={20} y={y as number} width={130} height={46} rx={6} />
      {text(85, (y as number) + 21, node(key as 'string1'), 'elec-title')}{text(85, (y as number) + 36, node('panels'), 'elec-sub')}
    </g>)}
    {[41, 111].map(y => <g key={y}>{square(190, y)}{text(201, y - 6, `${node('dcBreaker')} ${device('string-dc-1').ratingA} A`, 'elec-sub')}</g>)}

    <rect className="elec-node" x={330} y={20} width={200} height={150} rx={8} />
    {text(555, 199, node('ups'), 'elec-sub')}{text(895, 132, node('noUps'), 'elec-sub')}
    {text(430, 62, node('inverter'), 'elec-title')}{text(430, 80, node('inverterSub'), 'elec-sub')}{text(430, 98, INVERTER_MODEL, 'elec-sub')}
    <rect className="elec-node" x={640} y={50} width={140} height={64} rx={6} />
    {text(710, 76, node('battery'), 'elec-title')}{text(710, 92, node('batterySub'), 'elec-sub')}{text(710, 106, node('batteryItm'), 'elec-sub')}

    <rect className="elec-node" x={20} y={258} width={100} height={64} rx={6} />
    {text(70, 286, node('grid'), 'elec-title')}{text(70, 303, node('gridSub'), 'elec-sub')}
    <rect className="elec-node elec-node-board" x={160} y={250} width={120} height={80} rx={8} />
    {text(220, 284, node('mainBoard'), 'elec-title')}{text(220, 302, node('mainBoardSub'), 'elec-sub')}{text(220, 317, node('mainBoardItm'), 'elec-sub')}
    {square(389, 215)}{text(417, 230, `${node('inverterBreaker')} ${device('inverter-ac').ratingA} A`, 'elec-sub', 'start')}

    <rect className="elec-node" x={560} y={240} width={110} height={100} rx={6} />
    {text(615, 284, node('selector'), 'elec-title')}{text(615, 302, node('selectorPositions'), 'elec-sub')}
    {text(712, 430, node('feeder'), 'elec-sub', 'start')}{text(712, 444, `${FEEDER.cableMm2} mm² · ${FEEDER.conductors}`, 'elec-sub', 'start')}

    <rect className="elec-node elec-node-board" x={740} y={200} width={230} height={200} rx={8} />
    {square(752, 279)}{text(784, 294, `${node('main')} ${device('main').ratingA} A`, 'elec-sub', 'start')}
    {text(855, 336, node('garage'), 'elec-title')}{text(855, 354, node('garageSub'), 'elec-sub')}{text(855, 372, count('garage'), 'elec-sub')}
    <rect className="elec-node elec-node-board" x={740} y={450} width={230} height={140} rx={8} />
    <rect className="elec-device elec-device-pantry" x={752} y={479} width={22} height={22} rx={3} />{text(784, 494, `${node('pantryMain')} ${device('feeder').ratingA} A`, 'elec-sub', 'start')}
    {text(855, 528, node('pantry'), 'elec-title')}{text(855, 546, node('pantrySub'), 'elec-sub')}{text(855, 562, count('pantry'), 'elec-sub')}{text(855, 578, node('earth'), 'elec-sub')}
  </svg>
}

const protection = (item: Device, t: TFunction<'workspace'>) => {
  if (item.ratingA === null) return t(item.id === 'selector' ? 'electrical.board.bySupply' : 'electrical.board.byManual')
  return `${item.poles}P ${item.ratingA} A${item.id.startsWith('string-dc') ? ' DC' : ''}`
}

const MODULE_W = 18, DEVICE_H = 80
const PHASE_FILL: Record<Phase, string> = { L1: 'var(--elec-l1)', L2: 'var(--elec-l2)', L3: 'var(--elec-l3)' }

/**
 * One device of a board's row drawn as it looks on the rail, to read the board at a glance: the white body with its terminals above and below, the black lever (one bar across the poles of a
 * bipolar or a four-pole), and a stripe of the phase's colour. A residual-current device is grey with a blue lever, a test button and the N marking; the changeover switch has a knob. A string's DC breaker is a bipolar one with the DC colour's stripe. The
 * body keeps the real colours of the equipment in both themes, like the scene's materials do.
 */
function ModuleIcon({ x, id, modules, phase, rating, tag, name }: { x: number; id: string; modules: number; phase?: Phase; rating: string; tag: string; name: string }) {
  const w = modules * MODULE_W, cx = x + w / 2
  const rcd = id.startsWith('rcd'), selector = id === 'selector', spd = id.startsWith('surge'), dc = id.startsWith('string-dc')
  const poles = Array.from({ length: modules }, (_, pole) => x + (pole + .5) * MODULE_W)
  const stripe = phase ? PHASE_FILL[phase] : dc ? 'var(--elec-dc)' : rcd ? 'var(--gen-typical)' : '#9aa0a6'
  return <g>
    <title>{name}</title>
    <rect x={x + .6} y={0} width={w - 1.2} height={DEVICE_H} rx={2.5} fill={rcd ? '#dfe3e6' : '#f4f5f6'} stroke="#7d8389" strokeWidth={.8} />
    {poles.map(px => <circle key={`t${px}`} cx={px} cy={9} r={3.4} fill="#7b8087" stroke="#4a4f55" strokeWidth={.6} />)}
    {poles.map(px => <circle key={`b${px}`} cx={px} cy={DEVICE_H - 9} r={3.4} fill="#7b8087" stroke="#4a4f55" strokeWidth={.6} />)}
    {!rcd && <rect x={x + 1.2} y={18} width={w - 2.4} height={5} fill={stripe} style={{ fill: stripe }} />}
    <text x={cx} y={rcd ? 41 : 33} textAnchor="middle" fontSize={modules > 1 ? 7 : 6.2} fill="#2b2f33" fontWeight={600}>{rating}</text>
    {rcd && <><circle cx={x + MODULE_W * .9} cy={25} r={3.6} fill="#f1e9d2" stroke="#8d8466" strokeWidth={.6} /><text x={x + MODULE_W * .9} y={26.6} textAnchor="middle" fontSize={4.4} fill="#4a4636" fontWeight={700}>T</text>
      <text x={x + w - MODULE_W * .5} y={20} textAnchor="middle" fontSize={5.5} fill="#2b2f33" fontWeight={700}>N</text></>}
    {spd && <rect x={x + 4} y={46} width={w - 8} height={11} rx={2} fill="#3f9d5a" />}
    {selector && <><circle cx={cx} cy={52} r={12} fill="#1f2124" /><path d={`M${cx} 52V43`} stroke="#f4f5f6" strokeWidth={2.2} strokeLinecap="round" /></>}
    {!selector && !spd && (rcd
      ? <rect x={x + 3.5} y={50} width={Math.min(14, w - 7)} height={17} rx={2} fill="#2d6cb5" />
      : <>{poles.map(px => <rect key={`l${px}`} x={px - 5.5} y={44} width={11} height={20} rx={2} fill="#17181a" />)}{modules > 1 && <rect x={x + 3.5} y={57} width={w - 7} height={7} rx={1.5} fill="#17181a" />}</>)}
    <text x={cx} y={DEVICE_H + 11} textAnchor="middle" fontSize={7} fill="currentColor" fontWeight={600}>{tag}</text>
  </g>
}

/** The board as the installer sets it, row by row and left to right: a module is 18 mm wide, and a device takes as many modules as it has poles. The free modules are dashed. */
function BoardRows({ board }: { board: BoardId }) {
  const { t } = useTranslation('workspace')
  const { perRow, rows } = BOXES[board]
  const names = { ...(t('electrical.circuit', { returnObjects: true }) as Record<string, string>), ...(t('electrical.device', { returnObjects: true }) as Record<string, string>) }
  const rating = (id: string) => {
    const circuit = CIRCUITS.find(item => item.id === id)
    if (circuit) return `C${circuit.ratingA}`
    if (id.startsWith('rcd')) return '30 mA'
    const ampere = DEVICES.find(item => item.id === id)?.ratingA
    return ampere ? `${ampere} A` : ''
  }
  return <div className="elec-rows" role="list" aria-label={t('electrical.board.rowsTitle')}>
    {rows.map((row, index) => {
      const items = rowItems(row), used = items.reduce((sum, item) => sum + item.modules, 0)
      let at = 0
      return <div key={index} className="elec-row" role="listitem">
        <span className="elec-row-name">{t('electrical.board.row', { n: index + 1 })}</span>
        <svg className="elec-rail" viewBox={`0 0 ${perRow * MODULE_W} ${DEVICE_H + 16}`} role="img" aria-label={`${t('electrical.board.row', { n: index + 1 })}: ${items.map(item => names[item.id]).join(', ')}`}>
          {items.map(item => { const x = at * MODULE_W; at += item.modules; return <ModuleIcon key={item.id} x={x} id={item.id} modules={item.modules} phase={item.phases?.length === 1 ? item.phases[0] : undefined} rating={rating(item.id)} tag={TAGS[item.id]} name={names[item.id]} /> })}
          {used < perRow && <g><rect x={used * MODULE_W + 1} y={1} width={(perRow - used) * MODULE_W - 2} height={DEVICE_H - 2} rx={2.5} fill="none" stroke="currentColor" strokeOpacity={.5} strokeDasharray="4 3" />
            <text x={(used + (perRow - used) / 2) * MODULE_W} y={DEVICE_H / 2 + 3} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={.75}>{t('electrical.board.free', { count: perRow - used })}</text></g>}
        </svg>
      </div>
    })}
  </div>
}

function BoardCard({ board }: { board: BoardId }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const names = t('electrical.circuit', { returnObjects: true }) as Record<string, string>
  const deviceNames = t('electrical.device', { returnObjects: true }) as Record<string, string>
  const devices = boardDevices(board)
  const circuits = boardCircuits(board)
  const modules = boardModules(board)
  const load = (item: Circuit) => item.loadW ? t('electrical.board.loadW', { kw: formatNumber(item.loadW / 1000, 1) }) : '—'
  return <section className="elec-board" aria-labelledby={`elec-board-${board}`}>
    <h3 id={`elec-board-${board}`}>{t(`electrical.board.${board}`)}</h3>
    <p className="array-note">{t(`electrical.board.${board}Note`)}</p>
    <BoardRows board={board} />
    <table className="gen-table gen-table-plain">
      <thead><tr><th scope="col">{t('electrical.board.tag')}</th><th scope="col">{t('electrical.board.device')}</th><th scope="col">{t('electrical.board.breaker')}</th><th scope="col">{t('electrical.board.modules')}</th></tr></thead>
      <tbody>{devices.map(item => <tr key={item.id}><th scope="row" className="elec-tag">{TAGS[item.id]}</th><td className="elec-name">{deviceNames[item.id]}</td><td>{protection(item, t)}</td><td>{item.modules}</td></tr>)}</tbody>
    </table>
    {circuits.length > 0 && <table className="gen-table gen-table-plain">
      <thead><tr>
        <th scope="col">{t('electrical.board.tag')}</th><th scope="col">{t('electrical.board.circuit')}</th><th scope="col">{t('electrical.board.phase')}</th><th scope="col">{t('electrical.board.breaker')}</th>
        <th scope="col">{t('electrical.board.cable')}</th><th scope="col">{t('electrical.board.load')}</th><th scope="col">{t('electrical.board.modules')}</th>
      </tr></thead>
      <tbody>{circuits.map(item => <tr key={item.id}>
        <th scope="row" className="elec-tag">{TAGS[item.id]}</th><td className="elec-name">{names[item.id]}</td><td><PhaseChips phases={item.phases} /></td><td>{item.modules}P {item.ratingA} A · C</td><td>{formatNumber(item.cableMm2, item.cableMm2 % 1 ? 1 : 0)} mm²</td><td>{load(item)}</td><td>{item.modules}</td>
      </tr>)}</tbody>
    </table>}
    <p className="elec-total"><strong>{t('electrical.board.total')}: {modules}</strong> · {t('electrical.board.fit', { box: boxModules(board), free: boxModules(board) - modules })}</p>
  </section>
}

/** The main board: the meter's drop, a single breaker; the changeover switch and the inverter's grid input hang from it. */
function MainBoardCard() {
  const { t } = useTranslation('workspace')
  const deviceNames = t('electrical.device', { returnObjects: true }) as Record<string, string>
  return <section className="elec-board elec-main-board" aria-labelledby="elec-board-main">
    <h3 id="elec-board-main">{t('electrical.board.main')}</h3>
    <p className="array-note">{t('electrical.board.mainNote')}</p>
    <svg className="elec-rail elec-rail-main" viewBox={`0 0 ${METER_DROP.boxModules * MODULE_W} ${DEVICE_H + 16}`} role="img" aria-label={deviceNames[METER_DROP.id]}>
      <ModuleIcon x={0} id={METER_DROP.id} modules={METER_DROP.modules} rating={`${METER_DROP.poles}P`} tag={TAGS[METER_DROP.id]} name={deviceNames[METER_DROP.id]} />
      <rect x={METER_DROP.modules * MODULE_W + 1} y={1} width={(METER_DROP.boxModules - METER_DROP.modules) * MODULE_W - 2} height={DEVICE_H - 2} rx={2.5} fill="none" stroke="currentColor" strokeOpacity={.5} strokeDasharray="4 3" />
      <text x={(METER_DROP.modules + (METER_DROP.boxModules - METER_DROP.modules) / 2) * MODULE_W} y={DEVICE_H / 2 + 3} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={.75}>{t('electrical.board.free', { count: METER_DROP.boxModules - METER_DROP.modules })}</text>
    </svg>
    <table className="gen-table gen-table-plain">
      <thead><tr><th scope="col">{t('electrical.board.tag')}</th><th scope="col">{t('electrical.board.device')}</th><th scope="col">{t('electrical.board.breaker')}</th><th scope="col">{t('electrical.board.modules')}</th></tr></thead>
      <tbody><tr><th scope="row" className="elec-tag">{TAGS[METER_DROP.id]}</th><td className="elec-name">{deviceNames[METER_DROP.id]}</td><td>{METER_DROP.ratingA === null ? t('electrical.board.bySupply') : `${METER_DROP.poles}P ${METER_DROP.ratingA} A`}</td><td>{METER_DROP.modules}</td></tr></tbody>
    </table>
  </section>
}

function PhaseBalance() {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const power = phaseLoadW(), current = phaseCurrentA()
  const top = Math.max(...PHASES.map(phase => power[phase]))
  return <section className="elec-balance" aria-labelledby="elec-balance-title">
    <h3 id="elec-balance-title">{t('electrical.balance.title')}</h3>
    <ul>{PHASES.map(phase => <li key={phase}>
      <span className="elec-balance-name"><PhaseChips phases={[phase]} /> <span className="sr-only">{t('electrical.balance.phase', { phase: PHASE_NAME[phase] })}</span></span>
      <span className="elec-bar" aria-hidden="true"><span className={`elec-fill elec-${phase.toLowerCase()}`} style={{ width: `${power[phase] / top * 100}%` }} /></span>
      <span className="elec-balance-value">{t('electrical.balance.power', { kw: formatNumber(power[phase] / 1000, 1) })} · {t('electrical.balance.current', { amps: formatNumber(current[phase]) })} <span className="elec-demand">→ {t('electrical.balance.demand', { kw: formatNumber(power[phase] * SIMULTANEITY / 1000, 1), amps: formatNumber(current[phase] * SIMULTANEITY) })}</span></span>
    </li>)}</ul>
    <p className="array-note">{t('electrical.balance.note', { factor: formatNumber(SIMULTANEITY, 1) })}</p>
  </section>
}

/**
 * The electrical factsheet: a page to read, and to print for the electrician, of how the installation is laid out: the way the power goes, what each of the two boards holds and how the phases share the load.
 * The numbers are the plan in `data/electrical.ts`; nothing here is measured.
 */
export function ElectricalExplorer() {
  const { t } = useTranslation('workspace')
  const upper = CIRCUITS.filter(item => item.floor === 'upper').length, ground = CIRCUITS.length - upper
  const busiestOf = (circuits: readonly Circuit[]) => { const current = phaseCurrentA(circuits); return PHASES.reduce((a, b) => current[b] > current[a] ? b : a) }
  const onUps = onUpsOutput(), busiest = busiestOf(onUps), pantryBusiest = busiestOf(boardCircuits('pantry'))
  const { formatNumber } = useLocale()
  const sizes = { garage: { circuits: boardCircuits('garage').length, modules: boardModules('garage') }, pantry: { circuits: boardCircuits('pantry').length, modules: boardModules('pantry') } }
  const facts: [string, string][] = [
    [t('electrical.factSupply'), t('electrical.factSupplyValue')],
    [t('electrical.factInverter'), INVERTER_MODEL],
    [t('electrical.factBoards'), t('electrical.factBoardsValue')],
    [t('electrical.factCircuits'), t('electrical.factCircuitsValue', { upper, ground })],
    [t('electrical.factSelector'), t('electrical.factSelectorValue')],
    [t('electrical.factFeeder'), t('electrical.factFeederValue', { conductors: FEEDER.conductors, mm2: FEEDER.cableMm2, conduit: FEEDER.conduitMm })],
  ]
  const notes = [
    t('electrical.notes.earth'), t('electrical.notes.feeder', { phase: PHASE_NAME[pantryBusiest], amps: formatNumber(phaseCurrentA(boardCircuits('pantry'))[pantryBusiest] * SIMULTANEITY), connected: formatNumber(phaseCurrentA(boardCircuits('pantry'))[pantryBusiest]), factor: formatNumber(SIMULTANEITY, 1) }), 
    t('electrical.notes.inverterLimit', { limit: INVERTER_MAX_OUTPUT_A, phase: PHASE_NAME[busiest], amps: formatNumber(phaseCurrentA(onUps)[busiest] * SIMULTANEITY), connected: formatNumber(phaseCurrentA(onUps)[busiest]), factor: formatNumber(SIMULTANEITY, 1) }),
    t('electrical.notes.noUps'), t('electrical.notes.strings', { volts: PV_SYSTEM.inverter.mppt.maxInputV }), t('electrical.notes.comb'), t('electrical.notes.surge'), t('electrical.notes.feederOrigin'),
  ]
  return <div className="elec-workspace">
    <article className="gen-details elec-sheet" aria-labelledby="elec-title">
      <header>
        <div><span className="eyebrow">{t('electrical.eyebrow')}</span><h2 id="elec-title">{t('electrical.title')}</h2></div>
        <button className="gen-download elec-print" onClick={() => window.print()}>{t('electrical.print')}</button>
      </header>
      <p className="array-note">{t('electrical.intro')}</p>
      <div className="gen-stats elec-facts" aria-label={t('electrical.factsTitle')}>
        {facts.map(([label, value]) => <div key={label} className="gen-stat gen-stat-wide"><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <section aria-labelledby="elec-diagram-title">
        <h3 id="elec-diagram-title">{t('electrical.diagramTitle')}</h3>
        <div className="elec-scroll"><SupplyDiagram circuits={sizes} /></div>
        <ul className="gen-legend">
          <li className="elec-key elec-key-ac">{t('electrical.legendAc')}</li>
          <li className="elec-key elec-key-dc">{t('electrical.legendDc')}</li>
          <li className="elec-key elec-key-device">{t('electrical.legendGarage')}</li>
          <li className="elec-key elec-key-device elec-key-pantry">{t('electrical.legendPantry')}</li>
        </ul>
        <p className="array-note">{t('electrical.selectorNote')}</p>
      </section>
      <div className="elec-boards"><BoardCard board="garage" /><BoardCard board="surge" /><BoardCard board="pantry" /></div>
      <MainBoardCard />
      <PhaseBalance />
      <section className="elec-notes" aria-labelledby="elec-notes-title">
        <h3 id="elec-notes-title">{t('electrical.notes.title')}</h3>
        <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>
      </section>
    </article>
  </div>
}
