export interface DDragonChampion {
  id: string
  key: string
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
  into: string[]
  // Data Dragon's own numeric stat mods (FlatHPPoolMod, PercentMovementSpeedMod, ...) — a much
  // smaller, incomplete set of stats than the tooltip text covers, but it's a factual fallback
  // for the handful of items (e.g. World Atlas) whose `description` is blank in Data Dragon.
  stats: Record<string, number>
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
