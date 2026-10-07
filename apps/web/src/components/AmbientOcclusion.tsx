import { ToneMappingMode } from 'postprocessing'
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing'

/**
 * Soft shadows where surfaces meet: under a table, in a corner, behind a TV. Real-time light has none of them, and without them boxes look stuck on, like voxels.
 * The composer takes over the renderer's tone mapping, so ACES, the canvas's own, is applied here to keep the colours as they were.
 */
export function AmbientOcclusion({ enabled }: { enabled: boolean }) {
  if (!enabled) return null
  return <EffectComposer multisampling={4} enableNormalPass={false}>
    <N8AO aoRadius={.55} distanceFalloff={1} intensity={2.4} quality="medium" halfRes />
    <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
  </EffectComposer>
}
