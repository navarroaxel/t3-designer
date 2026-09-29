import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import type { MonthResult } from '../lib/pv/model'
import type { Generation } from '../lib/useGeneration'
import type { SolarStudy } from '../lib/useSolarStudy'

const WIDTH = 256, HEIGHT = 64

/** Power through the day: the clear sky as a line, the typical day as an area, and the chosen time. */
function PowerChart({ generation, minutes, label }: { generation: Generation; minutes: number; label: string }) {
  const { day } = generation
  const top = Math.max(1, ...day.clear.acW) / 1000
  const x = (value: number) => value / 1440 * WIDTH
  const y = (kw: number) => HEIGHT - kw / top * (HEIGHT - 6)
  const line = (values: number[]) => values.map((watts, index) => `${x(day.clear.minutes[index])},${y(watts / 1000)}`).join(' ')
  const nowX = x(minutes), nowY = y(generation.nowTypicalKw)
  return <div className="solar-chart power-chart">
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT + 12}`} role="img" aria-label={label}>
      <path d={`M0 ${HEIGHT}H${WIDTH}`} stroke="#dfe4d8" strokeWidth="1" />
      <path d="M64 6V70M128 6V70M192 6V70" stroke="#e7ebdf" strokeWidth="1" strokeDasharray="2 4" />
      <polygon points={`0,${HEIGHT} ${line(day.typical.acW)} ${WIDTH},${HEIGHT}`} fill="#dbe7c8" fillOpacity=".8" />
      <polyline points={line(day.clear.acW)} fill="none" stroke="#ad8748" strokeWidth="1.4" strokeDasharray="3 2" />
      <polyline points={line(day.typical.acW)} fill="none" stroke="#5e7c4a" strokeWidth="1.6" />
      <path d={`M${nowX} ${nowY}V${HEIGHT + 4}`} stroke="#81906f" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx={nowX} cy={nowY} r="4" fill="#5e7c4a" stroke="#fffefa" strokeWidth="2" />
    </svg>
    <div aria-hidden="true"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
  </div>
}

/** Energy of a typical day in each month; hovering or focusing a bar shows the month's estimate. */
function MonthBars({ generation, label }: { generation: Generation; label: string }) {
  const { t } = useTranslation('workspace')
  const { formatDate, formatNumber } = useLocale()
  const [active, setActive] = useState<number | null>(null)
  const { year } = generation
  if (!year) return null
  const top = Math.max(...year.months.map(month => month.acKwhPerDay))
  const monthName = (month: number, style: 'long' | 'narrow') => formatDate(new Date(Date.UTC(2026, month, 15, 12)), { month: style })
  const describe = (month: MonthResult) => t('building.genMonthTooltip', {
    month: monthName(month.month, 'long'), energy: formatNumber(month.acKwh), perDay: formatNumber(month.acKwhPerDay, 1),
  })
  return <div className="month-bars" role="group" aria-label={label}>
    {year.months.map(month => <div key={month.month} className="month-bar">
      <button type="button" className="month-bar-button" aria-label={describe(month)} aria-describedby={active === month.month ? 'month-tooltip' : undefined}
        onMouseEnter={() => setActive(month.month)} onMouseLeave={() => setActive(current => current === month.month ? null : current)}
        onFocus={() => setActive(month.month)} onBlur={() => setActive(current => current === month.month ? null : current)}>
        <span style={{ height: `${Math.max(3, month.acKwhPerDay / top * 100)}%` }} />
      </button>
      <small aria-hidden="true">{monthName(month.month, 'narrow')}</small>
      {active === month.month && <div id="month-tooltip" role="tooltip" className={`month-tooltip${month.month < 2 ? ' month-tooltip-start' : month.month > 9 ? ' month-tooltip-end' : ''}`}>
        <strong>{monthName(month.month, 'long')}</strong>
        <span>{t('building.genMonthEnergy', { energy: formatNumber(month.acKwh) })}</span>
        <span>{t('building.genMonthPerDay', { perDay: formatNumber(month.acKwhPerDay, 1) })}</span>
      </div>}
    </div>)}
  </div>
}

export function GenerationPanel({ solar, generation }: { solar: SolarStudy; generation: Generation }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const { day, year } = generation
  const kwh = (value: number) => formatNumber(value, value < 10 ? 1 : 0)
  return <section className="generation" aria-label={t('building.genTitle')}>
    <span className="eyebrow">{t('building.genTitle')}</span>
    <div className="generation-total"><strong>{kwh(day.typical.acKwh)}</strong><span>kWh</span><small>{t('building.genTypicalDay')}</small></div>
    <p className="array-note">{t('building.genRange', { clear: kwh(day.clear.acKwh), overcast: kwh(day.overcast.acKwh) })}</p>
    <PowerChart generation={generation} minutes={solar.moment.minutes} label={t('building.genChartAria')} />
    <p className="array-note">{t('building.genNow', { typical: formatNumber(generation.nowTypicalKw, 1), clear: formatNumber(generation.nowClearKw, 1) })}</p>
    <p className="array-note">{t('building.genShading', { percent: formatNumber(day.clearShadingLossPercent, 1) })}</p>
    <div className="generation-year">
      <span className="eyebrow">{t('building.genYear')}</span>
      {year
        ? <>
            <strong>{t('building.genYearEnergy', { energy: formatNumber(year.annualKwh), yield: formatNumber(year.specificYield) })}</strong>
            <MonthBars generation={generation} label={t('building.genMonthsAria')} />
            <p className="array-note">{t('building.genYearShading', { percent: formatNumber(year.annualShadingLossPercent, 1) })}</p>
          </>
        : <p className="array-note">{t('building.genCalculating')}</p>}
    </div>
    <p className="array-note generation-caveat">{t('building.genCaveat')}</p>
  </section>
}
