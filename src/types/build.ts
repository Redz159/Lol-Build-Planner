import type { RunePage } from './runes'
import type { ItemSlot } from './items'
import type { Tag } from './tags'

export interface Build {
  id: string
  champion: { id: string; name: string }
  title: string
  runePages: RunePage[]
  itemSlots: ItemSlot[]
  customTags: Tag[]
  favorite: boolean
  createdAt: string
  updatedAt: string
}
