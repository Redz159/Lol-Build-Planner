import type { RunePage } from './runes'
import type { BuildItems, ItemExclusionPair, ItemNoteGlobalFlags, ItemNotes, ItemSlotNotes, ItemSlot } from './items'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface Loadout {
  id: string
  roles: Role[]
  runePages: RunePage[]
  itemSlots: ItemSlot[]
  items: BuildItems
  itemExclusions: ItemExclusionPair[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
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
