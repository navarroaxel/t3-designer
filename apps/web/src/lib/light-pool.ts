/** A point light the scene could have: where it is, its colour, how strong and how far it reaches. */
export type LightSource = { id: string; position: [number, number, number]; color: string; intensity: number; distance: number; /** Sources of one group are shown together or not at all, like the three downlights of a light box. */ group?: string }

/**
 * Which of `sources` the pool shows: the `size` nearest to `from`, keeping the ones already shown in the slot they have so that a light does not hop from one lamp to another when two are about as
 * near. A group goes in as a unit, as near as its nearest member, and only if all of it fits in the slots left: its sources are all lit or all out. Returns one entry per slot: the id of the source it carries, or null.
 */
export function chooseSources(sources: readonly LightSource[], from: readonly [number, number, number], previous: readonly (string | null)[], size: number): (string | null)[] {
  const distance = (source: LightSource) => Math.hypot(source.position[0] - from[0], source.position[1] - from[1], source.position[2] - from[2])
  const units = new Map<string, LightSource[]>()
  for (const source of sources) units.set(source.group ? `group:${source.group}` : source.id, [...(units.get(source.group ? `group:${source.group}` : source.id) ?? []), source])
  const ranked = [...units.values()].map(members => ({ members, near: Math.min(...members.map(distance)) })).sort((a, b) => a.near - b.near)
  const nearest: string[] = []
  for (const { members } of ranked) if (nearest.length + members.length <= size) nearest.push(...members.map(source => source.id))
  const slots: (string | null)[] = Array.from({ length: size }, (_, index) => previous[index] && nearest.includes(previous[index]!) ? previous[index]! : null)
  const free = slots.flatMap((id, index) => id ? [] : [index]), kept = new Set(slots)
  for (const id of nearest) if (!kept.has(id) && free.length) slots[free.shift()!] = id
  return slots
}

