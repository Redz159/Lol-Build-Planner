import type { DDragonChampion, DDragonItem, DDragonRuneTree, DDragonSummonerSpell } from '../types/ddragon'
import {
  championImageUrl,
  itemImageUrl,
  passiveImageUrl,
  runeIconUrl,
  summonerSpellImageUrl,
} from './ddragon'

// One entry of public/data/abilities.json (scripts/gen-ability-index.mjs).
export interface AbilityIndexEntry {
  champion: string
  slot: 'P' | 'Q' | 'W' | 'E' | 'R'
  name: string
  icon: string
}

// Something the guide editor can insert as an inline icon. `ref` is what gets stored in the
// guide ("item:6699", "ability:Volibear:Q", ...); the icon URL is looked up again on render.
export interface IconEntry {
  ref: string
  name: string
  subtitle: string
  iconUrl: string
}

export interface IconSources {
  champions: DDragonChampion[]
  items: DDragonItem[]
  runeTrees: DDragonRuneTree[]
  summonerSpells: DDragonSummonerSpell[]
}

export function buildIconIndex(sources: IconSources, abilities: AbilityIndexEntry[]): IconEntry[] {
  const championNames = new Map(sources.champions.map((c) => [c.id, c.name]))
  return [
    ...sources.champions.map((c) => ({
      ref: `champion:${c.id}`,
      name: c.name,
      subtitle: 'Champion',
      iconUrl: championImageUrl(c.image.full),
    })),
    ...sources.items.map((i) => ({
      ref: `item:${i.id}`,
      name: i.name,
      subtitle: 'Item',
      iconUrl: itemImageUrl(i.image.full),
    })),
    ...sources.runeTrees.flatMap((tree) =>
      tree.slots.flatMap((slot) =>
        slot.runes.map((r) => ({
          ref: `rune:${r.id}`,
          name: r.name,
          subtitle: `${tree.name} rune`,
          iconUrl: runeIconUrl(r.icon),
        })),
      ),
    ),
    ...sources.summonerSpells.map((s) => ({
      ref: `spell:${s.id}`,
      name: s.name,
      subtitle: 'Summoner spell',
      iconUrl: summonerSpellImageUrl(s.image.full),
    })),
    ...abilities.map((a) => ({
      ref: `ability:${a.champion}:${a.slot}`,
      name: a.name,
      subtitle: `${championNames.get(a.champion) ?? a.champion} ${a.slot === 'P' ? 'Passive' : a.slot}`,
      iconUrl: a.slot === 'P' ? passiveImageUrl(a.icon) : summonerSpellImageUrl(a.icon),
    })),
  ]
}

// Lowercase letters and digits only, so "kai'sa", "Kai'Sa" and "kaisa" all match the same way.
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// 0 = the name starts with the query, 1 = a later word starts with it, 2 = it's somewhere inside.
function matchRank(name: string, query: string): number | null {
  const full = normalize(name)
  if (full.startsWith(query)) return 0
  const words = name.split(/[\s\-–:]+/)
  for (let i = 1; i < words.length; i++) {
    if (normalize(words.slice(i).join('')).startsWith(query)) return 1
  }
  return full.includes(query) ? 2 : null
}

export function searchIcons(index: IconEntry[], query: string, limit = 8): IconEntry[] {
  const q = normalize(query)
  if (q === '') return []
  const matches: { entry: IconEntry; rank: number }[] = []
  for (const entry of index) {
    const rank = matchRank(entry.name, q)
    if (rank !== null) matches.push({ entry, rank })
  }
  matches.sort((a, b) => a.rank - b.rank || a.entry.name.length - b.entry.name.length)
  return matches.slice(0, limit).map((m) => m.entry)
}

// The entry whose whole name is the query (":volibear:", ":infinityedge:"), if any.
export function findExactIcon(index: IconEntry[], query: string): IconEntry | undefined {
  const q = normalize(query)
  return q === '' ? undefined : index.find((e) => normalize(e.name) === q)
}
