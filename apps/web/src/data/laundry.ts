/**
 * The laundry on the first floor's left arm and the stair to the azotea, from the owner's photos and
 * measures. House frame [u, v]. It is the roof of the ground-floor band on the north-east, at first-floor
 * level; the laundry's interior is 1.96 m wide and 3 m long from the kitchen's rear wall to where the
 * stair's first flight ends, and its wall on the light well, to the south-west, is glazed.
 *
 * The stair has two flights side by side, each 0.9 m wide: the first, inside the laundry on the light-well
 * side, climbs 1 m to a landing outside the laundry's glazed back wall; the second, outside (the green
 * steps, with a 1 m wall on its side opposite the party wall as a railing), turns back over the laundry's north-east half and climbs to the azotea. The landing is 2 m wide
 * and 0.9 m deep, uncovered, with 1 m walls. The laundry's roof, over the glazed half, is a single pitch of
 * sheet that falls toward the light well. The glazed back wall has the door at the top of the first flight,
 * with a glazed jamb on its light-well side, and a solid sill under it up to the landing's level.
 *
 * Assumed, not measured: the 25 cm treads, the 20 cm of concrete of the steps, the heights of the roof and
 * of the walls, and the width of the glazing's frames.
 */
export type LaundryVolume = {
  id: string
  label: string
  u: [number, number]
  v: [number, number]
  base: number
  height: number
  /** A single pitch rising toward +v, by this many metres across the footprint. */
  rise?: number
}

export const LAUNDRY = {
  width: 1.96,
  length: 3,
  landing: { width: 2, depth: .9, rise: 1, wall: 1 },
  flight: { width: .9, tread: .25, risersFirst: 6, risersSecond: 12, slab: .2 },
  roof: { thickness: .1, eaveHeight: 3, rise: .3 },
  /** The door at the top of the first flight, onto the landing (assumed 0.85 m by 1.95 m, taking the flight's width less its frame). */
  door: { width: .85, height: 1.95, frame: .05 },
  wallThickness: .1,
  /** The wall along the second flight, opposite the party wall, that works as its railing. */
  guard: 1,
  /** The tall white wall on the party wall with neighbour A, over the laundry and the stair. */
  partyWallTop: 6.6,
}

/** `neInner` is the north-east party wall's inner face; `floor` the first floor's level and `roof` the azotea's. */
export function laundryVolumes(floor: number, neInner: number, partyWall: number, rearU: number, roof: number): LaundryVolume[] {
  const { width, length, landing, flight, roof: roofSpec, door, wallThickness, partyWallTop, guard } = LAUNDRY
  const v0 = neInner - width, doorU = rearU + length
  const volumes: LaundryVolume[] = []
  const landingLevel = floor + landing.rise
  // Walls and glazing.
  volumes.push(
    { id: 'HOUSE-LAUNDRY-GLASS', label: 'Casa · lavadero · vidrio sobre el pulmón', u: [rearU, doorU], v: [v0 - wallThickness, v0], base: floor, height: floor + roofSpec.eaveHeight },
    { id: 'HOUSE-LAUNDRY-BACK-SILL', label: 'Casa · lavadero · antepecho del fondo', u: [doorU, doorU + wallThickness], v: [v0 - wallThickness, v0 + flight.width], base: floor, height: floor + landing.rise },
    { id: 'HOUSE-LAUNDRY-BACK-JAMB-A', label: 'Casa · lavadero · fijo del fondo', u: [doorU, doorU + wallThickness], v: [v0 - wallThickness, v0 + door.frame], base: floor + landing.rise, height: floor + roofSpec.eaveHeight },
    { id: 'HOUSE-LAUNDRY-DOOR', label: 'Casa · lavadero · puerta al descanso', u: [doorU, doorU + wallThickness], v: [v0 + door.frame, v0 + door.frame + door.width], base: floor + landing.rise, height: floor + landing.rise + door.height },
    { id: 'HOUSE-LAUNDRY-BACK-TRANSOM', label: 'Casa · lavadero · paño sobre la puerta', u: [doorU, doorU + wallThickness], v: [v0 + door.frame, v0 + door.frame + door.width], base: floor + landing.rise + door.height, height: floor + roofSpec.eaveHeight },
    { id: 'HOUSE-LAUNDRY-BACK-NE', label: 'Casa · lavadero · pared del fondo bajo la escalera', u: [doorU, doorU + wallThickness], v: [v0 + flight.width, neInner], base: floor, height: floor + landing.rise - .2 },
    { id: 'HOUSE-LAUNDRY-PARTY', label: 'Casa · lavadero · medianera con A', u: [rearU, doorU + wallThickness + landing.depth + wallThickness], v: [neInner, neInner + partyWall], base: floor, height: partyWallTop },
    { id: 'HOUSE-LAUNDRY-ROOF', label: 'Casa · lavadero · techo de chapa', u: [rearU, doorU + wallThickness], v: [v0 - wallThickness, neInner - flight.width - wallThickness], base: floor + roofSpec.eaveHeight, height: floor + roofSpec.eaveHeight + roofSpec.thickness, rise: roofSpec.rise },
  )
  // The landing outside the back wall, uncovered, with walls on the rear and the light-well side.
  const landingU: [number, number] = [doorU + wallThickness, doorU + wallThickness + landing.depth]
  volumes.push(
    { id: 'HOUSE-LAUNDRY-LANDING', label: 'Casa · descanso de la escalera', u: landingU, v: [neInner - landing.width, neInner], base: landingLevel - flight.slab, height: landingLevel },
    { id: 'HOUSE-LAUNDRY-LANDING-REAR', label: 'Casa · descanso · muro del fondo', u: [landingU[1], landingU[1] + wallThickness], v: [neInner - landing.width - wallThickness, neInner], base: landingLevel, height: landingLevel + landing.wall },
    { id: 'HOUSE-LAUNDRY-LANDING-SIDE', label: 'Casa · descanso · muro sobre el pulmón', u: landingU, v: [neInner - landing.width - wallThickness, neInner - landing.width], base: landingLevel, height: landingLevel + landing.wall },
  )
  // First flight, inside, on the light-well side: the last step is the landing's level at the door.
  const riser1 = landing.rise / flight.risersFirst
  for (let step = 1; step < flight.risersFirst; step++) {
    const end = doorU - (flight.risersFirst - 1 - step) * flight.tread
    volumes.push({ id: `HOUSE-LAUNDRY-STEP-1-${step}`, label: `Casa · escalera · tramo 1 · escalón ${step}`, u: [end - flight.tread, end], v: [v0, v0 + flight.width], base: floor, height: floor + step * riser1 })
  }
  // Second flight, outside, from the landing back toward the azotea over the laundry's north-east half.
  const riser2 = (roof - landingLevel) / flight.risersSecond
  for (let step = 1; step <= flight.risersSecond; step++) {
    const start = landingU[0] - (step - 1) * flight.tread
    const top = landingLevel + step * riser2
    volumes.push({ id: `HOUSE-LAUNDRY-STEP-2-${step}`, label: `Casa · escalera · tramo 2 · escalón ${step}`, u: [start - flight.tread, start], v: [neInner - flight.width, neInner], base: top - flight.slab - riser2, height: top })
    // The 1 m wall on the side opposite the party wall, which works as the flight's railing: it rises with the steps.
    volumes.push({ id: `HOUSE-LAUNDRY-GUARD-${step}`, label: `Casa · escalera · baranda de mampostería ${step}`, u: [start - flight.tread, start], v: [neInner - flight.width - wallThickness, neInner - flight.width], base: top - flight.slab - riser2, height: top + guard })
  }
  return volumes
}
