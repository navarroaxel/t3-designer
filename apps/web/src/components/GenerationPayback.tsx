import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { DEGRADATION_PER_YEAR, PAYBACK_YEARS, type BillingSettings, type Payback } from '../lib/pv/billing'
import { moneyFormatter } from '../lib/money'
import { niceTicks } from '../lib/pv/stats'
import { NumberField } from './NumberField'

const FRAME = { width: 640, height: 210, left: 60, right: 10, top: 12, bottom: 24 }

/**
 * What the installation costs and when it pays for itself: the cost, what each panel left out saves, how the price of energy
 * moves, the years to recover the money, the yearly return, and the accumulated result year by year.
 */
export function PaybackView({ payback, cost, settings, update }: {
  payback: Payback
  cost: number
  settings: BillingSettings
  update: (patch: Partial<Pick<BillingSettings, 'installCost' | 'costPerPanelLeftOut' | 'priceChange'>>) => void
}) {
  const { t } = useTranslation('workspace')
  const { locale, formatNumber } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const money = useMemo(() => moneyFormatter(locale), [locale])
  const compact = useMemo(() => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }), [locale])
  const { accumulated, returns, years } = payback
  const low = Math.min(...accumulated), high = Math.max(...accumulated, 0)
  const span = niceTicks(high - low, 4)
  const step = span.length > 1 ? span[1] - span[0] : Math.max(1, high - low)
  const bottom = Math.floor(low / step) * step, top = Math.ceil(high / step) * step || step
  const ticks = Array.from({ length: Math.round((top - bottom) / step) + 1 }, (_, index) => bottom + index * step)
  const plotWidth = FRAME.width - FRAME.left - FRAME.right, plotHeight = FRAME.height - FRAME.top - FRAME.bottom
  const x = (year: number) => FRAME.left + year / PAYBACK_YEARS * plotWidth
  const y = (value: number) => FRAME.top + (top - value) / (top - bottom) * plotHeight
  const points = accumulated.map((value, year) => `${x(year).toFixed(1)},${y(value).toFixed(1)}`).join(' ')
  const total = accumulated[PAYBACK_YEARS]
  const column = plotWidth / PAYBACK_YEARS
  const totalYears = formatNumber(PAYBACK_YEARS)
  return <fieldset className="bill-profile bill-payback">
    <legend>{t('building.paybackTitle')}</legend>
    <div className="bill-inputs bill-profile-inputs">
      <label><span>{t('building.paybackCost')}</span>
        <NumberField label={t('building.paybackCost')} value={settings.installCost} min={0} step={100_000} onCommit={value => update({ installCost: value })} /></label>
      <label><span>{t('building.paybackPerPanel')}</span>
        <NumberField label={t('building.paybackPerPanel')} value={settings.costPerPanelLeftOut} min={0} step={50_000} onCommit={value => update({ costPerPanelLeftOut: value })} /></label>
      <label><span>{t('building.paybackPriceChange')}</span>
        <NumberField label={t('building.paybackPriceChange')} value={settings.priceChange} scale={.01} min={-50} max={500} onCommit={value => update({ priceChange: value })} /></label>
    </div>
    <div className="gen-stats">
      <div className={`gen-stat ${years === null ? 'gen-stat-cost' : 'gen-stat-key'}`}>
        <span>{t('building.paybackYears')}</span>
        <strong>{years === null ? t('building.paybackNever', { max: totalYears }) : <>{formatNumber(years, 1)}<small>{t('building.paybackUnit')}</small></>}</strong>
        <em>{t('building.paybackYearsNote', { cost: money.format(cost) })}</em></div>
      <div className="gen-stat"><span>{t('building.paybackReturn')}</span><strong>{formatNumber(payback.returnPercent, 1)}<small>%</small></strong>
        <em>{t('building.paybackReturnNote', { amount: money.format(returns[0]) })}</em></div>
      <div className={`gen-stat ${total < 0 ? 'gen-stat-cost' : ''}`}><span>{t('building.paybackTotal', { years: totalYears })}</span><strong>{money.format(total)}</strong>
        <em>{t('building.paybackTotalNote')}</em></div>
    </div>
    <div className="year-chart payback-chart" role="group" aria-label={t('building.paybackChartAria')}>
      <svg viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} aria-hidden="true">
        {ticks.map(tick => <g key={tick}>
          <line className={tick === 0 ? 'payback-zero' : 'gen-grid'} x1={FRAME.left} x2={FRAME.width - FRAME.right} y1={y(tick)} y2={y(tick)} />
          <text className="gen-axis-text" x={FRAME.left - 6} y={y(tick) + 3} textAnchor="end">{compact.format(tick)}</text>
        </g>)}
        {[0, 5, 10, 15, 20, 25].map(year => <text key={year} className="gen-axis-text" x={x(year)} y={FRAME.height - 7} textAnchor="middle">{year}</text>)}
        <polyline className="payback-line" points={points} />
        {years !== null && <circle className="gen-now-dot" cx={x(years)} cy={y(0)} r="5" />}
        {active !== null && <circle className="gen-probe-dot" cx={x(active)} cy={y(accumulated[active])} r="4" />}
      </svg>
      <div className="year-columns">
        {Array.from({ length: PAYBACK_YEARS }, (_, index) => index + 1).map(year => <div key={year} className="year-column" style={{ left: `${(FRAME.left + column * (year - 1)) / FRAME.width * 100}%`, width: `${column / FRAME.width * 100}%` }}>
          <button type="button" aria-describedby={active === year ? 'payback-tooltip' : undefined}
            aria-label={t('building.paybackYearAria', { year, total: money.format(accumulated[year]) })}
            onMouseEnter={() => setActive(year)} onMouseLeave={() => setActive(current => current === year ? null : current)}
            onFocus={() => setActive(year)} onBlur={() => setActive(current => current === year ? null : current)} />
          {active === year && <div id="payback-tooltip" role="tooltip" className={`month-tooltip year-tooltip${year <= 6 ? ' month-tooltip-start' : year > 19 ? ' month-tooltip-end' : ''}`}>
            <strong>{t('building.paybackTipYear', { year })}</strong>
            <span>{t('building.paybackTipReturn', { value: money.format(returns[year - 1]) })}</span>
            <span>{t('building.paybackTipTotal', { value: money.format(accumulated[year]) })}</span>
          </div>}
        </div>)}
      </div>
    </div>
    <p className="array-note">{t('building.paybackHint', { degradation: formatNumber(DEGRADATION_PER_YEAR * 100, 1) })}</p>
  </fieldset>
}
