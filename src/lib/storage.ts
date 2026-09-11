import { EMPTY_COLLECTION, type Collection } from '../types/collection'
import type { Build, Loadout, Role } from '../types/build'
import type { RunePage, RuneVariant } from '../types/runes'
import { normalizeBuildItems, normalizeItemExclusions, normalizeItemNotes, normalizeItemSlots } from '../types/items'
import { ROLES } from './loadouts'
import { newId } from './id'

const STORAGE_KEY = 'lolbp:collection'

interface LegacyRuneSelection {
  primaryTreeId: number
  keystoneId: number
  primaryRuneIds: number[]
  secondaryTreeId: number
  secondaryRuneIds: number[]
  shards: { offense: number; flex: number; defense: number }
}

// Tolerates both the current flat-array "preferred" shape and the earlier one-per-row
// (nullable) shape, so builds saved during development don't break on load.
function toPreferredArray(value: unknown): number[] {
  if (Array.isArray(value)) return value.filter((id): id is number => typeof id === 'number')
  if (typeof value === 'number') return [value]
  return []
}

// `v` is untrusted data straight from JSON.parse, potentially in an older shape.
function normalizeVariant(v: any): RuneVariant {
  return {
    id: v.id ?? newId(),
    secondaryTreeId: v.secondaryTreeId ?? 0,
    secondaryRuneIds: v.secondaryRuneIds ?? [],
    preferredSecondaryRuneIds: toPreferredArray(v.preferredSecondaryRuneIds),
    shards: v.shards ?? { offense: [], flex: [], defense: [] },
    preferredShards: {
      offense: toPreferredArray(v.preferredShards?.offense),
      flex: toPreferredArray(v.preferredShards?.flex),
      defense: toPreferredArray(v.preferredShards?.defense),
    },
  }
}

function normalizeRunePage(p: Partial<RunePage>): RunePage {
  return {
    id: p.id ?? newId(),
    primaryTreeId: p.primaryTreeId ?? 0,
    keystoneId: p.keystoneId ?? 0,
    preferredKeystone: p.preferredKeystone ?? false,
    primaryRuneIds: p.primaryRuneIds ?? [],
    preferredPrimaryRuneIds: toPreferredArray(p.preferredPrimaryRuneIds),
    variants: (p.variants ?? []).map(normalizeVariant),
  }
}

function normalizeRunePages(value: unknown): RunePage[] {
  return Array.isArray(value) ? value.map(normalizeRunePage) : []
}

function normalizeRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return []
  return ROLES.filter((r) => value.includes(r))
}

// `raw` is untrusted data straight from JSON.parse (localStorage or an imported file),
// potentially from a pre-loadouts schema version where runePages/items/itemExclusions sat
// directly on the build, or (older still) a single `runes` selection instead of `runePages`.
function migrateLegacyFlatBuild(raw: any): Loadout {
  const itemSlots = normalizeItemSlots(raw.itemSlots)
  const items = normalizeBuildItems(raw.items, itemSlots)
  const itemExclusions = normalizeItemExclusions(raw.itemExclusions)
  const itemNotes = normalizeItemNotes(raw.itemNotes)

  if (Array.isArray(raw.runePages)) {
    return { id: newId(), roles: [], runePages: normalizeRunePages(raw.runePages), itemSlots, items, itemExclusions, itemNotes }
  }
  const runes = raw.runes as LegacyRuneSelection | undefined
  if (!runes || !runes.primaryTreeId) return { id: newId(), roles: [], runePages: [], itemSlots, items, itemExclusions, itemNotes }

  return {
    id: newId(),
    roles: [],
    itemSlots,
    items,
    itemExclusions,
    itemNotes,
    runePages: [
      {
        id: newId(),
        primaryTreeId: runes.primaryTreeId,
        keystoneId: runes.keystoneId,
        preferredKeystone: false,
        primaryRuneIds: runes.primaryRuneIds,
        preferredPrimaryRuneIds: [],
        variants: [
          {
            id: newId(),
            secondaryTreeId: runes.secondaryTreeId,
            secondaryRuneIds: runes.secondaryRuneIds,
            preferredSecondaryRuneIds: [],
            shards: {
              offense: runes.shards.offense ? [runes.shards.offense] : [],
              flex: runes.shards.flex ? [runes.shards.flex] : [],
              defense: runes.shards.defense ? [runes.shards.defense] : [],
            },
            preferredShards: { offense: [], flex: [], defense: [] },
          },
        ],
      },
    ],
  }
}

export function migrateBuild(raw: any): Build {
  const parsedLoadouts: Loadout[] = Array.isArray(raw.loadouts)
    ? raw.loadouts.map((l: any) => {
        const itemSlots = normalizeItemSlots(l?.itemSlots)
        return {
          id: l?.id ?? newId(),
          roles: normalizeRoles(l?.roles),
          runePages: normalizeRunePages(l?.runePages),
          itemSlots,
          items: normalizeBuildItems(l?.items, itemSlots),
          itemExclusions: normalizeItemExclusions(l?.itemExclusions),
          itemNotes: normalizeItemNotes(l?.itemNotes),
        }
      })
    : []
  const loadouts = parsedLoadouts.length > 0 ? parsedLoadouts : [migrateLegacyFlatBuild(raw)]

  return {
    id: raw.id ?? newId(),
    champion: raw.champion,
    title: raw.title,
    favorite: raw.favorite ?? false,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
    loadouts,
  }
}

export function loadCollection(): Collection {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_COLLECTION
  try {
    const parsed = JSON.parse(raw) as Collection
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.builds)) return EMPTY_COLLECTION
    return { ...parsed, builds: parsed.builds.map(migrateBuild) }
  } catch {
    return EMPTY_COLLECTION
  }
}

export function saveCollection(collection: Collection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
}
