import type { Category, ExampleBuild } from '../types/build'
import type { RunePage } from '../types/runes'
import type { BuildItems, ItemPlacement, ItemSlot } from '../types/items'
import { emptyBuildItems } from '../types/items'
import { newId } from './id'
import { cloneRunePages } from './runeRules'
import { cloneExampleBuilds } from './exampleBuilds'
import { emptySkillOrder } from './skillOrder'

// What a category holds besides its label — used to seed a first category from the loadout's
// own plain values.
export type CategorySeed = Pick<Category, 'runePages' | 'items' | 'exampleBuilds' | 'summonerSpellSets' | 'skillOrder' | 'tripleTonic'>

// The summoner spells + skill order part of a category (or a loadout's plain values), copied as
// one unit by the Skills & Spells tab's transfer actions.
export type SkillsAndSpells = Pick<Category, 'summonerSpellSets' | 'skillOrder' | 'tripleTonic'>

export function skillsAndSpellsOf(source: SkillsAndSpells): SkillsAndSpells {
  return {
    summonerSpellSets: source.summonerSpellSets.map((set) => [...set]),
    skillOrder: [...source.skillOrder],
    tripleTonic: source.tripleTonic ? true : undefined,
  }
}

// Deep-copies a BuildItems map onto the given slots, minting fresh placement ids so the copy
// never shares identity with its source (used when seeding, duplicating, or cloning a category).
// Slots the source has no entry for come out empty, and any source slot not present in `slots`
// (e.g. a custom slot that only exists on the source's loadout) is silently dropped — the two
// loadouts' slot ids only line up exactly when neither has customized its slot list.
function cloneItems(source: BuildItems, slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, (source[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]))
}

export function addCategory(
  categories: Category[],
  slots: ItemSlot[],
  label: string,
  seed?: CategorySeed,
): Category[] {
  const trimmed = label.trim() || 'New Category'
  const runePages = seed ? cloneRunePages(seed.runePages) : []
  const items = seed ? cloneItems(seed.items, slots) : emptyBuildItems(slots)
  const exampleBuilds = seed ? cloneExampleBuilds(seed.exampleBuilds, slots) : []
  const skills = seed ? skillsAndSpellsOf(seed) : { summonerSpellSets: [], skillOrder: emptySkillOrder() }
  return [...categories, { id: newId(), label: trimmed, runePages, items, exampleBuilds, ...skills }]
}

export function renameCategory(categories: Category[], id: string, label: string): Category[] {
  const trimmed = label.trim()
  if (!trimmed) return categories
  return categories.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
}

export function deleteCategory(categories: Category[], id: string): Category[] {
  return categories.filter((c) => c.id !== id)
}

function cloneCategory(source: Category, slots: ItemSlot[], label: string): Category {
  return {
    id: newId(),
    label,
    runePages: cloneRunePages(source.runePages),
    items: cloneItems(source.items, slots),
    exampleBuilds: cloneExampleBuilds(source.exampleBuilds, slots),
    ...skillsAndSpellsOf(source),
  }
}

// Inserts the clone right after its source and returns the clone's id so the caller can switch
// the active tab to it.
export function duplicateCategory(categories: Category[], slots: ItemSlot[], id: string): { categories: Category[]; newId: string } {
  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return { categories, newId: id }
  const clone = cloneCategory(categories[index], slots, `${categories[index].label} Copy`)
  const next = [...categories]
  next.splice(index + 1, 0, clone)
  return { categories: next, newId: clone.id }
}

// Copies a category into another loadout's category list, re-keying its items onto that
// loadout's own item slots. Keeps the source's label as-is (no "Copy" suffix) since it isn't
// sitting next to its source anymore. Returns the clone's id so the caller can jump to it.
//
// If the target loadout has no categories yet, it's still showing its own plain runes/items —
// switching it into category mode by just appending the copy would silently hide that plain
// data behind the newly-created category tab (nothing reads the plain fields once any category
// exists). So a "Default" category seeded from that plain data goes in first, the same way
// addCategory seeds a loadout's first-ever category — the copy lands as a second tab instead of
// replacing what was already there.
export function copyCategoryToLoadout(
  targetCategories: Category[],
  targetSlots: ItemSlot[],
  source: Category,
  targetDefaults?: CategorySeed,
): { categories: Category[]; newId: string } {
  const clone = cloneCategory(source, targetSlots, source.label)
  const base: Category[] =
    targetCategories.length === 0 && targetDefaults
      ? [
          {
            id: newId(),
            label: 'Default',
            runePages: cloneRunePages(targetDefaults.runePages),
            items: cloneItems(targetDefaults.items, targetSlots),
            exampleBuilds: cloneExampleBuilds(targetDefaults.exampleBuilds, targetSlots),
            ...skillsAndSpellsOf(targetDefaults),
          },
        ]
      : targetCategories
  return { categories: [...base, clone], newId: clone.id }
}

// The "All" tab's read-only view: every category's rune pages, concatenated in category order.
export function mergedCategoryRunePages(categories: Category[]): RunePage[] {
  return categories.flatMap((c) => c.runePages)
}

// The "All" tab's read-only view: every category's example builds, concatenated in category order.
export function mergedCategoryExampleBuilds(categories: Category[]): ExampleBuild[] {
  return categories.flatMap((c) => c.exampleBuilds)
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

export function categoryHasPlacement(category: Category, slotId: string, itemId: string): boolean {
  return (category.items[slotId] ?? []).some((p) => p.itemId === itemId)
}

export function toggleCategoryPlacement(items: BuildItems, slotId: string, itemId: string): BuildItems {
  const current = items[slotId] ?? []
  const exists = current.some((p) => p.itemId === itemId)
  const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
  return { ...items, [slotId]: next }
}
