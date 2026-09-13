import type { ExampleBuild } from '../types/build'
import type { BuildItems, ItemExclusionPair, ItemRequirementPair, ItemSlot } from '../types/items'
import { newId } from './id'
import { isExcludedPair } from './itemExclusions'
import { requiredItemIds } from './itemRequirements'

// A completed example build only ever shows a handful of alternatives per slot (this is a
// concrete "here's what to buy" reference, not the flexible candidate pool) — capped well below
// what the free-form item slots allow.
export const MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT = 3

function cloneExampleBuildItems(items: BuildItems, slots: ItemSlot[]): BuildItems {
  return Object.fromEntries(slots.map((slot) => [slot.id, (items[slot.id] ?? []).map((p) => ({ id: newId(), itemId: p.itemId }))]))
}

function cloneExampleBuild(source: ExampleBuild, slots: ItemSlot[], label: string): ExampleBuild {
  return { id: newId(), label, items: cloneExampleBuildItems(source.items, slots) }
}

// Deep-copies a whole list of example builds onto (possibly different) slots, minting fresh ids
// throughout — used when a category carrying its own example builds is duplicated or copied to
// another role-variant.
export function cloneExampleBuilds(list: ExampleBuild[], slots: ItemSlot[]): ExampleBuild[] {
  return list.map((b) => cloneExampleBuild(b, slots, b.label))
}

export function deleteExampleBuild(list: ExampleBuild[], id: string): ExampleBuild[] {
  return list.filter((b) => b.id !== id)
}

// Inserts the clone right after its source, same convention as duplicateCategory.
export function duplicateExampleBuild(list: ExampleBuild[], slots: ItemSlot[], id: string): { list: ExampleBuild[]; newId: string } {
  const index = list.findIndex((b) => b.id === id)
  if (index === -1) return { list, newId: id }
  const clone = cloneExampleBuild(list[index], slots, `${list[index].label} Copy`)
  const next = [...list]
  next.splice(index + 1, 0, clone)
  return { list: next, newId: clone.id }
}

// Keeps every example build's item map in lockstep with the loadout's item slots, same reasoning
// as emptyBuildItems/addSlot elsewhere — an item-set that doesn't cover every slot id would leave
// a slot silently unaddable.
export function addSlotToExampleBuilds(list: ExampleBuild[], slotId: string): ExampleBuild[] {
  return list.map((b) => ({ ...b, items: { ...b.items, [slotId]: [] } }))
}

export function removeSlotFromExampleBuilds(list: ExampleBuild[], slotId: string): ExampleBuild[] {
  return list.map((b) => {
    const next = { ...b.items }
    delete next[slotId]
    return { ...b, items: next }
  })
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
