import { useCallback, useState } from 'react'
import { clampFactor, DEFAULT_FACTOR } from './pv/factor'

const KEY = 't3-designer.pv-factor'
function read(): number {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === null ? DEFAULT_FACTOR : clampFactor(Number(stored))
  } catch { return DEFAULT_FACTOR }
}

/**
 * The efficiency factor applied to the panels' power: the model's calibration by default, editable, and
 * remembered in this browser. Storage can be blocked, so it only ever adds convenience.
 */
export function usePvFactor() {
  const [factor, setFactor] = useState(read)
  const update = useCallback((value: number) => {
    const next = clampFactor(value)
    setFactor(next)
    try {
      if (next === DEFAULT_FACTOR) window.localStorage.removeItem(KEY)
      else window.localStorage.setItem(KEY, String(next))
    } catch { /* storage may be blocked */ }
  }, [])
  const reset = useCallback(() => update(DEFAULT_FACTOR), [update])
  return { factor, update, reset, isDefault: factor === DEFAULT_FACTOR }
}

export type PvFactor = ReturnType<typeof usePvFactor>
