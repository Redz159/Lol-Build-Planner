import type { RunePage } from './runes'
import type {
  BuildItems,
  ItemExclusionPair,
  ItemNoteGlobalFlags,
  ItemNotes,
  ItemRequirementPair,
  ItemSituationalFlags,
  ItemSlotNotes,
  ItemSlot,
} from './items'

export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support'

export type SkillKey = 'Q' | 'W' | 'E' | 'R'

// Entry i is the ability taken with the (i+1)-th skill point; always SKILL_POINTS long, null for
// a point not planned yet. With Triple Tonic's Elixir of Skill the 10th point is the elixir
// rather than a level-up — that only changes the grid's column labels, never this data.
export type SkillOrder = (SkillKey | null)[]

// One summoner spell pairing you'd take together (e.g. Flash + Ignite) — a category/loadout can
// list several alternatives. Always two spell ids.
export type SummonerSpellSet = string[]

// One concrete, illustrative "finished build" — up to a few alternative items per slot (stacked
// by preference), separate from the flexible per-slot candidate pool in `items`. Several of
// these can sit side by side under the same category/loadout, each its own example.
export interface ExampleBuild {
  id: string
  label: string
  items: BuildItems
}

// A category is its own independent rune-page set and item set over the same slots — like a
// parallel mini-loadout a loadout can switch between, rather than a tag on its single rune/item
// selection. Runes and items live *under* a category now, not the other way around.
export interface Category {
  id: string
  label: string
  runePages: RunePage[]
  items: BuildItems
  exampleBuilds: ExampleBuild[]
  summonerSpellSets: SummonerSpellSet[]
  skillOrder: SkillOrder
  // Whether the Elixir of Skill column is shown — only honored while one of the rune pages
  // actually takes Triple Tonic. Absent means false.
  tripleTonic?: boolean
  // Whether this category has already been through the item-set layout picker (Standard /
  // Core-based / Blank / Skip) — once true, an empty item pool shows the normal slot editor
  // instead of the picker again. Absent means false, same as the other per-item-set flags.
  layoutChosen?: boolean
}

// How many of an API import's sampled games picked a given item (per slot) or rune/shard —
// purely informational, shown as an optional "(x)" overlay on top of the normal view. Only ever
// set by the Riot import; a hand-built loadout has no games to count, so this stays undefined.
export interface ImportStats {
  items: Record<string, Record<string, number>> // slotId -> itemId -> game count
  runes: Record<number, number> // runeId/shardId -> game count (ids are unique across trees/rows)
}

export interface Loadout {
  id: string
  roles: Role[]
  runePages: RunePage[]
  summonerSpellSets: SummonerSpellSet[]
  skillOrder: SkillOrder
  tripleTonic?: boolean
  itemSlots: ItemSlot[]
  items: BuildItems
  categories: Category[]
  exampleBuilds: ExampleBuild[]
  itemExclusions: ItemExclusionPair[]
  itemRequirements: ItemRequirementPair[]
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
  importStats?: ImportStats
  // Same meaning as Category.layoutChosen, for the loadout's own plain item pool — only read
  // while the loadout has no categories at all (see ItemsEditor's currentItems scoping).
  layoutChosen?: boolean
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
