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

/**
 * A network socket, an RJ45 jack, on the same matte black plate as the power outlets but single: 72 by 72 mm, with the jack's grey frame and its dark opening, which has
 * the key notch of the plug's latch at the bottom. Same frame and orientation as `outletBoxes`: the plate stands out of a wall at v = `wallV`, facing +v.
 */
export const DATA_SOCKET = { size: .072, frame: [.026, .024] as const, opening: [.0145, .0125] as const, notch: [.006, .0035] as const }

export function dataSocketBoxes(name: string, wallV: number, centreU: number, floorY: number, centreHeight = OUTLET.centreHeight): OutletBox[] {
  const { size, frame, opening, notch } = DATA_SOCKET
  const { thickness } = OUTLET
  const y0 = floorY + centreHeight
  const face = (depth: number): [number, number] => [wallV + thickness + depth, wallV + thickness + depth + .0008]
  const centred = (id: string, width: number, height: number, up: number, depth: number, color: string): OutletBox =>
    ({ id: `${name}-${id}`, u: [centreU - width / 2, centreU + width / 2], v: face(depth), y: [y0 + up - height / 2, y0 + up + height / 2], color })
  return [
    { id: `${name}-plate`, u: [centreU - size / 2, centreU + size / 2], v: [wallV, wallV + thickness], y: [y0 - size / 2, y0 + size / 2], color: PLATE },
    centred('frame', frame[0], frame[1], 0, 0, '#8a8e92'),
    centred('opening', opening[0], opening[1], 0, .0008, SLOT),
    centred('notch', notch[0], notch[1], -opening[1] / 2 - notch[1] / 2 + .0005, .0008, SLOT),
  ]
}

/**
 * Where a wall fitting stands, and which way it faces. The fittings above are built on a wall at v = 0 that faces +v, centred on u = 0 (`outletBoxes`, `dataSocketBoxes`). A plate on another wall is the
 * same turned about the vertical: `face` is the way the wall looks (into the room), `plane` the wall's coordinate (v for a wall that faces along v, u for one that faces along u) and `along` the
 * fitting's centre along the wall. A fitting on a wall that faces along u turns its slots about u, not v (`rollAboutU`), and on a +u wall the slant of the slots is mirrored.
 */
export type WallFace = '+u' | '-u' | '+v' | '-v'
export type PlacedBox = OutletBox & { rollAboutU?: true }
export function placeOnWall(parts: readonly OutletBox[], face: WallFace, plane: number, along: number): PlacedBox[] {
  return parts.map((part): PlacedBox => {
    const [a0, a1] = part.u, [d0, d1] = part.v
    switch (face) {
      case '+v': return { ...part, u: [along + a0, along + a1], v: [plane + d0, plane + d1] }
      case '-v': return { ...part, u: [along - a1, along - a0], v: [plane - d1, plane - d0], roll: part.roll ? -part.roll : undefined }
      case '-u': return { ...part, u: [plane - d1, plane - d0], v: [along + a0, along + a1], rollAboutU: true }
      case '+u': return { ...part, u: [plane + d0, plane + d1], v: [along - a1, along - a0], roll: part.roll ? -part.roll : undefined, rollAboutU: true }
    }
  })
}
/** A double outlet on a wall (see `placeOnWall`), its centre `height` over `floorY`. */
export const wallOutlet = (name: string, face: WallFace, plane: number, along: number, floorY: number, height?: number) => placeOnWall(outletBoxes(name, 0, 0, floorY, height), face, plane, along)
/** A network socket on a wall (see `placeOnWall`), at the height of the power outlets unless it is told otherwise. */
export const wallDataSocket = (name: string, face: WallFace, plane: number, along: number, floorY: number, height?: number) => placeOnWall(dataSocketBoxes(name, 0, 0, floorY, height), face, plane, along)
