import { useState } from 'react'

/**
 * A number box that commits on blur or Enter, so typing "75" does not pass through a clamped "7".
 * `scale` converts between the stored value and the one shown (0.01 for a share shown in percent).
 */
export function NumberField({ id, label, value, onCommit, scale = 1, min, max, step = 1, className }: {
  id?: string
  label: string
  value: number
  onCommit: (value: number) => void
  scale?: number
  min?: number
  max?: number
  step?: number
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = Math.round(value / scale * 1e6) / 1e6
  const commit = () => {
    if (draft !== null && draft.trim() !== '' && Number.isFinite(Number(draft))) onCommit(Number(draft) * scale)
    setDraft(null)
  }
  return <input id={id} type="number" inputMode="decimal" className={className} aria-label={label} min={min} max={max} step={step}
    value={draft ?? String(shown)} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') commit() }} />
}
