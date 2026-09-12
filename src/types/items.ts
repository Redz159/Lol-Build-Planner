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

// Directional, unlike ItemExclusionPair: [itemId, requiredItemId] means itemId only belongs in
// the build once requiredItemId has also been picked. An item can carry several of these (one
// per required item), and all of them must hold — see requiredItemIds in lib/itemRequirements.
export type ItemRequirementPair = [string, string]

export function normalizeItemRequirements(value: unknown): ItemRequirementPair[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (p): p is ItemRequirementPair => Array.isArray(p) && p.length === 2 && typeof p[0] === 'string' && typeof p[1] === 'string',
  )
}

// Freeform per-item notes, keyed by item id, shown as an addition to that item's tooltip.
// This is the "global" note — the default shown wherever a slot has no note of its own below.
export type ItemNotes = Record<string, string>

export function normalizeItemNotes(value: unknown): ItemNotes {
  const result: ItemNotes = {}
  if (!value || typeof value !== 'object') return result
  for (const [itemId, note] of Object.entries(value as Record<string, unknown>)) {
    if (typeof note === 'string' && note.trim() !== '') result[itemId] = note
  }
  return result
}

// Per-(slot, item) note text, keyed by itemSlotNoteKey(slotId, itemId) — only read while that
// item is in "local" mode per ItemNoteGlobalFlags below. Each slot holding the item keeps its
// own entry here, independent of the others.
export type ItemSlotNotes = Record<string, string>

export function itemSlotNoteKey(slotId: string, itemId: string): string {
  return `${slotId}::${itemId}`
}

export function normalizeItemSlotNotes(value: unknown): ItemSlotNotes {
  const result: ItemSlotNotes = {}
  if (!value || typeof value !== 'object') return result
  for (const [key, note] of Object.entries(value as Record<string, unknown>)) {
    if (typeof note === 'string' && note.trim() !== '') result[key] = note
  }
  return result
}

// Whether an item's note is "global" (one note shared by every slot it's placed in, stored in
// ItemNotes) or "local" (each slot keeps its own note in ItemSlotNotes). This is a single flag
// per item — not per slot — so toggling it for an item anywhere flips it everywhere the item
// is placed. Absent means global (true), the default every item starts in.
export type ItemNoteGlobalFlags = Record<string, boolean>

export function normalizeItemNoteGlobalFlags(value: unknown): ItemNoteGlobalFlags {
  const result: ItemNoteGlobalFlags = {}
  if (!value || typeof value !== 'object') return result
  for (const [itemId, isGlobal] of Object.entries(value as Record<string, unknown>)) {
    if (isGlobal === false) result[itemId] = false
  }
  return result
}

// The note text to actually show for an item placed in a given slot. While the item is global,
// this is its shared ItemNotes entry regardless of slot; while local, it's that slot's own
// ItemSlotNotes entry (or nothing at all, even if a global note happens to still be stored) —
// never falls back to the global note, since that would resurrect a note the slot doesn't have.
export function effectiveItemNote(
  itemNotes: ItemNotes,
  itemSlotNotes: ItemSlotNotes,
  itemNoteGlobal: ItemNoteGlobalFlags,
  slotId: string,
  itemId: string,
): string | undefined {
  const isGlobal = itemNoteGlobal[itemId] ?? true
  return isGlobal ? itemNotes[itemId] : itemSlotNotes[itemSlotNoteKey(slotId, itemId)]
}
