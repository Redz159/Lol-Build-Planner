import type { DDragonItem } from '../types/ddragon'
import type { Role } from '../types/build'
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
  return item.gold.total <= 500
}

// A component still builds into something further (basic materials like Long Sword as
// well as epic components like Chain Vest); a legendary item is a finished, non-boots build.
export function isComponent(item: DDragonItem): boolean {
  return item.into.length > 0
}

export function isLegendaryItem(item: DDragonItem): boolean {
  return item.into.length === 0 && item.gold.total > 500 && !isBoots(item) && !item.tags.includes('Trinket')
}

// The support starter item line (World Atlas -> Runic Compass -> Bounty of Worlds ->
// Celestial Opposition/Dream Maker/Solstice Sleigh/Zaz'Zak's Realmspike/Bloodsong) is the
// only starter-tier item family carrying the gold-per-10 passive, so it's derived from that
// tag rather than a hardcoded name list — same reasoning as isBoots above.
export function isSupportItem(item: DDragonItem): boolean {
  return item.tags.includes('GoldPer') && isStarterItem(item)
}

// These have no distinguishing Data Dragon tag, so — like ITEM_GROUPS — they're matched by
// name against the live item list; a renamed/removed item just resolves to no match.
const JUNGLE_STARTER_ITEM_NAMES = new Set(['Scorchclaw Pup', 'Gustwalker Hatchling', 'Mosstomper Seedling'])
const UPGRADED_BOOTS_NAMES = new Set([
  'Armored Advance',
  'Gunmetal Greaves',
  'Chainlaced Crushers',
  'Crimson Lucidity',
  "Spellslinger's Shoes",
  'Swiftmarch',
  'Immortal Path',
])
const DORANS_ITEM_NAMES = new Set(["Doran's Blade", "Doran's Ring", "Doran's Shield", "Doran's Helm", "Doran's Bow"])

export function isJungleStarterItem(item: DDragonItem): boolean {
  return JUNGLE_STARTER_ITEM_NAMES.has(item.name)
}

export function isUpgradedBoots(item: DDragonItem): boolean {
  return UPGRADED_BOOTS_NAMES.has(item.name)
}

export function isDoransItem(item: DDragonItem): boolean {
  return DORANS_ITEM_NAMES.has(item.name)
}

// Role-gated visibility for the item browser. Support items, jungle starters, and upgraded
// boots are each hidden unless a matching role is selected (an "any" match across a loadout's
// roles — having just one qualifying role is enough); Doran's items and non-upgraded boots
// are the reverse, hidden only once every selected role is one that excludes them (jungle or
// support for Doran's, mid alone for base/tier-2 boots — a mid loadout goes straight for the
// upgraded line). A roles-less "Fill" loadout could apply to any role, so it's unrestricted
// and sees everything.
export function isItemVisibleForRoles(item: DDragonItem, roles: Role[]): boolean {
  if (roles.length === 0) return true
  if (isSupportItem(item)) return roles.includes('support')
  if (isJungleStarterItem(item)) return roles.includes('jungle')
  if (isUpgradedBoots(item)) return roles.includes('mid')
  if (isDoransItem(item)) return !roles.every((r) => r === 'jungle' || r === 'support')
  if (isBoots(item)) return !roles.every((r) => r === 'mid')
  return true
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
  { id: 'attr:component', label: 'Component', test: isComponent },
  { id: 'attr:legendary', label: 'Legendary Item', test: isLegendaryItem },
]

export const STAT_FILTERS: FilterOption[] = ALL_STAT_CATEGORIES.map((category) => ({
  id: `stat:${category.id}`,
  label: category.label,
  test: (item) => getAutoStatTags(item.tags).some((c) => c.id === category.id),
}))

export type FilterMode = 'any' | 'all'

export function itemMatchesFilters(
  item: DDragonItem,
  selected: ReadonlySet<string>,
  options: FilterOption[],
  mode: FilterMode = 'any',
): boolean {
  if (selected.size === 0) return true
  const selectedOptions = options.filter((opt) => selected.has(opt.id))
  return mode === 'any' ? selectedOptions.some((opt) => opt.test(item)) : selectedOptions.every((opt) => opt.test(item))
}
