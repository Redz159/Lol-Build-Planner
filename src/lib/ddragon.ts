import { DDRAGON_VERSION } from '../data/ddragonVersion'
import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../types/ddragon'

const CDN = 'https://ddragon.leagueoflegends.com'

async function cachedFetch<T>(cacheKey: string, url: string): Promise<T> {
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      return JSON.parse(cached) as T
    } catch {
      // fall through and refetch
    }
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`)
  const data = (await res.json()) as T
  localStorage.setItem(cacheKey, JSON.stringify(data))
  return data
}

export async function getChampions(): Promise<DDragonChampion[]> {
  const raw = await cachedFetch<{ data: Record<string, DDragonChampion> }>(
    `ddragon:${DDRAGON_VERSION}:champions`,
    `${CDN}/cdn/${DDRAGON_VERSION}/data/en_US/champion.json`,
  )
  return Object.values(raw.data).sort((a, b) => a.name.localeCompare(b.name))
}

interface RawDDragonItem extends DDragonItem {
  gold: { total: number; purchasable: boolean }
  maps: Record<string, boolean>
  into?: string[]
  requiredChampion?: string
}

// ARAM-only starter items (World Atlas, Celestial Opposition, Dream Maker, Zaz'Zak's
// Realmspike, Solstice Sleigh, Bloodsong, Guardian's Horn/Orb/Blade/Hammer, Cappa Juice)
// are flagged as available on map 11 too, even though they can't actually be bought on
// Summoner's Rift.
const ARAM_STARTER_ITEM_IDS = new Set([
  '3865',
  '3869',
  '3870',
  '3871',
  '3876',
  '3877',
  '2051',
  '3112',
  '3177',
  '3184',
  '2141',
])

export async function getItems(): Promise<DDragonItem[]> {
  const raw = await cachedFetch<{ data: Record<string, RawDDragonItem> }>(
    `ddragon:${DDRAGON_VERSION}:items`,
    `${CDN}/cdn/${DDRAGON_VERSION}/data/en_US/item.json`,
  )
  // Other game modes (Arena, ...) reuse an existing item's name under their own six-digit
  // id, incorrectly flagged as available on map 11 too; drop those so items aren't listed
  // twice, and so mode-exclusive items whose real SR id was retired don't show up at all.
  const bestByName = new Map<string, [string, RawDDragonItem]>()
  for (const [id, item] of Object.entries(raw.data)) {
    if (!item.gold.purchasable || !item.maps['11'] || Number(id) >= 100000) continue
    if (item.requiredChampion || ARAM_STARTER_ITEM_IDS.has(id)) continue
    const existing = bestByName.get(item.name)
    if (!existing || Number(id) < Number(existing[0])) bestByName.set(item.name, [id, item])
  }
  return Array.from(bestByName.values())
    .map(([id, item]) => ({
      id,
      name: item.name,
      description: item.description,
      image: item.image,
      tags: item.tags,
      gold: { total: item.gold.total },
      into: item.into ?? [],
    }))
    .sort((a, b) => a.gold.total - b.gold.total)
}

export async function getRuneTrees(): Promise<DDragonRuneTree[]> {
  return cachedFetch<DDragonRuneTree[]>(
    `ddragon:${DDRAGON_VERSION}:runes`,
    `${CDN}/cdn/${DDRAGON_VERSION}/data/en_US/runesReforged.json`,
  )
}

export function championImageUrl(fullImageName: string): string {
  return `${CDN}/cdn/${DDRAGON_VERSION}/img/champion/${fullImageName}`
}

export function itemImageUrl(fullImageName: string): string {
  return `${CDN}/cdn/${DDRAGON_VERSION}/img/item/${fullImageName}`
}

export function runeIconUrl(icon: string): string {
  return `${CDN}/cdn/img/${icon}`
}

const WIKI_IMG_CDN = 'https://wiki.leagueoflegends.com/en-us/images/thumb'

// The official rune tree crest icons ddragon ships are only 32x32 and look blurry once
// upscaled. The League wiki hosts a sharper 85x85 flat-style version of the same crests.
export function runeTreeIconUrl(treeKey: string): string {
  return `${WIKI_IMG_CDN}/${treeKey}_icon.png/64px-${treeKey}_icon.png`
}
