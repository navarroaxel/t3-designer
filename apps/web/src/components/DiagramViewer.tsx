import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type View = { x: number; y: number; k: number }
type Labels = { open: string; close: string; zoomIn: string; zoomOut: string; reset: string; title: string; filter: string; all: string; mode: string; phases: string }
/** A switch of the filter: what it switches off is drawn faint in the full-screen layer. */
export type DiagramFilter = { id: string; label: string; hint: string }
/** A mode of the diagram, one at a time (or none): `render` gets the id of the one that is on. */
export type DiagramMode = { id: string; label: string }
export type DiagramState = { off: ReadonlySet<string>; mode: string | null; phasesOff: ReadonlySet<string> }
const NONE: ReadonlySet<string> = new Set()

/** The diagram's width on the full-screen canvas, in pixels at zoom 1; its height follows from the SVG's own proportions. */
const BASE_WIDTH = 1600
const MIN_ZOOM = .15
const MAX_ZOOM = 4

/**
 * A diagram that opens in a full-screen layer to be navigated: dragged with the pointer (or a finger), zoomed with the wheel around the cursor or with the buttons, and closed with Escape. The inline
 * copy stays as it is on the page; the layer draws a second copy of the diagram, which can be filtered: each switch of `filters` turns a part of it off, and `render` gets the set of the ones that are off.
 */
export function DiagramViewer({ render, filters = [], modes = [], phases = [], labels }: { render: (state: DiagramState) => ReactNode; filters?: readonly DiagramFilter[]; modes?: readonly DiagramMode[]; phases?: readonly string[]; labels: Labels }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className="elec-full-open" onClick={() => setOpen(true)}>⤢ {labels.open}</button>
    <div className="elec-scroll">{render({ off: NONE, mode: null, phasesOff: NONE })}</div>
    {open && createPortal(<Layer labels={labels} filters={filters} modes={modes} phases={phases} render={render} onClose={() => setOpen(false)} />, document.body)}
  </>
}

function Layer({ render, filters, modes, phases, labels, onClose }: { render: (state: DiagramState) => ReactNode; filters: readonly DiagramFilter[]; modes: readonly DiagramMode[]; phases: readonly string[]; labels: Labels; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: number; x: number; y: number } | null>(null)
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 })
  const [off, setOff] = useState<ReadonlySet<string>>(NONE)
  const [mode, setMode] = useState<string | null>(null)
  const [phasesOff, setPhasesOff] = useState<ReadonlySet<string>>(NONE)
  /** At least one stays on: with none the diagram would have nothing to draw. Double-clicking a chip leaves only that one. */
  const toggle = (id: string) => setOff(current => { const next = new Set(current); if (!next.delete(id)) next.add(id); return next.size < filters.length ? next : current })

  const fit = useCallback(() => {
    const box = stage.current?.getBoundingClientRect()
    const k = box ? Math.min((box.width - 32) / BASE_WIDTH, 1.2) : 1
    setView({ x: 16, y: 16, k })
  }, [])
  const zoom = useCallback((factor: number, px?: number, py?: number) => {
    setView(current => {
      const box = stage.current?.getBoundingClientRect()
      const cx = px ?? (box ? box.width / 2 : 0), cy = py ?? (box ? box.height / 2 : 0)
      const k = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current.k * factor))
      const ratio = k / current.k
      return { k, x: cx - (cx - current.x) * ratio, y: cy - (cy - current.y) * ratio }
    })
  }, [])

  useEffect(() => { fit() }, [fit])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === '+' || event.key === '=') zoom(1.25)
      else if (event.key === '-') zoom(1 / 1.25)
      else if (event.key === '0') fit()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = previous }
  }, [onClose, zoom, fit])
  // The wheel has to be a non-passive listener to stop the page from scrolling behind the layer.
  useEffect(() => {
    const element = stage.current
    if (!element) return
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const box = element.getBoundingClientRect()
      zoom(Math.exp(-event.deltaY * .0015), event.clientX - box.left, event.clientY - box.top)
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [zoom])

  return <div className="elec-full" role="dialog" aria-modal="true" aria-label={labels.title}>
    <div className="elec-full-bar">
      <strong>{labels.title}</strong>
      {modes.length > 0 && <span className="elec-modes" role="group" aria-label={labels.mode}>
        {modes.map(item => <button key={item.id} type="button" className="elec-chip elec-mode" aria-pressed={mode === item.id} onClick={() => setMode(current => current === item.id ? null : item.id)}>{item.label}</button>)}
      </span>}
      {phases.length > 0 && <span className="elec-modes" role="group" aria-label={labels.phases}>
        {phases.map(item => <button key={item} type="button" className="elec-chip elec-mode elec-phase-chip" data-phase={item} aria-pressed={!phasesOff.has(item)} title={`${labels.phases} ${item}`} onClick={() => setPhasesOff(current => { const next = new Set(current); if (!next.delete(item)) next.add(item); return next })}>{item}</button>)}
      </span>}
      <span className="elec-full-tools">
        <button type="button" onClick={() => zoom(1 / 1.25)} aria-label={labels.zoomOut}>−</button>
        <button type="button" onClick={() => zoom(1.25)} aria-label={labels.zoomIn}>+</button>
        <button type="button" onClick={fit}>{labels.reset}</button>
        <button type="button" onClick={onClose} autoFocus>✕ {labels.close}</button>
      </span>
    </div>
    {filters.length > 0 && <div className="elec-full-filter" role="group" aria-label={labels.filter}>
      <span>{labels.filter}</span>
      {filters.map(item => <button key={item.id} type="button" className="elec-chip" aria-pressed={!off.has(item.id)} title={item.hint} onClick={() => toggle(item.id)} onDoubleClick={() => setOff(new Set(filters.filter(other => other.id !== item.id).map(other => other.id)))}>{item.label}</button>)}
      <button type="button" className="elec-chip-all" onClick={() => setOff(NONE)}>{labels.all}</button>
    </div>}
    <div
      ref={stage}
      className="elec-full-stage"
      onPointerDown={event => { drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId) }}
      onPointerMove={event => {
        const start = drag.current
        if (!start || start.id !== event.pointerId) return
        const dx = event.clientX - start.x, dy = event.clientY - start.y
        drag.current = { id: start.id, x: event.clientX, y: event.clientY }
        setView(current => ({ ...current, x: current.x + dx, y: current.y + dy }))
      }}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
    >
      <div className="elec-full-canvas" style={{ width: BASE_WIDTH, transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}>{render({ off, mode, phasesOff })}</div>
    </div>
  </div>
}
