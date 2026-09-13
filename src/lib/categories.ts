import type { Category } from '../types/build'
import type { RunePage } from '../types/runes'
import type { BuildItems, ItemPlacement, ItemSlot } from '../types/items'
import { emptyBuildItems } from '../types/items'
import { newId } from './id'

// Deep-copies a BuildItems map onto the given slots, minting fresh placement ids so the copy
// never shares identity with its source (used when seeding, duplicating, or cloning a category).
function cloneItems(source: BuildItems, slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, (source[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]))
}

// Deep-copies rune pages, minting fresh ids for each page and its variants — same reasoning as
// cloneItems, so a duplicated category never shares placement/page identity with its source.
function cloneRunePages(pages: RunePage[]): RunePage[] {
  return pages.map((p) => ({ ...p, id: newId(), variants: p.variants.map((v) => ({ ...v, id: newId() })) }))
}

export function addCategory(
  categories: Category[],
  slots: ItemSlot[],
  label: string,
  seed?: { runePages: RunePage[]; items: BuildItems },
): Category[] {
  const trimmed = label.trim() || 'New Category'
  const runePages = seed ? cloneRunePages(seed.runePages) : []
  const items = seed ? cloneItems(seed.items, slots) : emptyBuildItems(slots)
  return [...categories, { id: newId(), label: trimmed, runePages, items }]
}

export function renameCategory(categories: Category[], id: string, label: string): Category[] {
  const trimmed = label.trim()
  if (!trimmed) return categories
  return categories.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
}

export function deleteCategory(categories: Category[], id: string): Category[] {
  return categories.filter((c) => c.id !== id)
}

// Inserts the clone right after its source and returns the clone's id so the caller can switch
// the active tab to it.
export function duplicateCategory(categories: Category[], slots: ItemSlot[], id: string): { categories: Category[]; newId: string } {
  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return { categories, newId: id }
  const source = categories[index]
  const clone: Category = {
    id: newId(),
    label: `${source.label} Copy`,
    runePages: cloneRunePages(source.runePages),
    items: cloneItems(source.items, slots),
  }
  const next = [...categories]
  next.splice(index + 1, 0, clone)
  return { categories: next, newId: clone.id }
}

// The "All" tab's read-only view: every category's rune pages, concatenated in category order.
export function mergedCategoryRunePages(categories: Category[]): RunePage[] {
  return categories.flatMap((c) => c.runePages)
}

// The "All" tab's read-only view: per slot, every item that appears in any category, each shown
// once (first category it's found in wins the display order).
export function mergedCategoryItems(categories: Category[], slots: ItemSlot[]): BuildItems {
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
export function allCategorizedPlacements(categories: Category[], slots: ItemSlot[]): { itemId: string; slotId: string }[] {
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

export function categoryHasPlacement(category: Category, slotId: string, itemId: string): boolean {
  return (category.items[slotId] ?? []).some((p) => p.itemId === itemId)
}

export function toggleCategoryPlacement(items: BuildItems, slotId: string, itemId: string): BuildItems {
  const current = items[slotId] ?? []
  const exists = current.some((p) => p.itemId === itemId)
  const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
  return { ...items, [slotId]: next }
}
