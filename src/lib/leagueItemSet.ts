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
