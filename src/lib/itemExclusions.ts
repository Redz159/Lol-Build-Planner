import type { DDragonItem } from '../types/ddragon'
import type { ItemExclusionPair } from '../types/items'
import { ITEM_GROUPS } from '../data/itemGroups'

// Riot's own shop restriction groups (boots, Lifeline items, ...): any two items sharing a
// group can't both be owned, so they're excluded from each other automatically.
export function builtinExclusionPairs(items: DDragonItem[]): ItemExclusionPair[] {
  const idByName = new Map(items.map((item) => [item.name, item.id]))
  const pairs: ItemExclusionPair[] = []
  for (const group of ITEM_GROUPS) {
    const ids = group.map((name) => idByName.get(name)).filter((id): id is string => !!id)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]])
    }
  }
  return pairs
}

export function isExcludedPair(pairs: ItemExclusionPair[], a: string, b: string): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

export function toggleExclusionPair(pairs: ItemExclusionPair[], a: string, b: string): ItemExclusionPair[] {
  if (isExcludedPair(pairs, a, b)) {
    return pairs.filter(([x, y]) => !((x === a && y === b) || (x === b && y === a)))
  }
  return [...pairs, [a, b]]
}

export function exclusionPartners(pairs: ItemExclusionPair[], itemId: string): string[] {
  const partners = new Set<string>()
  for (const [a, b] of pairs) {
    if (a === itemId) partners.add(b)
    else if (b === itemId) partners.add(a)
  }
  return [...partners]
}
