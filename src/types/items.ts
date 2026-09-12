import { newId } from '../lib/id'

// `kind` marks a slot as one of the original built-in slots with special behavior:
// 'starter'/'boots' auto-filter the item browser to that attribute when the slot is active
// (boots additionally rejects non-boots items), and 'adc-bonus' hides the slot unless the
// loadout has the ADC role. Renaming a slot clears its kind — it becomes a plain slot, same
// as any user-added one. Custom slots never carry a kind.
export type ItemSlotKind = 'starter' | 'boots' | 'adc-bonus'

export interface ItemSlot {
  id: string
  label: string
  kind?: ItemSlotKind
}

// The slot layout every new loadout starts with, mirroring League's own build panel.
export const DEFAULT_ITEM_SLOTS: ItemSlot[] = [
  { id: 'starter', label: 'Starter Items', kind: 'starter' },
  { id: 'early', label: 'Early Components' },
  { id: 'item1', label: '1st Item' },
  { id: 'boots', label: 'Boots', kind: 'boots' },
  { id: 'item2', label: '2nd Item' },
  { id: 'item3', label: '3rd Item' },
  { id: 'item4', label: '4th Item' },
  { id: 'item5', label: '5th Item' },
  { id: 'item6', label: '6th Item', kind: 'adc-bonus' },
]

const VALID_SLOT_KINDS = new Set<ItemSlotKind>(['starter', 'boots', 'adc-bonus'])

// `value` is untrusted data straight from JSON.parse (localStorage or an imported file). An
// older schema version has no itemSlots at all, so falling back to the defaults both handles
// that migration and guards against a build somehow ending up with zero slots.
export function normalizeItemSlots(value: unknown): ItemSlot[] {
  if (!Array.isArray(value)) return DEFAULT_ITEM_SLOTS.map((s) => ({ ...s }))
  const seenIds = new Set<string>()
  const result: ItemSlot[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const id = (raw as Record<string, unknown>).id
    const label = (raw as Record<string, unknown>).label
    if (typeof id !== 'string' || typeof label !== 'string' || seenIds.has(id)) continue
    seenIds.add(id)
    const kind = (raw as Record<string, unknown>).kind
    result.push({ id, label, ...(typeof kind === 'string' && VALID_SLOT_KINDS.has(kind as ItemSlotKind) ? { kind: kind as ItemSlotKind } : {}) })
  }
  return result.length > 0 ? result : DEFAULT_ITEM_SLOTS.map((s) => ({ ...s }))
}

export interface ItemPlacement {
  id: string
  itemId: string
}

// Keyed by ItemSlot.id — always kept in sync with a loadout's itemSlots (one entry per slot).
export type BuildItems = Record<string, ItemPlacement[]>

export function emptyBuildItems(slots: ItemSlot[] = DEFAULT_ITEM_SLOTS): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, []]))
}

// `value` is untrusted data straight from JSON.parse (localStorage or an imported file),
// potentially from an older schema version — tolerate anything and fall back to empty. Only
// entries matching a known slot are kept, since the two are meant to stay in lockstep.
export function normalizeBuildItems(value: unknown, slots: ItemSlot[]): BuildItems {
  const result = emptyBuildItems(slots)
  if (!value || typeof value !== 'object') return result
  for (const slot of slots) {
    const raw = (value as Record<string, unknown>)[slot.id]
    if (!Array.isArray(raw)) continue
    result[slot.id] = raw
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

// Freeform per-item notes, keyed by item id, shown as an addition to that item's tooltip.
export type ItemNotes = Record<string, string>

export function normalizeItemNotes(value: unknown): ItemNotes {
  const result: ItemNotes = {}
  if (!value || typeof value !== 'object') return result
  for (const [itemId, note] of Object.entries(value as Record<string, unknown>)) {
    if (typeof note === 'string' && note.trim() !== '') result[itemId] = note
  }
  return result
}
