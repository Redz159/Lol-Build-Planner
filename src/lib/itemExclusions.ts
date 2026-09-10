import type { ItemExclusionPair } from '../types/items'

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
