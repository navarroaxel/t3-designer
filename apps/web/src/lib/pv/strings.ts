import { PV_SYSTEM } from '../../data/pv-system.ts'

/** How many series the inverter's input is wired as. */
export const STRING_COUNT = 2

const cache = new Map<string, string[][]>()

/**
 * The series (strings) of the installed panels, by panel id: the installed panels in wiring order. A series takes at
 * most `maxPanelsPerString` panels, so with that many or fewer only the first is used and the second is empty; with more
 * they are cut in half so the two series are as even as possible (the first one takes the odd panel). With every panel
 * installed that is two series of 8; with 12 it is two of 6; with 10 or fewer, one series. `null` means all panels.
 */
export function stringsFor(installed: ReadonlySet<string> | null): string[][] {
  const ids = PV_SYSTEM.wiringOrder.filter(id => !installed || installed.has(id))
  const key = ids.join(',')
  let strings = cache.get(key)
  if (!strings) {
    const first = ids.length <= PV_SYSTEM.maxPanelsPerString ? ids.length : Math.ceil(ids.length / STRING_COUNT)
    strings = [ids.slice(0, first), ids.slice(first)]
    cache.set(key, strings)
  }
  return strings
}
