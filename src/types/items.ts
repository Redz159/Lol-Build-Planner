import { newId } from '../lib/id'

export const ITEM_SLOT_IDS = ['starter', 'item1', 'boots', 'item2', 'item3', 'item4', 'item5', 'item6'] as const
export type ItemSlotId = (typeof ITEM_SLOT_IDS)[number]

export const ITEM_SLOT_LABELS: Record<ItemSlotId, string> = {
  starter: 'Starter Items',
  item1: '1st Item',
  boots: 'Boots',
  item2: '2nd Item',
  item3: '3rd Item',
  item4: '4th Item',
  item5: '5th Item',
  item6: '6th Item',
}

export interface ItemPlacement {
  id: string
  itemId: string
}

export type BuildItems = Record<ItemSlotId, ItemPlacement[]>

export function emptyBuildItems(): BuildItems {
  return { starter: [], item1: [], boots: [], item2: [], item3: [], item4: [], item5: [], item6: [] }
}

// `value` is untrusted data straight from JSON.parse (localStorage or an imported file),
// potentially from an older schema version — tolerate anything and fall back to empty.
export function normalizeBuildItems(value: unknown): BuildItems {
  const result = emptyBuildItems()
  if (!value || typeof value !== 'object') return result
  for (const slotId of ITEM_SLOT_IDS) {
    const raw = (value as Record<string, unknown>)[slotId]
    if (!Array.isArray(raw)) continue
    result[slotId] = raw
      .filter((p): p is Partial<ItemPlacement> => !!p && typeof p === 'object' && typeof p.itemId === 'string')
      .map((p) => ({ id: typeof p.id === 'string' ? p.id : newId(), itemId: p.itemId as string }))
  }
  return result
}

export type ItemExclusionPair = [string, string]

export function normalizeItemExclusions(value: unknown): ItemExclusionPair[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (p): p is ItemExclusionPair => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && typeof p[1] === 'string',
  )
}
