import { BUILDING_SITE } from '../data/building-site'
import { getLocalMinutes, type SolarPathPoint } from '../lib/solar'
import type { SolarStudy } from '../lib/useSolarStudy'
import '../building.css'

const { timeZone } = BUILDING_SITE
const clockFormatter = new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { timeZone, day: 'numeric', month: 'long' })
const seasons = [
  { name: 'Primavera', date: '03-20', label: '20 mar' },
  { name: 'Verano', date: '06-21', label: '21 jun' },
  { name: 'Otoño', date: '09-22', label: '22 sep' },
  { name: 'Invierno', date: '12-21', label: '21 dic' },
]
function SunGlyph({ night = false }: { night?: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {night ? <path d="M19.5 15.4A8 8 0 0 1 8.6 4.5 8 8 0 1 0 19.5 15.4Z" stroke="currentColor" strokeWidth="1.5" /> : <>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4m0-14.2-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>}
  </svg>
}

function SolarChart({ path, minutes, altitude }: { path: SolarPathPoint[]; minutes: number; altitude: number }) {
  const points = path.map(point => `${(point.minutes / 1440) * 256},${64 - Math.max(0, point.altitude) / 90 * 58}`)
  const currentX = minutes / 1440 * 256
  const currentY = 64 - Math.max(0, altitude) / 90 * 58
  return <div className="solar-chart">
    <svg viewBox="0 0 256 76" role="img" aria-label="Altura del sol a lo largo del día; la marca señala la hora elegida">
      <path d="M0 64H256" stroke="#dfe4d8" strokeWidth="1" />
      <path d="M64 12V67M128 12V67M192 12V67" stroke="#e7ebdf" strokeWidth="1" strokeDasharray="2 4" />
      <polygon points={`0,64 ${points.join(' ')} 256,64`} fill="#f1e4c9" fillOpacity="0.65" />
      <polyline points={points.join(' ')} fill="none" stroke="#ad8748" strokeWidth="1.6" />
      <path d={`M${currentX} ${currentY}V68`} stroke="#81906f" strokeWidth="1" strokeDasharray="2 3" />
      <circle cx={currentX} cy={currentY} r="4" fill={altitude > 0 ? '#c19850' : '#81906f'} stroke="#fffefa" strokeWidth="2" />
    </svg>
    <div aria-hidden="true"><span>00 h</span><span>06 h</span><span>12 h</span><span>18 h</span><span>24 h</span></div>
  </div>
}

export function SolarMomentTag({ solar, className = '' }: { solar: SolarStudy; className?: string }) {
  return <div className={`building-moment-tag ${className}`}><SunGlyph night={!solar.sun.isDaylight} /><span>{dateFormatter.format(solar.instant)}<b>{solar.time} <small>{solar.zone}</small></b></span></div>
}

export function SolarControls({ solar }: { solar: SolarStudy }) {
  const { moment, sun, day, time, zone, playing, setPlaying, changeDate, changeTime, resolution, bearing, daylightHours, daylightRemainder } = solar
  return <div className="solar-controls">
        <div className={`sun-status ${sun.isDaylight ? '' : 'sun-status-night'}`}>
          <span className="sun-status-icon"><SunGlyph night={!sun.isDaylight} /></span>
          <div><strong>{sun.isDaylight ? 'Sol sobre el horizonte' : 'Sol bajo el horizonte'}</strong><span>{sun.isDaylight ? 'Luz directa y sombras' : 'Sin iluminación solar directa'}</span></div>
        </div>

        <div className="solar-date-control">
          <label htmlFor="solar-date">Día del año</label>
          <input id="solar-date" type="date" min="1900-01-01" max="2100-12-31" value={moment.date} onChange={event => { if (event.target.validity.valid) changeDate(event.target.value) }} />
        </div>

        <div className="season-presets" role="group" aria-label="Comparar estaciones">
          {seasons.map(season => <button key={season.name} aria-pressed={moment.date.slice(5) === season.date} onClick={() => changeDate(`${moment.date.slice(0, 4)}-${season.date}`)}>{season.name}<small>{season.label}</small></button>)}
        </div>

        <div className="solar-time-heading"><label htmlFor="solar-time">Hora en Quimper</label><span>{zone} · Europe/Paris</span></div>
        <div className="solar-clock-row"><input id="solar-time" aria-label="Hora local de Quimper" type="time" value={time} onChange={event => { if (event.target.value) { const [hours, minutes] = event.target.value.split(':').map(Number); changeTime(hours * 60 + minutes) } }} /><button className={`day-play ${playing ? 'playing' : ''}`} aria-label={playing ? 'Pausar recorrido del día' : 'Reproducir recorrido del día'} aria-pressed={playing} onClick={() => setPlaying(previous => !previous)}>
          <svg viewBox="0 0 16 16" aria-hidden="true">{playing ? <path d="M4 3h3v10H4zM9 3h3v10H9z" /> : <path d="m5 2 9 6-9 6z" />}</svg>
        </button></div>
        <label className="sr-only" htmlFor="solar-time-slider">Mover la hora del día</label>
        <input className="solar-time-slider" id="solar-time-slider" type="range" min={0} max={1439} step={1} value={moment.minutes} aria-valuetext={`${time}, hora local de Quimper`} onChange={event => changeTime(Number(event.target.value))} />
        <div className="time-scale" aria-hidden="true"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span></div>
        <div className="playback-caption">{playing ? 'Recorriendo el día' : 'Reproducir un día completo'}<span>24 h en 24 s</span></div>
        {moment.adjusted && <p className="solar-time-note" role="status">Esta hora no existe por el cambio de horario. Ajustamos a las {time}.</p>}
        {resolution.status === 'ambiguous' && <p className="solar-time-note">Esta hora ocurre dos veces. Se muestra la primera, antes del cambio de horario.</p>}

        <div className="sun-readings"><div><span>Altura solar</span><strong>{sun.altitude.toFixed(1)}<small>°</small></strong><p>Sobre el horizonte</p></div><div><span>Azimut</span><strong>{sun.azimuth.toFixed(0)}<small>° {bearing}</small></strong><p>Desde el norte real</p></div></div>

        <section className="day-summary" aria-label="Recorrido solar del día"><div className="day-summary-heading"><h3>El recorrido del día</h3><span>{daylightHours} h {daylightRemainder} min de luz</span></div><SolarChart path={day.path} minutes={moment.minutes} altitude={sun.altitude} /><div className="sunrise-sunset"><div><span>↑ Salida</span><strong>{day.sunrise ? clockFormatter.format(day.sunrise) : '—'}</strong></div><button onClick={() => changeTime(getLocalMinutes(day.solarNoon, timeZone))} title="Ir al mediodía solar"><span>Mediodía solar</span><strong>{clockFormatter.format(day.solarNoon)}</strong></button><div><span>↓ Puesta</span><strong>{day.sunset ? clockFormatter.format(day.sunset) : '—'}</strong></div></div></section>

  </div>
}
