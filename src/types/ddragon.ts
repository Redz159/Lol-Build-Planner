export interface DDragonChampion {
  id: string
  name: string
  title: string
  image: { full: string }
}

export interface DDragonItem {
  id: string
  name: string
  description: string
  image: { full: string }
  tags: string[]
  gold: { total: number }
}

export interface DDragonRune {
  id: number
  key: string
  icon: string
  name: string
  shortDesc: string
}

export interface DDragonRuneSlot {
  runes: DDragonRune[]
}

export interface DDragonRuneTree {
  id: number
  key: string
  icon: string
  name: string
  slots: DDragonRuneSlot[]
}
