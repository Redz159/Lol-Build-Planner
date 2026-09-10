import type { DDragonItem } from '../types/ddragon'
import { ALL_STAT_CATEGORIES, getAutoStatTags } from './itemStatTags'

// These are derived from Data Dragon's own item fields rather than a hardcoded item-id
// list, so the classification keeps working as items are added/removed each patch.

export function isBoots(item: DDragonItem): boolean {
  return item.tags.includes('Boots')
}

// Grievous Wounds ("Wounds" in the tooltip keyword) is applied by every anti-heal item;
// Data Dragon doesn't tag it, but every such item's tooltip text mentions it.
export function isAntiHeal(item: DDragonItem): boolean {
  return /wounds/i.test(item.description)
}

export function isStarterItem(item: DDragonItem): boolean {
  return item.starter
}

export interface FilterOption {
  id: string
  label: string
  test: (item: DDragonItem) => boolean
}

export const ATTRIBUTE_FILTERS: FilterOption[] = [
  { id: 'attr:starter', label: 'Starter Item', test: isStarterItem },
  { id: 'attr:boots', label: 'Boots', test: isBoots },
  { id: 'attr:antiheal', label: 'Anti-heal', test: isAntiHeal },
]

export const STAT_FILTERS: FilterOption[] = ALL_STAT_CATEGORIES.map((category) => ({
  id: `stat:${category.id}`,
  label: category.label,
  test: (item) => getAutoStatTags(item.tags).some((c) => c.id === category.id),
}))

export function itemMatchesFilters(item: DDragonItem, selected: ReadonlySet<string>, options: FilterOption[]): boolean {
  if (selected.size === 0) return true
  return options.some((opt) => selected.has(opt.id) && opt.test(item))
}
