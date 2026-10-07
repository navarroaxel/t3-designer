/**
 * How rounded the edges of a box are. Real furniture has no knife edges: a corner catches the light, and a box with a soft edge stops looking like a block of voxels. The radius
 * follows the box's smallest side (a fifth of it) and is capped at 2 cm, so a wardrobe and a table top both get a believable edge; anything under 3 cm is a plate, a slot or a
 * port, and stays sharp (and cheap).
 */
export const MIN_ROUNDED_SIDE = .03
export const MAX_EDGE_RADIUS = .02
export const EDGE_RATIO = .2

export function edgeRadius(size: readonly [number, number, number]): number {
  const smallest = Math.min(...size)
  return smallest < MIN_ROUNDED_SIDE ? 0 : Math.min(MAX_EDGE_RADIUS, smallest * EDGE_RATIO)
}
