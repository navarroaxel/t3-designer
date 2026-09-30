import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { DAYS_IN_MONTH } from '../data/climate'
import { loadCurve, type BillingSettings } from '../lib/pv/billing'
import type { YearResult } from '../lib/pv/model'
import { niceTicks } from '../lib/pv/stats'

const FRAME = { width: 640, height: 190, left: 38, right: 10, top: 12, bottom: 22 }

/**
 * One month's typical day: what the array makes, what the house consumes by the profile, and the part they share,
 * which is used as it is made and never reaches the meter.
 */
export function ProfileChart({ year, settings, month }: { year: YearResult; settings: BillingSettings; month: number }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const step = year.stepMinutes
  const generation = year.months[month].curveW
  const load = loadCurve(settings.consumption[month] / DAYS_IN_MONTH[month], settings, step)
  const shared = generation.map((watts, index) => Math.min(watts, load[index]))
  const ticks = niceTicks(Math.max(1, ...generation, ...load) / 1000, 4)
  const top = ticks[ticks.length - 1]
  const plotWidth = FRAME.width - FRAME.left - FRAME.right, plotHeight = FRAME.height - FRAME.top - FRAME.bottom
  const x = (index: number) => FRAME.left + index * step / 1440 * plotWidth
  const y = (watts: number) => FRAME.top + plotHeight - watts / 1000 / top * plotHeight
  const base = FRAME.top + plotHeight
  const points = (values: number[]) => values.map((watts, index) => `${x(index).toFixed(1)},${y(watts).toFixed(1)}`).join(' ')
  const area = (values: number[]) => `${x(0)},${base} ${points(values)} ${x(values.length)},${base}`
  const perDay = shared.reduce((sum, watts) => sum + watts, 0) * step / 60 / 1000
  const made = generation.reduce((sum, watts) => sum + watts, 0) * step / 60 / 1000
  const monthName = new Intl.DateTimeFormat(useLocale().locale, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, month, 15, 12)))
  return <div className="profile-chart">
    <svg viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} role="img"
      aria-label={t('building.billProfileChartAria', { month: monthName, percent: formatNumber(made > 0 ? perDay / made * 100 : 0) })}>
      {ticks.map(tick => <g key={tick}>
        <line className="gen-grid" x1={FRAME.left} x2={FRAME.width - FRAME.right} y1={y(tick * 1000)} y2={y(tick * 1000)} />
        <text className="gen-axis-text" x={FRAME.left - 6} y={y(tick * 1000) + 3} textAnchor="end">{formatNumber(tick, tick < 10 && tick % 1 ? 1 : 0)}</text>
      </g>)}
      {[0, 3, 6, 9, 12, 15, 18, 21, 24].map(hour => <text key={hour} className="gen-axis-text" x={FRAME.left + hour / 24 * plotWidth} y={FRAME.height - 6}
        textAnchor={hour === 0 ? 'start' : hour === 24 ? 'end' : 'middle'}>{String(hour).padStart(2, '0')}</text>)}
      <text className="gen-axis-text" x={FRAME.left - 6} y={8} textAnchor="end">kW</text>
      <polygon className="gen-area" points={area(generation)} />
      <polygon className="profile-shared" points={area(shared)} />
      <polyline className="gen-line gen-line-typical" points={points(generation)} />
      <polyline className="profile-load" points={points(load)} />
    </svg>
    <ul className="gen-legend" aria-hidden="true">
      <li className="gen-key-typical">{t('building.billLegendGeneration')}</li>
      <li className="gen-key-load">{t('building.billLegendLoad')}</li>
      <li className="gen-key-shared">{t('building.billLegendShared')}</li>
    </ul>
    <p className="array-note" aria-live="polite">{t('building.billProfileReading', { month: monthName, percent: formatNumber(made > 0 ? perDay / made * 100 : 0), kwh: formatNumber(perDay * DAYS_IN_MONTH[month]) })}</p>
  </div>
}
