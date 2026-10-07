import { HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, Color, SRGBColorSpace } from 'three'
import { PANELS, PANEL_SPEC, TILT_DEGREES } from '../data/solar-array'

const FRAME_COLOR = '#c5cbd0'
/** A panel the sun does not reach turns this grey-blue, so shading reads at a glance. */
const SHADED_COLOR = new Color('#8b97aa')

/**
 * The face of a 620 Wp half-cut module, as in the maker's picture: 6 strings across and 12 rows of half cells in each half along its length, dark blue cells with fine ridges and
 * silver busbars, separated by thin white joints and a wider gap at the middle. The canvas is the glass area, 2.385 by 1.054 m, with its long side along x.
 */
function moduleFace() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048; canvas.height = 905
  const context = canvas.getContext('2d')!
  const gradient = context.createLinearGradient(0, 0, 2048, 905)
  gradient.addColorStop(0, '#0b1230'); gradient.addColorStop(.5, '#16224a'); gradient.addColorStop(1, '#0c1535')
  context.fillStyle = gradient
  context.fillRect(0, 0, 2048, 905)
  const rows = 12, columns = 6, halfWidth = (2048 - 8) / 2, cellX = halfWidth / rows, cellY = 905 / columns
  for (let half = 0; half < 2; half++) {
    const x0 = 4 + half * (halfWidth + 0)
    context.strokeStyle = 'rgba(205, 214, 232, .55)'; context.lineWidth = 2
    for (let row = 0; row <= rows; row++) { context.beginPath(); context.moveTo(x0 + row * cellX, 0); context.lineTo(x0 + row * cellX, 905); context.stroke() }
    for (let column = 0; column <= columns; column++) { context.beginPath(); context.moveTo(x0, column * cellY); context.lineTo(x0 + halfWidth, column * cellY); context.stroke() }
    // The fine ridges along each cell and its two busbars.
    context.strokeStyle = 'rgba(70, 90, 150, .22)'; context.lineWidth = 1
    for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
      for (let line = 1; line < 9; line++) { const y = column * cellY + cellY * line / 9; context.beginPath(); context.moveTo(x0 + row * cellX + 2, y); context.lineTo(x0 + (row + 1) * cellX - 2, y); context.stroke() }
    }
    context.strokeStyle = 'rgba(190, 198, 215, .35)'
    for (let row = 0; row < rows; row++) for (const at of [.3, .7]) { context.beginPath(); context.moveTo(x0 + (row + at) * cellX, 0); context.lineTo(x0 + (row + at) * cellX, 905); context.stroke() }
  }
  context.fillStyle = '#cfd6e6'
  context.fillRect(2048 / 2 - 4, 0, 8, 905)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/**
 * The installed panels (up to 16) on the azotea, in the house frame (local x is u, local z is -v).
 * Each panel is a group tilted about the v axis, with the low edge toward the street.
 * `installed` limits them to the panels chosen (all when null). `physical` renders only what shades: one solid box per panel, for the shadow pass. `shade` is each
 * panel's lit share of the beam; the less lit, the greyer the glass.
 */
export function SolarPanels({ physical = false, shade = null, installed = null }: { physical?: boolean; shade?: Record<string, number> | null; installed?: ReadonlySet<string> | null }) {
  const { lengthM, widthM, thicknessM } = PANEL_SPEC
  const tilt = TILT_DEGREES * Math.PI / 180
  const face = useMemo(() => moduleFace(), [])
  useEffect(() => () => face.dispose(), [face])
  return <group position={[HOUSE_CENTER[0], 0, HOUSE_CENTER[1]]} rotation={[0, HOUSE_YAW, 0]}>
    {PANELS.filter(panel => !installed || installed.has(panel.id)).map(panel => {
      const position: [number, number, number] = [
        (panel.u[0] + panel.u[1]) / 2,
        (panel.lowEdgeY + panel.highEdgeY) / 2,
        -(panel.v[0] + panel.v[1]) / 2,
      ]
      return <group key={panel.id} position={position} rotation={[0, 0, tilt]}>
        <mesh castShadow={physical} receiveShadow>
          <boxGeometry args={[lengthM, thicknessM, widthM]} />
          <meshStandardMaterial color={FRAME_COLOR} roughness={.5} metalness={.4} />
        </mesh>
        {!physical && <mesh position={[0, thicknessM / 2 + .002, 0]} receiveShadow>
          <boxGeometry args={[lengthM - .08, .004, widthM - .08]} />
          <meshStandardMaterial color="#ffffff" map={face} emissive={SHADED_COLOR} emissiveIntensity={shade ? (1 - (shade[panel.id] ?? 1)) * .55 : 0} roughness={.22} metalness={.3} />
        </mesh>}
      </group>
    })}
  </group>
}
