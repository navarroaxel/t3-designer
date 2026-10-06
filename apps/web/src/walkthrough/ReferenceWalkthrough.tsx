import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HOUSE_FLOOR_ORDER } from '../data/house-interior'
import type { Floor } from '../data/house-plan'
import type { SolarStudy } from '../lib/useSolarStudy'
import { Walkthrough } from './Walkthrough'
import { publicScene } from '../lib/public-scene'

export function ReferenceWalkthrough({ solar, floor, onFloorChange, onClose }: {
  solar: SolarStudy; floor: Floor; onFloorChange: (floor: Floor) => void; onClose: () => void
}) {
  const { t } = useTranslation('workspace')
  const snapshot = useMemo(() => publicScene(floor, []), [floor])
  return <>
    <div className="view-buttons floor-buttons walkthrough-floors" role="group" aria-label={t('apartment.floorSwitch')}>
      {HOUSE_FLOOR_ORDER.map(item => <button key={item} aria-pressed={floor === item} onClick={() => onFloorChange(item)}>{t(item === 'ground' ? 'apartment.floorGround' : 'apartment.floorFirst')}</button>)}
    </div>
    <Walkthrough key={floor} snapshot={snapshot} initialMoment={solar.moment} reference onClose={onClose} />
  </>
}
