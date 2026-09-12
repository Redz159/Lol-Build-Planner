import type { ItemRequirementPair } from '../types/items'

export function requiredItemIds(pairs: ItemRequirementPair[], itemId: string): string[] {
  return pairs.filter(([subject]) => subject === itemId).map(([, required]) => required)
}

export function isRequiredPair(pairs: ItemRequirementPair[], itemId: string, requiredItemId: string): boolean {
  return pairs.some(([subject, required]) => subject === itemId && required === requiredItemId)
}

export function toggleRequirementPair(pairs: ItemRequirementPair[], itemId: string, requiredItemId: string): ItemRequirementPair[] {
  if (isRequiredPair(pairs, itemId, requiredItemId)) {
    return pairs.filter(([subject, required]) => !(subject === itemId && required === requiredItemId))
  }
  return [...pairs, [itemId, requiredItemId]]
}
