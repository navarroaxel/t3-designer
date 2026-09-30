import { PV_SYSTEM } from '../../data/pv-system.ts'

export const FACTOR_RANGE = { min: .5, max: 1.1 } as const
export const DEFAULT_FACTOR: number = PV_SYSTEM.calibration.factor

/** A factor the panel accepts: rounded to a whole percent, within the range; anything else is the default. */
export const clampFactor = (value: number) => Number.isFinite(value) ? Math.min(FACTOR_RANGE.max, Math.max(FACTOR_RANGE.min, Math.round(value * 100) / 100)) : DEFAULT_FACTOR
