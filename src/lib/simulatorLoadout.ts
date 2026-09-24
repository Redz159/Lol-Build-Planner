import type { ExampleBuild, SkillKey, SkillOrder } from '../types/build'
import type { DDragonItem, DDragonRune, DDragonRuneTree } from '../types/ddragon'
import type { ItemSlot } from '../types/items'
import type { RunePage, ShardSelection } from '../types/runes'
import { DEFENSE_SHARDS, FLEX_SHARDS, OFFENSE_SHARDS, type StatShardOption } from '../data/statShards'
import type { RuneSelection } from './statEngine'

export const MAX_SIM_ITEMS = 6
export const SHARD_ROWS: { key: keyof ShardSelection; options: StatShardOption[] }[] = [
  { key: 'offense', options: OFFENSE_SHARDS },
  { key: 'flex', options: FLEX_SHARDS },
  { key: 'defense', options: DEFENSE_SHARDS },
]

// What the user has explicitly clicked in the simulator's rune picker. Anything left unset
// falls back to the rune page's own preferred (or first) pick for that row.
export interface RunePicks {
  pageId?: string
  variantId?: string
  // Primary tree row index (1-3) -> rune id.
  primary: Record<number, number>
  // Exactly the secondary runes picked, once the user has touched them.
  secondary?: number[]
  shards: Partial<Record<keyof ShardSelection, number>>
  inputs: Record<number, number>
}

export const EMPTY_RUNE_PICKS: RunePicks = { primary: {}, shards: {}, inputs: {} }

export interface ResolvedRunes {
  page?: RunePage
  variantId?: string
  keystoneId?: number
  primaryTreeId?: number
  secondaryTreeId?: number
  // Row index -> the rune ids the page allows there, and the one in use.
  primaryRows: { row: number; candidates: number[]; picked?: number }[]
  secondaryRows: { row: number; candidates: number[] }[]
  secondary: number[]
  shardRows: { key: keyof ShardSelection; candidates: StatShardOption[]; picked?: number }[]
  selection: RuneSelection
}

export function findRune(trees: DDragonRuneTree[], id: number): DDragonRune | undefined {
  for (const tree of trees) for (const slot of tree.slots) for (const rune of slot.runes) if (rune.id === id) return rune
  return undefined
}

const firstPreferred = (candidates: number[], preferred: number[]) => candidates.find((id) => preferred.includes(id)) ?? candidates[0]

// Turns a rune page (which lists every viable rune per row) plus the user's clicks into one
// concrete in-game rune setup.
export function resolveRunes(pages: RunePage[], picks: RunePicks, trees: DDragonRuneTree[]): ResolvedRunes {
  const page = pages.find((p) => p.id === picks.pageId) ?? pages[0]
  const variant = page?.variants.find((v) => v.id === picks.variantId) ?? page?.variants[0]
  const primaryTree = trees.find((t) => t.id === page?.primaryTreeId)
  const secondaryTree = trees.find((t) => t.id === variant?.secondaryTreeId)

  const primaryRows = (primaryTree?.slots.slice(1) ?? []).map((slot, i) => {
    const row = i + 1
    const inRow = slot.runes.map((r) => r.id)
    const allowed = inRow.filter((id) => page?.primaryRuneIds.includes(id))
    const candidates = allowed.length > 0 ? allowed : inRow
    const picked = picks.primary[row] !== undefined && candidates.includes(picks.primary[row]) ? picks.primary[row] : firstPreferred(allowed, page?.preferredPrimaryRuneIds ?? [])
    return { row, candidates, picked }
  })

  const secondaryRows = (secondaryTree?.slots.slice(1) ?? []).map((slot, i) => {
    const inRow = slot.runes.map((r) => r.id)
    const allowed = inRow.filter((id) => variant?.secondaryRuneIds.includes(id))
    return { row: i + 1, candidates: allowed.length > 0 ? allowed : inRow }
  })
  const rowOf = (id: number) => secondaryRows.find((r) => r.candidates.includes(id))?.row
  let secondary: number[]
  if (picks.secondary) {
    secondary = picks.secondary.filter((id) => rowOf(id) !== undefined)
  } else {
    // Default: preferred picks first, then the rest, at most one per row and two in total.
    const ordered = [
      ...(variant?.preferredSecondaryRuneIds ?? []),
      ...(variant?.secondaryRuneIds ?? []).filter((id) => !variant?.preferredSecondaryRuneIds.includes(id)),
    ]
    secondary = []
    for (const id of ordered) {
      if (secondary.length >= 2) break
      const row = rowOf(id)
      if (row !== undefined && !secondary.some((s) => rowOf(s) === row)) secondary.push(id)
    }
  }

  const shardRows = SHARD_ROWS.map(({ key, options }) => {
    const allowed = variant ? options.filter((o) => variant.shards[key].includes(o.id)) : []
    const candidates = allowed.length > 0 ? allowed : options
    const clicked = picks.shards[key]
    const picked =
      clicked !== undefined && candidates.some((o) => o.id === clicked)
        ? clicked
        : firstPreferred(
            allowed.map((o) => o.id),
            variant?.preferredShards[key] ?? [],
          )
    return { key, candidates, picked }
  })

  const runeIds = [page?.keystoneId, ...primaryRows.map((r) => r.picked), ...secondary].filter((id): id is number => !!id)
  const shardIds = shardRows.map((r) => r.picked).filter((id): id is number => !!id)
  return {
    page,
    variantId: variant?.id,
    keystoneId: page?.keystoneId || undefined,
    primaryTreeId: page?.primaryTreeId,
    secondaryTreeId: variant?.secondaryTreeId,
    primaryRows,
    secondaryRows,
    secondary,
    shardRows,
    selection: { runeIds, shardIds, inputs: picks.inputs },
  }
}

// Clicking a secondary rune: replaces whatever sits in the same row, otherwise drops the oldest
// pick once two are chosen — the same way the in-game secondary tree behaves.
export function toggleSecondary(current: number[], id: number, rowOf: (id: number) => number | undefined): number[] {
  if (current.includes(id)) return current.filter((x) => x !== id)
  const withoutRow = current.filter((x) => rowOf(x) !== rowOf(id))
  return [...withoutRow, id].slice(-2)
}

// Ability ranks at a champion level, from the build's planned skill order (the first `level`
// points). Points past what's planned just aren't counted.
export function ranksAtLevel(order: SkillOrder, level: number): Record<SkillKey, number> {
  const ranks: Record<SkillKey, number> = { Q: 0, W: 0, E: 0, R: 0 }
  for (const key of order.slice(0, level)) if (key) ranks[key]++
  return ranks
}

// A finished example build's "final six": the top pick of every slot, skipping the starter slot
// and anything that still builds into something else (components, tier-1 boots).
export function exampleBuildFinalItems(build: ExampleBuild, slots: ItemSlot[], allItems: DDragonItem[]): string[] {
  const result: string[] = []
  for (const slot of slots) {
    if (slot.kind === 'starter') continue
    const itemId = build.items[slot.id]?.[0]?.itemId
    const item = allItems.find((i) => i.id === itemId)
    if (!item || item.into.length > 0 || result.includes(item.id)) continue
    result.push(item.id)
  }
  return result.slice(0, MAX_SIM_ITEMS)
}
