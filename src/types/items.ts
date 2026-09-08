import type { TagId } from './tags'

export interface ItemOption {
  id: string
  itemId: string
  situational: boolean
  tagIds: TagId[]
  excludes: string[]
}

export interface ItemSlot {
  id: string
  label: string
  options: ItemOption[]
}
