import type { RunePage } from './runes'
import type {
  BuildItems,
  ItemCategory,
  ItemExclusionPair,
  ItemNoteGlobalFlags,
  ItemNotes,
  ItemRequirementPair,
  ItemSituationalFlags,
  ItemSlotNotes,
  ItemSlot,
} from './items'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface Loadout {
  id: string
  roles: Role[]
  runePages: RunePage[]
  itemSlots: ItemSlot[]
  items: BuildItems
  itemCategories: ItemCategory[]
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
