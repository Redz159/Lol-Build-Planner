import type { BuildItems, ItemSlot } from '../types/items'

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

// `championKey` is Data Dragon's numeric champion id (as a string, e.g. "266" for Aatrox) —
// what the client's associatedChampions field expects, not the champion's slug id.
export function buildLeagueItemSet(title: string, championKey: string | undefined, slots: ItemSlot[], buildItems: BuildItems): LeagueItemSet {
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
    blocks,
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
  return { title: typeof title === 'string' ? title : '', blocks }
}
