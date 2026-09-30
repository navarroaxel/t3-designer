import { useCallback, useState } from 'react'
import { DEFAULT_BILLING, sanitizeBilling, type BillingSettings } from './pv/billing'

const KEY = 't3-designer.billing'

function read(): BillingSettings {
  try {
    const stored = window.localStorage.getItem(KEY)
    return stored === null ? DEFAULT_BILLING : sanitizeBilling(JSON.parse(stored))
  } catch { return DEFAULT_BILLING }
}

const sameAsDefault = (settings: BillingSettings) => JSON.stringify(settings) === JSON.stringify(DEFAULT_BILLING)

/**
 * The bill calculator's settings, remembered in this browser. Storage can be blocked or hold something
 * unexpected, so it only ever adds convenience and every read is sanitised.
 */
export function useBilling() {
  const [settings, setSettings] = useState(read)
  const commit = useCallback((next: BillingSettings) => {
    const clean = sanitizeBilling(next)
    setSettings(clean)
    try {
      if (sameAsDefault(clean)) window.localStorage.removeItem(KEY)
      else window.localStorage.setItem(KEY, JSON.stringify(clean))
    } catch { /* storage may be blocked */ }
  }, [])
  const update = useCallback((patch: Partial<Omit<BillingSettings, 'consumption'>>) => commit({ ...settings, ...patch }), [commit, settings])
  const setMonth = useCallback((month: number, kwh: number) => commit({ ...settings, consumption: settings.consumption.map((value, index) => index === month ? kwh : value) }), [commit, settings])
  const setAllMonths = useCallback((kwh: number) => commit({ ...settings, consumption: settings.consumption.map(() => kwh) }), [commit, settings])
  const reset = useCallback(() => commit(DEFAULT_BILLING), [commit])
  return { settings, update, setMonth, setAllMonths, reset, isDefault: sameAsDefault(settings) }
}
