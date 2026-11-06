import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { PV_SYSTEM } from '../data/pv-system'
import {
  PHASE_NAME, BOXES, METER_DROP, MAIN_BOARD_ITEMS, boardCircuits, boardDevices, boardModules, onUpsOutput, boxModules, SIMULTANEITY, CIRCUITS, DEVICES, rowItems, TAGS, FEEDER, singleLine, groupNoUps, groupForwards, INVERTER_MAX_OUTPUT_A, INVERTER_MODEL, PHASES, phaseCurrentA, phaseLoadW,
  type BoardId, type Circuit, type Device, type Phase,
} from '../data/electrical'
import { useLocale } from '../i18n/useLocale'
import '../building.css'
import '../electrical.css'

const device = (id: string) => { const found = DEVICES.find(item => item.id === id); if (!found) throw new Error(`Unknown device ${id}`); return found }

function PhaseChips({ phases }: { phases: readonly Phase[] }) {
  return <span className="elec-phases">{phases.map(phase => <span key={phase} className={`elec-phase elec-${phase.toLowerCase()}`}>{PHASE_NAME[phase]}</span>)}</span>
}

/** The way the power goes, on one line: the strings to the inverter, the grid and the inverter's output to the changeover switch, and the feeder from the changeover switch to the pantry's. The small squares are devices, filled when they are in the garage board. */
function SupplyDiagram({ circuits }: { circuits: Record<'pa' | 'pantry', { circuits: number; modules: number }> }) {
  const { t } = useTranslation('workspace')
  const node = (key: keyof typeof nodes) => nodes[key]
  const nodes = t('electrical.node', { returnObjects: true })
  const square = (x: number, y: number) => <rect className="elec-device" x={x} y={y} width={22} height={22} rx={3} />
  const text = (x: number, y: number, label: string, className = 'elec-label', anchor: 'start' | 'middle' | 'end' = 'middle') => <text className={className} x={x} y={y} textAnchor={anchor}>{label}</text>
  const count = (board: 'pa' | 'pantry') => t('electrical.node.count', { circuits: circuits[board].circuits, modules: circuits[board].modules })
  return <svg className="elec-diagram" viewBox="0 0 1000 600" role="img" aria-label={t('electrical.diagramAria')}>
    {/* Wires first, so the boxes and devices sit over them. DC is the warm line, AC the green one. The dashed frame is the TSINV: what is inside it is in that board. */}
    <g className="elec-wire elec-wire-dc"><path d="M150 53H660M150 123H660M860 62H880" /></g>
    <g className="elec-wire elec-wire-ac"><path d="M120 290H160M280 290H500M440 290V195H720V170M780 170V215H555V240M610 290H752M700 290V490H752M860 140H990V520H970M880 140V240" /></g>
    <circle className="elec-dot" cx={440} cy={290} r={4} /><circle className="elec-dot" cx={700} cy={290} r={4} /><circle className="elec-dot" cx={880} cy={140} r={4} />
    <rect className="elec-frame" x={300} y={15} width={330} height={375} rx={10} />
    {text(315, 368, node('tsinv'), 'elec-title', 'start')}{text(315, 382, node('tsinvSub'), 'elec-sub', 'start')}

    {[['string1', 30], ['string2', 100]].map(([key, y]) => <g key={key}>
      <rect className="elec-node" x={20} y={y as number} width={130} height={46} rx={6} />
      {text(85, (y as number) + 21, node(key as 'string1'), 'elec-title')}{text(85, (y as number) + 36, node('panels'), 'elec-sub')}
    </g>)}
    {[41, 111].map((y, index) => { const id = `string-dc-${index + 1}`; return <g key={id}>{square(325, y)}{text(336, y - 6, `☀️ ${TAGS[id]} ${device(id).ratingA} A`, 'elec-sub', 'start')}</g> })}

    <rect className="elec-node" x={660} y={20} width={200} height={150} rx={8} />
    {text(790, 205, node('ups'), 'elec-sub', 'start')}{text(870, 111, node('noUps').split(': ')[0] + ':', 'elec-sub', 'start')}{text(870, 126, node('noUps').split(': ').slice(1).join(': '), 'elec-sub', 'start')}
    {text(760, 62, node('inverter'), 'elec-title')}{text(760, 80, node('inverterSub'), 'elec-sub')}{text(760, 98, INVERTER_MODEL, 'elec-sub')}
    <rect className="elec-node" x={880} y={30} width={110} height={64} rx={6} />
    {text(935, 56, node('battery'), 'elec-title')}{text(935, 72, node('batterySub'), 'elec-sub')}{text(935, 86, node('batteryItm'), 'elec-sub')}

    <rect className="elec-node" x={20} y={258} width={100} height={64} rx={6} />
    {text(70, 286, node('grid'), 'elec-title')}{text(70, 303, node('gridSub'), 'elec-sub')}
    <rect className="elec-node elec-node-board" x={160} y={250} width={120} height={80} rx={8} />
    {text(220, 284, node('mainBoard'), 'elec-title')}{text(220, 302, node('mainBoardSub'), 'elec-sub')}{text(220, 317, node('mainBoardItm'), 'elec-sub')}
    {square(429, 225)}{text(423, 240, `${node('inverterBreaker')} ${device('inverter-ac').ratingA} A`, 'elec-sub', 'end')}

    <rect className="elec-node" x={500} y={240} width={110} height={100} rx={6} />
    {text(555, 284, node('selector'), 'elec-title')}{text(555, 302, node('selectorPositions'), 'elec-sub')}
    {text(712, 440, `4(1x${FEEDER.cableMm2})mm²+PE`, 'elec-sub', 'start')}

    <rect className="elec-node elec-node-board" x={740} y={240} width={230} height={130} rx={8} />
    {square(752, 279)}{text(784, 294, `${node('main')} ${device('main').ratingA} A`, 'elec-sub', 'start')}
    {text(855, 326, node('pa'), 'elec-title')}{text(855, 344, node('paSub'), 'elec-sub')}{text(855, 360, count('pa'), 'elec-sub')}
    <rect className="elec-node elec-node-board" x={740} y={450} width={230} height={140} rx={8} />
    <rect className="elec-device elec-device-pantry" x={752} y={479} width={22} height={22} rx={3} />{text(784, 494, `${node('pantryMain')} ${device('feeder').ratingA} A`, 'elec-sub', 'start')}
    {text(855, 528, node('pantry'), 'elec-title')}{text(855, 546, node('pantrySub'), 'elec-sub')}{text(855, 562, count('pantry'), 'elec-sub')}{text(855, 578, node('earth'), 'elec-sub')}
  </svg>
}

const SL = { row: 40, gap: 18, top: 34, source: 10, headX: 70, bus: 250, rcdX: 275, subBus: 370, breakerX: 385, cableEnd: 640, loadX: 662 }
const RCD_W = 64, BOX_H = 34

/**
 * One board as a single-line diagram, left to right: the supply (the changeover switch, or the feeder for the pantry's board) through the board's main breaker and its surge arrester, a bus from which each residual-current device
 * leaves, and the circuits under each, with the breaker, phase, cable and load of each one. The devices that are on the inverter's output without UPS do not hang from that bus: they have a source of their own, and the line
 * that goes on to the other board (the sauna's) leaves from there. It is read from `singleLine`, so it follows the rows of the board.
 */
function SingleLine({ board }: { board: BoardId }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const names = t('electrical.circuit', { returnObjects: true }) as Record<string, string>
  const { head, groups } = singleLine(board)
  const text = (x: number, y: number, label: string, className = 'elec-sub', anchor: 'start' | 'middle' | 'end' = 'start') => <text className={className} x={x} y={y} textAnchor={anchor}>{label}</text>
  const cable = (item: Circuit) => t('electrical.single.cable', { n: item.phases.length === 1 ? 2 : item.phases.length, mm2: formatNumber(item.cableMm2, item.cableMm2 % 1 ? 1 : 0) })
  const box = (x: number, y: number, w: number, tag: string, rating: string, title: string) => <g>
    <title>{title}</title><rect className="elec-node" x={x} y={y - BOX_H / 2} width={w} height={BOX_H} rx={4} />
    {text(x + w / 2, y - 2, tag, 'elec-title', 'middle')}{text(x + w / 2, y + 11, rating, 'elec-sub', 'middle')}
  </g>
  const ticks = (x: number, y: number, count: number) => <path className="elec-single-earth" d={Array.from({ length: count }, (_, n) => `M${x + n * 5 - 2} ${y + 6}l4 -12`).join('')} />
  let cursor = SL.top
  const placed = groups.map(group => {
    const forwards = groupForwards(board, group), rows = group.circuits.length + forwards.length
    const first = cursor + SL.row / 2, last = first + (rows - 1) * SL.row
    cursor += rows * SL.row + SL.gap
    return { group, forwards, first, last, centre: (first + last) / 2, noUps: groupNoUps(group) }
  })
  const supplied = placed.filter(item => !item.noUps)
  const busTop = supplied[0]?.centre ?? 0, busBottom = supplied.at(-1)?.centre ?? 0, trunk = (busTop + busBottom) / 2
  const series = head.filter(item => !item.id.startsWith('surge')), surges = head.filter(item => item.id.startsWith('surge'))
  const seriesX = (index: number) => SL.headX + index * 90
  const height = cursor - SL.gap + SL.top
  const source = board === 'pa' ? t('electrical.single.fromSelector') : t('electrical.single.fromFeeder', { conductors: FEEDER.conductors, mm2: FEEDER.cableMm2 })
  const ratingOf = (item: Device) => item.ratingA === null ? '' : `${item.poles}P ${item.ratingA} A`
  return <svg className="elec-single" viewBox={`0 0 1000 ${height}`} role="img" aria-label={t('electrical.single.aria', { board: t(`electrical.board.${board}`) })}>
    <g className="elec-wire elec-wire-ac"><path d={[
      `M${SL.source} ${trunk}H${SL.bus}`, `M${SL.bus} ${busTop}V${busBottom}`,
      ...surges.map((_, index) => `M${seriesX(series.length) + 20 + index * 60} ${trunk}V${trunk + 26}`),
      ...placed.flatMap(({ group, forwards, first, last, centre, noUps }) => {
        const rows = [...group.circuits, ...forwards]
        return [
          `M${noUps ? SL.source : SL.bus} ${centre}H${group.rcd ? SL.rcdX : SL.subBus}`,
          ...(group.rcd ? [`M${SL.rcdX + RCD_W} ${centre}H${SL.subBus}`] : []), `M${SL.subBus} ${first}V${last}`,
          ...rows.map((_, index) => `M${SL.subBus} ${first + index * SL.row}H${SL.breakerX}M${SL.breakerX + 70} ${first + index * SL.row}H${SL.cableEnd}`),
        ]
      }),
    ].join('')} /></g>
    {supplied.length > 1 && supplied.map(({ centre }) => <circle key={centre} className="elec-dot" cx={SL.bus} cy={centre} r={3.5} />)}
    {text(SL.source, trunk - 24, source)}
    {series.map((item, index) => <g key={item.id}>{box(seriesX(index), trunk, RCD_W, TAGS[item.id], ratingOf(item), item.id)}</g>)}
    {surges.map((item, index) => { const x = seriesX(series.length) + 20 + index * 60, y = trunk + 26; return <g key={item.id}>
      <rect className="elec-node" x={x - 24} y={y} width={48} height={26} rx={4} />{text(x, y + 16, TAGS[item.id], 'elec-title', 'middle')}
      <path className="elec-single-earth" d={`M${x} ${y + 26}V${y + 36}M${x - 8} ${y + 36}H${x + 8}M${x - 5} ${y + 40}H${x + 5}M${x - 2} ${y + 44}H${x + 2}`} />{text(x + 14, y + 46, t('electrical.single.surge'))}
    </g> })}
    {placed.map(({ group, forwards, first, centre, noUps }) => <g key={group.rcd?.id ?? group.circuits[0].id}>
      {noUps && text(SL.source, centre - 24, t('electrical.single.noUpsSource'))}
      {group.rcd && <g>{box(SL.rcdX, centre, RCD_W, TAGS[group.rcd.id], ratingOf(group.rcd), group.rcd.id)}{text(SL.rcdX + RCD_W / 2, centre + 30, t('electrical.single.rcd', { type: group.rcd.rcdType }), 'elec-sub', 'middle')}</g>}
      {group.circuits.map((item, index) => { const y = first + index * SL.row; return <g key={item.id}>
        {box(SL.breakerX, y, 70, TAGS[item.id], `${item.modules}P C${item.ratingA}`, names[item.id])}
        {text(SL.breakerX + 78, y - 6, item.phases.map(phase => PHASE_NAME[phase]).join(''), 'elec-title')}
        {ticks(520, y, item.phases.length === 1 ? 2 : item.phases.length)}{text(580, y - 6, cable(item), 'elec-sub', 'middle')}
        <circle className="elec-node" cx={SL.cableEnd + 8} cy={y} r={6} />{text(SL.loadX + 6, y + 4, names[item.id], 'elec-title')}
        {item.loadW && text(990, y + 4, t('electrical.board.loadW', { kw: formatNumber(item.loadW / 1000, 1) }), 'elec-sub', 'end')}
      </g> })}
      {forwards.map((item, index) => { const y = first + (group.circuits.length + index) * SL.row; return <g key={item.id}>
        {ticks(520, y, item.phases.length === 1 ? 2 : item.phases.length)}{text(580, y - 6, cable(item), 'elec-sub', 'middle')}
        <path className="elec-single-earth" d={`M${SL.cableEnd - 8} ${y - 5}L${SL.cableEnd} ${y}L${SL.cableEnd - 8} ${y + 5}`} />{text(SL.loadX, y + 4, `${t('electrical.single.toBoard', { board: t('electrical.node.pantry') })} · ${names[item.id]}`, 'elec-title')}
      </g> })}
    </g>)}
  </svg>
}

const protection = (item: Device, t: TFunction<'workspace'>) => {
  if (item.ratingA === null) return t(item.id === 'selector' ? 'electrical.board.bySupply' : 'electrical.board.byManual')
  return `${item.poles}P ${item.ratingA} A${/^(string|battery)-dc/.test(item.id) ? ' DC' : ''}`
}

const MODULE_W = 18, DEVICE_H = 80
/** Every module is drawn the same size on every board, 26 px wide, so a board with fewer modules per row looks narrower; on a narrow screen the row shrinks to fit. */
const MODULE_PX = 26
const railStyle = (modules: number) => ({ width: modules * MODULE_PX, maxWidth: '100%' })
const PHASE_FILL: Record<Phase, string> = { L1: 'var(--elec-l1)', L2: 'var(--elec-l2)', L3: 'var(--elec-l3)' }

/**
 * One device of a board's row drawn as it looks on the rail, to read the board at a glance: the white body with its terminals above and below, the black lever (one bar across the poles of a
 * bipolar or a four-pole), and a stripe of the phase's colour. A residual-current device is grey with a blue lever, a test button and the N marking; the changeover switch has a knob. A string's DC breaker is a bipolar one with the DC colour's stripe. The
 * body keeps the real colours of the equipment in both themes, like the scene's materials do.
 */
function ModuleIcon({ x, id, modules, terminals = modules, phase, rating, tag, name }: { x: number; id: string; modules: number; terminals?: number; phase?: Phase; rating: string; tag: string; name: string }) {
  const w = modules * MODULE_W, cx = x + w / 2
  const rcd = id.startsWith('rcd'), selector = id === 'selector', protector = id === 'voltage-protector', spd = id.startsWith('surge'), dc = /^(string|battery)-dc/.test(id)
  const poles = Array.from({ length: modules }, (_, pole) => x + (pole + .5) * MODULE_W)
  /** Where the terminals are: one pair per pole, spread over the width; it is one per module unless the device is wider than its poles, like the voltage protector (four poles, five modules). */
  const pairs = Array.from({ length: terminals }, (_, pole) => x + (pole + .5) * w / terminals)
  const stripe = phase ? PHASE_FILL[phase] : dc ? 'var(--elec-dc)' : rcd ? 'var(--gen-typical)' : '#9aa0a6'
  return <g>
    <title>{name}</title>
    <rect x={x + .6} y={0} width={w - 1.2} height={DEVICE_H} rx={2.5} fill={rcd ? '#dfe3e6' : '#f4f5f6'} stroke="#7d8389" strokeWidth={.8} />
    {pairs.map(px => <circle key={`t${px}`} cx={px} cy={9} r={3.4} fill="#7b8087" stroke="#4a4f55" strokeWidth={.6} />)}
    {pairs.map(px => <circle key={`b${px}`} cx={px} cy={DEVICE_H - 9} r={3.4} fill="#7b8087" stroke="#4a4f55" strokeWidth={.6} />)}
    {!rcd && <rect x={x + 1.2} y={18} width={w - 2.4} height={5} fill={stripe} style={{ fill: stripe }} />}
    <text x={cx} y={rcd ? 41 : 33} textAnchor="middle" fontSize={modules > 1 ? 7 : 6.2} fill="#2b2f33" fontWeight={600}>{rating}</text>
    {rcd && <><circle cx={x + MODULE_W * .9} cy={25} r={3.6} fill="#f1e9d2" stroke="#8d8466" strokeWidth={.6} /><text x={x + MODULE_W * .9} y={26.6} textAnchor="middle" fontSize={4.4} fill="#4a4636" fontWeight={700}>T</text>
      <text x={x + w - MODULE_W * .5} y={20} textAnchor="middle" fontSize={5.5} fill="#2b2f33" fontWeight={700}>N</text></>}
    {protector && <><rect x={x + 3} y={34} width={w - 6} height={30} rx={2} fill="#1f2124" />{[0, 1, 2].map(n => <circle key={n} cx={x + w * (n + 1) / 4} cy={49} r={3} fill="#4cc26b" />)}</>}
    {spd && <rect x={x + 4} y={46} width={w - 8} height={11} rx={2} fill="#3f9d5a" />}
    {selector && <><circle cx={cx} cy={52} r={12} fill="#1f2124" /><path d={`M${cx} 52V43`} stroke="#f4f5f6" strokeWidth={2.2} strokeLinecap="round" /></>}
    {!selector && !spd && !protector && (rcd
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
        <svg className="elec-rail" style={railStyle(perRow)} viewBox={`0 0 ${perRow * MODULE_W} ${DEVICE_H + 16}`} role="img" aria-label={`${t('electrical.board.row', { n: index + 1 })}: ${items.map(item => names[item.id]).join(', ')}`}>
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
  const used = MAIN_BOARD_ITEMS.reduce((sum, item) => sum + item.modules, 0), { boxModules } = METER_DROP
  let at = 0
  return <section className="elec-board elec-main-board" aria-labelledby="elec-board-main">
    <h3 id="elec-board-main">{t('electrical.board.main')}</h3>
    <p className="array-note">{t('electrical.board.mainNote')}</p>
    <svg className="elec-rail" style={railStyle(boxModules)} viewBox={`0 0 ${boxModules * MODULE_W} ${DEVICE_H + 16}`} role="img" aria-label={MAIN_BOARD_ITEMS.map(item => deviceNames[item.id]).join(', ')}>
      {MAIN_BOARD_ITEMS.map(item => { const x = at * MODULE_W; at += item.modules; return <ModuleIcon key={item.id} x={x} id={item.id} modules={item.modules} terminals={item.poles} rating={item.ratingA ? `${item.ratingA} A` : item.id.startsWith('surge') ? '' : `${item.poles}P`} tag={TAGS[item.id]} name={deviceNames[item.id]} /> })}
      {used < boxModules && <g><rect x={used * MODULE_W + 1} y={1} width={(boxModules - used) * MODULE_W - 2} height={DEVICE_H - 2} rx={2.5} fill="none" stroke="currentColor" strokeOpacity={.5} strokeDasharray="4 3" />
        <text x={(used + (boxModules - used) / 2) * MODULE_W} y={DEVICE_H / 2 + 3} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={.75}>{t('electrical.board.free', { count: boxModules - used })}</text></g>}
    </svg>
    <table className="gen-table gen-table-plain">
      <thead><tr><th scope="col">{t('electrical.board.tag')}</th><th scope="col">{t('electrical.board.device')}</th><th scope="col">{t('electrical.board.breaker')}</th><th scope="col">{t('electrical.board.modules')}</th></tr></thead>
      <tbody>{MAIN_BOARD_ITEMS.map(item => <tr key={item.id}><th scope="row" className="elec-tag">{TAGS[item.id]}</th><td className="elec-name">{deviceNames[item.id]}</td><td>{item.ratingA === null ? t(item.id === METER_DROP.id ? 'electrical.board.bySupply' : 'electrical.board.byManual') : `${item.poles}P ${item.ratingA} A`}</td><td>{item.modules}</td></tr>)}</tbody>
    </table>
    <p className="elec-total"><strong>{t('electrical.board.total')}: {used}</strong> · {t('electrical.board.fit', { box: boxModules, free: boxModules - used })}</p>
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
  const sizes = { pa: { circuits: boardCircuits('pa').length, modules: boardModules('pa') }, pantry: { circuits: boardCircuits('pantry').length, modules: boardModules('pantry') } }
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
      <section aria-labelledby="elec-single-title">
        <h3 id="elec-single-title">{t('electrical.single.title')}</h3>
        <p className="array-note">{t('electrical.single.intro')}</p>
        <div className="elec-single-boards">{(['pa', 'pantry'] as const).map(board => <section key={board}><h4>{t(`electrical.board.${board}`)}</h4><div className="elec-scroll"><SingleLine board={board} /></div></section>)}</div>
      </section>
      <div className="elec-boards"><MainBoardCard /><BoardCard board="solar" /><BoardCard board="pantry" /><BoardCard board="pa" /></div>
      <PhaseBalance />
      <section className="elec-notes" aria-labelledby="elec-notes-title">
        <h3 id="elec-notes-title">{t('electrical.notes.title')}</h3>
        <ul>{notes.map(note => <li key={note}>{note}</li>)}</ul>
      </section>
    </article>
  </div>
}
