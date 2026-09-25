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

// A complete, freely chosen rune setup. Premade pages from the build only act as presets that
// fill this in (see presetPicks) — every tree, rune and shard stays selectable afterwards.
export interface RunePicks {
  // The premade page/variant last loaded, if any — only used to mark the runes it lists.
  presetPageId?: string
  presetVariantId?: string
  primaryTreeId?: number
  keystoneId?: number
  // Primary tree row index (1-3) -> rune id.
  primary: Record<number, number>
  secondaryTreeId?: number
  secondary: number[]
  shards: Partial<Record<keyof ShardSelection, number>>
  inputs: Record<number, number>
}

export const EMPTY_RUNE_PICKS: RunePicks = { primary: {}, secondary: [], shards: {}, inputs: {} }

export interface ResolvedRunes {
  keystoneId?: number
  primaryTreeId?: number
  secondaryTreeId?: number
  keystones: number[]
  primaryRows: { row: number; candidates: number[]; picked?: number }[]
  secondaryRows: { row: number; candidates: number[] }[]
  secondary: number[]
  shardRows: { key: keyof ShardSelection; candidates: StatShardOption[]; picked?: number }[]
  // Runes and shards the loaded premade page lists as viable.
  suggested: Set<number>
  selection: RuneSelection
}

export function findRune(trees: DDragonRuneTree[], id: number): DDragonRune | undefined {
  for (const tree of trees) for (const slot of tree.slots) for (const rune of slot.runes) if (rune.id === id) return rune
  return undefined
}

const firstPreferred = (candidates: number[], preferred: number[]) => candidates.find((id) => preferred.includes(id)) ?? candidates[0]

const rowRunes = (tree: DDragonRuneTree | undefined, row: number) => tree?.slots[row]?.runes.map((r) => r.id) ?? []

// Loads a premade page (which lists every viable rune per row) as one concrete setup: the
// preferred (or first viable) pick of each row, up to two secondary runes in different rows.
export function presetPicks(page: RunePage, variantId: string | undefined, trees: DDragonRuneTree[], inputs: Record<number, number>): RunePicks {
  const variant = page.variants.find((v) => v.id === variantId) ?? page.variants[0]
  const primaryTree = trees.find((t) => t.id === page.primaryTreeId)
  const secondaryTree = trees.find((t) => t.id === variant?.secondaryTreeId)
  const primary: Record<number, number> = {}
  for (const row of [1, 2, 3]) {
    const pick = firstPreferred(
      rowRunes(primaryTree, row).filter((id) => page.primaryRuneIds.includes(id)),
      page.preferredPrimaryRuneIds,
    )
    if (pick) primary[row] = pick
  }
  const secondary: number[] = []
  const rowOf = (id: number) => [1, 2, 3].find((row) => rowRunes(secondaryTree, row).includes(id))
  const ordered = [
    ...(variant?.preferredSecondaryRuneIds ?? []),
    ...(variant?.secondaryRuneIds ?? []).filter((id) => !variant?.preferredSecondaryRuneIds.includes(id)),
  ]
  for (const id of ordered) {
    const row = rowOf(id)
    if (secondary.length < 2 && row !== undefined && !secondary.some((x) => rowOf(x) === row)) secondary.push(id)
  }
  const shards: RunePicks['shards'] = {}
  for (const { key, options } of SHARD_ROWS) {
    const pick = firstPreferred(
      options.map((o) => o.id).filter((id) => variant?.shards[key].includes(id)),
      variant?.preferredShards[key] ?? [],
    )
    if (pick) shards[key] = pick
  }
  return {
    presetPageId: page.id,
    presetVariantId: variant?.id,
    primaryTreeId: page.primaryTreeId || undefined,
    keystoneId: page.keystoneId || undefined,
    primary,
    secondaryTreeId: variant?.secondaryTreeId || undefined,
    secondary,
    shards,
    inputs,
  }
}

// The picks a side starts with: the build's first premade page, if it has one.
export function initialRunePicks(pages: RunePage[], trees: DDragonRuneTree[]): RunePicks {
  return pages[0] ? presetPicks(pages[0], undefined, trees, {}) : EMPTY_RUNE_PICKS
}

export function resolveRunes(pages: RunePage[], picks: RunePicks, trees: DDragonRuneTree[]): ResolvedRunes {
  const primaryTree = trees.find((t) => t.id === picks.primaryTreeId)
  const secondaryTree = picks.secondaryTreeId !== picks.primaryTreeId ? trees.find((t) => t.id === picks.secondaryTreeId) : undefined
  const keystones = rowRunes(primaryTree, 0)
  const keystoneId = picks.keystoneId && keystones.includes(picks.keystoneId) ? picks.keystoneId : undefined
  const primaryRows = [1, 2, 3].map((row) => {
    const candidates = rowRunes(primaryTree, row)
    return { row, candidates, picked: candidates.includes(picks.primary[row]) ? picks.primary[row] : undefined }
  })
  const secondaryRows = [1, 2, 3].map((row) => ({ row, candidates: rowRunes(secondaryTree, row) }))
  const secondary = picks.secondary.filter((id) => secondaryRows.some((r) => r.candidates.includes(id)))
  const shardRows = SHARD_ROWS.map(({ key, options }) => ({ key, candidates: options, picked: picks.shards[key] }))

  const suggested = new Set<number>()
  const page = pages.find((p) => p.id === picks.presetPageId)
  const variant = page?.variants.find((v) => v.id === picks.presetVariantId)
  if (page) {
    if (page.primaryTreeId === picks.primaryTreeId) [page.keystoneId, ...page.primaryRuneIds].forEach((id) => suggested.add(id))
    if (variant?.secondaryTreeId === picks.secondaryTreeId) variant?.secondaryRuneIds.forEach((id) => suggested.add(id))
    for (const { key } of SHARD_ROWS) variant?.shards[key].forEach((id) => suggested.add(id))
  }

  const runeIds = [keystoneId, ...primaryRows.map((r) => r.picked), ...secondary].filter((id): id is number => !!id)
  const shardIds = shardRows.map((r) => r.picked).filter((id): id is number => !!id)
  return {
    keystoneId,
    primaryTreeId: primaryTree?.id,
    secondaryTreeId: secondaryTree?.id,
    keystones,
    primaryRows,
    secondaryRows,
    secondary,
    shardRows,
    suggested,
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
