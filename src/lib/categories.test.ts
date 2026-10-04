import { describe, expect, it } from 'vitest'
import type { Category } from '../types/build'
import type { ItemSlot } from '../types/items'
import {
  addCategory,
  copyCategoryToLoadout,
  deleteCategory,
  duplicateCategory,
  mergedCategoryItems,
  renameCategory,
  toggleCategoryPlacement,
} from './categories'

const slots: ItemSlot[] = [
  { id: 'starter', label: 'Starter' },
  { id: 'item1', label: '1st Item' },
]

function withItems(label: string, starter: string[]): Category {
  const [category] = addCategory([], slots, label)
  return { ...category, items: { ...category.items, starter: starter.map((itemId) => ({ id: `${label}-${itemId}`, itemId })) } }
}

describe('addCategory', () => {
  it('creates an empty category with one entry per slot', () => {
    const [category] = addCategory([], slots, '  Poke  ')
    expect(category.label).toBe('Poke')
    expect(category.items).toEqual({ starter: [], item1: [] })
  })

  it('falls back to a default label', () => {
    expect(addCategory([], slots, '  ')[0].label).toBe('New Category')
  })

  it('copies a seed with fresh placement ids', () => {
    const seed = withItems('Seed', ['1055'])
    const [category] = addCategory([], slots, 'Copy', seed)
    expect(category.items.starter.map((p) => p.itemId)).toEqual(['1055'])
    expect(category.items.starter[0].id).not.toBe(seed.items.starter[0].id)
  })
})

describe('renameCategory / deleteCategory', () => {
  it('ignores a blank rename', () => {
    const categories = addCategory([], slots, 'A')
    expect(renameCategory(categories, categories[0].id, ' ')).toBe(categories)
    expect(renameCategory(categories, categories[0].id, 'B')[0].label).toBe('B')
  })

  it('deletes by id', () => {
    const categories = addCategory(addCategory([], slots, 'A'), slots, 'B')
    expect(deleteCategory(categories, categories[0].id).map((c) => c.label)).toEqual(['B'])
  })
})

describe('duplicateCategory', () => {
  it('inserts the copy right after its source', () => {
    const categories = [withItems('A', ['1055']), withItems('B', [])]
    const { categories: next, newId } = duplicateCategory(categories, slots, categories[0].id)
    expect(next.map((c) => c.label)).toEqual(['A', 'A Copy', 'B'])
    expect(next[1].id).toBe(newId)
    expect(next[1].items.starter.map((p) => p.itemId)).toEqual(['1055'])
  })
})

describe('copyCategoryToLoadout', () => {
  it('seeds a Default category first when the target has none', () => {
    const source = withItems('Poke', ['1055'])
    const defaults = withItems('Plain', ['1056'])
    const { categories } = copyCategoryToLoadout([], slots, source, defaults)
    expect(categories.map((c) => c.label)).toEqual(['Default', 'Poke'])
    expect(categories[0].items.starter.map((p) => p.itemId)).toEqual(['1056'])
  })

  it('appends to existing categories', () => {
    const existing = [withItems('A', [])]
    const { categories } = copyCategoryToLoadout(existing, slots, withItems('Poke', []), withItems('Plain', []))
    expect(categories.map((c) => c.label)).toEqual(['A', 'Poke'])
  })
})

describe('mergedCategoryItems', () => {
  it('lists each item once per slot, first category first', () => {
    const merged = mergedCategoryItems([withItems('A', ['1', '2']), withItems('B', ['2', '3'])], slots)
    expect(merged.starter.map((p) => p.itemId)).toEqual(['1', '2', '3'])
    expect(merged.item1).toEqual([])
  })
})

describe('toggleCategoryPlacement', () => {
  it('adds a missing item and removes a present one', () => {
    const added = toggleCategoryPlacement({ starter: [] }, 'starter', '1055')
    expect(added.starter.map((p) => p.itemId)).toEqual(['1055'])
    expect(toggleCategoryPlacement(added, 'starter', '1055').starter).toEqual([])
  })
})
