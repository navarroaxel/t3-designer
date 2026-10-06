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

/**
 * The mount's two arms, folded or reaching: each arm is a pair of links (an upper and a lower one, stacked) from a pivot on the wall plate's right end to an elbow and on to a
 * pivot on the head's left end, seen from the room. `reach` is how far the head has come out of its folded place. Each link is the box `u` and `v` describe, laid along u
 * at its midpoint and then turned by `yaw` about the vertical, so it joins its two ends. The elbow bulges out by what the link lengths leave over, a little more than half a span.
 */
export type LinkBox = MountBox & { yaw: number }

export function tvMountLinks(name: string, wallV: number, centreU: number, centreY: number, reach: number): LinkBox[] {
  const half = TV_MOUNT.width / 2 - .05
  const a: [number, number] = [centreU + half, wallV + .03], b: [number, number] = [centreU - half, wallV + .051 + reach]
  const du = b[0] - a[0], dv = b[1] - a[1], span = Math.hypot(du, dv)
  const link = span / 2 * 1.04, bulge = Math.sqrt(Math.max(0, link * link - span * span / 4))
  // The elbow is out from the wall: the normal to the span with the larger v.
  const normal: [number, number] = dv >= 0 ? [-dv / span, du / span] : [dv / span, -du / span]
  const normalOut: [number, number] = normal[1] >= 0 ? normal : [-normal[0], -normal[1]]
  const elbow: [number, number] = [(a[0] + b[0]) / 2 + normalOut[0] * bulge, (a[1] + b[1]) / 2 + normalOut[1] * bulge]
  const boxes: LinkBox[] = []
  for (const [index, height] of [centreY + .022, centreY - .022].entries()) {
    for (const [segment, [from, to]] of ([[a, elbow], [elbow, b]] as const).entries()) {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]), middle: [number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]
      boxes.push({
        id: `tv-${name}-mount-arm-${index}-${segment}`, u: [middle[0] - length / 2, middle[0] + length / 2], v: [middle[1] - .0125, middle[1] + .0125],
        y: [height - .015, height + .015], color: STEEL, metalness: .5, yaw: Math.atan2(to[1] - from[1], to[0] - from[0]),
      })
    }
  }
  return boxes
}
