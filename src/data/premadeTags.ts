import type { Tag } from '../types/tags'

// Only situational/judgment tags live here — anything that's an objective fact about
// an item's stats (Armor, AP, Ability Haste, ...) is auto-derived, see lib/itemStatTags.ts.
export const PREMADE_TAGS: Tag[] = [
  { id: 'antiheal', label: 'Anti-heal', origin: 'premade' },
  { id: 'tank', label: 'Tank', origin: 'premade' },
  { id: 'antishield', label: 'Anti-shield', origin: 'premade' },
]
