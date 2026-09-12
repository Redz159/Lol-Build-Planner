import type { BuildItems, ItemCategory, ItemPlacement, ItemSlot } from '../types/items'
import { emptyBuildItems } from '../types/items'
import { newId } from './id'

// Deep-copies a BuildItems map onto the given slots, minting fresh placement ids so the copy
// never shares identity with its source (used when seeding, duplicating, or cloning a category).
function cloneItems(source: BuildItems, slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, (source[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]))
}

export function addCategory(categories: ItemCategory[], slots: ItemSlot[], label: string, seed?: BuildItems): ItemCategory[] {
  const trimmed = label.trim() || 'New Category'
  const items = seed ? cloneItems(seed, slots) : emptyBuildItems(slots)
  return [...categories, { id: newId(), label: trimmed, items }]
}

export function renameCategory(categories: ItemCategory[], id: string, label: string): ItemCategory[] {
  const trimmed = label.trim()
  if (!trimmed) return categories
  return categories.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
}

export function deleteCategory(categories: ItemCategory[], id: string): ItemCategory[] {
  return categories.filter((c) => c.id !== id)
}

// Inserts the clone right after its source and returns the clone's id so the caller can switch
// the active tab to it.
export function duplicateCategory(categories: ItemCategory[], slots: ItemSlot[], id: string): { categories: ItemCategory[]; newId: string } {
  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return { categories, newId: id }
  const source = categories[index]
  const clone: ItemCategory = { id: newId(), label: `${source.label} Copy`, items: cloneItems(source.items, slots) }
  const next = [...categories]
  next.splice(index + 1, 0, clone)
  return { categories: next, newId: clone.id }
}

// The "All" tab's read-only view: per slot, every item that appears in any category, each shown
// once (first category it's found in wins the display order).
export function mergedCategoryItems(categories: ItemCategory[], slots: ItemSlot[]): BuildItems {
  const result = emptyBuildItems(slots)
  for (const slot of slots) {
    const seen = new Set<string>()
    const merged: ItemPlacement[] = []
    for (const category of categories) {
      for (const placement of category.items[slot.id] ?? []) {
        if (seen.has(placement.itemId)) continue
        seen.add(placement.itemId)
        merged.push(placement)
      }
    }
    result[slot.id] = merged
  }
  return result
}

// Every distinct (slot, item) placement found in any category, deduplicated — the pool the
// per-category "+add" quick-toggle picker offers, since it only ever copies existing placements
// between categories rather than introducing brand-new items.
export function allCategorizedPlacements(categories: ItemCategory[], slots: ItemSlot[]): { itemId: string; slotId: string }[] {
  const seen = new Set<string>()
  const result: { itemId: string; slotId: string }[] = []
  for (const category of categories) {
    for (const slot of slots) {
      for (const placement of category.items[slot.id] ?? []) {
        const key = `${slot.id}::${placement.itemId}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ itemId: placement.itemId, slotId: slot.id })
      }
    }
  }
  return result
}

export function categoryHasPlacement(category: ItemCategory, slotId: string, itemId: string): boolean {
  return (category.items[slotId] ?? []).some((p) => p.itemId === itemId)
}

export function toggleCategoryPlacement(items: BuildItems, slotId: string, itemId: string): BuildItems {
  const current = items[slotId] ?? []
  const exists = current.some((p) => p.itemId === itemId)
  const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
  return { ...items, [slotId]: next }
}
