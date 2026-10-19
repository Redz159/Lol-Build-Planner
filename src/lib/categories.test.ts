import { describe, expect, it } from 'vitest'
import type { Category } from '../types/build'
import type { ItemSlot } from '../types/items'
import {
  addCategory,
  categoryHasPlacement,
  copyCategoryToLoadout,
  currentItemSet,
  deleteCategory,
  duplicateCategory,
  mergedCategoryItemSet,
  renameCategory,
  toggleCategoryPlacement,
} from './categories'
import { emptyLoadout } from './loadouts'

const slots: ItemSlot[] = [
  { id: 'starter', label: 'Starter' },
  { id: 'item1', label: '1st Item' },
]

function withItems(label: string, starter: string[], categorySlots: ItemSlot[] = slots): Category {
  const [category] = addCategory([], label)
  const items = Object.fromEntries(categorySlots.map((s) => [s.id, []]))
  return {
    ...category,
    itemSlots: categorySlots,
    items: { ...items, [categorySlots[0].id]: starter.map((itemId) => ({ id: `${label}-${itemId}`, itemId })) },
  }
}

describe('addCategory', () => {
  it('creates a category with no slots, so it opens on the layout picker', () => {
    const [category] = addCategory([], '  Poke  ')
    expect(category.label).toBe('Poke')
    expect(category.itemSlots).toEqual([])
    expect(category.items).toEqual({})
    expect(category.layoutChosen).toBeUndefined()
  })

  it('falls back to a default label', () => {
    expect(addCategory([], '  ')[0].label).toBe('New Category')
  })

  it('copies a seed, slots included, with fresh placement ids', () => {
    const seed = { ...withItems('Seed', ['1055']), layoutChosen: true }
    const [category] = addCategory([], 'Copy', seed)
    expect(category.itemSlots).toEqual(slots)
    expect(category.layoutChosen).toBe(true)
    expect(category.items.starter.map((p) => p.itemId)).toEqual(['1055'])
    expect(category.items.starter[0].id).not.toBe(seed.items.starter[0].id)
  })
})

describe('renameCategory / deleteCategory', () => {
  it('ignores a blank rename', () => {
    const categories = addCategory([], 'A')
    expect(renameCategory(categories, categories[0].id, ' ')).toBe(categories)
    expect(renameCategory(categories, categories[0].id, 'B')[0].label).toBe('B')
  })

  it('deletes by id', () => {
    const categories = addCategory(addCategory([], 'A'), 'B')
    expect(deleteCategory(categories, categories[0].id).map((c) => c.label)).toEqual(['B'])
  })
})

describe('duplicateCategory', () => {
  it('inserts the copy right after its source, keeping its own slots', () => {
    const own: ItemSlot[] = [{ id: 'core', label: 'Core Items' }]
    const categories = [withItems('A', ['1055'], own), withItems('B', [])]
    const { categories: next, newId } = duplicateCategory(categories, categories[0].id)
    expect(next.map((c) => c.label)).toEqual(['A', 'A Copy', 'B'])
    expect(next[1].id).toBe(newId)
    expect(next[1].itemSlots).toEqual(own)
    expect(next[1].items.core.map((p) => p.itemId)).toEqual(['1055'])
  })
})

describe('per-category excludes, requirements and situational flags', () => {
  it('starts a new category empty and gives a duplicate its own copy', () => {
    const source: Category = {
      ...withItems('A', []),
      itemExclusions: [['1', '2']],
      itemRequirements: [['3', '4']],
      itemSituational: { '5': true },
    }
    const [fresh] = addCategory([], 'B')
    expect(fresh.itemExclusions).toEqual([])
    expect(fresh.itemRequirements).toEqual([])
    expect(fresh.itemSituational).toEqual({})
    const copy = duplicateCategory([source], source.id).categories[1]
    expect(copy.itemExclusions).toEqual([['1', '2']])
    expect(copy.itemRequirements).toEqual([['3', '4']])
    expect(copy.itemSituational).toEqual({ '5': true })
    copy.itemExclusions[0][1] = 'x'
    copy.itemSituational['6'] = true
    expect(source.itemExclusions).toEqual([['1', '2']])
    expect(source.itemSituational).toEqual({ '5': true })
  })
})

describe('copyCategoryToLoadout', () => {
  it('seeds a Default category first when the target has none', () => {
    const source = withItems('Poke', ['1055'])
    const defaults = withItems('Plain', ['1056'])
    const { categories } = copyCategoryToLoadout([], source, defaults)
    expect(categories.map((c) => c.label)).toEqual(['Default', 'Poke'])
    expect(categories[0].items.starter.map((p) => p.itemId)).toEqual(['1056'])
  })

  it('appends to existing categories', () => {
    const existing = [withItems('A', [])]
    const { categories } = copyCategoryToLoadout(existing, withItems('Poke', []), withItems('Plain', []))
    expect(categories.map((c) => c.label)).toEqual(['A', 'Poke'])
  })
})

describe('mergedCategoryItemSet', () => {
  it('lists each item once per slot, first category first', () => {
    const merged = mergedCategoryItemSet([withItems('A', ['1', '2']), withItems('B', ['2', '3'])])
    expect(merged.itemSlots).toEqual(slots)
    expect(merged.items.starter.map((p) => p.itemId)).toEqual(['1', '2', '3'])
    expect(merged.items.item1).toEqual([])
  })

  it('lines up different slot lists by label', () => {
    const other: ItemSlot[] = [
      { id: 'x', label: 'starter' },
      { id: 'core', label: 'Core Items' },
    ]
    const b = withItems('B', ['3'], other)
    b.exampleBuilds = [{ id: 'e', label: 'Ex', items: { starter: [{ id: 'q', itemId: '9' }] } }]
    const merged = mergedCategoryItemSet([withItems('A', ['1']), b])
    expect(merged.itemSlots.map((s) => s.id)).toEqual(['starter', 'item1', 'core'])
    expect(merged.items.starter.map((p) => p.itemId)).toEqual(['1', '3'])
    expect(merged.exampleBuilds).toEqual(b.exampleBuilds)
  })
})

describe('mergedCategoryItemSet relations', () => {
  it('unions the excludes, requirements and situational flags of every category', () => {
    const a: Category = { ...withItems('A', []), itemExclusions: [['1', '2']], itemRequirements: [['3', '4']], itemSituational: { '5': true } }
    const b: Category = { ...withItems('B', []), itemExclusions: [['2', '1'], ['6', '7']], itemRequirements: [['3', '4']], itemSituational: { '8': true } }
    const merged = mergedCategoryItemSet([a, b])
    expect(merged.itemExclusions).toEqual([['1', '2'], ['6', '7']])
    expect(merged.itemRequirements).toEqual([['3', '4']])
    expect(merged.itemSituational).toEqual({ '5': true, '8': true })
  })
})

describe('currentItemSet', () => {
  it('picks the category, the merge, or the plain loadout', () => {
    const a = withItems('A', ['1'])
    const loadout = { ...emptyLoadout(), categories: [a] }
    expect(currentItemSet(loadout, a.id)).toBe(a)
    expect(currentItemSet(loadout, null)).toBe(loadout)
    expect(currentItemSet(loadout, 'all').items.starter.map((p) => p.itemId)).toEqual(['1'])
  })
})

describe('toggleCategoryPlacement', () => {
  it('adds a missing item and removes a present one, matching the slot by label', () => {
    const added = toggleCategoryPlacement(withItems('A', []), 'STARTER', '1055')
    expect(categoryHasPlacement(added, 'starter', '1055')).toBe(true)
    expect(toggleCategoryPlacement(added, 'Starter', '1055').items.starter).toEqual([])
  })

  it('leaves a category without that slot alone', () => {
    const category = withItems('A', [])
    expect(toggleCategoryPlacement(category, 'Core Items', '1055')).toBe(category)
  })
})
