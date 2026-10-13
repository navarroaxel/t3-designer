import { FLOOR_HEIGHT } from './building-site.ts'
import { BATHROOM_DOOR, CUT_HEIGHT, FIRST_FLOOR_BATHROOM, SLAB_THICKNESS } from './house-plan.ts'

/**
 * The bathroom's fixtures (owner), along its wall shared with the living, from the door to the back wall: a 60 cm vanity,
 * the toilet and a 75 cm shower with one glass panel. The vanity is the unit of the owner's photo, hung on the wall and floating, without its legs (owner): a wood-look body
 * with an open shelf, a white drawer front, a ceramic top with the basin, and a mirror above with a side shelf. The toilet is
 * the smart one-piece unit of the owner's link (Tieri): 77 cm long, 48 cm wide and 58 cm high, white, floor-standing, with the
 * integrated bidet: it has no cistern, everything is built into the unit. The shower is not enclosed and has no tray: the floor is the same tile, and a single fixed glass panel, 75 cm wide, separates it. The vanity's width and these two are
 * the owner's; every other size is typical and assumed.
 *
 * The wall is the bathroom's back wall (the living is behind it); the door is on the north-east wall, so along that wall
 * the run starts at the north-east corner and goes toward the south-west party wall, decreasing v. House frame [u, v].
 */
/** A box, or an ellipse inscribed in it, narrowing toward the floor by `taper` (1 = straight sides). */
export type BathroomBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; opacity?: number; metalness?: number; shape?: 'ellipse'; taper?: number; cylinder?: { length: number; tilt: number } }

const wall = FIRST_FLOOR_BATHROOM.u[1]
const floor = FLOOR_HEIGHT
const cut = FLOOR_HEIGHT + CUT_HEIGHT
const start = FIRST_FLOOR_BATHROOM.v[1]
const end = FIRST_FLOOR_BATHROOM.v[0]

export const BATHROOM_SIZES = {
  vanityWidth: .6, vanityDepth: .45, vanityFloat: .25, vanityHeight: .85, topThickness: .04,
  toiletLength: .77, toiletWidth: .48, toiletHeight: .58, toiletLid: .025, toiletTaper: .86,
  showerWidth: .75, glassLength: .9, glassFrame: .015,
  mirrorBottom: 1.05, shelfPanel: .15,
}
const S = BATHROOM_SIZES

/** Spans along v of the three fixtures, from the door to the back wall. */
export const BATHROOM_RUN = {
  vanity: [start - S.vanityWidth, start] as [number, number],
  // The shower takes 0.75 m at the back wall; the toilet is centred in what lies between it and the vanity.
  toilet: [end + S.showerWidth, start - S.vanityWidth] as [number, number],
  shower: [end, end + S.showerWidth] as [number, number],
}
const vanityV = BATHROOM_RUN.vanity
const toiletCentre = (BATHROOM_RUN.toilet[0] + BATHROOM_RUN.toilet[1]) / 2
/**
 * The bathroom's outlet (owner): on the wall shared with the living, in the 16.5 cm of wall between the toilet and the vanity, centred in it, at floor level (owner: for the smart toilet, a Japanese-style one with a bidet): the plate's
 * centre is 15 cm up, which leaves its lower edge 11 cm over the tiles. A double plate is 114 mm wide, so it fits with 2.5 cm to spare on each side.
 */
export const BATHROOM_OUTLET = { u: wall, v: (toiletCentre + S.toiletWidth / 2 + BATHROOM_RUN.vanity[0]) / 2, height: .15 }
const showerV = BATHROOM_RUN.shower

const MIRROR_GLASS = .03
const WOOD = '#c9ad8c', WHITE = '#f6f5f1', BLACK = '#222325', CHROME = '#cfd2d6'
const vanityU: [number, number] = [wall - S.vanityDepth, wall]
const bodyTop = floor + S.vanityHeight - S.topThickness

/**
 * The shower's niche (owner's request): a recess of two shelves built into the wall that faces the shower's taps (the bathroom's wall on the wardrobe's side, u[0]), centred on the shower's width, 62 cm wide.
 * Each shelf is 30 cm tall inside over a 1 cm porcelain board (the owner's: the same porcelain as the tiles), 31 cm a shelf and 62 cm the two; the recess is cut 8 cm into the 12 cm partition, from the room's face, so 4 cm of it is left behind. Its width, its height off the floor and its
 * depth are assumed. Heights above the ground-floor level.
 */
export const BATHROOM_NICHE = (() => {
  const shelf = .3, divider = .01, width = .62, depth = .08, bottom = floor + 1
  const centre = (showerV[0] + showerV[1]) / 2, face = FIRST_FLOOR_BATHROOM.u[0]
  return { shelf, divider, depth, face, u: [face - depth, face] as [number, number], v: [centre - width / 2, centre + width / 2] as [number, number], y: [bottom, bottom + 2 * (shelf + divider)] as [number, number] }
})()

/** The bathroom's warm LED strips, under the vanity and in the niche, are one kind (owner): the same colour, 8 mm thick and 2 cm wide. */
const LED_STRIP = { color: '#ffe0b0', thickness: .008, width: .02 }

/** The porcelain boards of the niche, under each shelf (the lower one is its sill), in the recess (not in the room, so not among the fixtures). */
export const BATHROOM_NICHE_BOXES: (BathroomBox & { glow?: boolean })[] = [
  { id: 'niche-sill', u: BATHROOM_NICHE.u, v: BATHROOM_NICHE.v, y: [BATHROOM_NICHE.y[0], BATHROOM_NICHE.y[0] + BATHROOM_NICHE.divider], color: '#e9e6df' },
  { id: 'niche-shelf', u: BATHROOM_NICHE.u, v: BATHROOM_NICHE.v, y: [BATHROOM_NICHE.y[0] + BATHROOM_NICHE.shelf + BATHROOM_NICHE.divider, BATHROOM_NICHE.y[0] + BATHROOM_NICHE.shelf + 2 * BATHROOM_NICHE.divider], color: '#e9e6df' },
  // A warm LED strip (owner's request), the same as the one under the vanity, along the top of each shelf, just inside its front edge, to bring out the niche: the lower one under the board above it, the upper one under the niche's top.
  ...[BATHROOM_NICHE.y[0] + BATHROOM_NICHE.divider + BATHROOM_NICHE.shelf, BATHROOM_NICHE.y[1]].map((top, index) => ({
    id: `ceiling-niche-led-${index + 1}`, u: [BATHROOM_NICHE.face - .03, BATHROOM_NICHE.face - .03 + LED_STRIP.width] as [number, number], v: [BATHROOM_NICHE.v[0] + .015, BATHROOM_NICHE.v[1] - .015] as [number, number],
    y: [top - LED_STRIP.thickness, top] as [number, number], color: LED_STRIP.color, glow: true,
  })),
]

export const BATHROOM_BOXES: BathroomBox[] = [
  // The vanity floats: it is hung on the wall with no legs, its underside 0.25 m above the floor (assumed). Its wood-look body, a white
  // drawer front, the ceramic top, the tap, the mirror and its side shelf.
  { id: 'vanity-body', u: vanityU, v: vanityV, y: [floor + S.vanityFloat, bodyTop], color: WOOD },
  { id: 'vanity-drawer', u: [vanityU[0] - .02, vanityU[0]], v: [vanityV[0] + .03, vanityV[1] - .03], y: [floor + .3, floor + .58], color: WHITE },
  { id: 'vanity-top', u: [vanityU[0] - .02, wall], v: [vanityV[0] - .01, vanityV[1] + .01], y: [bodyTop, floor + S.vanityHeight], color: WHITE },
  { id: 'vanity-tap', u: [wall - .1, wall - .07], v: [(vanityV[0] + vanityV[1]) / 2 - .015, (vanityV[0] + vanityV[1]) / 2 + .015], y: [floor + S.vanityHeight, floor + S.vanityHeight + .16], color: CHROME, metalness: .4 },
  { id: 'mirror', u: [wall - MIRROR_GLASS, wall], v: [vanityV[0], vanityV[1] - S.shelfPanel], y: [floor + S.mirrorBottom, cut], color: '#9aa4ab', metalness: .55 },
  { id: 'mirror-shelf', u: [wall - .12, wall], v: [vanityV[1] - S.shelfPanel, vanityV[1]], y: [floor + S.mirrorBottom, cut], color: '#d3c3ae' },
  // The toilet, a smart one-piece unit as in the owner's photo: one smooth, egg-shaped body with no cistern, a little narrower at the
  // floor, its lid on top and a dark control panel with a light at the back of the lid. Its back is to the wall; centred on its space.
  { id: 'toilet-body', u: [wall - S.toiletLength, wall], v: [toiletCentre - S.toiletWidth / 2, toiletCentre + S.toiletWidth / 2], y: [floor, floor + S.toiletHeight - S.toiletLid], color: WHITE, shape: 'ellipse', taper: S.toiletTaper },
  { id: 'toilet-lid', u: [wall - S.toiletLength - .005, wall], v: [toiletCentre - S.toiletWidth / 2 - .005, toiletCentre + S.toiletWidth / 2 + .005], y: [floor + S.toiletHeight - S.toiletLid, floor + S.toiletHeight], color: '#f7f6f2', shape: 'ellipse' },
  { id: 'toilet-panel', u: [wall - .3, wall - .1], v: [toiletCentre - .11, toiletCentre + .11], y: [floor + S.toiletHeight, floor + S.toiletHeight + .006], color: '#1c1d20' },
  { id: 'toilet-light', u: [wall - .34, wall - .3], v: [toiletCentre - .18, toiletCentre - .14], y: [floor + S.toiletHeight - .02, floor + S.toiletHeight + .006], color: '#59d0e8' },
  // The shower: no tray and no enclosure, the same floor as the rest. One fixed glass panel on the toilet side, running out from
  // the wall, with a thin black frame on its free edge and at its foot, and the taps on the wall.
  { id: 'shower-glass', u: [wall - S.glassLength, wall], v: [showerV[1], showerV[1] + .01], y: [floor, cut], color: '#cfe3ea', opacity: .3 },
  { id: 'shower-glass-frame-edge', u: [wall - S.glassLength - S.glassFrame, wall - S.glassLength], v: [showerV[1] - .002, showerV[1] + .012], y: [floor, cut], color: BLACK },
  { id: 'shower-glass-frame-foot', u: [wall - S.glassLength, wall], v: [showerV[1] - .002, showerV[1] + .012], y: [floor, floor + S.glassFrame], color: BLACK },
  { id: 'shower-taps', u: [wall - .06, wall], v: [(showerV[0] + showerV[1]) / 2 - .09, (showerV[0] + showerV[1]) / 2 + .09], y: [floor + 1, floor + 1.08], color: CHROME, metalness: .4 },
]

/**
 * The mirror's backlight, from the owner's picture of a backlit LED mirror: a dark glass with a bright white strip all around, a little in from its edge, a soft halo on the wall
 * beyond it and two touch buttons at the lower right (the right hand, facing the wall, is the lower v). The mirror hangs up to 1.9 m, above the 1.5 m cut, so these are not in
 * BATHROOM_BOXES. `glow` pieces light themselves.
 */
export const MIRROR = { top: 1.9, inset: .025, strip: .016, glass: .03 }
const mirrorV: [number, number] = [vanityV[0], vanityV[1] - S.shelfPanel]
const mirrorY: [number, number] = [floor + S.mirrorBottom, floor + MIRROR.top]
const stripU: [number, number] = [wall - MIRROR.glass - .006, wall - MIRROR.glass]
export const MIRROR_LIGHT_BOXES: (BathroomBox & { glow?: boolean })[] = [
  { id: 'mirror-halo', u: [wall - .0015, wall - .0005], v: [mirrorV[0] - .07, mirrorV[1] + .07], y: [mirrorY[0] - .07, mirrorY[1] + .07], color: '#f4f8ff', opacity: .16, glow: true },
  { id: 'mirror-led-top', u: stripU, v: [mirrorV[0] + MIRROR.inset, mirrorV[1] - MIRROR.inset], y: [mirrorY[1] - MIRROR.inset - MIRROR.strip, mirrorY[1] - MIRROR.inset], color: '#f7fbff', glow: true },
  { id: 'mirror-led-bottom', u: stripU, v: [mirrorV[0] + MIRROR.inset, mirrorV[1] - MIRROR.inset], y: [mirrorY[0] + MIRROR.inset, mirrorY[0] + MIRROR.inset + MIRROR.strip], color: '#f7fbff', glow: true },
  { id: 'mirror-led-right', u: stripU, v: [mirrorV[0] + MIRROR.inset, mirrorV[0] + MIRROR.inset + MIRROR.strip], y: [mirrorY[0] + MIRROR.inset, mirrorY[1] - MIRROR.inset], color: '#f7fbff', glow: true },
  { id: 'mirror-led-left', u: stripU, v: [mirrorV[1] - MIRROR.inset - MIRROR.strip, mirrorV[1] - MIRROR.inset], y: [mirrorY[0] + MIRROR.inset, mirrorY[1] - MIRROR.inset], color: '#f7fbff', glow: true },
  // The two touch buttons: a round-looking square for the light and one for the demister.
  { id: 'mirror-button-1', u: stripU, v: [mirrorV[0] + .075, mirrorV[0] + .095], y: [mirrorY[0] + .055, mirrorY[0] + .075], color: '#dfe6ee', glow: true },
  { id: 'mirror-button-2', u: stripU, v: [mirrorV[0] + .045, mirrorV[0] + .065], y: [mirrorY[0] + .055, mirrorY[0] + .075], color: '#dfe6ee', glow: true },
]

/**
 * The bathroom's light box (owner): a drywall "cajón" along the wall that faces the mirror, under the ceiling, with three recessed LED downlights in its underside, in a row along the wall. They
 * light the face in the mirror from the front. 30 cm deep and 30 cm tall, white, the width of the room; the lights are 9 cm across, evenly spaced. Heights above the ground-floor level. It hangs
 * above the 1.5 m cut, so it is not in BATHROOM_BOXES.
 */
export const BATHROOM_LIGHT_BOX = { depth: .3, height: .3, ceiling: FLOOR_HEIGHT - SLAB_THICKNESS, light: .09, count: 3 }
const lightBoxU: [number, number] = [FIRST_FLOOR_BATHROOM.u[0], FIRST_FLOOR_BATHROOM.u[0] + BATHROOM_LIGHT_BOX.depth]
const lightBoxY: [number, number] = [FLOOR_HEIGHT + BATHROOM_LIGHT_BOX.ceiling - BATHROOM_LIGHT_BOX.height, FLOOR_HEIGHT + BATHROOM_LIGHT_BOX.ceiling]
export const BATHROOM_LIGHT_POSITIONS: { u: number; v: number }[] = Array.from({ length: BATHROOM_LIGHT_BOX.count }, (_, index) => ({
  u: (lightBoxU[0] + lightBoxU[1]) / 2,
  v: FIRST_FLOOR_BATHROOM.v[0] + (FIRST_FLOOR_BATHROOM.v[1] - FIRST_FLOOR_BATHROOM.v[0]) * (index + .5) / BATHROOM_LIGHT_BOX.count,
}))
/**
 * The front light (owner's request, from the owner's photo): a bar of three adjustable spots on a chrome backplate, on the mirror's wall above the mirror, aimed into the room to light the face from the front. It is
 * centred along the wall (the middle of the bathroom's width, in v), 2.3 m up. The plate is 42 cm by 11 cm; each head is a brushed-steel cylinder 5.5 cm across and 7.5 cm long on a short stub, with a chrome ring
 * round a glowing lens. The sizes are assumed from the photo (the heads there are tilted; here they point straight out). Heights above the ground-floor level.
 */
export const BATHROOM_FRONT_SPOT = { plateWidth: .42, plateHeight: .11, plateDepth: .015, head: .055, headLength: .075, stub: .02, stubLength: .03, ring: .01, lens: .004, pitch: .13, height: 2.3 }
const spot = BATHROOM_FRONT_SPOT
/** How far the bar stands out of the wall, lens included. */
export const BATHROOM_FRONT_SPOT_DEPTH = spot.plateDepth + spot.stubLength + spot.headLength + spot.ring + spot.lens
export const BATHROOM_FRONT_SPOT_AT = { u: wall, v: (FIRST_FLOOR_BATHROOM.v[0] + FIRST_FLOOR_BATHROOM.v[1]) / 2, y: floor + spot.height }
const spotAt = BATHROOM_FRONT_SPOT_AT
const STEEL = '#b9bcc0', CHROME_PLATE = '#dcdfe2'
/**
 * The heads are tilted down toward the floor, 60 degrees under the horizontal, about the v axis. A head's pieces stack along its axis from the plate (a stub, the head, a ring and the lens); `cylinder` carries each
 * one's length along the axis and the tilt, and its u and y span the square its diameter makes about its centre.
 */
export const BATHROOM_FRONT_SPOT_TILT = Math.PI / 3
const spotBoxes = (): (BathroomBox & { glow?: boolean })[] => {
  const across = (centre: number, size: number): [number, number] => [centre - size / 2, centre + size / 2]
  const plate = { id: 'ceiling-spot-plate', u: [wall - spot.plateDepth, wall] as [number, number], v: across(spotAt.v, spot.plateWidth), y: across(spotAt.y, spot.plateHeight), color: CHROME_PLATE, metalness: .8 }
  const tilt = BATHROOM_FRONT_SPOT_TILT, along = [-Math.cos(tilt), -Math.sin(tilt)]
  const heads = [-1, 0, 1].flatMap(step => {
    const v = spotAt.v + step * spot.pitch, n = step + 2
    let reach = 0
    const segment = (id: string, length: number, diameter: number, color: string, extra: { metalness?: number; glow?: boolean }): BathroomBox & { glow?: boolean } => {
      const middle = reach + length / 2
      reach += length
      return { id: `ceiling-spot-${id}-${n}`, u: across(wall - spot.plateDepth + along[0] * middle, diameter), v: across(v, diameter), y: across(spotAt.y + along[1] * middle, diameter), color, cylinder: { length, tilt }, ...extra }
    }
    return [
      segment('stub', spot.stubLength, spot.stub, STEEL, { metalness: .7 }),
      segment('head', spot.headLength, spot.head, STEEL, { metalness: .6 }),
      segment('ring', spot.ring, spot.head + .005, '#e6e8ea', { metalness: .85 }),
      segment('lens', spot.lens, spot.head - .014, '#fff6e6', { glow: true }),
    ]
  })
  return [plate, ...heads]
}
/** Where the bar's light shines from: in front of the middle head's lens, under the plate. */
export const BATHROOM_FRONT_SPOT_LIGHT = { u: wall - spot.plateDepth - Math.cos(BATHROOM_FRONT_SPOT_TILT) * (BATHROOM_FRONT_SPOT_DEPTH - spot.plateDepth + .05), y: spotAt.y - Math.sin(BATHROOM_FRONT_SPOT_TILT) * (BATHROOM_FRONT_SPOT_DEPTH - spot.plateDepth + .05), v: spotAt.v }
export const BATHROOM_FRONT_SPOT_BOXES = spotBoxes()
/**
 * The vanity floats, so a warm LED strip runs under it (owner's request), along its underside near the front edge, to light the floor. It is on the bathroom's switch with the downlights. It hangs below
 * the cut, so it is drawn in the cutaway too.
 */
export const VANITY_LED_BOX: BathroomBox & { glow: true } = { id: 'ceiling-vanity-led', u: [vanityU[0] + .03, vanityU[0] + .03 + LED_STRIP.width], v: [vanityV[0] + .03, vanityV[1] - .03], y: [floor + S.vanityFloat - LED_STRIP.thickness, floor + S.vanityFloat], color: LED_STRIP.color, glow: true }
export const VANITY_LED_LIGHT = { u: vanityU[0] + .04, v: (vanityV[0] + vanityV[1]) / 2, y: floor + S.vanityFloat - .03 }
export const BATHROOM_LIGHT_BOXES: (BathroomBox & { glow?: boolean; round?: boolean })[] = [
  { id: 'ceiling-box', u: lightBoxU, v: FIRST_FLOOR_BATHROOM.v, y: lightBoxY, color: '#f1efe9' },
  ...BATHROOM_LIGHT_POSITIONS.map((at, index) => ({ id: `ceiling-light-${index + 1}`, u: [at.u - BATHROOM_LIGHT_BOX.light / 2, at.u + BATHROOM_LIGHT_BOX.light / 2] as [number, number], v: [at.v - BATHROOM_LIGHT_BOX.light / 2, at.v + BATHROOM_LIGHT_BOX.light / 2] as [number, number], y: [lightBoxY[0] - .004, lightBoxY[0] + .002] as [number, number], color: '#fff6e6', glow: true, round: true })),
]

/**
 * The bathroom's light switch (owner's request): a single plate on the wall of the door, inside the bathroom, a hand's width past the door's edge on the side of the vanity (between the door and the
 * vanity's end, 1.10 m up), with a rocker and a small light that shows while the lights are on. A visitor aims at it and presses E to switch the three downlights off and on; they start on. It is
 * a device of its own, `bathroom-switch-plate`. The plate faces the bathroom, toward lower v.
 */
export const BATHROOM_SWITCH_ID = 'bathroom-switch-plate'
const switchWall = FIRST_FLOOR_BATHROOM.v[1], switchU = BATHROOM_DOOR.u[1] + .14, switchY = FLOOR_HEIGHT + 1.1
export const BATHROOM_SWITCH_BOXES: (BathroomBox & { glow?: boolean; round?: boolean })[] = [
  { id: 'switch-plate', u: [switchU - .036, switchU + .036], v: [switchWall - .008, switchWall], y: [switchY - .036, switchY + .036], color: '#f3f2ee' },
  { id: 'switch-rocker', u: [switchU - .014, switchU + .014], v: [switchWall - .011, switchWall - .008], y: [switchY - .024, switchY + .024], color: '#d9d8d3' },
  { id: 'switch-dot', u: [switchU + .024, switchU + .029], v: [switchWall - .0085, switchWall - .008], y: [switchY + .024, switchY + .029], color: '#ffcf8a', glow: true },
]
