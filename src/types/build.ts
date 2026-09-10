import type { RunePage } from './runes'
import type { BuildItems, ItemExclusionPair } from './items'

export interface Build {
  id: string
  champion: { id: string; name: string }
  title: string
  runePages: RunePage[]
  items: BuildItems
  itemExclusions: ItemExclusionPair[]
  favorite: boolean
  createdAt: string
  updatedAt: string
}
