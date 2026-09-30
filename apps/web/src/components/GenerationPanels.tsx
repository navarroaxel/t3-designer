import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PANELS, PANEL_SPEC } from '../data/solar-array'
import { useLocale } from '../i18n/useLocale'
import type { DayResult } from '../lib/pv/model'
import { panelStats, type PanelStat } from '../lib/pv/stats'

type Metric = 'energy' | 'shade'
const METRICS: Metric[] = ['energy', 'shade']
const ROW_KEY = { back: 'building.genRowBack', middle: 'building.genRowMiddle', front: 'building.genRowFront' } as const

// The plan seen from the street: the rear at the top and the north-east on the left, as the panels' own numbering runs.
const PADDING = 26
const SCALE = 52
const uMin = Math.min(...PANELS.map(panel => panel.u[0])), uMax = Math.max(...PANELS.map(panel => panel.u[1]))
const vMin = Math.min(...PANELS.map(panel => panel.v[0])), vMax = Math.max(...PANELS.map(panel => panel.v[1]))
const WIDTH = (vMax - vMin) * SCALE + PADDING * 2, HEIGHT = (uMax - uMin) * SCALE + PADDING * 2
const box = (panel: (typeof PANELS)[number]) => ({ x: PADDING + (vMax - panel.v[1]) * SCALE, y: PADDING + (uMax - panel.u[1]) * SCALE, width: (panel.v[1] - panel.v[0]) * SCALE, height: (panel.u[1] - panel.u[0]) * SCALE })

/**
 * The array seen from the street, every panel coloured by what it yields on the chosen day (or by what shade takes
 * from it on a clear day), with the two strings and a tooltip for each panel.
 */
export function PanelsView({ day }: { day: DayResult }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [metric, setMetric] = useState<Metric>('energy')
  const [active, setActive] = useState<string | null>(null)
  const { panels, strings } = useMemo(() => panelStats(day), [day])
  const byId = new Map(panels.map(panel => [panel.id, panel]))
  const kwhOf = (panel: PanelStat) => formatNumber(panel.kwh, 2)
  const top = Math.max(...panels.map(panel => panel.kwh))
  const worstShade = Math.max(5, ...panels.map(panel => panel.shadeLossPercent))
  const level = (panel: PanelStat) => metric === 'energy' ? .18 + .82 * (top > 0 ? panel.kwh / top : 0) : .12 + .88 * Math.min(1, panel.shadeLossPercent / worstShade)
  const name = (panel: PanelStat) => t('building.genPanelName', { row: t(ROW_KEY[panel.row]), index: panel.index })
  const weakest = panels.reduce((a, b) => b.kwh < a.kwh ? b : a)
  const shadiest = panels.reduce((a, b) => b.shadeLossPercent > a.shadeLossPercent ? b : a)
  const spread = weakest.kwh > 0 ? (Math.max(...panels.map(panel => panel.kwh)) / weakest.kwh - 1) * 100 : 0
  const tooltipFor = (panel: PanelStat) => <>
    <strong>{name(panel)}</strong>
    <span>{t('building.genPanelString', { string: panel.string + 1 })}</span>
    <span>{t('building.genPanelKwh', { kwh: kwhOf(panel) })}</span>
    <span>{t('building.genPanelIrradiation', { value: formatNumber(panel.irradiation, 2) })}</span>
    <span>{t('building.genPanelShade', { percent: formatNumber(panel.shadeLossPercent, 1) })}</span>
  </>
  return <>
    <div className="gen-year-head">
      <div className="gen-metrics" role="group" aria-label={t('building.genPanelMetric')}>
        {METRICS.map(option => <button key={option} aria-pressed={metric === option} onClick={() => setMetric(option)}>{t(option === 'energy' ? 'building.genPanelMetricEnergy' : 'building.genPanelMetricShade')}</button>)}
      </div>
    </div>
    <div className="panel-map" role="group" aria-label={t('building.genPanelsAria')}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        {PANELS.map(panel => {
          const stat = byId.get(panel.id)!, frame = box(panel)
          return <g key={panel.id}>
            <rect className={`panel-cell panel-cell-${metric}${stat.string ? ' panel-cell-second' : ''}${active === panel.id ? ' panel-cell-active' : ''}`} {...frame} rx="3" fillOpacity={level(stat)} />
            <text className={`panel-cell-text ${level(stat) > .55 ? 'on-solid' : 'on-faint'}`} x={frame.x + frame.width / 2} y={frame.y + frame.height / 2 - 2} textAnchor="middle">{metric === 'energy' ? kwhOf(stat) : `${formatNumber(stat.shadeLossPercent, 1)}%`}</text>
            <text className={`panel-cell-sub ${level(stat) > .55 ? 'on-solid' : 'on-faint'}`} x={frame.x + frame.width / 2} y={frame.y + frame.height / 2 + 11} textAnchor="middle">{metric === 'energy' ? 'kWh' : ''}{stat.string + 1 === 1 ? ' ①' : ' ②'}</text>
          </g>
        })}
        <text className="gen-axis-text" x={WIDTH / 2} y={12} textAnchor="middle">{t('building.genMapRear')}</text>
        <text className="gen-axis-text" x={WIDTH / 2} y={HEIGHT - 6} textAnchor="middle">{t('building.genMapStreet')}</text>
        <text className="gen-axis-text" x={6} y={HEIGHT / 2} textAnchor="start">{t('building.genMapNorthEast')}</text>
        <text className="gen-axis-text" x={WIDTH - 6} y={HEIGHT / 2} textAnchor="end">{t('building.genMapSouthWest')}</text>
      </svg>
      {PANELS.map(panel => {
        const stat = byId.get(panel.id)!, frame = box(panel)
        const style = { left: `${frame.x / WIDTH * 100}%`, top: `${frame.y / HEIGHT * 100}%`, width: `${frame.width / WIDTH * 100}%`, height: `${frame.height / HEIGHT * 100}%` }
        return <div key={panel.id} className="panel-hit" style={style}>
          <button type="button" aria-describedby={active === panel.id ? 'panel-tooltip' : undefined}
            aria-label={t('building.genPanelAria', { name: name(stat), string: stat.string + 1, kwh: kwhOf(stat), percent: formatNumber(stat.shadeLossPercent, 1) })}
            onMouseEnter={() => setActive(panel.id)} onMouseLeave={() => setActive(current => current === panel.id ? null : current)}
            onFocus={() => setActive(panel.id)} onBlur={() => setActive(current => current === panel.id ? null : current)} />
          {active === panel.id && <div id="panel-tooltip" role="tooltip" className="month-tooltip panel-tooltip">{tooltipFor(stat)}</div>}
        </div>
      })}
    </div>
    <p className="array-note">{t('building.genPanelsHint', { watts: formatNumber(PANEL_SPEC.watts) })}</p>
    <div className="gen-stats">
      {strings.map(item => <div key={item.index} className="gen-stat">
        <span>{t('building.genStringName', { string: item.index + 1 })}</span>
        <strong>{formatNumber(item.kwh, item.kwh < 10 ? 1 : 0)}<small>kWh</small></strong>
        <em>{t('building.genStringNote', { panels: item.panels, kwp: formatNumber(item.kwp, 2), yield: formatNumber(item.specificYield, 2) })}</em>
      </div>)}
      <div className="gen-stat"><span>{t('building.genStatSpread')}</span><strong>{formatNumber(spread, 1)}<small>%</small></strong><em>{t('building.genStatSpreadNote', { name: name(weakest), kwh: kwhOf(weakest) })}</em></div>
      <div className="gen-stat"><span>{t('building.genStatMostShaded')}</span><strong>{name(shadiest)}</strong><em>{t('building.genPanelShade', { percent: formatNumber(shadiest.shadeLossPercent, 1) })}</em></div>
    </div>
  </>
}
