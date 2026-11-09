import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { DiagramViewer } from './DiagramViewer'
import { PV_SYSTEM } from '../data/pv-system'
import {
  PHASE_NAME, BOXES, METER_DROP, SURGE_AC, VOLTAGE_PROTECTOR, MAIN_BOARD_ITEMS, CIRCUIT_BREAKING_KA, RCD_TRIP_MS, SMART_SWITCH, boardCircuits, boardDevices, boardModules, onUpsOutput, boxModules, SIMULTANEITY, CIRCUITS, DEVICES, rowItems, TAGS, FEEDER, SUPPLY_CABLE_MM2, SUPPLY_CONDUIT_MM, METER_CABLE_MM2, SMART_LOAD_CABLE_MM2, STRING_PANELS, BATTERY, singleLine, groupNoUps, INVERTER_MAX_OUTPUT_A, INVERTER_MODEL, PHASES, phaseCurrentA, phaseLoadW,
  type BoardId, type Circuit, type Device, type Phase,
} from '../data/electrical'
import { useLocale } from '../i18n/useLocale'
import '../building.css'
import '../electrical.css'

const device = (id: string) => { const found = DEVICES.find(item => item.id === id); if (!found) throw new Error(`Unknown device ${id}`); return found }

function PhaseChips({ phases }: { phases: readonly Phase[] }) {
  return <span className="elec-phases">{phases.map(phase => <span key={phase} className={`elec-phase elec-${phase.toLowerCase()}`}>{PHASE_NAME[phase]}</span>)}</span>
}

/** The single-line diagram's measures: a column for each circuit, the gap between the groups of one residual-current device and the next, and the margin. */
const SL = { col: 84, gap: 24, margin: 24, label: 14, boxW: 70, rcdW: 72, boxH: 34, rcdH: 66, nameLines: 14 }

/** The words of a label in lines of at most `max` characters, to write it under a column. */
const wrap = (label: string, max = SL.nameLines) => label.split(' ').reduce<string[]>((lines, word) => {
  const last = lines.at(-1)
  if (last !== undefined && `${last} ${word}`.length <= max) lines[lines.length - 1] = `${last} ${word}`
  else lines.push(word)
  return lines
}, [])

/**
 * The boards as one single-line diagram, top to bottom. It starts with the drop, once: the grid through the main board's ITM, surge arrester and voltage protector to the changeover
 * switch CON, which picks between that and the inverter's AC OUT (the inverter hangs from the same drop through AC IN). Then CON's output goes to the first board's main breaker and, branching off before it, to the other's (the pantry's feeder); each board's main breaker feeds a bus
 * from which each residual-current device drops, and under each one its circuits, a column each, with the breaker, phase, cable, load and name. The devices that are on the inverter's Smart Load output do not hang from that bus: they have a
 * source of their own at the top, and the line that goes on to the other board (the sauna's) leaves from there. It is read from `singleLine`, so it follows the rows of the board.
 */
function SingleLine({ boards }: { boards: readonly BoardId[] }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const names = t('electrical.circuit', { returnObjects: true }) as Record<string, string>
  const parts = boards.map(board => ({ board, ...singleLine(board) }))
  const text = (x: number, y: number, label: string, className = 'elec-sub', anchor: 'start' | 'middle' | 'end' = 'middle') => <text key={`${x}-${y}-${label}`} className={className} x={x} y={y} textAnchor={anchor}>{label}</text>
  /** The letters of a circuit's phases, each in its homologated colour (R brown, S black, T red). */
  const phaseText = (x: number, y: number, phases: readonly Phase[], className = 'elec-sub', anchor: 'start' | 'middle' | 'end' = 'middle') =>
    <text key={`${x}-${y}-${phases.join('')}`} className={className} x={x} y={y} textAnchor={anchor}>{phases.map(phase => <tspan key={phase} className={`elec-ph-${phase.toLowerCase()}`}>{PHASE_NAME[phase]}</tspan>)}</text>
  const cable = (item: Circuit) => t('electrical.single.cable', { n: item.phases.length === 1 ? 2 : item.phases.length + 1, mm2: formatNumber(item.cableMm2, item.cableMm2 % 1 ? 1 : 0) }).split(' + ')
  const ratingOf = (item: Device) => item.ratingA === null ? '' : `${item.poles}x${item.ratingA}A`
  /**
   * A circuit breaker as its standard symbol (IRAM / IEC): the blade slanting from the lower terminal with the cross-bar at its tip, the thermal element as a step in a line from its middle and the magnetic one as the arrowhead
   * at the end of it, between two open circles. It is 34 high, as the boxes are; the text goes to the right of the wire, or below it where the symbol lies on a horizontal wire.
   */
  const breaker = (cx: number, cy: number, lines: string[], title: string, horizontal = false, left = false, dx = 0) => <g>
    <title>{title}</title>
    <g transform={horizontal ? `rotate(-90 ${cx} ${cy})` : undefined}>
      {/* The owner's IRAM symbol (itm_iram.svg, 100 x 200), scaled to fit 34 between the circles: the blade, 30 degrees open from the lower circle, with the thermal pulse and the magnetic arrow. */}
      <g transform={`translate(${cx} ${cy}) scale(.68) translate(-40 -90)`} style={{ strokeWidth: 2.2 }}>
        <circle className="elec-node" cx={40} cy={65} r={5} /><circle className="elec-node" cx={40} cy={115} r={5} />
        <g className="elec-single-earth" style={{ strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }} transform="rotate(30 40 115)">
          <path d="M40 108.25V62" style={{ strokeWidth: 3.1 }} /><path d="M40 76H48M40 92H45V85H51V92H56" />
          <path d="M64 76L48 72V80Z" style={{ fill: 'currentColor', stroke: 'none' }} />
        </g>
      </g>
    </g>
    {lines.map((line, index) => horizontal ? text(cx, cy + 32 + index * 13, line, index ? 'elec-sub' : 'elec-title') : text(left ? cx - 12 : cx + 28 + dx, cy - (lines.length - 1) * 6.5 + index * 13 + 3, line, index || lines.length === 1 ? 'elec-sub' : 'elec-title', left ? 'end' : 'start'))}
  </g>
  /** A residual-current device as its standard symbol, 66 high (`SL.rcdH`), the text to the right. */
  const rcdSymbol = (cx: number, cy: number, lines: string[], title: string) => <g>
    <title>{title}</title>
    {/* The owner's IRAM symbol (diferencial_iram.svg, 100 x 200), scaled like the breaker's: the blade, 30 degrees open, the coil's link going down to the toroid that the conductor goes through. */}
    <g transform={`translate(${cx} ${cy - 16}) scale(.68) translate(-40 -90)`}>
      <circle className="elec-node" cx={40} cy={65} r={5} style={{ strokeWidth: 2.2 }} /><circle className="elec-node" cx={40} cy={115} r={5} style={{ strokeWidth: 2.2 }} />
      <g className="elec-single-earth" style={{ strokeWidth: 2.2, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <path d="M40 121.25V165M50 97.7H58V150" />
        <ellipse cx={40} cy={150} rx={18} ry={5} />
        <path d="M40 108.25V62" transform="rotate(30 40 115)" style={{ strokeWidth: 3.1 }} />
      </g>
    </g>
    {lines.map((line, index) => text(cx + 26, cy - (lines.length - 1) * 6.5 + index * 13 + 3, line, index ? 'elec-sub' : 'elec-title', 'start'))}
  </g>
  /** The marks across a vertical wire, one for each conductor. */
  const ticks = (x: number, y: number, count: number) => <path className="elec-single-earth" d={Array.from({ length: count }, (_, n) => `M${x - 6} ${y + n * 5 + 2}l12 -4`).join('')} />

  /** The width of the row labels of the table under the diagram, which the columns are shifted by. */
  const LABELS = 92
  let at = SL.margin + LABELS
  const placed = parts.flatMap((part, partIndex) => {
    if (partIndex) at += SL.gap * 2
    return part.groups.map(group => {
      const rows = group.circuits.length
      const first = at + SL.col / 2, last = first + (rows - 1) * SL.col
      at += rows * SL.col + SL.gap
      return { board: part.board, group, rows, first, last, centre: (first + last) / 2, noUps: groupNoUps(group) }
    })
  })
  const width = at - SL.gap + SL.margin
  /** What each board has of its own: its bus, the trunk that its main breaker hangs from, and its series devices. */
  const info = parts.map(part => {
    const mine = placed.filter(item => item.board === part.board), supplied = mine.filter(item => !item.noUps)
    const busLeft = supplied[0]?.centre ?? mine[0].centre, busRight = supplied.at(-1)?.centre ?? mine[0].centre
    return { board: part.board, supplied, busLeft, busRight, trunk: (busLeft + busRight) / 2, series: part.head.filter(item => !item.id.startsWith('surge')), surges: part.head.filter(item => item.id.startsWith('surge')) }
  })
  const { series, surges } = info[0], trunk = info[0].trunk
  const seriesY = (index: number) => 52 + index * 58
  const surgeY = seriesY(series.length - 1) + SL.boxH / 2 + 24
  const busY = surges.length ? surgeY + 100 : seriesY(series.length - 1) + SL.boxH / 2 + 30
  const rcdY = busY + 56, subY = rcdY + SL.rcdH / 2 + 22, breakerY = subY + 38, loadY = breakerY + 106
  /** The output terminals of a circuit: the phase terminals (R, S, T) and the neutral, numbered by the circuit's place in its own board. */
  const terminals = (circuit: Circuit) => {
    const n = BOXES[circuit.board].rows.flat().filter(id => CIRCUITS.some(item => item.id === id)).indexOf(circuit.id) + 1
    return [...circuit.phases.map(phase => `${PHASE_NAME[phase]}${n}`), `N${n}`]
  }
  /** Where a circuit goes, for the table: its emoji and its name without it; the forwarded line says which board it goes to. */
  const destinationOf = (circuit: Circuit) => {
    const [, emoji = '', name = names[circuit.id]] = names[circuit.id].match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u) ?? []
    return { emoji, label: name }
  }
  const tableTop = loadY + 36, ROW = 18, DESTINATION_H = 126, tableRows = ['circuit', 'power', 'phase', 'cable', 'earth', 'terminal', 'destination'] as const
  /** The terminals' row is a vertical list, as tall as the longest one; the others are one line. */
  const terminalsH = Math.max(...placed.flatMap(item => item.group.circuits).map(item => terminals(item).length)) * 11 + 8
  const heights = [ROW, ROW, ROW, ROW, ROW, terminalsH, DESTINATION_H]
  const rowY = (index: number) => tableTop + heights.slice(0, index).reduce((sum, h) => sum + h, 0), rowH = (index: number) => heights[index]
  const height = rowY(tableRows.length - 1) + DESTINATION_H + 8
  const columnX = (item: (typeof placed)[number], index: number) => item.first + index * SL.col
  const nodes = t('electrical.node', { returnObjects: true }) as Record<string, string>
  const rating = (item: { poles: number; ratingA: number | null }) => item.ratingA === null ? `${item.poles}P` : `${item.poles}x${item.ratingA}A`
  const inverterIn = DEVICES.find(item => item.id === 'inverter-ac')!, inverterOut = DEVICES.find(item => item.id === 'inverter-out')!
  const cableText = `4(1x${SUPPLY_CABLE_MM2})mm²+PE`
  /** The drop's height, and its left wire's x: 24 to the left of the board's trunk, so that CON's output (its middle) lines up with it. */
  const T = 84, A = 34, D = 520 + T + A + 66, L = Math.max(trunk - 24, 230), PEX = L - 130, SPDX = L - 70, totalWidth = Math.max(width, L + 520)
  /** Where the earth rod's line meets the drop, between the meter box and the ITM, as seen from the board's group (which starts at `D`). */
  const peY = A + 100 - D
  return <svg className="elec-single" style={{ minWidth: totalWidth * .85, maxWidth: totalWidth * 1.25 }} viewBox={`0 0 ${totalWidth} ${height + D}`} role="img" aria-label={t('electrical.single.aria', { board: boards.map(board => t(`electrical.board.${board}`)).join(' · ') })}>
    <g transform={`translate(0 ${A})`}>
    {/* The company's service drop (the owner's acometida_edesur_iram.svg, 300 x 240, at .6, its tap the one below): the cable coming in from the left with the arrow, its four conductors and its cable. */}
    <g className="elec-wire elec-wire-ac"><path d={`M${L - 132} -2H${L}V16`} /></g>
    <path className="elec-node" d={`M${L - 114} -6.8L${L - 90} -2L${L - 114} 2.8Z`} />
    <path className="elec-single-earth" d={`M${L - 31.2} 1.6l4.8 -7.2M${L - 26.4} 1.6l4.8 -7.2M${L - 21.6} 1.6l4.8 -7.2M${L - 16.8} 1.6l4.8 -7.2`} />
    {text(L - 90, -9, '1 x (4x6) mm²', 'elec-sub')}{text(L - 102, 13, nodes.serviceFrom, 'elec-sub')}{text(L - 102, 25, 'EDESUR', 'elec-sub')}
    <g className="elec-wire elec-wire-ac"><path d={`M${L} 40V60M${L} 95V${T + 77}`} /></g>
    {/* The company's tap and the meter box, ahead of the ITM (the owner's toma_medidor_iram.svg, 100 x 220, scaled to .6): the square with a cross, and the arched box with the M. */}
    <g transform={`translate(${L} 28) scale(.6) translate(-50 -35)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round' }}>
      <title>{nodes.utilityTap}</title><rect x={30} y={15} width={40} height={40} className="elec-node" style={{ strokeWidth: 2.5 }} /><path d="M30 15L70 55M70 15L30 55" />
    </g>
    <g transform={`translate(${L} 60) scale(.6) translate(-50 -107)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <title>{nodes.meterBox}</title><path d="M32 165V125A18 18 0 0 1 68 125V165Z" className="elec-node" style={{ strokeWidth: 2.5 }} /><path d="M42 157V133L50 148L58 133V157" />
    </g>
    {text(L + 22, 32, nodes.utilityTap, 'elec-sub', 'start')}<path className="elec-single-earth" d={`M${PEX - 14} 118H${L + 200}M${L - 6} 124L${L + 6} 112M${PEX - 6} 124L${PEX + 6} 112`} /><path className="elec-single-earth" d={[0, 1, 2, 3].map(n => `M${L - 6} ${133 + n * 5}l12 -4`).join('')} />{text(L + 16, 114, `4(1x${METER_CABLE_MM2}mm²)+PE=1x${METER_CABLE_MM2}mm²`, 'elec-sub', 'start')}{text(L + 22, 81, nodes.meterBox, 'elec-sub', 'start')}
    <g transform={`translate(0 ${T})`}>
    {/* The conduit that takes CON's output to the boards, marked like the drop's: a line across the output, above the branch to the boards, with a slash where it crosses the output and another where it crosses the violet PE, and its diameter and cable to the right of the cable, before the branch. */}
    <path className="elec-single-earth" d={`M${PEX - 14} 538H${trunk + 14}M${PEX - 6} 544L${PEX + 6} 532M${trunk - 6} 544L${trunk + 6} 532`} />
    {text(trunk + 12, 555, `Ø${FEEDER.conduitMm} - 4(1x${FEEDER.cableMm2}mm²) + PE`, 'elec-sub', 'start')}
    <g className="elec-wire elec-wire-ac"><path d={[
      `M${L} ${95 - T}V77M${L} 111V151M${L} 193V462`, `M${L} 128H${SPDX}V134`, `M${L} 235H${L + 225}V248M${L + 225} 282V298.5`,
      `M${L + 208} 353.5V370M${L + 208} 404V425H${L + 48}V462`, `M${trunk} 502V${D - T - A + SL.label + 6}`, ...info.slice(1).map(board => `M${trunk} 572H${board.trunk}V${D - T - A + SL.label + 6}`),
    ].join('')} /></g>
    <circle className="elec-dot" cx={L} cy={128} r={3.5} /><circle className="elec-dot" cx={L} cy={235} r={3.5} />{info.length > 1 && <circle className="elec-dot" cx={trunk} cy={572} r={3.5} />}
    {breaker(L, 94, [TAGS[METER_DROP.id], `${METER_DROP.poles}x${METER_DROP.ratingA}A`, t('electrical.single.curveType', { curve: METER_DROP.curve }), `Icc=${METER_DROP.breakingKA}kA`], TAGS[METER_DROP.id], false, false, 12)}
    {text(L + 22, 142, '380/220 Vca-50 Hz', 'elec-sub', 'start')}
    {/* The owner's IRAM surge arrester (spd_descargador_iram.svg, 100 x 200), scaled to .6: the rectangle with the arrow pointing down, and the earth below it. */}
    <g transform={`translate(${SPDX} 134) scale(.6) translate(-50 -60)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <title>{TAGS[SURGE_AC.id]}</title>
      <path d="M50 61.25V93" />
      <path d="M50 111.25V160.75" style={{ strokeDasharray: '8 5', stroke: '#b04a9a' }} />
      <rect x={42} y={60} width={16} height={50} className="elec-node" style={{ strokeWidth: 2.5 }} />
      <path d="M50 61.25V93" /><path d="M50 105L47 93H53Z" style={{ fill: 'currentColor', stroke: 'none' }} />
    </g>
    {text(SPDX + 8, 153, TAGS[SURGE_AC.id], 'elec-sub', 'start')}
    {/* Its earth is the PE cable: the dashed line goes on, under the voltage protector, to the one that comes down from the earth rod. */}
    <g className="elec-pe"><path d={`M${SPDX} 194.5V205H${PEX}`} /></g><circle className="elec-dot elec-pe-dot" cx={PEX} cy={205} r={3} />
    {/* The owner's IRAM voltage protector (protector_tension_iram.svg, 100 x 200), scaled to .6 and in series: the measuring relay's rectangle with U>, U< and the voltage. */}
    <g transform={`translate(${L} 172) scale(.6) translate(-50 -100)`}>
      <title>{TAGS[VOLTAGE_PROTECTOR.id]}</title>
      <rect x={18} y={65} width={64} height={70} className="elec-node" style={{ strokeWidth: 2.5 }} />
      <g textAnchor="middle" style={{ fill: 'currentColor', stroke: 'none', fontFamily: 'inherit' }}>
        <text x={50} y={91} fontSize={18}>U &gt;</text><text x={50} y={113} fontSize={18}>U &lt;</text><text x={50} y={129} fontSize={11}>220 V</text>
      </g>
    </g>
    {text(L + 30, 168, TAGS[VOLTAGE_PROTECTOR.id], 'elec-title', 'start')}{text(L + 30, 182, rating(VOLTAGE_PROTECTOR), 'elec-sub', 'start')}
    {breaker(L + 225, 265, [TAGS[inverterIn.id], rating(inverterIn)], TAGS[inverterIn.id], false, true)}
    {/* The owner's inverter symbol (inversor_solar.svg, 100 x 200), scaled to .8: the converter's square with its diagonal, the DC bars above it and the AC wave below. */}
    <g transform={`translate(${L + 225} 326) scale(1.1) translate(-50 -95)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <title>{nodes.inverter}</title>
      <rect x={25} y={70} width={50} height={50} className="elec-node" style={{ strokeWidth: 2.5 }} />
      <path d="M25 120L75 70M33 83H47M33 89H47M52 105c3 -6 6 -6 8 0s5 6 8 0" />
    </g>
    {/* The PE goes with the cable to the TSINV, inside the same conduit: a bar between the conduit's line and the cable to AC IN, long enough to reach the strings' surge arresters, which are joined to it, from the one that comes down from the earth rod. */}
    <g className="elec-pe"><path d={`M${PEX} 225H${L + 428}`} /></g><circle className="elec-dot elec-pe-dot" cx={PEX} cy={225} r={3} />
    {/* The two strings, on the right of the inverter (the owner's panel_solar.svg, 160 x 200, at .8): the generator's square with its diagonal, the DC bars and the incident light, each with its 20 A DC breaker, to the inverter's DC input. */}
    {[1, 2].map(n => { const x = L + 290 + (n - 1) * 110, id = `string-dc-${n}`, y = n === 1 ? 310 : 324, string = device(id); return <g key={id}>
      <g className="elec-wire elec-wire-dc"><path d={`M${x} 38V85M${x} 119V${y}H${L + 253}M${x} 148H${x + 28}V154`} /></g>
      <g transform={`translate(${x} 18) scale(.8) translate(-55 -70)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <title>{`${TAGS[id]} · ${STRING_PANELS.panels} × ${STRING_PANELS.wp} Wp`}</title>
        <rect x={30} y={45} width={50} height={50} className="elec-node" style={{ strokeWidth: 2.5 }} />
        <path d="M30 95L80 45M58 76H72M58 82H72" />
        {[[10, 24], [22, 14]].map(([tx, ty]) => <g key={tx} transform={`translate(${tx} ${ty}) rotate(45)`}><path d="M0 0H14" /><path d="M22 0L14 -2V2Z" style={{ fill: 'currentColor', stroke: 'none' }} /></g>)}
      </g>
      {text(x + 26, 12, `${STRING_PANELS.panels} × ${STRING_PANELS.wp} Wp`, 'elec-sub', 'start')}{text(x + 26, 25, `${formatNumber(STRING_PANELS.panels * STRING_PANELS.wp / 1000, 2)} kWp`, 'elec-sub', 'start')}
      {ticks(x, 59, 2)}
      {breaker(x, 102, [TAGS[id], `${string.poles}x${string.ratingA}A`], id)}
      <circle className="elec-dot" cx={x} cy={148} r={3} />
      {/* The string's DC surge arrester, as the AC one is drawn: the rectangle with the arrow, and its dashed earth. */}
      <g transform={`translate(${x + 28} 154) scale(.6) translate(-50 -60)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <title>{TAGS[`surge-dc-${n}`]}</title>
        <path d="M50 111.25V160.75" style={{ strokeDasharray: '8 5', stroke: '#b04a9a' }} />
        <rect x={42} y={60} width={16} height={50} className="elec-node" style={{ strokeWidth: 2.5 }} />
        <path d="M50 61.25V93" /><path d="M50 105L47 93H53Z" style={{ fill: 'currentColor', stroke: 'none' }} />
      </g>
      {text(x + 38, 171, TAGS[`surge-dc-${n}`], 'elec-sub', 'start')}
      <g className="elec-pe"><path d={`M${x + 28} 214.5V225`} /></g><circle className="elec-dot elec-pe-dot" cx={x + 28} cy={225} r={3} />
    </g> })}
    {/* The inverter's Smart Load output, which feeds the water heater and the sauna, in the TSPB: from the inverter's bottom edge, next to AC OUT, across to the board's group that hangs from it. */}
    {placed.filter(item => item.noUps).map(item => <g key={item.centre} className="elec-wire elec-wire-ac"><path d={`M${L + 242} 353.5V480H${item.centre}V${D - T - A + SL.label + 6}`} /></g>)}
    {text(L + 252, 474, `${t('electrical.single.smartLoad')} - 4(1x${SMART_LOAD_CABLE_MM2})mm²+PE`, 'elec-sub', 'start')}
    {/* The battery, below the strings, on the inverter's DC side (the owner's bateria_unifilar.svg, 100 x 200, at .6). It has no breaker of its own: the inverter's is built in. */}
    {(() => { const x = L + 300; return <g>
      <g className="elec-wire elec-wire-dc"><path d={`M${L + 253} 338H${x}V384`} /></g>
      <path className="elec-single-earth" d={[0, 1].map(n => `M${x - 6} ${358 + n * 5}l12 -4`).join('')} />
      <g transform={`translate(${x} 385) scale(.6) translate(-50 -110)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
        <title>{`${nodes.battery} ${BATTERY.model}`}</title>
        <path d="M30 110H70M30 140H70" /><path d="M50 122.5V138.75" style={{ strokeDasharray: '3 4', strokeLinecap: 'butt' }} />
        <rect x={40} y={117.5} width={20} height={5} style={{ fill: 'currentColor', stroke: 'none' }} /><rect x={40} y={147.5} width={20} height={5} style={{ fill: 'currentColor', stroke: 'none' }} />
      </g>
      {text(x - 17, 383, '+', 'elec-sub')}{text(x - 12, 414, '–', 'elec-sub')}{text(x + 20, 388, `${nodes.battery.replace('🔋 ', '')} ${formatNumber(BATTERY.voltageV, 1)} V`, 'elec-sub', 'start')}{text(x + 20, 402, BATTERY.model, 'elec-sub', 'start')}{text(x + 20, 416, `${formatNumber(BATTERY.energyKWh, 1)} kWh · ${BATTERY.capacityAh} Ah`, 'elec-sub', 'start')}
    </g> })()}
    {text(L + 188, 321, t('electrical.single.inverterTitle'), 'elec-title', 'end')}{text(L + 188, 335, t('electrical.single.inverterSub'), 'elec-sub', 'end')}{text(L + 188, 349, INVERTER_MODEL, 'elec-sub', 'end')}
    {breaker(L + 208, 387, [TAGS[inverterOut.id], rating(inverterOut)], TAGS[inverterOut.id], false, true)}
    {/* The conduit between the TP and the TSINV, drawn as in the sample single-line diagram: its line, a slash across each conductor that goes through it (the cable and the PE) and what it holds. */}
    <path className="elec-single-earth" d={`M${PEX - 14} 215H${L + 215}M${L - 6} 221L${L + 6} 209M${PEX - 6} 221L${PEX + 6} 209`} />
    {text(L + 20, 210, `Ø${SUPPLY_CONDUIT_MM} - 4(1x${SUPPLY_CABLE_MM2}mm²) + PE=1x${SUPPLY_CABLE_MM2}mm²`, 'elec-sub', 'start')}{text(L + 100, 418, cableText, 'elec-sub', 'start')}
    {/* The owner's three-position changeover switch (conmutadora_3pos_iram.svg, 140 x 200), at .8, with its blade in the middle, open (0): the two inputs, the pivot that is the output. Grid on the left (I), inverter on the right (II). */}
    <g transform={`translate(${L + 24} 462) scale(.8) translate(-70 -80)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round' }}>
      <title>{nodes.selector}</title>
      <circle className="elec-node" cx={40} cy={80} r={5} /><circle className="elec-node" cx={100} cy={80} r={5} /><circle className="elec-node" cx={70} cy={130} r={5} />
      <path d="M70 123.25V88" style={{ strokeWidth: 3.5 }} />
    </g>
    {text(L + 12 - 14, 480, 'I', 'elec-sub', 'end')}{text(L + 24, 466, '0', 'elec-sub')}{text(L + 48 + 12, 480, 'II', 'elec-sub', 'start')}
    {text(L + 62, 500, nodes.selector.split(' ')[0], 'elec-title', 'start')}{text(L + 62, 514, ratingOf(DEVICES.find(item => item.id === 'selector') as Device), 'elec-sub', 'start')}{text(L + 62, 528, nodes.selectorPositions, 'elec-sub', 'start')}
    </g>
    </g>
    <g transform={`translate(0 ${D})`}>
    <g className="elec-wire elec-wire-ac"><path d={[
      ...info.flatMap(board => [
        ...[...board.series.map((_, index) => seriesY(index)), busY + SL.boxH / 2].map((y, index, all) => `M${board.trunk} ${index ? seriesY(index - 1) + SL.boxH / 2 : SL.label + 6}V${index < all.length - 1 ? y - SL.boxH / 2 : busY}`), `M${board.busLeft} ${busY}H${board.busRight}`,
        ...board.surges.map((_, index) => `M${board.trunk} ${surgeY + index * 60}H${board.trunk + 44}V${surgeY + index * 60 + 14}M${board.trunk + 44} ${surgeY + index * 60 + 40}V${surgeY + index * 60 + 50}`),
      ]),
      ...placed.flatMap(item => [
        `M${item.centre} ${item.noUps ? SL.label + 6 : busY}V${item.group.rcd ? rcdY - SL.rcdH / 2 : subY}`,
        ...(item.group.rcd ? [`M${item.centre} ${rcdY + SL.rcdH / 2}V${subY}`] : []), `M${item.first} ${subY}H${item.last}`,
        ...Array.from({ length: item.rows }, (_, index) => {
          const x = columnX(item, index)
          const inline = DEVICES.some(device => device.inlineOf === item.group.circuits[index]?.id)
          return `M${x} ${subY}V${breakerY - SL.boxH / 2}` + (inline ? `M${x} ${breakerY + SL.boxH / 2}V${breakerY + 54.4}M${x} ${breakerY + 85}V${loadY - 6}` : `M${x} ${breakerY + SL.boxH / 2}V${loadY - 6}`)
        }),
      ]),
    ].join('')} /></g>
    {info.map(board => <g key={board.board}>
      {board.supplied.map(item => <circle key={item.centre} className="elec-dot" cx={item.centre} cy={busY} r={3.5} />)}
      {board.supplied.length > 1 && <circle className="elec-dot" cx={board.trunk} cy={busY} r={3.5} />}
      {/* The four conductors that come from CON, marked where they enter each board, above its first breaker. */}
      <path className="elec-single-earth" d={[0, 1, 2, 3].map(n => `M${board.trunk - 6} ${8 + n * 3.2}l12 -4`).join('')} />
      {board.series.map((item, index) => <g key={item.id}>{breaker(board.trunk, seriesY(index), [TAGS[item.id], ratingOf(item)], item.id)}</g>)}
      {board.surges.map((item, index) => { const x = board.trunk + 44, y = surgeY + index * 60 + 14; return <g key={item.id}>
        <rect className="elec-node" x={x - 24} y={y} width={48} height={26} rx={4} />{text(x, y + 17, TAGS[item.id], 'elec-title')}
        <path className="elec-single-earth" d={`M${x - 8} ${y + 36}H${x + 8}M${x - 5} ${y + 40}H${x + 5}M${x - 2} ${y + 44}H${x + 2}`} />{text(x + 14, y + 44, t('electrical.single.surge'), 'elec-sub', 'start')}
      </g> })}
    </g>)}
    {placed.map(item => { const { group, centre, noUps } = item; return <g key={group.rcd?.id ?? group.circuits[0].id}>
      {noUps && ticks(centre, (group.rcd ? rcdY - SL.rcdH / 2 : subY) - 88, 4)}
      {group.rcd && rcdSymbol(centre, rcdY, [TAGS[group.rcd.id], ratingOf(group.rcd), t('electrical.single.rcd', { type: group.rcd.rcdType }), `t=${RCD_TRIP_MS}ms`], group.rcd.id)}
      {item.rows > 1 && Array.from({ length: item.rows }, (_, index) => <circle key={index} className="elec-dot" cx={columnX(item, index)} cy={subY} r={3} />)}
      {group.circuits.map((circuit, index) => { const x = columnX(item, index); return <g key={circuit.id}>
        {phaseText(x + 5, subY + 16, circuit.phases, 'elec-title', 'start')}
        {breaker(x, breakerY, [`${circuit.modules}x${circuit.ratingA}A`, t('electrical.single.curveType', { curve: 'C' }), `Icc=${formatNumber(CIRCUIT_BREAKING_KA, 1)}kA`], names[circuit.id])}
        {ticks(x, breakerY + 28, circuit.phases.length === 1 ? 2 : circuit.phases.length + 1)}
        {(() => { const inline = DEVICES.find(item => item.inlineOf === circuit.id); return inline && <g>
          {/* A circuit's smart switch, in series after its breaker (the owner's sonoff_pow_contactor.svg, 100 x 200, at .5): the fixed contact with the contactor's arc, and the open blade from its pivot. */}
          <title>{`${SMART_SWITCH.brand} ${SMART_SWITCH.model}`}</title>
          <g transform={`translate(${x} ${breakerY + 70}) scale(.5) translate(-40 -90)`} className="elec-single-earth" style={{ strokeWidth: 3, strokeLinecap: 'round' }}>
            <path d="M40 58.75V72M40 60A6 6 0 0 0 40 72" />
            <circle cx={40} cy={115} r={5} className="elec-node" style={{ strokeWidth: 3 }} />
            <path d="M40 108.25V62" transform="rotate(30 40 115)" style={{ strokeWidth: 5 }} />
          </g>
          {text(x + 22, breakerY + 66, SMART_SWITCH.model, 'elec-sub', 'start')}
          {text(x + 22, breakerY + 79, `${inline.poles}x${inline.ratingA}A`, 'elec-sub', 'start')}
        </g> })()}
        {/* The owner's circuit output (salida_circuito.svg, 100 x 140), at .85: the output terminal with the slash across it. */}
        <g transform={`translate(${x} ${loadY}) scale(.85) translate(-50 -110)`} className="elec-single-earth" style={{ strokeWidth: 2.5, strokeLinecap: 'round' }}>
          <circle cx={50} cy={110} r={7} className="elec-node" style={{ strokeWidth: 2.5 }} /><path d="M37 121L63 99" />
        </g>
      </g> })}
    </g> })}
    {/* The PE bar, dashed as in the sample single-line diagram, just above the primary bus, with its earth at the end. */}
    <g className="elec-pe"><path d={`M${Math.min(placed[0].first - 14, PEX)} ${busY - 10}H${Math.max(placed.at(-1)!.last + 14, PEX)}M${PEX} ${busY - 10}V${peY}H${PEX - 96}V${peY + 6}`} /></g>
    <path className="elec-single-earth" style={{ stroke: '#b04a9a', strokeWidth: 1.8 }} d={`M${PEX - 106} ${peY + 6}H${PEX - 86}M${PEX - 102} ${peY + 11}H${PEX - 90}M${PEX - 98} ${peY + 16}H${PEX - 94}`} />
    <circle className="elec-dot elec-pe-dot" cx={PEX} cy={busY - 10} r={3} />
    {text(PEX - 4, peY - 5, t('electrical.single.peRod'), 'elec-sub', 'end')}
    {/* The labels of the left margin, as in the sample single-line diagram: the secondary bus that the circuits' breakers hang from, and the output terminals. */}
    {text(10, busY + 4, t('electrical.single.primaryBus'), 'elec-sub', 'start')}{text(10, subY + 4, t('electrical.single.secondaryBus'), 'elec-sub', 'start')}{text(10, loadY + 4, t('electrical.single.outputTerminal'), 'elec-sub', 'start')}
    {/* The table of the circuits under the diagram, a column for each, as in the sample single-line diagram. */}
    {tableRows.map((row, index) => <g key={row}>
      <rect className="elec-cell" x={4} y={rowY(index)} width={LABELS - 8} height={rowH(index)} />
      {(row === 'terminal' ? t(`electrical.single.table.${row}`).split(/ (?=[^ ]+$)/) : [t(`electrical.single.table.${row}`)]).map((line, n) => text(10, rowY(index) + 12.5 + n * 11, line, 'elec-sub', 'start'))}
    </g>)}
    {placed.flatMap(item => item.group.circuits.map((circuit, index) => ({ circuit, x: columnX(item, index) }))).map(({ circuit, x }) => {
      const cells = [TAGS[circuit.id], circuit.loadW ? formatNumber(circuit.loadW) : '–', circuit.phases.map(phase => PHASE_NAME[phase]).join(''), cable(circuit)[0].replace(' mm²', ''), formatNumber(circuit.cableMm2, circuit.cableMm2 % 1 ? 1 : 0), terminals(circuit), destinationOf(circuit)]
      return <g key={circuit.id}>{cells.map((cell, index) => <g key={index}>
        <rect className="elec-cell" x={x - SL.col / 2} y={rowY(index)} width={SL.col} height={rowH(index)} />
        {index === tableRows.length - 1
          ? <>
            {text(x, rowY(index) + 24, (cell as { emoji: string }).emoji, 'elec-title')}
            {wrap((cell as { label: string }).label, 15).map((line, n, all) => { const lx = x + (n - (all.length - 1) / 2) * 12 + 4, ly = rowY(index) + 34 + (rowH(index) - 34) / 2; return <text key={n} className="elec-sub" x={lx} y={ly} textAnchor="middle" transform={`rotate(-90 ${lx} ${ly})`}>{line}</text> })}
          </>
          : index === 2
            ? phaseText(x, rowY(index) + 12.5, circuit.phases)
            : (Array.isArray(cell) ? cell : [cell as string]).map((line, n) => text(x, rowY(index) + 12.5 + n * 11, line, index === 0 ? 'elec-title' : 'elec-sub'))}
      </g>)}</g>
    })}
    </g>
  </svg>
}

const protection = (item: Device, t: TFunction<'workspace'>) => {
  if (item.ratingA === null) return t(item.id === 'selector' ? 'electrical.board.bySupply' : 'electrical.board.byManual')
  return `${item.poles}x${item.ratingA}A${/^string-dc/.test(item.id) ? ' DC' : ''}`
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
  const rcd = id.startsWith('rcd'), selector = id === 'selector', protector = id === 'voltage-protector', smart = DEVICES.some(item => item.id === id && item.inlineOf), spd = id.startsWith('surge'), dc = /^string-dc/.test(id)
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
    {!smart && <text x={cx} y={rcd ? 41 : 33} textAnchor="middle" fontSize={modules > 1 ? 7 : 6.2} fill="#2b2f33" fontWeight={600}>{rating}</text>}
    {rcd && <><circle cx={x + MODULE_W * .9} cy={25} r={3.6} fill="#f1e9d2" stroke="#8d8466" strokeWidth={.6} /><text x={x + MODULE_W * .9} y={26.6} textAnchor="middle" fontSize={4.4} fill="#4a4636" fontWeight={700}>T</text>
      <text x={x + w - MODULE_W * .5} y={20} textAnchor="middle" fontSize={5.5} fill="#2b2f33" fontWeight={700}>N</text></>}
    {protector && <><rect x={x + 3} y={34} width={w - 6} height={30} rx={2} fill="#1f2124" />{[0, 1, 2].map(n => <circle key={n} cx={x + w * (n + 1) / 4} cy={49} r={3} fill="#4cc26b" />)}</>}
    {smart && <><circle cx={x + w * .2} cy={31} r={3.2} fill="#c9ced3" stroke="#7d8389" strokeWidth={.6} /><circle cx={x + w * .46} cy={31} r={2.1} fill="#4cc26b" /><circle cx={x + w * .66} cy={31} r={2.1} fill="#e0a23a" /><rect x={x + 4} y={40} width={w - 8} height={24} rx={2} fill="#1f2124" /><text x={cx} y={56} textAnchor="middle" fontSize={8} fill="#4cc26b" fontWeight={600}>{rating}</text></>}
    {spd && <rect x={x + 4} y={46} width={w - 8} height={11} rx={2} fill="#3f9d5a" />}
    {selector && <><circle cx={cx} cy={52} r={12} fill="#1f2124" /><path d={`M${cx} 52V43`} stroke="#f4f5f6" strokeWidth={2.2} strokeLinecap="round" /></>}
    {!selector && !spd && !protector && !smart && (rcd
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
    return ampere ? `${ampere}A` : ''
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
  const load = (item: Circuit) => item.loadW ? formatNumber(item.loadW) : '—'
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
        <th scope="row" className="elec-tag">{TAGS[item.id]}</th><td className="elec-name">{names[item.id]}</td><td><PhaseChips phases={item.phases} /></td><td>{item.modules}x{item.ratingA}A · C</td><td>{formatNumber(item.cableMm2, item.cableMm2 % 1 ? 1 : 0)}</td><td>{load(item)}</td><td>{item.modules}</td>
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
      {MAIN_BOARD_ITEMS.map(item => { const x = at * MODULE_W; at += item.modules; return <ModuleIcon key={item.id} x={x} id={item.id} modules={item.modules} terminals={item.poles} rating={item.ratingA ? `${item.ratingA}A` : item.id.startsWith('surge') ? '' : `${item.poles}P`} tag={TAGS[item.id]} name={deviceNames[item.id]} /> })}
      {used < boxModules && <g><rect x={used * MODULE_W + 1} y={1} width={(boxModules - used) * MODULE_W - 2} height={DEVICE_H - 2} rx={2.5} fill="none" stroke="currentColor" strokeOpacity={.5} strokeDasharray="4 3" />
        <text x={(used + (boxModules - used) / 2) * MODULE_W} y={DEVICE_H / 2 + 3} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={.75}>{t('electrical.board.free', { count: boxModules - used })}</text></g>}
    </svg>
    <table className="gen-table gen-table-plain">
      <thead><tr><th scope="col">{t('electrical.board.tag')}</th><th scope="col">{t('electrical.board.device')}</th><th scope="col">{t('electrical.board.breaker')}</th><th scope="col">{t('electrical.board.modules')}</th></tr></thead>
      <tbody>{MAIN_BOARD_ITEMS.map(item => <tr key={item.id}><th scope="row" className="elec-tag">{TAGS[item.id]}</th><td className="elec-name">{deviceNames[item.id]}</td><td>{item.ratingA === null ? t(item.id === METER_DROP.id ? 'electrical.board.bySupply' : 'electrical.board.byManual') : `${item.poles}x${item.ratingA}A`}</td><td>{item.modules}</td></tr>)}</tbody>
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
  const onUps = onUpsOutput(), busiest = busiestOf(onUps), pantryOnUps = boardCircuits('pantry').filter(item => !item.noUps), pantryBusiest = busiestOf(pantryOnUps)
  const { formatNumber } = useLocale()
  const facts: [string, string][] = [
    [t('electrical.factSupply'), t('electrical.factSupplyValue')],
    [t('electrical.factInverter'), INVERTER_MODEL],
    [t('electrical.factBoards'), t('electrical.factBoardsValue')],
    [t('electrical.factCircuits'), t('electrical.factCircuitsValue', { upper, ground })],
    [t('electrical.factSelector'), t('electrical.factSelectorValue')],
    [t('electrical.factFeeder'), t('electrical.factFeederValue', { conductors: FEEDER.conductors, mm2: FEEDER.cableMm2, conduit: FEEDER.conduitMm })],
  ]
  const notes = [
    t('electrical.notes.earth'), t('electrical.notes.feeder', { phase: PHASE_NAME[pantryBusiest], amps: formatNumber(phaseCurrentA(pantryOnUps)[pantryBusiest] * SIMULTANEITY), connected: formatNumber(phaseCurrentA(pantryOnUps)[pantryBusiest]), factor: formatNumber(SIMULTANEITY, 1) }), 
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
      <section aria-labelledby="elec-single-title">
        <h3 id="elec-single-title">{t('electrical.single.title')}</h3>
        <p className="array-note">{t('electrical.single.intro')}</p>
        <DiagramViewer labels={{ title: t('electrical.single.title'), open: t('electrical.single.fullscreen'), close: t('electrical.single.close'), zoomIn: t('electrical.single.zoomIn'), zoomOut: t('electrical.single.zoomOut'), reset: t('electrical.single.fit') }}><SingleLine boards={['pa', 'pantry']} /></DiagramViewer>
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
