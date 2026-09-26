import { Component, Suspense, useMemo, type ReactNode } from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { Mesh } from 'three'
import { assetCatalog, currentFixtures } from '../data/current-state'

type AssetBoundaryProps = { label: string; url: string; children: ReactNode }

class AssetBoundary extends Component<AssetBoundaryProps, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) {
      return (
        <Html center>
          <span role="status" style={{ display: 'block', width: 135, padding: '7px 10px', borderRadius: 8, background: '#f4eee5', color: '#76513c', font: '11px/1.4 system-ui', textAlign: 'center' }}>
            No se pudo cargar: {this.props.label}
            <button type="button" onClick={() => { useGLTF.clear(this.props.url); this.setState({ failed: false }) }} style={{ display: 'block', margin: '5px auto 0', cursor: 'pointer' }}>Reintentar</button>
          </span>
        </Html>
      )
    }
    return this.props.children
  }
}

function FixtureModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const model = useMemo(() => {
    // Clone nodes per instance; geometry and immutable PBR materials are shared.
    // In particular the three radiators must never reparent one cached scene.
    const clone = scene.clone(true)
    clone.traverse((node) => {
      if (node instanceof Mesh) {
        node.castShadow = true
        node.receiveShadow = true
      }
    })
    return clone
  }, [scene])
  return <primitive object={model} dispose={null} />
}

export function Fixtures() {
  return (
    <group name="current-state-fixtures">
      {currentFixtures.map((fixture) => {
        const asset = assetCatalog.find((candidate) => candidate.id === fixture.assetId)
        if (!asset) return null
        return (
          <group key={fixture.id} name={fixture.id} position={fixture.position} rotation={[0, fixture.rotation, 0]} userData={{ roomId: fixture.roomId, label: fixture.label, evidence: fixture.evidence }}>
            <AssetBoundary label={fixture.label} url={asset.url}>
              <Suspense fallback={null}>
                <FixtureModel url={asset.url} />
              </Suspense>
            </AssetBoundary>
          </group>
        )
      })}
    </group>
  )
}
