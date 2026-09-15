import type { ExampleBuild } from '../types/build'
import type { BuildItems, ItemSlot } from '../types/items'
import { newId } from './id'

// Matches the JSON schema the League client reads from
// Config/Champions/<Champion>/Recommended/*.json, and accepts via its item-set import dialog.
export interface LeagueItemSetBlock {
  type: string
  items: { id: string; count: number }[]
}

export interface LeagueItemSet {
  title: string
  type: 'custom'
  map: 'any'
  mode: 'any'
  priority: false
  sortrank: number
  associatedChampions: number[]
  associatedMaps: number[]
  blocks: LeagueItemSetBlock[]
}

// "Most common (8 games)" / "Alternative 2 (6 games)" -> "Example build: 8 Games" / "Example
// build: 6 Games" — the game count is what actually matters once this is its own titled block;
// a hand-typed label (no game count to find) is just used as-is instead.
function exampleBuildBlockTitle(label: string): string {
  const match = label.match(/(\d+)\s*games?/i)
  return match ? `Example build: ${match[1]} Games` : `Example build: ${label}`
}

// Each example build becomes its own block/row, holding only its most-used pick per slot — the
// flexible pool's "every candidate" block already covers alternatives, so this row is meant to
// read as one concrete, unambiguous build. Boots is the one exception: up to 2 alternatives,
// since picking the wrong single boots there is a much bigger tempo loss than any other slot.
function exampleBuildBlocks(exampleBuilds: ExampleBuild[], slots: ItemSlot[]): LeagueItemSetBlock[] {
  return exampleBuilds
    .map((build) => ({
      type: exampleBuildBlockTitle(build.label),
      items: slots.flatMap((slot) => {
        const cap = slot.kind === 'boots' ? 2 : 1
        return (build.items[slot.id] ?? []).slice(0, cap).map((p) => ({ id: p.itemId, count: 1 }))
      }),
    }))
    .filter((block) => block.items.length > 0)
}

// `championKey` is Data Dragon's numeric champion id (as a string, e.g. "266" for Aatrox) —
// what the client's associatedChampions field expects, not the champion's slug id.
export function buildLeagueItemSet(
  title: string,
  championKey: string | undefined,
  slots: ItemSlot[],
  buildItems: BuildItems,
  exampleBuilds: ExampleBuild[] = [],
): LeagueItemSet {
  const championId = championKey ? Number(championKey) : NaN
  const blocks = slots
    .map((slot) => ({
      type: slot.label,
      items: (buildItems[slot.id] ?? []).map((p) => ({ id: p.itemId, count: 1 })),
    }))
    .filter((block) => block.items.length > 0)

  return {
    title,
    type: 'custom',
    map: 'any',
    mode: 'any',
    priority: false,
    sortrank: 0,
    associatedChampions: Number.isFinite(championId) ? [championId] : [],
    associatedMaps: [],
    blocks: [...blocks, ...exampleBuildBlocks(exampleBuilds, slots)],
  }
}

export function leagueItemSetJson(set: LeagueItemSet): string {
  return JSON.stringify(set, null, 2)
}

export function downloadLeagueItemSet(set: LeagueItemSet): void {
  const blob = new Blob([leagueItemSetJson(set)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${set.title}.json`.replace(/\s+/g, '_')
  a.click()
  URL.revokeObjectURL(url)
}

export interface ParsedItemSetBlock {
  label: string
  itemIds: string[]
}

export interface ParsedItemSet {
  title: string
  blocks: ParsedItemSetBlock[]
  // Data Dragon numeric champion keys from the set's associatedChampions, if any — used to guess
  // which champion a freshly-imported build should belong to.
  associatedChampionKeys: number[]
}

// `json` is untrusted text the user pasted or loaded from a file — tolerate anything and throw
// a plain-language error rather than letting a JSON.parse/shape exception leak through.
export function parseLeagueItemSet(json: string): ParsedItemSet {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('That is not valid JSON.')
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray((raw as Record<string, unknown>).blocks)) {
    throw new Error('That does not look like a League item set (missing "blocks").')
  }
  const rawBlocks = (raw as Record<string, unknown>).blocks as unknown[]
  const blocks: ParsedItemSetBlock[] = rawBlocks
    .map((block): ParsedItemSetBlock | null => {
      if (!block || typeof block !== 'object') return null
      const type = (block as Record<string, unknown>).type
      const items = (block as Record<string, unknown>).items
      if (typeof type !== 'string' || !Array.isArray(items)) return null
      const itemIds = items
        .filter((item): item is { id: string } => !!item && typeof item === 'object' && typeof (item as Record<string, unknown>).id === 'string')
        .map((item) => item.id)
      return itemIds.length > 0 ? { label: type, itemIds } : null
    })
    .filter((block): block is ParsedItemSetBlock => block !== null)
  if (blocks.length === 0) throw new Error('That item set has no items in it.')

  const title = (raw as Record<string, unknown>).title
  const associatedChampions = (raw as Record<string, unknown>).associatedChampions
  const associatedChampionKeys = Array.isArray(associatedChampions) ? associatedChampions.filter((n): n is number => typeof n === 'number') : []
  return { title: typeof title === 'string' ? title : '', blocks, associatedChampionKeys }
}

// Builds a fresh set of slots (one per block, in order) and their items — for a brand-new build
// rather than merging into one that already has its own slots (see ItemsEditor's own import,
// which matches against existing slots instead).
export function slotsAndItemsFromParsedSet(parsed: ParsedItemSet): { itemSlots: ItemSlot[]; items: BuildItems } {
  const itemSlots: ItemSlot[] = parsed.blocks.map((block) => ({ id: newId(), label: block.label }))
  const items: BuildItems = {}
  parsed.blocks.forEach((block, i) => {
    items[itemSlots[i].id] = block.itemIds.map((itemId) => ({ id: newId(), itemId }))
  })
  return { itemSlots, items }
}
