export type TagId = string

export interface Tag {
  id: TagId
  label: string
  origin: 'premade' | 'custom'
}
