/**
 * A PlayStation 5 DualSense controller, lying on a table, from the maker's picture (the front, seen from above): a white shell with two grips, a black centre
 * with the two sticks, the touchpad with its blue light bar, the two triggers on the far edge, the D-pad on the left and the four face buttons on the right. It is
 * 160 mm wide and 106 mm deep, about 66 mm tall at the grips. The picture's pixels become metres at 1100 px to 160 mm.
 * House frame [u, v], absolute heights; the triggers point toward the wall (-v) and the visitor, at the table's front, sees it the right way up.
 */
export type PadBox = { id: string; u: [number, number]; v: [number, number]; y: [number, number]; color: string; metalness?: number; shape?: 'ellipse' }

const K = .16 / 1100
const WHITE = '#f4f5f8', BLACK = '#1b1c20', BLUE = '#2c55ff', GREY = '#d5d8de'

/** `centre` is the controller's centre across, `back` its far edge (toward the wall) and `base` the table top. */
export function dualsenseBoxes(centre: number, back: number, base: number): PadBox[] {
  // Picture pixel (x right, y down) to the house frame: the picture's right is the sitter's right, which is lower u when facing the wall.
  const u = (x: number) => centre - (x - 600) * K
  const v = (y: number) => back + (y - 40) * K
  const span = (a: number, b: number): [number, number] => [Math.min(u(a), u(b)), Math.max(u(a), u(b))]
  const depth = (a: number, b: number): [number, number] => [v(a), v(b)]
  const up = (from: number, to: number): [number, number] => [base + from, base + to]
  const disc = (id: string, x: number, y: number, radius: number, from: number, to: number, color: string): PadBox =>
    ({ id, u: span(x - radius, x + radius), v: depth(y - radius, y + radius), y: up(from, to), color, shape: 'ellipse' })
  const pad = (id: string, x: number, y: number, half: number, from: number, to: number, color: string): PadBox =>
    ({ id, u: span(x - half, x + half), v: depth(y - half, y + half), y: up(from, to), color })
  return [
    // The white shell: the upper body, and the two grips that run down to the front edge.
    { id: 'upper', u: span(120, 1080), v: depth(60, 470), y: up(.014, .036), color: WHITE },
    { id: 'grip-left', u: span(60, 400), v: depth(300, 760), y: up(0, .044), color: WHITE },
    { id: 'grip-right', u: span(800, 1140), v: depth(300, 760), y: up(0, .044), color: WHITE },
    // The black centre, which the sticks stand on, and the touchpad over it.
    { id: 'centre', u: span(330, 870), v: depth(280, 520), y: up(.008, .03), color: BLACK },
    { id: 'touchpad', u: span(385, 800), v: depth(62, 278), y: up(.036, .0395), color: '#eef1f9' },
    { id: 'light-left', u: span(370, 385), v: depth(75, 270), y: up(.034, .039), color: BLUE },
    { id: 'light-right', u: span(800, 815), v: depth(75, 270), y: up(.034, .039), color: BLUE },
    // The triggers, black, on the far edge.
    { id: 'trigger-left', u: span(190, 330), v: depth(38, 95), y: up(.026, .052), color: BLACK },
    { id: 'trigger-right', u: span(870, 1010), v: depth(38, 95), y: up(.026, .052), color: BLACK },
    // The two sticks, black caps on the black centre.
    disc('stick-left', 425, 395, 70, .03, .042, '#26272c'),
    disc('stick-right', 770, 395, 70, .03, .042, '#26272c'),
    // The D-pad: a white cross on the left.
    pad('dpad-up', 255, 195, 38, .036, .041, WHITE), pad('dpad-down', 255, 305, 38, .036, .041, WHITE),
    pad('dpad-left', 200, 250, 38, .036, .041, WHITE), pad('dpad-right', 310, 250, 38, .036, .041, WHITE),
    // The four face buttons, in a diamond on the right, light grey.
    disc('button-triangle', 938, 165, 34, .036, .042, GREY), disc('button-circle', 1018, 248, 34, .036, .042, GREY),
    disc('button-cross', 938, 325, 34, .036, .042, GREY), disc('button-square', 858, 248, 34, .036, .042, GREY),
    // The create and options buttons, small ovals either side of the touchpad, the PS button and the microphone mark on the black.
    pad('create', 345, 125, 14, .036, .04, GREY), pad('options', 855, 125, 14, .036, .04, GREY),
    pad('ps-button', 600, 385, 20, .03, .033, '#3a3c44'),
    { id: 'microphone', u: span(575, 625), v: depth(448, 458), y: up(.03, .032), color: '#3a3c44' },
  ]
}
