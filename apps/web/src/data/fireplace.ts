import { GROUND_LIVING } from './house-plan.ts'

/**
 * The gas fireplace of the ground floor's living (owner's photo), against the party wall with neighbour A: a black steel box open at the
 * front, with a plinth, studded side panels, a stone top and a set of logs on a burner. Its sizes are read from the photo and assumed:
 * 0.95 m wide, 0.38 m deep and 0.85 m high. Centring it on the living's depth is assumed too. It faces the room, toward lower v.
 * House frame [u, v], heights above the ground-floor level.
 */
export type FireplaceBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; shape?: 'log' }

export const FIREPLACE = { width: .95, depth: .38, height: .85, plinth: .08, panel: .06, back: .03, top: .04, overhang: .02 }
const F = FIREPLACE

const wall = GROUND_LIVING.v[1]
const middleU = (GROUND_LIVING.u[0] + GROUND_LIVING.u[1]) / 2
export const FIREPLACE_U: [number, number] = [middleU - F.width / 2, middleU + F.width / 2]
export const FIREPLACE_V: [number, number] = [wall - F.depth, wall]
const bodyBottom = F.plinth
const bodyTop = F.height - F.top
const BLACK = '#1a1a1c', STONE = '#d6c39c', LOG = '#7a5a3d', END = '#b5602f'

export const FIREPLACE_BOXES: FireplaceBox[] = [
  // The plinth, a little wider than the box.
  { id: 'plinth', u: [FIREPLACE_U[0] - .03, FIREPLACE_U[1] + .03], v: [FIREPLACE_V[0] - .03, wall], y: [0, F.plinth], color: BLACK },
  { id: 'panel-left', u: [FIREPLACE_U[0], FIREPLACE_U[0] + F.panel], v: FIREPLACE_V, y: [bodyBottom, bodyTop], color: BLACK },
  { id: 'panel-right', u: [FIREPLACE_U[1] - F.panel, FIREPLACE_U[1]], v: FIREPLACE_V, y: [bodyBottom, bodyTop], color: BLACK },
  { id: 'back', u: [FIREPLACE_U[0] + F.panel, FIREPLACE_U[1] - F.panel], v: [wall - F.back, wall], y: [bodyBottom, bodyTop], color: '#0c0c0d' },
  { id: 'lintel', u: [FIREPLACE_U[0], FIREPLACE_U[1]], v: FIREPLACE_V, y: [bodyTop - .05, bodyTop], color: BLACK },
  { id: 'floor', u: [FIREPLACE_U[0] + F.panel, FIREPLACE_U[1] - F.panel], v: [FIREPLACE_V[0], wall - F.back], y: [bodyBottom, bodyBottom + .03], color: '#252527' },
  { id: 'top', u: [FIREPLACE_U[0] - F.overhang, FIREPLACE_U[1] + F.overhang], v: [FIREPLACE_V[0] - F.overhang, wall], y: [bodyTop, F.height], color: STONE },
  // The logs on the burner: a big one across the front, two smaller behind and on top, with the cut ends orange.
  { id: 'log-front', u: [middleU - .24, middleU + .18], v: [wall - .22, wall - .14], y: [bodyBottom + .06, bodyBottom + .14], color: LOG, shape: 'log' },
  { id: 'log-back-left', u: [middleU - .2, middleU - .04], v: [wall - .17, wall - .1], y: [bodyBottom + .13, bodyBottom + .2], color: LOG, shape: 'log' },
  { id: 'log-back-right', u: [middleU + .0, middleU + .14], v: [wall - .18, wall - .11], y: [bodyBottom + .13, bodyBottom + .2], color: LOG, shape: 'log' },
  { id: 'log-end', u: [middleU + .17, middleU + .19], v: [wall - .215, wall - .145], y: [bodyBottom + .065, bodyBottom + .135], color: END },
]
