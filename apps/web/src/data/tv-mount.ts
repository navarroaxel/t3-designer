import { TV_MOUNT } from './house-plan.ts'

/**
 * The TVs' wall mount, folded, as boxes in the house frame [u, v] with absolute heights: the plate on the wall, two links, the head plate, and the two rails
 * the TV's VESA holes screw to, as far apart as the TV's pattern (100 to 400 mm). The TV's back stands where the rails end, 67 mm from the wall.
 */
export type MountBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number }

const STEEL = '#1b1c1e'

export function tvMountBoxes(name: string, wallV: number, centreU: number, centreY: number, vesa: readonly [number, number]): MountBox[] {
  const half = TV_MOUNT.width / 2, plate = TV_MOUNT.plateHeight / 2
  const layer = (from: number, to: number): [number, number] => [wallV + from, wallV + to]
  const box = (id: string, u: [number, number], v: [number, number], y: [number, number]): MountBox => ({ id: `tv-${name}-mount-${id}`, u, v, y, color: STEEL, metalness: .5 })
  const spacing = Math.min(Math.max(vesa[0], TV_MOUNT.vesaWidthRange[0]), TV_MOUNT.vesaWidthRange[1])
  return [
    box('wall-plate', [centreU - half, centreU + half], layer(0, .02), [centreY - plate, centreY + plate]),
    // Two links, folded flat one over the other between the plates.
    box('link-top', [centreU - half + .03, centreU + half - .03], layer(.02, .045), [centreY + .005, centreY + .04]),
    box('link-bottom', [centreU - half + .03, centreU + half - .03], layer(.02, .045), [centreY - .04, centreY - .005]),
    box('head', [centreU - half, centreU + half], layer(.045, .057), [centreY - plate, centreY + plate]),
    // The rails: 420 mm tall, 30 mm wide, one on each side of the VESA pattern.
    ...[-1, 1].map(side => box(`rail-${side}`, [centreU + side * spacing / 2 - .015, centreU + side * spacing / 2 + .015], layer(.057, TV_MOUNT.depthFolded), [centreY - TV_MOUNT.railHeight / 2, centreY + TV_MOUNT.railHeight / 2])),
  ]
}
