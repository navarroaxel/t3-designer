import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ARRAY_WATTS } from '../data/solar-array'
import { useLocale } from '../i18n/useLocale'
import type { Generation } from '../lib/useGeneration'
import { clock, cumulativeKwh, METRIC_UNIT, monthValue, niceTicks, type YearMetric } from '../lib/pv/stats'
import type { MonthResult, YearResult } from '../lib/pv/model'

const KWP = ARRAY_WATTS / 1000
/** The simulated day has one point per this many minutes. */
const STEP = 10

type Frame = { width: number; height: number; left: number; right: number; top: number; bottom: number }
const COMPACT: Frame = { width: 256, height: 76, left: 0, right: 0, top: 6, bottom: 12 }
const LARGE: Frame = { width: 640, height: 260, left: 38, right: 10, top: 12, bottom: 22 }

/**
 * Power through the day: the clear sky as a dashed line, the typical day as an area (the bell curve),
 * and the chosen time as a marker. Hovering or focusing the chart reads the values at that moment in a
 * tooltip; clicking, or pressing Enter, sets the solar study to that time.
 */
export function PowerChart({ generation, minutes, onSelect, size, label }: {
  generation: Generation
  minutes: number
  onSelect: (minutes: number) => void
  size: 'compact' | 'large'
  label: string
}) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [probe, setProbe] = useState<number | null>(null)
  const { day } = generation
  const large = size === 'large'
  const frame = large ? LARGE : COMPACT
  const plotWidth = frame.width - frame.left - frame.right, plotHeight = frame.height - frame.top - frame.bottom
  const ticks = niceTicks(Math.max(1, ...day.clear.acW) / 1000, 4)
  const top = large ? ticks[ticks.length - 1] : Math.max(1, ...day.clear.acW) / 1000
  const x = (value: number) => frame.left + value / 1440 * plotWidth
  const y = (kw: number) => frame.top + plotHeight - kw / top * plotHeight
  const line = (values: number[]) => values.map((watts, index) => `${x(day.clear.minutes[index]).toFixed(1)},${y(watts / 1000).toFixed(1)}`).join(' ')
  const baseline = frame.top + plotHeight
  const cumulative = cumulativeKwh(day.typical.acW, STEP)
  const indexAt = (value: number) => Math.min(day.typical.acW.length - 1, Math.max(0, Math.round(value / STEP)))
  const probeIndex = probe === null ? null : indexAt(probe)
  const readings = probeIndex === null ? null : {
    minutes: day.clear.minutes[probeIndex],
    typical: day.typical.acW[probeIndex] / 1000,
    clear: day.clear.acW[probeIndex] / 1000,
    overcast: day.overcast.acW[probeIndex] / 1000,
    sofar: cumulative[probeIndex],
  }
  const describe = readings && t('building.genChartReading', {
    time: clock(readings.minutes), typical: formatNumber(readings.typical, 1), clear: formatNumber(readings.clear, 1), sofar: formatNumber(readings.sofar, 1),
  })
  const fromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const svgX = (event.clientX - box.left) / box.width * frame.width
    return Math.min(1439, Math.max(0, (svgX - frame.left) / plotWidth * 1440))
  }
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = probe ?? minutes
    const jump = event.shiftKey ? 60 : STEP
    const moves: Record<string, number> = { ArrowLeft: current - jump, ArrowDown: current - jump, ArrowRight: current + jump, ArrowUp: current + jump, Home: 0, End: 1439 }
    if (event.key in moves) { event.preventDefault(); setProbe(Math.min(1439, Math.max(0, moves[event.key]))) }
    else if ((event.key === 'Enter' || event.key === ' ') && probe !== null) { event.preventDefault(); onSelect(Math.round(probe / STEP) * STEP) }
    else if (event.key === 'Escape') setProbe(null)
  }
  const tooltipX = readings ? x(readings.minutes) / frame.width : 0
  const nowX = x(minutes), nowY = y(generation.nowTypicalKw)
  return <div className={`solar-chart power-chart power-chart-${size}`}>
    <div className="power-chart-plot" tabIndex={0} role="slider" aria-label={label}
      aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={1439} aria-valuenow={Math.round(probe ?? minutes)}
      aria-valuetext={describe ?? clock(minutes)} aria-describedby={readings ? `power-tooltip-${size}` : undefined}
      onPointerMove={event => setProbe(fromPointer(event))} onPointerLeave={() => setProbe(null)}
      onPointerDown={event => setProbe(fromPointer(event))}
      onClick={event => onSelect(Math.round(fromPointer(event as unknown as PointerEvent<HTMLDivElement>) / STEP) * STEP)}
      onFocus={() => setProbe(current => current ?? minutes)} onBlur={() => setProbe(null)} onKeyDown={onKey}>
      <svg viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true">
        {large && ticks.map(tick => <g key={tick}>
          <line className="gen-grid" x1={frame.left} x2={frame.width - frame.right} y1={y(tick)} y2={y(tick)} />
          <text className="gen-axis-text" x={frame.left - 6} y={y(tick) + 3} textAnchor="end">{formatNumber(tick, tick < 10 && tick % 1 ? 1 : 0)}</text>
        </g>)}
        {large && [0, 3, 6, 9, 12, 15, 18, 21, 24].map(hour => <text key={hour} className="gen-axis-text" x={x(hour * 60)} y={frame.height - 6} textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}>{String(hour).padStart(2, '0')}</text>)}
        {large && <text className="gen-axis-text" x={frame.left - 6} y={8} textAnchor="end">kW</text>}
        {!large && <>
          <path className="gen-grid" d={`M0 ${baseline}H${frame.width}`} />
          <path className="gen-grid gen-grid-dashed" d={`M64 ${frame.top}V${baseline}M128 ${frame.top}V${baseline}M192 ${frame.top}V${baseline}`} />
        </>}
        <polygon className="gen-area" points={`${x(0)},${baseline} ${line(day.typical.acW)} ${x(1440)},${baseline}`} />
        {large && <polyline className="gen-line gen-line-overcast" points={line(day.overcast.acW)} />}
        <polyline className="gen-line gen-line-clear" points={line(day.clear.acW)} />
        <polyline className="gen-line gen-line-typical" points={line(day.typical.acW)} />
        <path className="gen-now-line" d={`M${nowX} ${nowY}V${baseline + 4}`} />
        <circle className="gen-now-dot" cx={nowX} cy={nowY} r={large ? 5 : 4} />
        {readings && <>
          <path className="gen-probe-line" d={`M${x(readings.minutes)} ${frame.top}V${baseline}`} />
          <circle className="gen-probe-dot" cx={x(readings.minutes)} cy={y(readings.typical)} r={large ? 4 : 3} />
        </>}
      </svg>
      {!large && <div className="power-chart-hours" aria-hidden="true"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>}
      {readings && <div id={`power-tooltip-${size}`} role="tooltip"
        className={`month-tooltip power-tooltip${tooltipX < .22 ? ' month-tooltip-start' : tooltipX > .78 ? ' month-tooltip-end' : ''}`}
        style={tooltipX < .22 || tooltipX > .78 ? undefined : { left: `${tooltipX * 100}%` }}>
        <strong>{clock(readings.minutes)}</strong>
        <span className="gen-key-typical">{t('building.genReadTypical', { kw: formatNumber(readings.typical, 2) })}</span>
        <span className="gen-key-clear">{t('building.genReadClear', { kw: formatNumber(readings.clear, 2) })}</span>
        <span className="gen-key-overcast">{t('building.genReadOvercast', { kw: formatNumber(readings.overcast, 2) })}</span>
        <span>{t('building.genReadSoFar', { kwh: formatNumber(readings.sofar, 1) })}</span>
      </div>}
    </div>
  </div>
}

/**
 * The months as bars over a labelled axis, with the year's mean as a dashed line. The bars are buttons: hovering reads the month, selecting moves the study to its 15th.
 */
export function YearChart({ year, metric, selectedMonth, onSelect, monthName, label }: {
  year: YearResult
  metric: YearMetric
  selectedMonth: number
  onSelect: (month: number) => void
  monthName: (month: number, style: 'long' | 'narrow' | 'short') => string
  label: string
}) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const values = year.months.map(month => monthValue(month, metric, KWP))
  const mean = metric === 'perMonth' ? year.annualKwh / 12 : year.annualKwh / 365 / (metric === 'perKwp' ? KWP : 1)
  const ticks = niceTicks(Math.max(...values), 4)
  const top = ticks[ticks.length - 1]
  const frame = { width: 640, height: 240, left: 40, right: 8, top: 12, bottom: 24 }
  const plotWidth = frame.width - frame.left - frame.right, plotHeight = frame.height - frame.top - frame.bottom
  const column = plotWidth / 12
  const y = (value: number) => frame.top + plotHeight - value / top * plotHeight
  const digits = metric === 'perMonth' ? 0 : 1
  const unit = t(METRIC_UNIT[metric])
  const describe = (month: MonthResult) => t('building.genYearReading', {
    month: monthName(month.month, 'long'), value: formatNumber(values[month.month], digits), unit,
  })
  return <div className="year-chart" role="group" aria-label={label}>
    <svg viewBox={`0 0 ${frame.width} ${frame.height}`} aria-hidden="true">
      {ticks.map(tick => <g key={tick}>
        <line className="gen-grid" x1={frame.left} x2={frame.width - frame.right} y1={y(tick)} y2={y(tick)} />
        <text className="gen-axis-text" x={frame.left - 6} y={y(tick) + 3} textAnchor="end">{formatNumber(tick, tick < 10 && tick % 1 ? 1 : 0)}</text>
      </g>)}
      {values.map((value, month) => <rect key={month} className={`gen-bar${month === selectedMonth ? ' gen-bar-selected' : ''}${month === active ? ' gen-bar-active' : ''}`}
        x={frame.left + column * month + column * .16} width={column * .68} y={y(value)} height={Math.max(1, frame.top + plotHeight - y(value))} rx="2" />)}
      <line className="gen-mean" x1={frame.left} x2={frame.width - frame.right} y1={y(mean)} y2={y(mean)} />
      {year.months.map(month => <text key={month.month} className={`gen-axis-text${month.month === selectedMonth ? ' gen-axis-selected' : ''}`}
        x={frame.left + column * (month.month + .5)} y={frame.height - 7} textAnchor="middle">{monthName(month.month, 'short')}</text>)}
    </svg>
    <div className="year-columns">
      {year.months.map(month => <div key={month.month} className="year-column" style={{ left: `${(frame.left + column * month.month) / frame.width * 100}%`, width: `${column / frame.width * 100}%` }}>
        <button type="button" aria-label={describe(month)} aria-pressed={month.month === selectedMonth} aria-describedby={active === month.month ? 'year-tooltip' : undefined}
          onClick={() => onSelect(month.month)}
          onMouseEnter={() => setActive(month.month)} onMouseLeave={() => setActive(current => current === month.month ? null : current)}
          onFocus={() => setActive(month.month)} onBlur={() => setActive(current => current === month.month ? null : current)} />
        {active === month.month && <div id="year-tooltip" role="tooltip"
          className={`month-tooltip year-tooltip${month.month < 2 ? ' month-tooltip-start' : month.month > 9 ? ' month-tooltip-end' : ''}`}>
          <strong>{monthName(month.month, 'long')}</strong>
          <span>{t('building.genMonthEnergy', { energy: formatNumber(month.acKwh) })}</span>
          <span>{t('building.genMonthPerDay', { perDay: formatNumber(month.acKwhPerDay, 1) })}</span>
          <span>{t('building.genMonthPerKwp', { value: formatNumber(month.acKwhPerDay / KWP, 2) })}</span>
          <span>{t('building.genMonthClear', { percent: formatNumber(month.clearFraction * 100) })}</span>
          <span>{t('building.genMonthShading', { percent: formatNumber(month.shadingLossPercent, 1) })}</span>
        </div>}
      </div>)}
    </div>
  </div>
}
