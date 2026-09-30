import { HOUSE_CENTER, HOUSE_YAW } from '../data/building-site'
import { Color } from 'three'
import { PANELS, PANEL_SPEC, TILT_DEGREES } from '../data/solar-array'

const FRAME_COLOR = '#c5cbd0'
const GLASS_COLOR = new Color('#1d2b4a')
/** A panel the sun does not reach turns this grey-blue, so shading reads at a glance. */
const SHADED_COLOR = new Color('#8b97aa')

/**
 * The installed panels (up to 16) on the azotea, in the house frame (local x is u, local z is -v).
 * Each panel is a group tilted about the v axis, with the low edge toward the street.
 * `installed` limits them to the panels chosen (all when null). `physical` renders only what shades: one solid box per panel, for the shadow pass. `shade` is each
 * panel's lit share of the beam; the less lit, the greyer the glass.
 */
export function SolarPanels({ physical = false, shade = null, installed = null }: { physical?: boolean; shade?: Record<string, number> | null; installed?: ReadonlySet<string> | null }) {
  const { lengthM, widthM, thicknessM } = PANEL_SPEC
  const tilt = TILT_DEGREES * Math.PI / 180
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
          <meshStandardMaterial color={GLASS_COLOR.clone().lerp(SHADED_COLOR, shade ? 1 - (shade[panel.id] ?? 1) : 0)} roughness={.25} metalness={.35} />
        </mesh>}
      </group>
    })}
  </group>
}
