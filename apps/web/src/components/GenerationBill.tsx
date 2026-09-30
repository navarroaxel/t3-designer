import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { billingInput, computeBills, PROFILE_PRESETS } from '../lib/pv/billing'
import { niceTicks } from '../lib/pv/stats'
import type { YearResult } from '../lib/pv/model'
import { moneyFormatter } from '../lib/money'
import { useBilling } from '../lib/useBilling'
import { NumberField } from './NumberField'
import { ProfileChart } from './GenerationProfile'

const FRAME = { width: 640, height: 220, left: 54, right: 8, top: 12, bottom: 24 }

/**
 * The electricity bill month by month with and without the array, for a two-way meter: the house's consumption,
 * what the array makes, the share the grid pays for the export, and the bill that comes out.
 */
export function BillView({ year, month }: { year: YearResult; month: number }) {
  const { t } = useTranslation('workspace')
  const { locale, formatNumber, formatDate } = useLocale()
  const billing = useBilling()
  const { settings } = billing
  const [help, setHelp] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const [profileMonth, setProfileMonth] = useState(month)
  const money = useMemo(() => moneyFormatter(locale), [locale])
  const compact = useMemo(() => new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }), [locale])
  const { months, totals } = useMemo(() => computeBills(billingInput(year), settings), [year, settings])
  const monthName = (index: number, style: 'long' | 'short') => formatDate(new Date(Date.UTC(2026, index, 15, 12)), { month: style })
  const ticks = niceTicks(Math.max(1, ...months.map(month => Math.max(month.billWithout, month.billWith))), 4)
  const top = ticks[ticks.length - 1]
  const plotWidth = FRAME.width - FRAME.left - FRAME.right, plotHeight = FRAME.height - FRAME.top - FRAME.bottom
  const column = plotWidth / 12
  const y = (value: number) => FRAME.top + plotHeight - value / top * plotHeight
  const base = FRAME.top + plotHeight
  const savedPercent = totals.billWithout > 0 ? totals.saved / totals.billWithout * 100 : 0
  const meanConsumption = totals.consumption / 12

  return <>
    <div className="bill-inputs">
      <label><span>{t('building.billTariff')}</span>
        <NumberField label={t('building.billTariff')} value={settings.tariff} min={0} step={1} onCommit={value => billing.update({ tariff: value })} /></label>
      <div className="bill-field">
        <span className="bill-field-label">
          <label htmlFor="bill-credit">{t('building.billCredit')}</label>
          <button type="button" className="bill-help" aria-label={t('building.billCreditHelpLabel')} aria-describedby={help ? 'bill-credit-help' : undefined}
            onMouseEnter={() => setHelp(true)} onMouseLeave={() => setHelp(false)} onFocus={() => setHelp(true)} onBlur={() => setHelp(false)}
            onKeyDown={event => { if (event.key === 'Escape') setHelp(false) }}>?</button>
          {help && <div id="bill-credit-help" role="tooltip" className="month-tooltip bill-tooltip">{t('building.billCreditHelp', { credit: formatNumber(settings.creditShare * 100) })}</div>}
        </span>
        <span className="bill-unit-row">
          <NumberField id="bill-credit" label={t('building.billCredit')} value={settings.creditShare} scale={.01} min={0} max={100} onCommit={value => billing.update({ creditShare: value })} />
          <span aria-hidden="true">%</span>
        </span>
      </div>
      <label><span>{t('building.billFixed')}</span>
        <NumberField label={t('building.billFixed')} value={settings.fixedCharge} min={0} step={100} onCommit={value => billing.update({ fixedCharge: value })} /></label>
      <label><span>{t('building.billAllMonths')}</span>
        <NumberField label={t('building.billAllMonths')} value={Math.round(meanConsumption)} min={0} step={10} onCommit={billing.setAllMonths} /></label>
    </div>
    <p className="array-note">{t('building.billInputsNote')}
      {!billing.isDefault && <> <button type="button" className="gen-factor-reset" onClick={billing.reset}>{t('building.billReset')}</button></>}</p>

    <fieldset className="bill-profile">
      <legend>{t('building.billProfile')}</legend>
      <div className="gen-metrics" role="group" aria-label={t('building.billProfile')}>
        {([['homeByDay', 'building.billProfileHomeByDay'], ['even', 'building.billProfileEven'], ['awayByDay', 'building.billProfileAwayByDay']] as const).map(([preset, key]) =>
          <button key={preset} type="button" aria-pressed={Math.abs(settings.daytimeShare - PROFILE_PRESETS[preset]) < 1e-9} onClick={() => billing.update({ daytimeShare: PROFILE_PRESETS[preset] })}>{t(key)}</button>)}
      </div>
      <div className="bill-inputs bill-profile-inputs">
        <label><span>{t('building.billProfileDayShare')}</span>
          <NumberField label={t('building.billProfileDayShare')} value={settings.daytimeShare} scale={.01} min={0} max={100} onCommit={value => billing.update({ daytimeShare: value })} /></label>
        <label><span>{t('building.billProfileFrom')}</span>
          <NumberField label={t('building.billProfileFrom')} value={settings.dayStart} min={0} max={22} onCommit={value => billing.update({ dayStart: value })} /></label>
        <label><span>{t('building.billProfileTo')}</span>
          <NumberField label={t('building.billProfileTo')} value={settings.dayEnd} min={1} max={23} onCommit={value => billing.update({ dayEnd: value })} /></label>
        <label><span>{t('building.billProfileMonth')}</span>
          <select value={profileMonth} aria-label={t('building.billProfileMonth')} onChange={event => setProfileMonth(Number(event.target.value))}>
            {year.months.map(item => <option key={item.month} value={item.month}>{monthName(item.month, 'long')}</option>)}
          </select></label>
      </div>
      <ProfileChart year={year} settings={settings} month={profileMonth} />
      <p className="array-note">{t('building.billProfileHint')}</p>
    </fieldset>

    <div className="gen-stats">
      <div className="gen-stat"><span>{t('building.billWithout')}</span><strong>{money.format(totals.billWithout)}</strong><em>{t('building.billPerYear')}</em></div>
      <div className="gen-stat"><span>{t('building.billWith')}</span><strong>{money.format(totals.billWith)}</strong><em>{t('building.billPerYear')}</em></div>
      <div className="gen-stat"><span>{t('building.billSaved')}</span><strong>{money.format(totals.saved)}</strong><em>{t('building.billSavedNote', { percent: formatNumber(savedPercent) })}</em></div>
      <div className="gen-stat"><span>{t('building.billCoverage')}</span><strong>{formatNumber(totals.coverage)}<small>%</small></strong><em>{t('building.billCoverageNote', { generation: formatNumber(totals.generation), consumption: formatNumber(totals.consumption) })}</em></div>
      <div className="gen-stat"><span>{t('building.billStatSelf')}</span><strong>{formatNumber(totals.selfPercent)}<small>%</small></strong><em>{t('building.billStatSelfNote')}</em></div>
      <div className="gen-stat"><span>{t('building.billExported')}</span><strong>{formatNumber(totals.exported)}<small>kWh</small></strong><em>{t('building.billExportedNote', { imported: formatNumber(totals.imported) })}</em></div>
      {totals.creditLeft > 0 && <div className="gen-stat"><span>{t('building.billCreditLeft')}</span><strong>{money.format(totals.creditLeft)}</strong><em>{t('building.billCreditLeftNote')}</em></div>}
    </div>

    <div className="year-chart bill-chart" role="group" aria-label={t('building.billChartAria')}>
      <svg viewBox={`0 0 ${FRAME.width} ${FRAME.height}`} aria-hidden="true">
        {ticks.map(tick => <g key={tick}>
          <line className="gen-grid" x1={FRAME.left} x2={FRAME.width - FRAME.right} y1={y(tick)} y2={y(tick)} />
          <text className="gen-axis-text" x={FRAME.left - 6} y={y(tick) + 3} textAnchor="end">{compact.format(tick)}</text>
        </g>)}
        {months.map(month => {
          const x = FRAME.left + column * month.month
          return <g key={month.month}>
            <rect className="bill-bar-without" x={x + column * .1} width={column * .38} y={y(month.billWithout)} height={Math.max(1, base - y(month.billWithout))} rx="2" />
            <rect className="bill-bar-with" x={x + column * .52} width={column * .38} y={y(month.billWith)} height={Math.max(1, base - y(month.billWith))} rx="2" />
            <text className="gen-axis-text" x={x + column / 2} y={FRAME.height - 7} textAnchor="middle">{monthName(month.month, 'short')}</text>
          </g>
        })}
      </svg>
      <div className="year-columns">
        {months.map(month => <div key={month.month} className="year-column" style={{ left: `${(FRAME.left + column * month.month) / FRAME.width * 100}%`, width: `${column / FRAME.width * 100}%` }}>
          <button type="button" aria-describedby={active === month.month ? 'bill-tooltip' : undefined}
            aria-label={t('building.billBarAria', { month: monthName(month.month, 'long'), without: money.format(month.billWithout), with: money.format(month.billWith) })}
            onMouseEnter={() => setActive(month.month)} onMouseLeave={() => setActive(current => current === month.month ? null : current)}
            onFocus={() => setActive(month.month)} onBlur={() => setActive(current => current === month.month ? null : current)} />
          {active === month.month && <div id="bill-tooltip" role="tooltip" className={`month-tooltip year-tooltip${month.month < 2 ? ' month-tooltip-start' : month.month > 9 ? ' month-tooltip-end' : ''}`}>
            <strong>{monthName(month.month, 'long')}</strong>
            <span className="gen-key-without">{t('building.billTipWithout', { value: money.format(month.billWithout) })}</span>
            <span className="gen-key-with">{t('building.billTipWith', { value: money.format(month.billWith) })}</span>
            <span>{t('building.billTipSaved', { value: money.format(month.saved) })}</span>
            <span>{t('building.billTipSelf', { kwh: formatNumber(month.selfUsed), percent: formatNumber(month.selfPercent) })}</span>
            <span>{t('building.billTipEnergy', { generation: formatNumber(month.generation), consumption: formatNumber(month.consumption) })}</span>
            <span>{t('building.billTipGrid', { exported: formatNumber(month.exported), imported: formatNumber(month.imported) })}</span>
            {month.creditLeft > 0 && <span>{t('building.billTipCredit', { value: money.format(month.creditLeft) })}</span>}
          </div>}
        </div>)}
      </div>
    </div>
    <ul className="gen-legend" aria-hidden="true">
      <li className="gen-key-without">{t('building.billWithout')}</li>
      <li className="gen-key-with">{t('building.billWith')}</li>
    </ul>

    <div className="bill-table-wrap">
      <table className="gen-table bill-table">
        <caption className="sr-only">{t('building.billTableCaption')}</caption>
        <thead><tr>
          <th scope="col">{t('building.genColMonth')}</th><th scope="col">{t('building.billColGeneration')}</th><th scope="col">{t('building.billColConsumption')}</th>
          <th scope="col">{t('building.billColExported')}</th><th scope="col">{t('building.billColImported')}</th>
          <th scope="col">{t('building.billColWithout')}</th><th scope="col">{t('building.billColWith')}</th><th scope="col">{t('building.billColSaved')}</th>
        </tr></thead>
        <tbody>
          {months.map(month => <tr key={month.month}>
            <th scope="row">{monthName(month.month, 'long')}</th>
            <td>{formatNumber(month.generation)}</td>
            <td><NumberField className="bill-month-input" label={t('building.billMonthAria', { month: monthName(month.month, 'long') })} value={month.consumption} min={0} step={10} onCommit={value => billing.setMonth(month.month, value)} /></td>
            <td>{formatNumber(month.exported)}</td><td>{formatNumber(month.imported)}</td>
            <td>{money.format(month.billWithout)}</td><td>{money.format(month.billWith)}</td><td className="bill-saved">{money.format(month.saved)}</td>
          </tr>)}
        </tbody>
        <tfoot><tr>
          <th scope="row">{t('building.billTotal')}</th><td>{formatNumber(totals.generation)}</td><td>{formatNumber(totals.consumption)}</td>
          <td>{formatNumber(totals.exported)}</td><td>{formatNumber(totals.imported)}</td>
          <td>{money.format(totals.billWithout)}</td><td>{money.format(totals.billWith)}</td><td className="bill-saved">{money.format(totals.saved)}</td>
        </tr></tfoot>
      </table>
    </div>
    <p className="array-note">{t('building.billMethod')}</p>
  </>
}
