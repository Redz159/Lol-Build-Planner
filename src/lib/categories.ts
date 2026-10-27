import type { Category, ExampleBuild, ItemSet, Loadout } from '../types/build'
import type { RunePage } from '../types/runes'
import { itemSlotNoteKey, type BuildItems, type ItemExclusionPair, type ItemPlacement, type ItemRequirementPair, type ItemSituationalFlags, type ItemSlot, type ItemSlotNotes } from '../types/items'
import { newId } from './id'
import { cloneRunePages } from './runeRules'
import { cloneExampleBuilds } from './exampleBuilds'
import { emptySkillOrder } from './skillOrder'
import { isExcludedPair } from './itemExclusions'
import { isRequiredPair } from './itemRequirements'

// What a category holds besides its label — used to seed a first category from the loadout's
// own plain values.
export type CategorySeed = Pick<Category, 'runePages' | keyof ItemSet | keyof SkillsAndSpells>

// The summoner spells + skill order part of a category (or a loadout's plain values), copied as
// one unit by the Skills & Spells tab's transfer actions.
export type SkillsAndSpells = Pick<Category, 'summonerSpellSets' | 'summonerSpellSetNotes' | 'skillOrder' | 'skillOrderNote' | 'tripleTonic'>

export function skillsAndSpellsOf(source: SkillsAndSpells): SkillsAndSpells {
  return {
    summonerSpellSets: source.summonerSpellSets.map((set) => [...set]),
    summonerSpellSetNotes: source.summonerSpellSetNotes ? { ...source.summonerSpellSetNotes } : undefined,
    skillOrder: [...source.skillOrder],
    skillOrderNote: source.skillOrderNote,
    tripleTonic: source.tripleTonic ? true : undefined,
  }
}

// Deep-copies a BuildItems map onto the given slots, minting fresh placement ids so the copy
// never shares identity with its source (used when seeding, duplicating, or cloning a category).
function cloneItems(source: BuildItems, slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, (source[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]))
}

// Slot ids are kept as-is (only placements get fresh ids). duplicateCategory re-mints them
// afterwards so the copy doesn't share local notes with its source.
function cloneItemSet(source: ItemSet): ItemSet {
  return {
    itemSlots: source.itemSlots.map((s) => ({ ...s })),
    items: cloneItems(source.items, source.itemSlots),
    exampleBuilds: cloneExampleBuilds(source.exampleBuilds),
    ...(source.layoutChosen ? { layoutChosen: true } : {}),
    itemExclusions: source.itemExclusions.map(([a, b]) => [a, b]),
    itemRequirements: source.itemRequirements.map(([a, b]) => [a, b]),
    itemSituational: { ...source.itemSituational },
  }
}

// A category added without a seed starts with no slots at all, so the Items tab opens on the
// layout picker for it.
export function addCategory(categories: Category[], label: string, seed?: CategorySeed): Category[] {
  const trimmed = label.trim() || 'New Category'
  const runePages = seed ? cloneRunePages(seed.runePages) : []
  const itemSet: ItemSet = seed
    ? cloneItemSet(seed)
    : { itemSlots: [], items: {}, exampleBuilds: [], itemExclusions: [], itemRequirements: [], itemSituational: {} }
  const skills = seed ? skillsAndSpellsOf(seed) : { summonerSpellSets: [], skillOrder: emptySkillOrder() }
  return [...categories, { id: newId(), label: trimmed, runePages, ...itemSet, ...skills }]
}

export function renameCategory(categories: Category[], id: string, label: string): Category[] {
  const trimmed = label.trim()
  if (!trimmed) return categories
  return categories.map((c) => (c.id === id ? { ...c, label: trimmed } : c))
}

export function deleteCategory(categories: Category[], id: string): Category[] {
  return categories.filter((c) => c.id !== id)
}

function cloneCategory(source: CategorySeed, label: string): Category {
  return {
    id: newId(),
    label,
    runePages: cloneRunePages(source.runePages),
    ...cloneItemSet(source),
    ...skillsAndSpellsOf(source),
  }
}

// Inserts the clone right after its source and returns the clone's id so the caller can switch
// the active tab to it. The clone gets fresh slot ids, so local (non-global) notes stay per
// category: the source's local notes are copied onto the clone's slots and returned with the
// loadout's other notes, and editing one category's note afterwards leaves the other's alone.
export function duplicateCategory(
  categories: Category[],
  id: string,
  itemSlotNotes: ItemSlotNotes,
): { categories: Category[]; newId: string; itemSlotNotes: ItemSlotNotes } {
  const index = categories.findIndex((c) => c.id === id)
  if (index === -1) return { categories, newId: id, itemSlotNotes }
  const source = categories[index]
  const separated = withFreshSlotIds(
    cloneCategory(source, `${source.label} Copy`),
    new Set(source.itemSlots.map((s) => s.id)),
    itemSlotNotes,
  )
  const next = [...categories]
  next.splice(index + 1, 0, separated.category)
  return { categories: next, newId: separated.category.id, itemSlotNotes: separated.itemSlotNotes }
}

// Gives the category's slots in `slotIds` new ids, copying each one's local notes onto the new id
// (the old entries stay, since another category still uses those slots).
function withFreshSlotIds(
  category: Category,
  slotIds: Set<string>,
  itemSlotNotes: ItemSlotNotes,
): { category: Category; itemSlotNotes: ItemSlotNotes } {
  const fresh = new Map(category.itemSlots.filter((s) => slotIds.has(s.id)).map((s) => [s.id, newId()]))
  if (fresh.size === 0) return { category, itemSlotNotes }
  const remap = (slotId: string) => fresh.get(slotId) ?? slotId
  const copiedNotes = Object.entries(itemSlotNotes).flatMap(([key, note]) => {
    const sep = key.indexOf('::')
    const freshId = fresh.get(key.slice(0, sep))
    return freshId ? [[itemSlotNoteKey(freshId, key.slice(sep + 2)), note]] : []
  })
  return {
    category: {
      ...category,
      itemSlots: category.itemSlots.map((s) => ({ ...s, id: remap(s.id) })),
      items: Object.fromEntries(Object.entries(category.items).map(([slotId, placements]) => [remap(slotId), placements])),
    },
    itemSlotNotes: { ...itemSlotNotes, ...Object.fromEntries(copiedNotes) },
  }
}

// Categories duplicated before duplicateCategory minted fresh slot ids share slot ids with their
// source, and with them every local note. Splits those up on load: the first category using a
// slot id keeps it, each later one gets a new id with a copy of the notes. The loadout's own
// plain slots don't count, since they're hidden once categories exist.
export function separateSharedCategorySlots(loadout: Loadout): Loadout {
  const seen = new Set<string>()
  let itemSlotNotes = loadout.itemSlotNotes
  let changed = false
  const categories = loadout.categories.map((category) => {
    const shared = new Set(category.itemSlots.filter((s) => seen.has(s.id)).map((s) => s.id))
    for (const s of category.itemSlots) seen.add(s.id)
    if (shared.size === 0) return category
    changed = true
    const separated = withFreshSlotIds(category, shared, itemSlotNotes)
    itemSlotNotes = separated.itemSlotNotes
    return separated.category
  })
  return changed ? { ...loadout, categories, itemSlotNotes } : loadout
}

// Copies a category, with its own item slots, into another loadout's category list. Keeps the
// source's label as-is (no "Copy" suffix) since it isn't sitting next to its source anymore.
// Returns the clone's id so the caller can jump to it.
//
// If the target loadout has no categories yet, it's still showing its own plain runes/items —
// switching it into category mode by just appending the copy would silently hide that plain
// data behind the newly-created category tab (nothing reads the plain fields once any category
// exists). So a "Default" category seeded from that plain data goes in first, the same way
// addCategory seeds a loadout's first-ever category — the copy lands as a second tab instead of
// replacing what was already there.
export function copyCategoryToLoadout(
  targetCategories: Category[],
  source: Category,
  targetDefaults?: CategorySeed,
): { categories: Category[]; newId: string } {
  const clone = cloneCategory(source, source.label)
  const base: Category[] =
    targetCategories.length === 0 && targetDefaults ? [cloneCategory(targetDefaults, 'Default')] : targetCategories
  return { categories: [...base, clone], newId: clone.id }
}

// The "All" tab's read-only view: every category's rune pages, concatenated in category order.
export function mergedCategoryRunePages(categories: Category[]): RunePage[] {
  return categories.flatMap((c) => c.runePages)
}

// The "All" tab's read-only view. Categories can have different slots, so slots are lined up by
// label (case-insensitive): each label shows once, in the order first seen. Per slot, every item
// from any category is listed once (first category wins the display order). Example builds all
// share the same fixed slots, so they're just listed one category after another. Excludes,
// requirements and situational flags are the union of every category's.
export function mergedCategoryItemSet(categories: Category[]): ItemSet {
  const itemSlots: ItemSlot[] = []
  const slotIdByLabel = new Map<string, string>()
  for (const category of categories) {
    for (const slot of category.itemSlots) {
      const key = slot.label.toLowerCase()
      if (slotIdByLabel.has(key)) continue
      slotIdByLabel.set(key, slot.id)
      itemSlots.push(slot)
    }
  }
  const mergedId = (slot: ItemSlot) => slotIdByLabel.get(slot.label.toLowerCase())!
  const items: BuildItems = Object.fromEntries(itemSlots.map((s) => [s.id, [] as ItemPlacement[]]))
  const exampleBuilds: ExampleBuild[] = []
  const itemExclusions: ItemExclusionPair[] = []
  const itemRequirements: ItemRequirementPair[] = []
  const itemSituational: ItemSituationalFlags = {}
  for (const category of categories) {
    for (const slot of category.itemSlots) {
      const merged = items[mergedId(slot)]
      for (const placement of category.items[slot.id] ?? []) {
        if (!merged.some((p) => p.itemId === placement.itemId)) merged.push(placement)
      }
    }
    exampleBuilds.push(...category.exampleBuilds)
    for (const [a, b] of category.itemExclusions) {
      if (!isExcludedPair(itemExclusions, a, b)) itemExclusions.push([a, b])
    }
    for (const [a, b] of category.itemRequirements) {
      if (!isRequiredPair(itemRequirements, a, b)) itemRequirements.push([a, b])
    }
    Object.assign(itemSituational, category.itemSituational)
  }
  return { itemSlots, items, exampleBuilds, itemExclusions, itemRequirements, itemSituational }
}

// The item-set the Items tab (and the simulator) works on: a category's own, the merged "All"
// view, or the loadout's plain one when it has no categories (categoryId null).
export function currentItemSet(loadout: Loadout, categoryId: string | null): ItemSet {
  if (categoryId === 'all') return mergedCategoryItemSet(loadout.categories)
  return (categoryId && loadout.categories.find((c) => c.id === categoryId)) || loadout
}

function slotWithLabel(category: Category, slotLabel: string): ItemSlot | undefined {
  return category.itemSlots.find((s) => s.label.toLowerCase() === slotLabel.toLowerCase())
}

// The category tab's quick-add popup shows the merged "All" slots, so it matches by slot label.
export function categoryHasPlacement(category: Category, slotLabel: string, itemId: string): boolean {
  const slot = slotWithLabel(category, slotLabel)
  return !!slot && (category.items[slot.id] ?? []).some((p) => p.itemId === itemId)
}

// A category without a slot of that label is left unchanged.
export function toggleCategoryPlacement(category: Category, slotLabel: string, itemId: string): Category {
  const slot = slotWithLabel(category, slotLabel)
  if (!slot) return category
  const current = category.items[slot.id] ?? []
  const exists = current.some((p) => p.itemId === itemId)
  const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
  return { ...category, items: { ...category.items, [slot.id]: next } }
}
