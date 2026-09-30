import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocale } from '../i18n/useLocale'
import { clock, cumulativeKwh, dayStats, METRIC_UNIT, monthValue, yearCsv, type YearMetric } from '../lib/pv/stats'
import type { Generation } from '../lib/useGeneration'
import type { InstalledPanels } from '../lib/useInstalledPanels'
import type { SolarStudy } from '../lib/useSolarStudy'
import { PowerChart, YearChart } from './GenerationCharts'
import { PanelsView } from './GenerationPanels'
import { BillView } from './GenerationBill'

const METRICS: YearMetric[] = ['perDay', 'perMonth', 'perKwp']
type Tab = 'today' | 'year' | 'panels' | 'bill'

function Stat({ label, value, unit, note }: { label: string; value: string; unit?: string; note?: string }) {
  return <div className="gen-stat"><span>{label}</span><strong>{value}{unit && <small>{unit}</small>}</strong>{note && <em>{note}</em>}</div>
}

/**
 * The wide view of the generation: the day's curve and figures, and the year's months. It floats over the
 * 3D scene, which stays visible and follows the same date and time, and closes with Escape.
 */
export function GenerationDetails({ solar, generation, panels, onClose }: { solar: SolarStudy; generation: Generation; panels: InstalledPanels; onClose: () => void }) {
  const { t } = useTranslation('workspace')
  const { formatNumber, formatDate } = useLocale()
  const [tab, setTab] = useState<Tab>('today')
  const [metric, setMetric] = useState<YearMetric>('perDay')
  const closeButton = useRef<HTMLButtonElement>(null)
  const { day, year } = generation
  const { moment } = solar
  const month = Number(moment.date.slice(5, 7)) - 1
  const stats = useMemo(() => dayStats(day, day.kwp), [day])
  const cumulative = useMemo(() => cumulativeKwh(day.typical.acW, 10), [day])
  const monthName = (index: number, style: 'long' | 'narrow' | 'short') => formatDate(new Date(Date.UTC(2026, index, 15, 12)), { month: style })
  const kwh = (value: number) => formatNumber(value, value < 10 ? 1 : 0)
  const range = (window: [number, number] | null) => window ? `${clock(window[0])} – ${clock(window[1])}` : '—'
  const soFar = cumulative[Math.min(cumulative.length - 1, Math.round(moment.minutes / 10))]

  useEffect(() => { closeButton.current?.focus() }, [])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function downloadCsv() {
    if (!year) return
    const names = Array.from({ length: 12 }, (_, index) => monthName(index, 'long'))
    const url = URL.createObjectURL(new Blob([yearCsv(year, year.kwp, names)], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'generation-by-month.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const best = year ? year.months.reduce((a, b) => b.acKwhPerDay > a.acKwhPerDay ? b : a) : null
  const worst = year ? year.months.reduce((a, b) => b.acKwhPerDay < a.acKwhPerDay ? b : a) : null

  return <section className="gen-details" role="dialog" aria-modal="false" aria-label={t('building.genDetailsTitle')}>
    <header>
      <div>
        <span className="eyebrow">{t('building.genTitle')}</span>
        <h2>{t('building.genDetailsTitle')}</h2>
      </div>
      <div className="gen-tabs" role="tablist" aria-label={t('building.genDetailsTitle')}>
        {(['today', 'year', 'panels', 'bill'] as const).map(option => <button key={option} role="tab" id={`gen-tab-${option}`} aria-selected={tab === option} aria-controls={`gen-panel-${option}`}
          onClick={() => setTab(option)}>{t(option === 'today' ? 'building.genTabToday' : option === 'year' ? 'building.genTabYear' : option === 'panels' ? 'building.genTabPanels' : 'building.genTabBill')}</button>)}
      </div>
      <button ref={closeButton} type="button" className="gen-close" aria-label={t('building.genClose')} title={t('building.genClose')} onClick={onClose}>×</button>
    </header>

    {tab === 'today' && <div role="tabpanel" id="gen-panel-today" aria-labelledby="gen-tab-today" className="gen-tab-body">
      <p className="gen-context">{t('building.genDetailsDay', { date: formatDate(new Date(`${moment.date}T12:00:00Z`), { dateStyle: 'full', timeZone: 'UTC' }), time: solar.time })}</p>
      <PowerChart generation={generation} minutes={moment.minutes} onSelect={solar.changeTime} size="large" label={t('building.genChartAria')} />
      <ul className="gen-legend" aria-hidden="true">
        <li className="gen-key-typical">{t('building.genLegendTypical')}</li>
        <li className="gen-key-clear">{t('building.genLegendClear')}</li>
        <li className="gen-key-overcast">{t('building.genLegendOvercast')}</li>
        <li className="gen-key-now">{t('building.genLegendNow')}</li>
      </ul>
      <p className="array-note">{t('building.genChartHint')}</p>
      <div className="gen-stats">
        <Stat label={t('building.genStatTypical')} value={kwh(day.typical.acKwh)} unit="kWh" note={t('building.genStatSoFar', { kwh: kwh(soFar), percent: formatNumber(day.typical.acKwh > 0 ? soFar / day.typical.acKwh * 100 : 0) })} />
        <Stat label={t('building.genStatClear')} value={kwh(day.clear.acKwh)} unit="kWh" note={t('building.genStatClearShare', { percent: formatNumber(day.clearFraction * 100) })} />
        <Stat label={t('building.genStatOvercast')} value={kwh(day.overcast.acKwh)} unit="kWh" />
        <Stat label={t('building.genStatPeak')} value={formatNumber(stats.clearPeakKw, 1)} unit="kW" note={t('building.genStatPeakAt', { time: clock(stats.clearPeakMinutes), load: formatNumber(stats.inverterLoadPercent) })} />
        <Stat label={t('building.genStatYield')} value={formatNumber(stats.specificYield, 1)} unit="kWh/kWp" note={t('building.genStatYieldNote', { kwp: formatNumber(day.kwp, 2) })} />
        <Stat label={t('building.genStatWindow')} value={range(stats.productionWindow)} note={t('building.genStatWindowNote')} />
        <Stat label={t('building.genStatShading')} value={formatNumber(day.clearShadingLossPercent, 1)} unit="%" note={stats.shadeWindow ? t('building.genStatShadeWindow', { window: range(stats.shadeWindow) }) : t('building.genStatNoShade')} />
        <Stat label={t('building.genStatIrradiation')} value={formatNumber(day.typical.poaKwhM2, 1)} unit="kWh/m²" note={t('building.genStatIrradiationNote', { ghi: formatNumber(day.typical.ghiKwhM2, 1) })} />
      </div>
    </div>}

    {tab === 'panels' && <div role="tabpanel" id="gen-panel-panels" aria-labelledby="gen-tab-panels" className="gen-tab-body">
      <p className="gen-context">{t('building.genDetailsDay', { date: formatDate(new Date(`${moment.date}T12:00:00Z`), { dateStyle: 'full', timeZone: 'UTC' }), time: solar.time })}</p>
      <PanelsView day={day} panels={panels} fullYear={generation.fullYear} year={year} />
    </div>}

    {tab === 'bill' && <div role="tabpanel" id="gen-panel-bill" aria-labelledby="gen-tab-bill" className="gen-tab-body">
      {year ? <BillView year={year} month={month} /> : <p className="array-note">{t('building.genCalculating')}</p>}
    </div>}

    {tab === 'year' && <div role="tabpanel" id="gen-panel-year" aria-labelledby="gen-tab-year" className="gen-tab-body">
      {!year ? <p className="array-note">{t('building.genCalculating')}</p> : <>
        <div className="gen-year-head">
          <div className="gen-metrics" role="group" aria-label={t('building.genMetric')}>
            {METRICS.map(option => <button key={option} aria-pressed={metric === option} onClick={() => setMetric(option)}>{t(METRIC_UNIT[option])}</button>)}
          </div>
          <button type="button" className="gen-download" onClick={downloadCsv}>{t('building.genDownload')}</button>
        </div>
        <YearChart year={year} metric={metric} selectedMonth={month} monthName={monthName} label={t('building.genMonthsAria')}
          onSelect={index => solar.changeDate(`${moment.date.slice(0, 4)}-${String(index + 1).padStart(2, '0')}-15`)} />
        <ul className="gen-legend" aria-hidden="true">
          <li className="gen-key-bar">{t('building.genLegendBars')}</li>
          <li className="gen-key-mean">{t('building.genLegendMean')}</li>
        </ul>
        <p className="array-note">{t('building.genYearHint')}</p>
        <div className="gen-stats">
          <Stat label={t('building.genStatAnnual')} value={formatNumber(year.annualKwh)} unit="kWh" note={t('building.genStatAnnualNote', { yield: formatNumber(year.specificYield) })} />
          <Stat label={t('building.genStatBest')} value={monthName(best!.month, 'long')} note={t('building.genStatMonthNote', { perDay: formatNumber(best!.acKwhPerDay, 1) })} />
          <Stat label={t('building.genStatWorst')} value={monthName(worst!.month, 'long')} note={t('building.genStatMonthNote', { perDay: formatNumber(worst!.acKwhPerDay, 1) })} />
          <Stat label={t('building.genStatYearShading')} value={formatNumber(year.annualShadingLossPercent, 1)} unit="%" note={t('building.genStatPeakYear', { kw: formatNumber(year.peakKw, 1) })} />
        </div>
        <table className="gen-table">
          <caption className="sr-only">{t('building.genTableCaption')}</caption>
          <thead><tr>
            <th scope="col">{t('building.genColMonth')}</th><th scope="col">kWh</th><th scope="col">{t('building.genUnitPerDay')}</th>
            <th scope="col">{t('building.genUnitPerKwp')}</th><th scope="col">{t('building.genColClear')}</th><th scope="col">{t('building.genColShade')}</th>
          </tr></thead>
          <tbody>
            {year.months.map(row => <tr key={row.month} aria-current={row.month === month ? 'true' : undefined}>
              <th scope="row">{monthName(row.month, 'long')}</th>
              <td>{formatNumber(row.acKwh)}</td><td>{formatNumber(row.acKwhPerDay, 1)}</td>
              <td>{formatNumber(monthValue(row, 'perKwp', year.kwp), 2)}</td><td>{formatNumber(row.clearFraction * 100)}%</td><td>{formatNumber(row.shadingLossPercent, 1)}%</td>
            </tr>)}
          </tbody>
        </table>
      </>}
    </div>}
  </section>
}
