import type { Apartment as ApartmentData } from '@t3-designer/scene-schema'
import { Floor } from './Floor'
import { Wall } from './Wall'

type ApartmentProps = {
  apartment: ApartmentData
  cutaway: boolean
}

export function Apartment({ apartment, cutaway }: ApartmentProps) {
  return (
    <group>
      <Floor polygon={apartment.perimeter} color="#d4d4c9" thickness={0.14} />
      {apartment.rooms.map((room) => (
        <Floor key={room.id} polygon={room.polygon} color={room.color} elevation={0.008} />
      ))}
      {apartment.balcony && (
        <Floor polygon={apartment.balcony.polygon} color="#dce1d1" thickness={0.14} />
      )}
      {apartment.walls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          doors={apartment.doors.filter((door) => door.wallId === wall.id)}
          windows={apartment.windows.filter((window) => window.wallId === wall.id)}
          cutaway={cutaway}
        />
      ))}
    </group>
  )
}
