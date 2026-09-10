import type { RunePage } from './runes'
import type { BuildItems, ItemExclusionPair } from './items'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export interface Loadout {
  id: string
  roles: Role[]
  runePages: RunePage[]
  items: BuildItems
  itemExclusions: ItemExclusionPair[]
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
