import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HOUSE_FLOOR_ORDER } from '../data/house-interior'
import type { Floor } from '../data/house-plan'
import type { SolarStudy } from '../lib/useSolarStudy'
import { Walkthrough } from './Walkthrough'
import { HOUSE_FLOORS } from '../data/house-interior'
import { polygonCentroid } from '@t3-designer/geometry'
import { publicScene } from '../lib/public-scene'

export function ReferenceWalkthrough({ solar, floor, onFloorChange, onClose }: {
  solar: SolarStudy; floor: Floor; onFloorChange: (floor: Floor) => void; onClose: () => void
}) {
  const { t } = useTranslation('workspace')
  // Both floors are one visit: the stair joins them. The floor chosen above is only where the visit begins.
  const ground = useMemo(() => publicScene('ground', []), [])
  const first = useMemo(() => publicScene('first', []), [])
  // The first floor opens in the middle of the living, looking at the kitchen along the north-east party wall (yaw 0 looks toward -z).
  const start = useMemo(() => {
    const living = floor === 'first' ? HOUSE_FLOORS.first.rooms.find(room => room.id === 'kitchen-living') : undefined
    return living ? { position: polygonCentroid(living.polygon), yaw: 0, elevation: first.placement.floorElevation } : undefined
  }, [floor, first])
  return <>
    <div className="view-buttons floor-buttons walkthrough-floors" role="group" aria-label={t('apartment.floorSwitch')}>
      {HOUSE_FLOOR_ORDER.map(item => <button key={item} aria-pressed={floor === item} onClick={() => onFloorChange(item)}>{t(item === 'ground' ? 'apartment.floorGround' : 'apartment.floorFirst')}</button>)}
    </div>
    <Walkthrough key={floor} startAt={start} snapshot={ground} upper={first} initialMoment={solar.moment} reference onClose={onClose} />
  </>
}
