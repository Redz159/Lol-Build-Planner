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
  gold: { purchasable: boolean }
  maps: Record<string, boolean>
}

export async function getItems(): Promise<DDragonItem[]> {
  const raw = await cachedFetch<{ data: Record<string, RawDDragonItem> }>(
    `ddragon:${DDRAGON_VERSION}:items`,
    `${CDN}/cdn/${DDRAGON_VERSION}/data/en_US/item.json`,
  )
  return Object.entries(raw.data)
    .filter(([, item]) => item.gold.purchasable && item.maps['11'])
    .map(([id, item]) => ({ id, name: item.name, image: item.image }))
    .sort((a, b) => a.name.localeCompare(b.name))
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
