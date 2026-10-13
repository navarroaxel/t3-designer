/** A point light the scene could have: where it is, its colour, how strong and how far it reaches. */
export type LightSource = { id: string; position: [number, number, number]; color: string; intensity: number; distance: number; /** Where the camera has to be (x and z, in the sources' frame) for the source to be worth a place: a light shut in a room, behind walls that stop it, is not shown to a camera elsewhere. Anywhere if missing. */ region?: { x: [number, number]; z: [number, number] } }

/**
 * Which of `sources` the pool shows: the `size` nearest to `from`, keeping the ones already shown in the slot they have so that a light does not hop from one lamp to another when two are about as
 * near, among the ones whose `region` holds the camera.  Returns one entry per slot: the id of the source it carries, or null.
 */
export function chooseSources(sources: readonly LightSource[], from: readonly [number, number, number], previous: readonly (string | null)[], size: number): (string | null)[] {
  const distance = (source: LightSource) => Math.hypot(source.position[0] - from[0], source.position[1] - from[1], source.position[2] - from[2])
  const eligible = sources.filter(source => !source.region || (from[0] >= source.region.x[0] && from[0] <= source.region.x[1] && from[2] >= source.region.z[0] && from[2] <= source.region.z[1]))
  const nearest = eligible.sort((a, b) => distance(a) - distance(b)).slice(0, size).map(source => source.id)
  const slots: (string | null)[] = Array.from({ length: size }, (_, index) => previous[index] && nearest.includes(previous[index]!) ? previous[index]! : null)
  const free = slots.flatMap((id, index) => id ? [] : [index]), kept = new Set(slots)
  for (const id of nearest) if (!kept.has(id) && free.length) slots[free.shift()!] = id
  return slots
}

