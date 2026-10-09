import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import type { MonthResult } from '../lib/pv/model'
import type { Generation } from '../lib/useGeneration'
import { PowerChart } from './GenerationCharts'
import { DEFAULT_FACTOR, FACTOR_RANGE } from '../lib/pv/factor'
import type { PvFactor } from '../lib/usePvFactor'
import type { SolarStudy } from '../lib/useSolarStudy'

/** Energy of a typical day in each month; hovering or focusing a bar shows the month's estimate. */
function MonthBars({ generation, label, onSelect }: { generation: Generation; label: string; onSelect: (month: number) => void }) {
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
        onClick={() => onSelect(month.month)}
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

/** The efficiency factor: a slider and a number box, both in percent, with a way back to the calibrated value. */
export function FactorControl({ factor }: { factor: PvFactor }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const [draft, setDraft] = useState<string | null>(null)
  const percent = Math.round(factor.factor * 100)
  const commit = () => {
    if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) factor.update(Number(draft) / 100)
    setDraft(null)
  }
  return <div className="gen-factor">
    <label htmlFor="gen-factor-number">{t('building.genFactor')}</label>
    <div className="gen-factor-inputs">
      <input type="range" aria-label={t('building.genFactor')} min={FACTOR_RANGE.min * 100} max={FACTOR_RANGE.max * 100} step="1" value={percent}
        onChange={event => { setDraft(null); factor.update(Number(event.target.value) / 100) }} />
      <input id="gen-factor-number" type="number" inputMode="numeric" min={FACTOR_RANGE.min * 100} max={FACTOR_RANGE.max * 100} step="1" value={draft ?? String(percent)}
        onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') commit() }} />
      <span aria-hidden="true">%</span>
    </div>
    <p className="array-note">{factor.isDefault
      ? t('building.genFactorDefault', { percent: formatNumber(DEFAULT_FACTOR * 100) })
      : t('building.genFactorEdited', { percent: formatNumber(DEFAULT_FACTOR * 100) })}
    {!factor.isDefault && <> <button type="button" className="gen-factor-reset" onClick={factor.reset}>{t('building.genFactorReset')}</button></>}</p>
  </div>
}

export function GenerationPanel({ solar, generation, factor, onExpand }: { solar: SolarStudy; generation: Generation; factor: PvFactor; onExpand: () => void }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const { day, year } = generation
  const kwh = (value: number) => formatNumber(value, value < 10 ? 1 : 0)
  return <section className="generation" aria-label={t('building.genTitle')}>
    <div className="generation-head">
      <span className="eyebrow">{t('building.genTitle')}</span>
      <button type="button" className="gen-expand" onClick={onExpand}>{t('building.genExpand')}</button>
    </div>
    <div className="generation-total"><strong>{kwh(day.typical.acKwh)}</strong><span>kWh</span><small>{t('building.genTypicalDay')}</small></div>
    <p className="array-note">{t('building.genRange', { clear: kwh(day.clear.acKwh), overcast: kwh(day.overcast.acKwh) })}</p>
    <PowerChart generation={generation} minutes={solar.moment.minutes} onSelect={solar.changeTime} size="compact" label={t('building.genChartAria')} />
    <p className="array-note">{t('building.genNow', { typical: formatNumber(generation.nowTypicalKw, 1), clear: formatNumber(generation.nowClearKw, 1) })}</p>
    <p className="array-note">{t('building.genShading', { percent: formatNumber(day.clearShadingLossPercent, 1) })}</p>
    <div className="generation-year">
      <span className="eyebrow">{t('building.genYear')}</span>
      {year
        ? <>
            <strong>{t('building.genYearEnergy', { energy: formatNumber(year.annualKwh), yield: formatNumber(year.specificYield) })}</strong>
            <MonthBars generation={generation} label={t('building.genMonthsAria')} onSelect={month => solar.changeDate(`${solar.moment.date.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-15`)} />
            <p className="array-note">{t('building.genYearShading', { percent: formatNumber(year.annualShadingLossPercent, 1) })}</p>
          </>
        : <p className="array-note">{t('building.genCalculating')}</p>}
    </div>
    <FactorControl factor={factor} />
    <p className="array-note generation-caveat">{t('building.genCaveat')}</p>
  </section>
}
