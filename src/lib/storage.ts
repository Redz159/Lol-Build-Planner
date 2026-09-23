import { EMPTY_COLLECTION, type Collection } from '../types/collection'
import type { Build, Category, ExampleBuild, Loadout, Role, SkillOrder, SummonerSpellSet } from '../types/build'
import type { RunePage, RuneVariant } from '../types/runes'
import {
  normalizeBuildItems,
  normalizeItemExclusions,
  normalizeItemNoteGlobalFlags,
  normalizeItemNotes,
  normalizeItemRequirements,
  normalizeItemSituationalFlags,
  normalizeItemSlotNotes,
  normalizeItemSlots,
  type ItemSlot,
} from '../types/items'
import { ROLES } from './loadouts'
import { SKILL_KEYS, SKILL_POINTS } from './skillOrder'
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

function normalizeSummonerSpellIds(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
}

// `rawSets` is the current per-pair format; `legacyIds` the older flat spell list it replaced.
// A flat list of up to two spells is one set; a longer one can't say which spells went together,
// so it becomes its first spell (usually Flash) paired with each of the others.
function normalizeSummonerSpellSets(rawSets: unknown, legacyIds: unknown): SummonerSpellSet[] {
  if (Array.isArray(rawSets)) {
    return rawSets.map(normalizeSummonerSpellIds).filter((set) => set.length === 2)
  }
  const ids = normalizeSummonerSpellIds(legacyIds)
  if (ids.length === 0) return []
  if (ids.length <= 2) return [ids]
  return ids.slice(1).map((id) => [ids[0], id])
}

function normalizeSkillOrder(value: unknown): SkillOrder {
  const raw = Array.isArray(value) ? value : []
  return Array.from({ length: SKILL_POINTS }, (_, i) => SKILL_KEYS.find((k) => k === raw[i]) ?? null)
}

// The optional tooltip notes of the Skills & Spells tab — only present in the result when set.
function normalizeSkillNotes(raw: Record<string, unknown>): Pick<Category, 'summonerSpellSetNotes' | 'skillOrderNote'> {
  const setNotes = normalizeItemNotes(raw.summonerSpellSetNotes)
  const skillOrderNote = typeof raw.skillOrderNote === 'string' && raw.skillOrderNote.trim() !== '' ? raw.skillOrderNote : undefined
  return {
    ...(Object.keys(setNotes).length > 0 ? { summonerSpellSetNotes: setNotes } : {}),
    ...(skillOrderNote ? { skillOrderNote } : {}),
  }
}

function normalizeExampleBuilds(value: unknown, slots: ItemSlot[]): ExampleBuild[] {
  if (!Array.isArray(value)) return []
  const result: ExampleBuild[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const id = (raw as Record<string, unknown>).id
    const label = (raw as Record<string, unknown>).label
    if (typeof id !== 'string' || typeof label !== 'string') continue
    result.push({ id, label, items: normalizeBuildItems((raw as Record<string, unknown>).items, slots) })
  }
  return result
}

// `fallbackSummonerSpellSets` is the owning loadout's own spells — categories saved before spells
// moved per-category inherit them, so existing builds keep their spells in every category.
function normalizeCategories(value: unknown, slots: ItemSlot[], fallbackSummonerSpellSets: SummonerSpellSet[]): Category[] {
  if (!Array.isArray(value)) return []
  const result: Category[] = []
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue
    const id = (raw as Record<string, unknown>).id
    const label = (raw as Record<string, unknown>).label
    if (typeof id !== 'string' || typeof label !== 'string') continue
    result.push({
      id,
      label,
      runePages: normalizeRunePages((raw as Record<string, unknown>).runePages),
      items: normalizeBuildItems((raw as Record<string, unknown>).items, slots),
      exampleBuilds: normalizeExampleBuilds((raw as Record<string, unknown>).exampleBuilds, slots),
      summonerSpellSets:
        'summonerSpellSets' in raw || 'summonerSpellIds' in raw
          ? normalizeSummonerSpellSets((raw as Record<string, unknown>).summonerSpellSets, (raw as Record<string, unknown>).summonerSpellIds)
          : fallbackSummonerSpellSets,
      skillOrder: normalizeSkillOrder((raw as Record<string, unknown>).skillOrder),
      ...normalizeSkillNotes(raw as Record<string, unknown>),
      ...((raw as Record<string, unknown>).tripleTonic === true ? { tripleTonic: true } : {}),
      ...((raw as Record<string, unknown>).layoutChosen === true ? { layoutChosen: true } : {}),
    })
  }
  return result
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
  // `raw.itemCategories` is the pre-restructure key (items-only categories, no runePages) — still
  // read so builds saved during that period migrate instead of losing their categories.
  const summonerSpellSets = normalizeSummonerSpellSets(raw.summonerSpellSets, raw.summonerSpellIds)
  const categories = normalizeCategories(raw.categories ?? raw.itemCategories, itemSlots, summonerSpellSets)
  const exampleBuilds = normalizeExampleBuilds(raw.exampleBuilds, itemSlots)
  const itemExclusions = normalizeItemExclusions(raw.itemExclusions)
  const itemRequirements = normalizeItemRequirements(raw.itemRequirements)
  const itemNotes = normalizeItemNotes(raw.itemNotes)
  const itemSlotNotes = normalizeItemSlotNotes(raw.itemSlotNotes)
  const itemNoteGlobal = normalizeItemNoteGlobalFlags(raw.itemNoteGlobal)
  const itemSituational = normalizeItemSituationalFlags(raw.itemSituational)

  if (Array.isArray(raw.runePages)) {
    return {
      id: newId(),
      roles: [],
      runePages: normalizeRunePages(raw.runePages),
      summonerSpellSets,
      skillOrder: normalizeSkillOrder(raw.skillOrder),
      itemSlots,
      items,
      categories,
      exampleBuilds,
      itemExclusions,
      itemRequirements,
      itemNotes,
      itemSlotNotes,
      itemNoteGlobal,
      itemSituational,
    }
  }
  const runes = raw.runes as LegacyRuneSelection | undefined
  if (!runes || !runes.primaryTreeId) {
    return {
      id: newId(),
      roles: [],
      runePages: [],
      summonerSpellSets: [],
      skillOrder: normalizeSkillOrder(undefined),
      itemSlots,
      items,
      categories,
      exampleBuilds,
      itemExclusions,
      itemRequirements,
      itemNotes,
      itemSlotNotes,
      itemNoteGlobal,
      itemSituational,
    }
  }

  return {
    id: newId(),
    roles: [],
    itemSlots,
    items,
    categories,
    exampleBuilds,
    itemExclusions,
    itemRequirements,
    itemNotes,
    itemSlotNotes,
    itemNoteGlobal,
    itemSituational,
    summonerSpellSets: [],
    skillOrder: normalizeSkillOrder(undefined),
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
        const summonerSpellSets = normalizeSummonerSpellSets(l?.summonerSpellSets, l?.summonerSpellIds)
        return {
          id: l?.id ?? newId(),
          roles: normalizeRoles(l?.roles),
          runePages: normalizeRunePages(l?.runePages),
          summonerSpellSets,
          skillOrder: normalizeSkillOrder(l?.skillOrder),
          ...normalizeSkillNotes(l ?? {}),
          ...(l?.tripleTonic === true ? { tripleTonic: true } : {}),
          itemSlots,
          items: normalizeBuildItems(l?.items, itemSlots),
          categories: normalizeCategories(l?.categories ?? l?.itemCategories, itemSlots, summonerSpellSets),
          exampleBuilds: normalizeExampleBuilds(l?.exampleBuilds, itemSlots),
          itemExclusions: normalizeItemExclusions(l?.itemExclusions),
          itemRequirements: normalizeItemRequirements(l?.itemRequirements),
          itemNotes: normalizeItemNotes(l?.itemNotes),
          itemSlotNotes: normalizeItemSlotNotes(l?.itemSlotNotes),
          itemNoteGlobal: normalizeItemNoteGlobalFlags(l?.itemNoteGlobal),
          itemSituational: normalizeItemSituationalFlags(l?.itemSituational),
          ...(l?.layoutChosen === true ? { layoutChosen: true } : {}),
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
