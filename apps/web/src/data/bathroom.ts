import { FLOOR_HEIGHT } from './building-site.ts'
import { CUT_HEIGHT, FIRST_FLOOR_BATHROOM } from './house-plan.ts'

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
export type BathroomBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; opacity?: number; metalness?: number; shape?: 'ellipse'; taper?: number }

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

const WOOD = '#c9ad8c', WHITE = '#f6f5f1', BLACK = '#222325', CHROME = '#cfd2d6'
const vanityU: [number, number] = [wall - S.vanityDepth, wall]
const bodyTop = floor + S.vanityHeight - S.topThickness

export const BATHROOM_BOXES: BathroomBox[] = [
  // The vanity floats: it is hung on the wall with no legs, its underside 0.25 m above the floor (assumed). Its wood-look body, a white
  // drawer front, the ceramic top, the tap, the mirror and its side shelf.
  { id: 'vanity-body', u: vanityU, v: vanityV, y: [floor + S.vanityFloat, bodyTop], color: WOOD },
  { id: 'vanity-drawer', u: [vanityU[0] - .02, vanityU[0]], v: [vanityV[0] + .03, vanityV[1] - .03], y: [floor + .3, floor + .58], color: WHITE },
  { id: 'vanity-top', u: [vanityU[0] - .02, wall], v: [vanityV[0] - .01, vanityV[1] + .01], y: [bodyTop, floor + S.vanityHeight], color: WHITE },
  { id: 'vanity-tap', u: [wall - .1, wall - .07], v: [(vanityV[0] + vanityV[1]) / 2 - .015, (vanityV[0] + vanityV[1]) / 2 + .015], y: [floor + S.vanityHeight, floor + S.vanityHeight + .16], color: CHROME, metalness: .4 },
  { id: 'mirror', u: [wall - .03, wall], v: [vanityV[0], vanityV[1] - S.shelfPanel], y: [floor + S.mirrorBottom, cut], color: '#d3dde2', metalness: .3 },
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
