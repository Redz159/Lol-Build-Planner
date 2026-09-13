import type { RunePage } from './runes'
import type {
  BuildItems,
  ItemExclusionPair,
  ItemNoteGlobalFlags,
  ItemNotes,
  ItemRequirementPair,
  ItemSituationalFlags,
  ItemSlotNotes,
  ItemSlot,
} from './items'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

// A category is its own independent rune-page set and item set over the same slots — like a
// parallel mini-loadout a loadout can switch between, rather than a tag on its single rune/item
// selection. Runes and items live *under* a category now, not the other way around.
export interface Category {
  id: string
  label: string
  runePages: RunePage[]
  items: BuildItems
}

export interface Loadout {
  id: string
  roles: Role[]
  runePages: RunePage[]
  itemSlots: ItemSlot[]
  items: BuildItems
  categories: Category[]
  itemExclusions: ItemExclusionPair[]
  itemRequirements: ItemRequirementPair[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
}

export interface Build {
  id: string
  champion: { id: string; name: string }
  title: string
  loadouts: Loadout[]
  favorite: boolean
  createdAt: string
  updatedAt: string
}
