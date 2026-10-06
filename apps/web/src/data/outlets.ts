/**
 * A double power outlet of Buenos Aires: the Argentine plug, IRAM 2073, which has the same shape as the Australian one (AS/NZS 3112): two flat pins in an
 * inverted V and a vertical earth pin below. The plate is the matte black one of the owner's picture, 114 by 72 mm; each of its two sockets has two angled
 * slots, 30 degrees off the vertical, and an earth slot. The slot pitch comes from the picture (610 px for the 114 mm plate).
 * House frame [u, v], absolute heights; the plate stands out of a wall whose inner face is at v = `wallV`, facing +v. `roll` turns a box about the wall's normal.
 */
export type OutletBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; roll?: number }

export const OUTLET = { width: .114, height: .072, thickness: .008, socketOffset: .0212, slotLength: .0075, slotWidth: .0032, slantDegrees: 30, centreHeight: .3 }

const PLATE = '#212326', SLOT = '#050506'

export function outletBoxes(name: string, wallV: number, centreU: number, floorY: number, centreHeight = OUTLET.centreHeight): OutletBox[] {
  const { width, height, thickness, socketOffset, slotLength, slotWidth, slantDegrees } = OUTLET
  const y0 = floorY + centreHeight
  // Viewed from the room, facing the wall, the right hand is the lower u.
  const at = (id: string, across: number, up: number, size: [number, number], color: string, roll = 0): OutletBox => ({
    id: `${name}-${id}`, u: [centreU - across - size[0] / 2, centreU - across + size[0] / 2], v: [wallV + thickness, wallV + thickness + .0008], y: [y0 + up - size[1] / 2, y0 + up + size[1] / 2], color, roll,
  })
  const slant = slantDegrees * Math.PI / 180
  const sockets = [-1, 1].flatMap(side => [
    // The live and the neutral: an inverted V, the left one leaning to the right at the top.
    at(`socket-${side}-live`, side * socketOffset - .0066, .0067, [slotWidth, slotLength], SLOT, slant),
    at(`socket-${side}-neutral`, side * socketOffset + .0066, .0067, [slotWidth, slotLength], SLOT, -slant),
    at(`socket-${side}-earth`, side * socketOffset, -.0067, [slotWidth, slotLength], SLOT),
  ])
  return [
    { id: `${name}-plate`, u: [centreU - width / 2, centreU + width / 2], v: [wallV, wallV + thickness], y: [y0 - height / 2, y0 + height / 2], color: PLATE },
    ...sockets,
  ]
}
