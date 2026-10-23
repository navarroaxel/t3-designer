import { useTranslation } from 'react-i18next'
import { PV_SYSTEM } from '../data/pv-system'
import { useLocale } from '../i18n/useLocale'
import { stringsFor } from '../lib/pv/strings'
import type { DayResult } from '../lib/pv/model'
import { clock, dayStats } from '../lib/pv/stats'
import type { InstalledPanels } from '../lib/useInstalledPanels'

const { inverter } = PV_SYSTEM

function Stat({ label, value, unit, note, wide }: { label: string; value: string; unit?: string; note?: string; wide?: boolean }) {
  return <div className={wide ? 'gen-stat gen-stat-wide' : 'gen-stat'}><span>{label}</span><strong>{value}{unit && <small>{unit}</small>}</strong>{note && <em>{note}</em>}</div>
}

/**
 * The inverter: the owner's Deye and how the array loads it, on the day of the study. The datasheet's figures are in
 * `PV_SYSTEM.inverter`; the clear day's peak and the time spent at the rating come from the model.
 */
export function InverterView({ day, panels }: { day: DayResult; panels: InstalledPanels }) {
  const { t } = useTranslation('workspace')
  const { formatNumber } = useLocale()
  const stats = dayStats(day, day.kwp)
  const step = day.clear.minutes.length > 1 ? day.clear.minutes[1] - day.clear.minutes[0] : 0
  const atLimit = day.clear.acW.filter(watts => watts >= inverter.maxAcW - 1).length * step
  const strings = stringsFor(panels.installed).filter(ids => ids.length > 0)
  const kw = (watts: number) => formatNumber(watts / 1000, watts % 1000 === 0 ? 0 : 1)
  const range = (window: readonly [number, number]) => `${window[0]}–${window[1]}`
  const rows: [string, string][] = [
    [t('building.genInverterMaxPv'), `${kw(inverter.maxPvInputW)} kW`],
    [t('building.genInverterMaxAccess'), `${kw(inverter.maxPvAccessW)} kW`],
    [t('building.genInverterMppt'), `${range(inverter.mppt.voltageV)} V`],
    [t('building.genInverterMpptFull'), `${range(inverter.mppt.fullLoadVoltageV)} V`],
    [t('building.genInverterMaxVoltage'), `${inverter.mppt.maxInputV} V`],
    [t('building.genInverterStartUp'), `${inverter.mppt.startUpV} V`],
    [t('building.genInverterCurrent'), `${inverter.mppt.maxCurrentA} A`],
    [t('building.genInverterTrackers'), `${inverter.mppt.count} · ${inverter.mppt.stringsPerTracker}+${inverter.mppt.stringsPerTracker}`],
    [t('building.genInverterApparent'), `${kw(inverter.maxApparentVA)} kVA`],
  ]
  return <>
    <p className="array-note">{t('building.genInverterIntro')}</p>
    <div className="gen-stats">
      <Stat label={t('building.genInverterModel')} value={inverter.model} wide note={t('building.genInverterModelNote')} />
      <Stat label={t('building.genInverterRated')} value={kw(inverter.maxAcW)} unit="kW" note={t('building.genInverterRatedNote')} />
      <Stat label={t('building.genInverterEfficiency')} value={formatNumber(inverter.efficiency * 100, 1)} unit="%" note={t('building.genInverterEfficiencyNote', { max: formatNumber(inverter.maxEfficiency * 100, 1) })} />
      <Stat label={t('building.genInverterRatio')} value={formatNumber(day.kwp * 1000 / inverter.maxAcW, 2)} note={t('building.genInverterRatioNote', { kwp: formatNumber(day.kwp, 2), max: kw(inverter.maxPvInputW) })} />
      <Stat label={t('building.genInverterPeak')} value={formatNumber(stats.clearPeakKw, 1)} unit="kW" note={t('building.genInverterPeakNote', { percent: formatNumber(stats.inverterLoadPercent), time: clock(stats.clearPeakMinutes) })} />
      <Stat label={t('building.genInverterLimit')} value={formatNumber(atLimit / 60, 1)} unit="h" note={t('building.genInverterLimitNote')} />
      <Stat label={t('building.genInverterStrings')} value={strings.map(ids => ids.length).join(' + ')} note={t('building.genInverterStringsNote', { max: inverter.mppt.count })} />
    </div>
    <table className="gen-table gen-table-plain">
      <caption className="sr-only">{t('building.genInverterTable')}</caption>
      <thead><tr><th scope="col">{t('building.genInverterTable')}</th><th scope="col"></th></tr></thead>
      <tbody>{rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody>
    </table>
    <p className="array-note">{t('building.genInverterOpen')} <a href={inverter.datasheetUrl} target="_blank" rel="noreferrer">{t('building.genInverterManual')}</a></p>
  </>
}
