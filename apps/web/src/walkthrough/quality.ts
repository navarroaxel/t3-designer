/**
 * How much the walkthrough asks of the graphics card, in three steps, and when it steps down. The tour starts at the first, the best looking; if it cannot keep up (a slow card, a big screen) the
 * performance monitor asks for the next, which draws fewer pixels and a simpler soft shadow; if it is running well again it goes back up. A step that takes the soft shadows off is the last.
 */
export type AoQuality = 'performance' | 'low' | 'medium'
export type QualityLevel = { /** Pixels per css pixel: a range the browser picks in, or one number. */ dpr: number | [number, number]; /** The soft shadows where surfaces meet: their quality, or null for none. */ ao: AoQuality | null }
export const QUALITY_LEVELS: readonly QualityLevel[] = [
  { dpr: [1, 1.5], ao: 'medium' },
  { dpr: 1, ao: 'performance' },
  { dpr: .75, ao: null },
]
/** The step after a decline (one lower in quality) or an incline (one higher), held to the steps there are. */
export const stepQuality = (level: number, direction: 'decline' | 'incline') => Math.max(0, Math.min(QUALITY_LEVELS.length - 1, level + (direction === 'decline' ? 1 : -1)))
/** Frames per second the monitor wants: under the lower it steps down, over the upper (and for long enough) it steps back up. */
export const QUALITY_FPS: [number, number] = [45, 58]
