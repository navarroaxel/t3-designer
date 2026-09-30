import { useCallback, useMemo, useState } from 'react'
import { PANELS, type PanelRow } from '../data/solar-array'

const KEY = 't3-designer.panels-left-out'
const KNOWN = new Set(PANELS.map(panel => panel.id))

function read(): string[] {
  try {
    const stored = window.localStorage.getItem(KEY)
    const parsed: unknown = stored === null ? [] : JSON.parse(stored)
    const ids = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && KNOWN.has(id)) : []
    // An installation needs at least one panel.
    return ids.length >= PANELS.length ? [] : ids
  } catch { return [] }
}

/**
 * Which of the planned panels are installed. The planned array is the maximum, so the choice is the panels left
 * out; it is remembered in this browser. `installed` is `null` while the whole array is in, which the model
 * reads as "everything" without building a set.
 */
export function useInstalledPanels() {
  const [leftOut, setLeftOut] = useState(read)
  const commit = useCallback((ids: string[]) => {
    const clean = ids
    setLeftOut(clean)
    try {
      if (clean.length === 0) window.localStorage.removeItem(KEY)
      else window.localStorage.setItem(KEY, JSON.stringify(clean))
    } catch { /* storage may be blocked */ }
  }, [])
  const installed = useMemo<ReadonlySet<string> | null>(
    () => leftOut.length === 0 ? null : new Set(PANELS.filter(panel => !leftOut.includes(panel.id)).map(panel => panel.id)),
    [leftOut])
  const isIn = useCallback((id: string) => !leftOut.includes(id), [leftOut])
  /** Turn one panel on or off; the last installed panel stays, and so does the last installed row. */
  const toggle = useCallback((id: string) => {
    if (leftOut.includes(id)) commit(leftOut.filter(other => other !== id))
    else if (leftOut.length < PANELS.length - 1) commit([...leftOut, id])
  }, [leftOut, commit])
  const setRow = useCallback((row: PanelRow, on: boolean) => {
    const rowIds = PANELS.filter(panel => panel.row === row).map(panel => panel.id)
    const next = on ? leftOut.filter(id => !rowIds.includes(id)) : [...new Set([...leftOut, ...rowIds])]
    // Turning off the last installed row would leave no panel at all.
    if (next.length < PANELS.length) commit(next)
  }, [leftOut, commit])
  const reset = useCallback(() => commit([]), [commit])
  return { installed, isIn, toggle, setRow, reset, count: PANELS.length - leftOut.length, total: PANELS.length, isFull: leftOut.length === 0 }
}

export type InstalledPanels = ReturnType<typeof useInstalledPanels>
