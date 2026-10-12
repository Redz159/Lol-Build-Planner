import type { ExampleBuild } from '../types/build'
import {
  effectiveItemNote,
  type BuildItems,
  type ItemExclusionPair,
  type ItemNoteGlobalFlags,
  type ItemNotes,
  type ItemPlacement,
  type ItemRequirementPair,
  type ItemSlot,
  type ItemSlotNotes,
} from '../types/items'
import { newId } from './id'
import { isExcludedPair } from './itemExclusions'
import { requiredItemIds } from './itemRequirements'

// A completed example build only ever shows a handful of alternatives per slot (this is a
// concrete "here's what to buy" reference, not the flexible candidate pool) — capped well below
// what the free-form item slots allow.
export const MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT = 3

// Example builds always use this one slot list, whatever slots the item-set (the pool they pick
// from) has. Ids match DEFAULT_ITEM_SLOTS, so builds saved with the Standard layout, and the Riot
// import's example builds, already line up. The 6th item is ADC-only, as in the Standard layout.
export const EXAMPLE_BUILD_SLOTS: ItemSlot[] = [
  { id: 'starter', label: 'Starter Items', kind: 'starter' },
  { id: 'early', label: 'Early Components' },
  { id: 'boots', label: 'Boots', kind: 'boots' },
  { id: 'item1', label: '1st Item' },
  { id: 'item2', label: '2nd Item' },
  { id: 'item3', label: '3rd Item' },
  { id: 'item4', label: '4th Item' },
  { id: 'item5', label: '5th Item' },
  { id: 'item6', label: '6th Item', kind: 'adc-bonus' },
]

const BASE_EXAMPLE_SLOT_IDS = new Set(['starter', 'early', 'boots'])

// The example slot an item-set slot corresponds to: same label, or the same starter/boots kind.
function matchingExampleSlot(poolSlot: ItemSlot): ItemSlot | undefined {
  const label = poolSlot.label.toLowerCase()
  return EXAMPLE_BUILD_SLOTS.find(
    (s) => s.label.toLowerCase() === label || (!!poolSlot.kind && poolSlot.kind !== 'adc-bonus' && s.kind === poolSlot.kind),
  )
}

// Which item-set slots an example slot draws its candidates from: the slot that matches it, if
// any. Otherwise an "Nth Item" step draws from every slot that isn't starter/early/boots, which is
// how a Core-based layout's Core and Follow-up items become the picks for 1st, 2nd, ... item.
export function exampleSlotSources(exampleSlot: ItemSlot, poolSlots: ItemSlot[]): ItemSlot[] {
  const matching = poolSlots.filter((s) => matchingExampleSlot(s)?.id === exampleSlot.id)
  if (matching.length > 0 || BASE_EXAMPLE_SLOT_IDS.has(exampleSlot.id)) return matching
  return poolSlots.filter((s) => !BASE_EXAMPLE_SLOT_IDS.has(matchingExampleSlot(s)?.id ?? ''))
}

// The candidates for one example slot, each item once (first source slot wins).
export function exampleSlotCandidates(exampleSlot: ItemSlot, poolSlots: ItemSlot[], poolItems: BuildItems): ItemPlacement[] {
  const result: ItemPlacement[] = []
  for (const slot of exampleSlotSources(exampleSlot, poolSlots)) {
    for (const placement of poolItems[slot.id] ?? []) {
      if (!result.some((p) => p.itemId === placement.itemId)) result.push(placement)
    }
  }
  return result
}

// An item's note inside an example slot: its note in whichever source slot has one (a global note
// is the same in every slot).
export function exampleSlotNote(
  exampleSlot: ItemSlot,
  poolSlots: ItemSlot[],
  notes: { itemNotes: ItemNotes; itemSlotNotes: ItemSlotNotes; itemNoteGlobal: ItemNoteGlobalFlags },
  itemId: string,
): string | undefined {
  const sourceIds = [...exampleSlotSources(exampleSlot, poolSlots).map((s) => s.id), exampleSlot.id]
  return sourceIds.map((slotId) => effectiveItemNote(notes.itemNotes, notes.itemSlotNotes, notes.itemNoteGlobal, slotId, itemId)).find((n) => n)
}

export function emptyExampleBuildItems(): BuildItems {
  return Object.fromEntries(EXAMPLE_BUILD_SLOTS.map((s) => [s.id, []]))
}

// Example builds saved before they had their own slots were keyed by the item-set's slots. Each
// old slot moves to the example slot with the same label (or starter/boots kind); any other slot
// (Core Items, Follow-up Items, custom ones) fills the next empty "Nth Item" slot, in order.
export function migrateExampleBuildItems(items: BuildItems, sourceSlots: ItemSlot[]): BuildItems {
  const result = emptyExampleBuildItems()
  const leftovers: ItemPlacement[][] = []
  for (const slot of sourceSlots) {
    const placements = items[slot.id] ?? []
    if (placements.length === 0) continue
    const target = matchingExampleSlot(slot)
    if (target && result[target.id].length === 0) result[target.id] = placements.slice(0, MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT)
    else leftovers.push(placements)
  }
  for (const placements of leftovers) {
    const free = EXAMPLE_BUILD_SLOTS.find((s) => !BASE_EXAMPLE_SLOT_IDS.has(s.id) && result[s.id].length === 0)
    if (!free) break
    result[free.id] = placements.slice(0, MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT)
  }
  return result
}

function cloneExampleBuild(source: ExampleBuild, label: string): ExampleBuild {
  const items = Object.fromEntries(
    EXAMPLE_BUILD_SLOTS.map((slot) => [slot.id, (source.items[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]),
  )
  return { id: newId(), label, items }
}

// Deep-copies a whole list of example builds, minting fresh ids throughout — used when a
// category carrying its own example builds is duplicated or copied to another role-variant.
export function cloneExampleBuilds(list: ExampleBuild[]): ExampleBuild[] {
  return list.map((b) => cloneExampleBuild(b, b.label))
}

export function deleteExampleBuild(list: ExampleBuild[], id: string): ExampleBuild[] {
  return list.filter((b) => b.id !== id)
}

// Inserts the clone right after its source, same convention as duplicateCategory.
export function duplicateExampleBuild(list: ExampleBuild[], id: string): { list: ExampleBuild[]; newId: string } {
  const index = list.findIndex((b) => b.id === id)
  if (index === -1) return { list, newId: id }
  const clone = cloneExampleBuild(list[index], `${list[index].label} Copy`)
  const next = [...list]
  next.splice(index + 1, 0, clone)
  return { list: next, newId: clone.id }
}

// Viewing an example build lets you click an item as a "what if I go this way" pick, same idea
// as the flexible pool's preview — and, unlike editing, exclusions actively hide the losing side
// here: pick an item in one slot and anything elsewhere in the *same* build that can't coexist
// with it (a mutual exclusion, an unmet requirement relative to what's previewed, or the same
// item placed again) disappears rather than just dimming.
export function exampleBuildPreviewExcludedPlacementIds(
  build: ExampleBuild,
  preview: Partial<Record<string, string>>,
  itemExclusions: ItemExclusionPair[],
  builtinExclusions: ItemExclusionPair[],
  itemRequirements: ItemRequirementPair[],
): Set<string> {
  const previewedPlacementIds = new Set(Object.values(preview).filter((id): id is string => !!id))
  const previewedItemIds = new Set<string>()
  for (const [slotId, placementId] of Object.entries(preview)) {
    if (!placementId) continue
    const placement = build.items[slotId]?.find((p) => p.id === placementId)
    if (placement) previewedItemIds.add(placement.itemId)
  }
  const result = new Set<string>()
  if (previewedItemIds.size === 0) return result
  const itemIdsInBuild = new Set(Object.values(build.items).flatMap((placements) => placements.map((p) => p.itemId)))
  for (const placements of Object.values(build.items)) {
    for (const placement of placements) {
      if (previewedPlacementIds.has(placement.id)) continue
      const sameItemElsewhere = previewedItemIds.has(placement.itemId)
      const excluded = [...previewedItemIds].some(
        (pid) => isExcludedPair(itemExclusions, pid, placement.itemId) || isExcludedPair(builtinExclusions, pid, placement.itemId),
      )
      const applicableRequired = requiredItemIds(itemRequirements, placement.itemId).filter((id) => itemIdsInBuild.has(id))
      const requirementUnmet = applicableRequired.length > 0 && !applicableRequired.every((id) => previewedItemIds.has(id))
      if (sameItemElsewhere || excluded || requirementUnmet) result.add(placement.id)
    }
  }
  return result
}

export function addExampleBuildItem(build: ExampleBuild, slotId: string, itemId: string): ExampleBuild {
  const current = build.items[slotId] ?? []
  if (current.length >= MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT || current.some((p) => p.itemId === itemId)) return build
  return { ...build, items: { ...build.items, [slotId]: [...current, { id: newId(), itemId }] } }
}

export function removeExampleBuildItem(build: ExampleBuild, slotId: string, placementId: string): ExampleBuild {
  return { ...build, items: { ...build.items, [slotId]: (build.items[slotId] ?? []).filter((p) => p.id !== placementId) } }
}

// Swaps a placement with its neighbor to change which "height" it sits at within the slot.
export function moveExampleBuildItem(build: ExampleBuild, slotId: string, placementId: string, direction: 'up' | 'down'): ExampleBuild {
  const current = build.items[slotId] ?? []
  const index = current.findIndex((p) => p.id === placementId)
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (index === -1 || targetIndex < 0 || targetIndex >= current.length) return build
  const next = [...current]
  ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
  return { ...build, items: { ...build.items, [slotId]: next } }
}
