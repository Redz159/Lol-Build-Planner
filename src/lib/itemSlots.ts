import type { Loadout } from '../types/build'
import { itemSlotNoteKey, type BuildItems, type ItemSlot } from '../types/items'
import { addSlotToExampleBuilds, removeSlotFromExampleBuilds } from './exampleBuilds'
import { newId } from './id'

// Slots are shared across every category, so adding/removing one has to keep loadout.items,
// every category's own item map, and every example build's item map in lockstep with
// loadout.itemSlots. Each helper returns the loadout patch to apply.
export function addItemSlot(loadout: Loadout): Partial<Loadout> {
  const slot: ItemSlot = { id: newId(), label: 'New Slot' }
  return {
    itemSlots: [...loadout.itemSlots, slot],
    items: { ...loadout.items, [slot.id]: [] },
    exampleBuilds: addSlotToExampleBuilds(loadout.exampleBuilds, slot.id),
    categories: loadout.categories.map((c) => ({
      ...c,
      items: { ...c.items, [slot.id]: [] },
      exampleBuilds: addSlotToExampleBuilds(c.exampleBuilds, slot.id),
    })),
  }
}

// Renaming clears the slot's kind (it becomes a plain slot), but keeps multiSelect. Returns
// undefined when nothing would change.
export function renameItemSlot(loadout: Loadout, slotId: string, label: string): Partial<Loadout> | undefined {
  const trimmed = label.trim()
  const slot = loadout.itemSlots.find((s) => s.id === slotId)
  if (!slot || !trimmed || trimmed === slot.label) return undefined
  return {
    itemSlots: loadout.itemSlots.map((s) =>
      s.id === slotId ? { id: s.id, label: trimmed, ...(s.multiSelect ? { multiSelect: true } : {}) } : s,
    ),
  }
}

export function toggleItemSlotMultiSelect(loadout: Loadout, slotId: string): Partial<Loadout> | undefined {
  const slot = loadout.itemSlots.find((s) => s.id === slotId)
  if (!slot) return undefined
  const turningOff = !!slot.multiSelect
  return {
    itemSlots: loadout.itemSlots.map((s) => {
      if (s.id !== slotId) return s
      if (turningOff) {
        const { multiSelect: _multiSelect, ...rest } = s
        return rest
      }
      return { ...s, multiSelect: true }
    }),
  }
}

export function deleteItemSlot(loadout: Loadout, slotId: string): Partial<Loadout> {
  const stripSlot = (buildItems: BuildItems): BuildItems => {
    const next = { ...buildItems }
    delete next[slotId]
    return next
  }
  const prefix = itemSlotNoteKey(slotId, '')
  const nextSlotNotes = Object.fromEntries(Object.entries(loadout.itemSlotNotes).filter(([key]) => !key.startsWith(prefix)))
  return {
    itemSlots: loadout.itemSlots.filter((s) => s.id !== slotId),
    items: stripSlot(loadout.items),
    exampleBuilds: removeSlotFromExampleBuilds(loadout.exampleBuilds, slotId),
    categories: loadout.categories.map((c) => ({
      ...c,
      items: stripSlot(c.items),
      exampleBuilds: removeSlotFromExampleBuilds(c.exampleBuilds, slotId),
    })),
    itemSlotNotes: nextSlotNotes,
  }
}

// Moves a slot to just before `beforeSlotId` (or to the end when null). Id-based rather than
// index-based because the editor only shows the visible slots, so hidden ones keep their place.
// Returns undefined when nothing would change.
export function moveItemSlot(loadout: Loadout, slotId: string, beforeSlotId: string | null): Partial<Loadout> | undefined {
  const slot = loadout.itemSlots.find((s) => s.id === slotId)
  if (!slot || slotId === beforeSlotId) return undefined
  const rest = loadout.itemSlots.filter((s) => s.id !== slotId)
  const index = beforeSlotId === null ? rest.length : rest.findIndex((s) => s.id === beforeSlotId)
  if (index === -1) return undefined
  const itemSlots = [...rest.slice(0, index), slot, ...rest.slice(index)]
  if (itemSlots.every((s, i) => s === loadout.itemSlots[i])) return undefined
  return { itemSlots }
}
