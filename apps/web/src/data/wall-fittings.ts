/**
 * Two fittings of the living's TV wall, from the owner's pictures (ECHOGEAR): the in-wall media box and the round cable pass-through. House frame [u, v], absolute heights;
 * they stand out of a wall whose inner face is at v = `wallV`, facing +v.
 *
 * - **The media box** (9 inch, trim ring 15.87 by 10.84 in = 403 by 275 mm): white, a trim ring round a cover with a slot along its lower edge for the cables, set into the wall
 *   (the box behind is 363 by 229 mm and 99 mm deep, so only the ring and the cover show). The slot is 64% of the cover wide, a little right of centre, as in the picture.
 * - **The pass-through** (a round white plate, assumed 150 mm across, flat on the wall): a horizontal slit that lets an HDMI cable through, a hole at each end of the slit.
 */
export type FittingBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; disc?: true }

export const MEDIA_BOX = { trimWidth: .403, trimHeight: .275, openingWidth: .363, openingHeight: .229, depth: .099, trim: .012, slotWidth: .23, slotHeight: .03, slotFromEdge: .012 }
export const PASS_THROUGH = { diameter: .15, slit: .07, thickness: .004 }

const WHITE = '#f2f3f4', SHADE = '#8a8e92', SLIT = '#2a2b2e'

export function mediaBoxBoxes(name: string, wallV: number, centreU: number, centreY: number): FittingBox[] {
  const { trimWidth, trimHeight, openingWidth, openingHeight, trim, slotWidth, slotHeight, slotFromEdge } = MEDIA_BOX
  const face: [number, number] = [wallV, wallV + trim]
  // The cover, a hair behind the ring: 3 mm under the opening on each side. Its slot is cut along the lower edge; the viewer's right is the lower u.
  const coverWidth = openingWidth - .003, coverHeight = openingHeight - .003
  const slot: [number, number] = [centreU + coverWidth / 2 - .0726 * coverWidth / .36 - slotWidth, centreU + coverWidth / 2 - .0726 * coverWidth / .36]
  return [
    { id: `${name}-trim-top`, u: [centreU - trimWidth / 2, centreU + trimWidth / 2], v: face, y: [centreY + openingHeight / 2, centreY + trimHeight / 2], color: WHITE },
    { id: `${name}-trim-bottom`, u: [centreU - trimWidth / 2, centreU + trimWidth / 2], v: face, y: [centreY - trimHeight / 2, centreY - openingHeight / 2], color: WHITE },
    { id: `${name}-trim-left`, u: [centreU + openingWidth / 2, centreU + trimWidth / 2], v: face, y: [centreY - openingHeight / 2, centreY + openingHeight / 2], color: WHITE },
    { id: `${name}-trim-right`, u: [centreU - trimWidth / 2, centreU - openingWidth / 2], v: face, y: [centreY - openingHeight / 2, centreY + openingHeight / 2], color: WHITE },
    { id: `${name}-cover`, u: [centreU - coverWidth / 2, centreU + coverWidth / 2], v: [wallV, wallV + trim - .002], y: [centreY - coverHeight / 2, centreY + coverHeight / 2], color: WHITE },
    // The slot: a recess in the cover's lower edge, showing the grey inside of the box.
    { id: `${name}-slot`, u: slot, v: [wallV + trim - .0015, wallV + trim - .001], y: [centreY - coverHeight / 2 + slotFromEdge, centreY - coverHeight / 2 + slotFromEdge + slotHeight], color: SHADE },
  ]
}

export function passThroughBoxes(name: string, wallV: number, centreU: number, centreY: number): FittingBox[] {
  const { diameter, slit, thickness } = PASS_THROUGH
  const disc = (id: string, radius: number, from: number, to: number, color: string, at = centreU, height = centreY): FittingBox =>
    ({ id: `${name}-${id}`, u: [at - radius, at + radius], v: [wallV + from, wallV + to], y: [height - radius, height + radius], color, disc: true })
  const BRAID = '#3a3d41', GOLD = '#d4af37'
  return [
    // A flat white plate, flush with the wall: it takes an HDMI cable, not a radio.
    disc('plate', diameter / 2, 0, thickness, WHITE),
    // The slit, with a hole at each end.
    { id: `${name}-slit`, u: [centreU - slit / 2, centreU + slit / 2], v: [wallV + thickness - .0005, wallV + thickness], y: [centreY - .0015, centreY + .0015], color: SLIT },
    disc('hole-left', .004, thickness - .0005, thickness, SLIT, centreU + slit / 2, centreY),
    disc('hole-right', .004, thickness - .0005, thickness, SLIT, centreU - slit / 2, centreY),
    // The HDMI cable: braided, out through the slit and up the wall behind the TV to its port, ending in the plug (a white body and a gold tip).
    { id: `${name}-cable-out`, u: [centreU - .004, centreU + .004], v: [wallV + thickness, wallV + .03], y: [centreY - .004, centreY + .004], color: BRAID },
    { id: `${name}-cable-up`, u: [centreU - .004, centreU + .004], v: [wallV + .022, wallV + .03], y: [centreY - .004, centreY + .17], color: BRAID },
    { id: `${name}-hdmi-body`, u: [centreU - .011, centreU + .011], v: [wallV + .02, wallV + .042], y: [centreY + .17, centreY + .21], color: '#f2f3f4' },
    { id: `${name}-hdmi-tip`, u: [centreU - .0075, centreU + .0075], v: [wallV + .026, wallV + .036], y: [centreY + .21, centreY + .225], color: GOLD },
  ]
}
