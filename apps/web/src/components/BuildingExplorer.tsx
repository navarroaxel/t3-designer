import { useEffect, useMemo, useState } from 'react'
import { BuildingScene } from './BuildingScene'
import { BUILDING_SITE, SITE_BUILDINGS, SITE_PARCEL } from '../data/building-site'
import { getLocalDate, getLocalMinutes, getSolarDay, getSolarPosition, resolveLocalDateTime, type SolarPathPoint } from '../lib/solar'
import '../building.css'

const { latitude, longitude, timeZone } = BUILDING_SITE
const clockFormatter = new Intl.DateTimeFormat('es-ES', { timeZone, hour: '2-digit', minute: '2-digit' })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { timeZone, day: 'numeric', month: 'long' })
const zoneFormatter = new Intl.DateTimeFormat('es-ES', { timeZone, timeZoneName: 'short' })
const seasons = [
  { name: 'Primavera', date: '03-20', label: '20 mar' },
  { name: 'Verano', date: '06-21', label: '21 jun' },
  { name: 'Otoño', date: '09-22', label: '22 sep' },
  { name: 'Invierno', date: '12-21', label: '21 dic' },
]
const targetBuilding = SITE_BUILDINGS.find(building => building.isTarget)

type Moment = { date: string; minutes: number; adjusted: boolean }

function clockValue(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function validMoment(date: string, minutes: number): Moment {
  const requested = Math.min(1439, Math.max(0, Math.round(minutes)))
  let validMinutes = requested
  // Prefer the next valid minute after a clock jump. Some historical French
  // transitions removed the end of the day, so fall back within this same date.
  while (validMinutes < 1440 && resolveLocalDateTime(date, validMinutes, timeZone).status === 'nonexistent') validMinutes++
  if (validMinutes === 1440) {
    validMinutes = requested
    while (validMinutes > 0 && resolveLocalDateTime(date, validMinutes, timeZone).status === 'nonexistent') validMinutes--
  }
  return { date, minutes: validMinutes, adjusted: validMinutes !== requested }
}

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

export function BuildingExplorer() {
  const [moment, setMoment] = useState<Moment>(() => ({ date: getLocalDate(new Date(), timeZone), minutes: 14 * 60, adjusted: false }))
  const [playing, setPlaying] = useState(false)
  const [showNeighbors, setShowNeighbors] = useState(true)
  const [showSunPath, setShowSunPath] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [view, setView] = useState<{ mode: '3d' | 'top'; revision: number }>({ mode: '3d', revision: 0 })
  const resolution = useMemo(() => resolveLocalDateTime(moment.date, moment.minutes, timeZone), [moment.date, moment.minutes])
  const instant = resolution.instants[0]
  const sun = useMemo(() => getSolarPosition(instant, latitude, longitude), [instant])
  const day = useMemo(() => getSolarDay(moment.date, latitude, longitude, timeZone), [moment.date])
  const time = clockValue(moment.minutes)
  const zone = zoneFormatter.formatToParts(instant).find(part => part.type === 'timeZoneName')?.value
  const bearing = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(sun.azimuth / 45) % 8]
  const daylightMinutes = Math.round(day.daylightMinutes)
  const daylightHours = Math.floor(daylightMinutes / 60)
  const daylightRemainder = daylightMinutes % 60

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setMoment(previous => {
        const requested = (previous.minutes + 12) % 1440
        const next = validMoment(previous.date, requested)
        // A historical clock jump may remove the day's final hour. Loop from
        // its last valid instant rather than getting stuck on the fallback.
        return requested > previous.minutes && next.minutes <= previous.minutes
          ? validMoment(previous.date, 0)
          : next
      })
    }, 200)
    return () => window.clearInterval(timer)
  }, [playing])

  function changeDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
    setPlaying(false)
    setMoment(previous => validMoment(date, previous.minutes))
  }

  function changeTime(minutes: number) {
    setPlaying(false)
    setMoment(previous => validMoment(previous.date, minutes))
  }

  function resetView(mode: '3d' | 'top') {
    setView(previous => ({ mode, revision: previous.revision + 1 }))
  }

  return <>
    <div className="workspace building-workspace">
      <section className={`viewport building-viewport ${sun.isDaylight ? 'is-day' : 'is-night'}`} aria-label="Edificio y entorno en tres dimensiones">
        <BuildingScene instant={instant} sun={sun} showNeighbors={showNeighbors} showSunPath={showSunPath} showLabels={showLabels} view={view} />
        <div className="viewport-top building-viewport-top">
          <div className="building-location"><span className="eyebrow">El edificio y su entorno</span><strong>Jean-Baptiste Colbert</strong><small>Quimper · Bretaña, Francia</small></div>
          <div className="view-buttons" role="group" aria-label="Cámara del edificio">
            <button aria-pressed={view.mode === '3d'} onClick={() => resetView('3d')}>Perspectiva</button>
            <button aria-pressed={view.mode === 'top'} onClick={() => resetView('top')}>Planta</button>
            <button className="camera-reset" aria-label="Reiniciar vista" title="Reiniciar vista" onClick={() => resetView(view.mode)}>↺</button>
          </div>
        </div>
        <div className="building-moment-tag"><SunGlyph night={!sun.isDaylight} /><span>{dateFormatter.format(instant)}<b>{time} <small>{zone}</small></b></span></div>
        <div className="viewport-bottom building-viewport-bottom">
          <div className="scene-guide"><span><i className="target-key" /> Edificio seleccionado <i className="neighbor-key" /> Entorno</span><small>Arrastrar para orbitar · Rueda para acercar</small></div>
          <fieldset className="display-options building-layers">
            <legend className="sr-only">Capas del edificio</legend>
            <label><input type="checkbox" checked={showNeighbors} onChange={event => setShowNeighbors(event.target.checked)} /> Vecinos</label>
            <label><input type="checkbox" checked={showSunPath} onChange={event => setShowSunPath(event.target.checked)} /> Órbita solar</label>
            <label><input type="checkbox" checked={showLabels} onChange={event => setShowLabels(event.target.checked)} /> Rótulos</label>
          </fieldset>
        </div>
      </section>

      <aside className="inspector solar-inspector" aria-label="Simulador de luz solar">
        <div className="solar-heading"><span className="eyebrow">Estudio solar</span><h2>La luz, a lo largo<br /> del año.</h2><p>Mové el tiempo. Mirá cómo cambia<br />la luz sobre el edificio.</p></div>

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

        <details className="evidence-notes building-evidence"><summary>Fuentes y precisión</summary>
          <p><a href={BUILDING_SITE.rnbUrl} target="_blank" rel="noreferrer">Registro Nacional de Edificios ↗</a><br />Vincula los números 1, 1 bis y 1 ter al mismo edificio. Dirección oficial: {BUILDING_SITE.officialAddress}.</p>
          <p><a href="https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/diffusion/wfs/" target="_blank" rel="noreferrer">IGN · BD TOPO ↗</a><br />Huellas, alturas y calles. Altura del edificio: {targetBuilding?.height} m; {targetBuilding?.floors} niveles. Precisión declarada: {targetBuilding?.planarAccuracy} m en planta y {targetBuilding?.verticalAccuracy} m en altura.</p>
          <p><a href="https://apicarto.ign.fr/api/cadastre/parcelle?code_insee=29232&section=AL&numero=0538" target="_blank" rel="noreferrer">Catastro · parcela {SITE_PARCEL.label} ↗</a><br />{SITE_PARCEL.area.toLocaleString('es-ES')} m² de parcela. Capturas de Google Maps / Earth para interpretar fachadas.</p>
          <p>Volúmenes georreferenciados en un entorno de aproximadamente {BUILDING_SITE.radiusMeters} m. Terreno plano y tejados vecinos simplificados; ventanas, materiales y cubiertas aproximados. El departamento y sus ventanas todavía no están identificados.</p>
          <p><a href="https://gml.noaa.gov/grad/solcalc/calcdetails.html" target="_blank" rel="noreferrer">Cálculo solar · NOAA / Meeus ↗</a><br />Posición solar astronómica y sombras sobre este modelo. No incluye nubes ni vegetación, y no es un estudio de radiación. Los horarios de salida y puesta usan un horizonte ideal.</p>
          <p>Datos consultados: {BUILDING_SITE.retrievedAt}. {BUILDING_SITE.attribution}.</p>
        </details>
      </aside>
    </div>
    <footer className="app-footer building-footer"><span className="footer-label">Edificio + sol</span><p>Geometría IGN y catastro · Fachadas aproximadas · Departamento pendiente de identificar</p><a href={BUILDING_SITE.mapUrl} target="_blank" rel="noreferrer">Ver ubicación ↗</a></footer>
  </>
}
