import type { ItemSet, Loadout } from '../types/build'
import type { BuildItems, ItemSlot, ItemSlotNotes } from '../types/items'
import { newId } from './id'
import type { LayoutTemplate } from './itemSetLayouts'

// Every item-set (each category, or the loadout's own plain one) keeps its own slot list, so
// adding/removing a slot only has to keep that set's items in lockstep with its itemSlots.
// Example builds have their own fixed slots (EXAMPLE_BUILD_SLOTS) and aren't touched. Each helper
// returns the item-set patch to apply.
export function addItemSlot(set: ItemSet): Partial<ItemSet> {
  const slot: ItemSlot = { id: newId(), label: 'New Slot' }
  return {
    itemSlots: [...set.itemSlots, slot],
    items: { ...set.items, [slot.id]: [] },
  }
}

// Renaming clears the slot's kind (it becomes a plain slot), but keeps multiSelect. Returns
// undefined when nothing would change.
export function renameItemSlot(set: ItemSet, slotId: string, label: string): Partial<ItemSet> | undefined {
  const trimmed = label.trim()
  const slot = set.itemSlots.find((s) => s.id === slotId)
  if (!slot || !trimmed || trimmed === slot.label) return undefined
  return {
    itemSlots: set.itemSlots.map((s) =>
      s.id === slotId ? { id: s.id, label: trimmed, ...(s.multiSelect ? { multiSelect: true } : {}) } : s,
    ),
  }
}

// Boots never pick multiple (only one pair fits in a build), so that toggle is a no-op.
export function toggleItemSlotMultiSelect(set: ItemSet, slotId: string): Partial<ItemSet> | undefined {
  const slot = set.itemSlots.find((s) => s.id === slotId)
  if (!slot || slot.kind === 'boots') return undefined
  const turningOff = !!slot.multiSelect
  return {
    itemSlots: set.itemSlots.map((s) => {
      if (s.id !== slotId) return s
      if (turningOff) {
        const { multiSelect: _multiSelect, ...rest } = s
        return rest
      }
      return { ...s, multiSelect: true }
    }),
  }
}

export function deleteItemSlot(set: ItemSet, slotId: string): Partial<ItemSet> {
  const items: BuildItems = { ...set.items }
  delete items[slotId]
  return {
    itemSlots: set.itemSlots.filter((s) => s.id !== slotId),
    items,
  }
}

// Moves a slot to just before `beforeSlotId` (or to the end when null). Id-based rather than
// index-based because the editor only shows the visible slots, so hidden ones keep their place.
// Returns undefined when nothing would change.
export function moveItemSlot(set: ItemSet, slotId: string, beforeSlotId: string | null): Partial<ItemSet> | undefined {
  const slot = set.itemSlots.find((s) => s.id === slotId)
  if (!slot || slotId === beforeSlotId) return undefined
  const rest = set.itemSlots.filter((s) => s.id !== slotId)
  const index = beforeSlotId === null ? rest.length : rest.findIndex((s) => s.id === beforeSlotId)
  if (index === -1) return undefined
  const itemSlots = [...rest.slice(0, index), slot, ...rest.slice(index)]
  if (itemSlots.every((s, i) => s === set.itemSlots[i])) return undefined
  return { itemSlots }
}

// Replaces the item-set's slots with the layout's, all empty. Only offered while the set has
// nothing placed (see ItemsEditor's layout picker), so there's no item to carry over.
export function applyItemSetLayout(template: LayoutTemplate): Partial<ItemSet> {
  const itemSlots: ItemSlot[] = template.slots.map((s) => ({
    id: newId(),
    label: s.label,
    ...(s.kind ? { kind: s.kind } : {}),
    ...(s.multiSelect ? { multiSelect: true } : {}),
  }))
  return {
    itemSlots,
    items: Object.fromEntries(itemSlots.map((s) => [s.id, []])),
    layoutChosen: true,
  }
}

// "Clear items": drops every slot, item, example build, exclude, requirement and situational
// flag, which sends the set back to the layout picker.
export function clearItemSet(): Partial<ItemSet> {
  return {
    itemSlots: [],
    items: {},
    exampleBuilds: [],
    layoutChosen: false,
    itemExclusions: [],
    itemRequirements: [],
    itemSituational: {},
  }
}

// Local notes are keyed by slot id, so once no item-set in the loadout has a slot anymore its
// notes would just linger. Slot ids can be shared between item-sets (a duplicated category keeps
// its source's ids), so a note only goes once no set uses its slot.
export function pruneItemSlotNotes(loadout: Loadout): ItemSlotNotes {
  const inUse = new Set([loadout, ...loadout.categories].flatMap((set) => set.itemSlots.map((s) => s.id)))
  const entries = Object.entries(loadout.itemSlotNotes)
  const kept = entries.filter(([key]) => inUse.has(key.slice(0, key.indexOf('::'))))
  return kept.length === entries.length ? loadout.itemSlotNotes : Object.fromEntries(kept)
}
