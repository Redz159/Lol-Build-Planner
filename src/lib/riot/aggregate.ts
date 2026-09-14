import type { ExampleBuild, Loadout, Role } from '../../types/build'
import type { BuildItems, ItemExclusionPair, ItemPlacement, ItemSlot } from '../../types/items'
import { DEFAULT_ITEM_SLOTS, emptyBuildItems } from '../../types/items'
import { isBoots, isStarterItem } from '../itemAttributes'
import { MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT } from '../exampleBuilds'
import { newId } from '../id'
import type { RiotMatch, RiotParticipant, RiotTimeline } from './types'

const POSITION_TO_ROLE: Record<string, Role> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MIDDLE: 'mid',
  BOTTOM: 'adc',
  UTILITY: 'support',
}

// A game counts as a valid sample for a role only if Riot tagged the participant's position —
// ARAM and some remakes report an empty teamPosition, so those games are dropped rather than
// guessed at.
export function roleForParticipant(p: RiotParticipant): Role | undefined {
  return POSITION_TO_ROLE[p.teamPosition]
}

export function findParticipant(match: RiotMatch, puuid: string): RiotParticipant | undefined {
  return match.info.participants.find((p) => p.puuid === puuid)
}

function topByFrequency(counts: Map<number, number>): number | undefined {
  let best: number | undefined
  let bestCount = -1
  for (const [id, count] of counts) {
    if (count > bestCount) {
      best = id
      bestCount = count
    }
  }
  return best
}

function bump(map: Map<number, number>, id: number): void {
  map.set(id, (map.get(id) ?? 0) + 1)
}

// Reconstructs the order items actually remained in a player's inventory, from the match
// timeline's purchase/sell/destroy/undo events for one participant — final item0..item6 slots
// only reflect end-of-game inventory position, not build order or intermediate boots tiers.
//
// A real "combine into a finished item" transaction always logs the components' ITEM_DESTROYED
// paired with the finished item's ITEM_PURCHASED at the exact same timestamp (verified against
// live match data). Passive in-game auto-upgrades — the Tear line (Manamune -> Muramana,
// Archangel's Staff -> Seraph's Embrace, Winter's Approach -> Fimbulwinter) and the jungler
// boots line — fire a lone ITEM_DESTROYED with no matching purchase, since Riot never logs a
// "purchase" for the evolved form at all (it's not buyable — Data Dragon marks it
// non-purchasable and our item list excludes it). A potion being fully drunk is the same lone-
// destroy shape. In every one of those cases the original purchased entry should just stay, so
// only a destroy paired with a same-tick purchase actually removes anything.
function reconstructBuildOrder(timeline: RiotTimeline, participantId: number): { itemId: number; timestamp: number }[] {
  const events = timeline.info.frames
    .flatMap((f) => f.events)
    .filter((e) => e.participantId === participantId)
    .sort((a, b) => a.timestamp - b.timestamp)
  const purchaseTimestamps = new Set(events.filter((e) => e.type === 'ITEM_PURCHASED').map((e) => e.timestamp))

  const sequence: { itemId: number; timestamp: number }[] = []
  const removeLast = (itemId: number) => {
    for (let i = sequence.length - 1; i >= 0; i--) {
      if (sequence[i].itemId === itemId) {
        sequence.splice(i, 1)
        return
      }
    }
  }
  for (const e of events) {
    if (e.type === 'ITEM_PURCHASED' && e.itemId) sequence.push({ itemId: e.itemId, timestamp: e.timestamp })
    else if (e.type === 'ITEM_SOLD' && e.itemId) removeLast(e.itemId)
    else if (e.type === 'ITEM_DESTROYED' && e.itemId && purchaseTimestamps.has(e.timestamp)) removeLast(e.itemId)
    else if (e.type === 'ITEM_UNDO') {
      if (e.beforeId) removeLast(e.beforeId)
      if (e.afterId) sequence.push({ itemId: e.afterId, timestamp: e.timestamp })
    }
  }
  return sequence
}

const STARTER_PHASE_MS = 3 * 60 * 1000
const CORE_SLOT_IDS = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6']

interface RoleGameData {
  participant: RiotParticipant
  coreItemsInOrder?: number[]
  starterItems?: number[]
  bootsItem?: number
}

// Cap on how many distinct concrete builds get surfaced as example builds — sampled games
// naturally cluster into a handful of build orders, and a wall of near-duplicates isn't more
// useful than the top few most common ones.
const MAX_EXAMPLE_BUILDS_FROM_IMPORT = 3

// How many of the earliest core-item slots identify "the same build" for clustering — games
// that match on these count as the same build even if they diverge everywhere else (a different
// starter, different boots, or a different 2nd/3rd item that converges back later), matching the
// way build guides usually group by their first big item and list everything past it as
// alternatives rather than as separate builds outright. Just the first core item: real games for
// the same champion/role routinely vary their 2nd/3rd item pick before converging again on the
// same later items, and splitting those into separate example builds buried what was actually
// one build with a couple of interchangeable early picks.
const CLUSTER_KEY_CORE_SLOTS = 1

function rankByFrequency(ids: number[]): number[] {
  const counts = new Map<number, number>()
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

// Aggregates one cluster of games into a single example build, the same "rank every distinct
// pick by how often it showed up" treatment buildItems below applies loadout-wide — just scoped
// to this cluster's games instead of every sampled game, and capped to an example build's own
// per-slot alternative limit. A slot every game in the cluster agrees on comes out with one
// placement; a slot they diverge on (starter items, a situational late item, ...) comes out with
// each variant seen as its own alternative.
function exampleBuildItemsFromCluster(games: RoleGameData[], role: Role, itemSlots: ItemSlot[]): BuildItems {
  const items = emptyBuildItems(itemSlots)
  const capped = (ids: number[]): ItemPlacement[] =>
    rankByFrequency(ids)
      .slice(0, MAX_EXAMPLE_BUILD_ITEMS_PER_SLOT)
      .map((id) => ({ id: newId(), itemId: String(id) }))

  items.starter = capped(games.flatMap((g) => g.starterItems ?? []))
  items.boots = capped(games.map((g) => g.bootsItem).filter((id): id is number => id !== undefined))
  CORE_SLOT_IDS.forEach((slotId, position) => {
    if (slotId === 'item6' && role !== 'adc') return
    const idsAtPosition = games.map((g) => g.coreItemsInOrder?.[position]).filter((id): id is number => id !== undefined)
    items[slotId] = capped(idsAtPosition)
  })
  return items
}

// Two games "build into one another" (count as the same build) when the shorter one's core
// order is an actual prefix of the longer one's, up to CLUSTER_KEY_CORE_SLOTS deep — a game that
// only got as far as item1 before the sample ran out (or the game just ended) is still the same
// build as one that went on further from that same item1 foundation, not a separate,
// less-complete build of its own.
function coreOrderIsCompatible(a: number[], b: number[]): boolean {
  const depth = Math.min(a.length, b.length, CLUSTER_KEY_CORE_SLOTS)
  if (depth === 0) return false
  for (let i = 0; i < depth; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// Clusters sampled games by core order (see coreOrderIsCompatible) and turns the most common
// distinct clusters into example builds — these are what a new player would actually want to
// see: "here's what to buy, with the alternatives that came up," not the flexible pool's union
// of every item anyone ever bought. Longest core order first, so a cluster's representative is
// always the most "complete" build seen — a shorter game that's just an earlier stopping point
// on the same path merges into it instead of seeding its own separate, less-complete cluster.
function exampleBuildsFromGames(games: RoleGameData[], role: Role, itemSlots: ItemSlot[]): ExampleBuild[] {
  const usableGames = [...games.filter((g) => g.coreItemsInOrder && g.coreItemsInOrder.length > 0)].sort(
    (a, b) => b.coreItemsInOrder!.length - a.coreItemsInOrder!.length,
  )
  const clusters: { representative: number[]; games: RoleGameData[] }[] = []
  for (const game of usableGames) {
    const core = game.coreItemsInOrder!
    const cluster = clusters.find((c) => coreOrderIsCompatible(c.representative, core))
    if (cluster) cluster.games.push(game)
    else clusters.push({ representative: core, games: [game] })
  }

  return clusters
    .sort((a, b) => b.games.length - a.games.length)
    .slice(0, MAX_EXAMPLE_BUILDS_FROM_IMPORT)
    .map(({ games: clusterGames }, index) => ({
      id: newId(),
      label:
        index === 0
          ? `Most common (${clusterGames.length} game${clusterGames.length === 1 ? '' : 's'})`
          : `Alternative ${index + 1} (${clusterGames.length} game${clusterGames.length === 1 ? '' : 's'})`,
      items: exampleBuildItemsFromCluster(clusterGames, role, itemSlots),
    }))
}

// Builds one role's runes + items from every sampled game played in that role, mirroring the
// app's own data model: all distinct picks are kept (like primaryRuneIds' "viable" set), with
// the most common one flagged preferred — items get the same "keep every variant seen"
// treatment rather than collapsing to a single "best" pick.
export function buildLoadoutForRole(role: Role, games: RoleGameData[], runeTrees: DDragonRuneTree[]): Loadout {
  const perkRow = new Map<number, number>()
  for (const tree of runeTrees) {
    tree.slots.forEach((slot, rowIndex) => {
      for (const rune of slot.runes) perkRow.set(rune.id, rowIndex)
    })
  }

  // --- Runes ---
  const byKeystone = new Map<number, RiotParticipant[]>()
  for (const g of games) {
    const primary = g.participant.perks.styles.find((s) => s.description === 'primaryStyle')
    const keystoneId = primary?.selections[0]?.perk
    if (!keystoneId) continue
    const list = byKeystone.get(keystoneId) ?? []
    list.push(g.participant)
    byKeystone.set(keystoneId, list)
  }

  const runePages = [...byKeystone.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([keystoneId, participants], groupIndex) => {
      const primary = participants[0].perks.styles.find((s) => s.description === 'primaryStyle')!
      const primaryTreeId = primary.style
      const primaryRowCounts = new Map<number, Map<number, number>>()
      const primaryRuneIds = new Set<number>()
      for (const p of participants) {
        const style = p.perks.styles.find((s) => s.description === 'primaryStyle')
        if (!style) continue
        for (const sel of style.selections.slice(1)) {
          const row = perkRow.get(sel.perk)
          if (row === undefined) continue
          primaryRuneIds.add(sel.perk)
          const rowCounts = primaryRowCounts.get(row) ?? new Map<number, number>()
          bump(rowCounts, sel.perk)
          primaryRowCounts.set(row, rowCounts)
        }
      }
      const preferredPrimaryRuneIds = [...primaryRowCounts.values()].map(topByFrequency).filter((id): id is number => id !== undefined)

      const bySecondaryTree = new Map<number, RiotParticipant[]>()
      for (const p of participants) {
        const sub = p.perks.styles.find((s) => s.description === 'subStyle')
        if (!sub) continue
        const list = bySecondaryTree.get(sub.style) ?? []
        list.push(p)
        bySecondaryTree.set(sub.style, list)
      }

      const variants = [...bySecondaryTree.entries()]
        .sort((a, b) => b[1].length - a[1].length)
        .map(([secondaryTreeId, subParticipants]) => {
          const secondaryRowCounts = new Map<number, Map<number, number>>()
          const secondaryRuneIds = new Set<number>()
          const shardCounts = { offense: new Map<number, number>(), flex: new Map<number, number>(), defense: new Map<number, number>() }
          const shardValues = { offense: new Set<number>(), flex: new Set<number>(), defense: new Set<number>() }
          for (const p of subParticipants) {
            const sub = p.perks.styles.find((s) => s.description === 'subStyle')
            if (sub) {
              for (const sel of sub.selections) {
                const row = perkRow.get(sel.perk)
                if (row === undefined) continue
                secondaryRuneIds.add(sel.perk)
                const rowCounts = secondaryRowCounts.get(row) ?? new Map<number, number>()
                bump(rowCounts, sel.perk)
                secondaryRowCounts.set(row, rowCounts)
              }
            }
            shardValues.offense.add(p.perks.statPerks.offense)
            shardValues.flex.add(p.perks.statPerks.flex)
            shardValues.defense.add(p.perks.statPerks.defense)
            bump(shardCounts.offense, p.perks.statPerks.offense)
            bump(shardCounts.flex, p.perks.statPerks.flex)
            bump(shardCounts.defense, p.perks.statPerks.defense)
          }
          const preferredSecondaryRuneIds = [...secondaryRowCounts.values()].map(topByFrequency).filter((id): id is number => id !== undefined)
          const top = (m: Map<number, number>) => {
            const t = topByFrequency(m)
            return t === undefined ? [] : [t]
          }
          return {
            id: newId(),
            secondaryTreeId,
            secondaryRuneIds: [...secondaryRuneIds],
            preferredSecondaryRuneIds,
            shards: { offense: [...shardValues.offense], flex: [...shardValues.flex], defense: [...shardValues.defense] },
            preferredShards: { offense: top(shardCounts.offense), flex: top(shardCounts.flex), defense: top(shardCounts.defense) },
          }
        })

      return {
        id: newId(),
        primaryTreeId,
        keystoneId,
        preferredKeystone: groupIndex === 0,
        primaryRuneIds: [...primaryRuneIds],
        preferredPrimaryRuneIds,
        variants,
      }
    })

  // --- Items ---
  const itemSlots = DEFAULT_ITEM_SLOTS.map((s) => ({ ...s }))
  const buildItems = emptyBuildItems(itemSlots)
  // Every distinct item seen is kept (like primaryRuneIds' "viable" set), ordered most- to
  // least-bought rather than first-seen, so the build reads the same way the player's own
  // choices trended.
  const placementsByFrequency = (ids: number[]): ItemPlacement[] => rankByFrequency(ids).map((id) => ({ id: newId(), itemId: String(id) }))

  const starterIds = games.flatMap((g) => g.starterItems ?? [])
  buildItems.starter = placementsByFrequency(starterIds)

  const bootsIds = games.map((g) => g.bootsItem).filter((id): id is number => id !== undefined)
  buildItems.boots = placementsByFrequency(bootsIds)

  const perPosition: number[][] = CORE_SLOT_IDS.map(() => [])
  const gameCoreSets: Set<number>[] = []
  for (const g of games) {
    if (!g.coreItemsInOrder) continue
    const seenThisGame = new Set<number>()
    g.coreItemsInOrder.forEach((itemId, position) => {
      if (position >= CORE_SLOT_IDS.length) return
      perPosition[position].push(itemId)
      seenThisGame.add(itemId)
    })
    if (seenThisGame.size > 0) gameCoreSets.push(seenThisGame)
  }
  CORE_SLOT_IDS.forEach((slotId, i) => {
    if (slotId === 'item6' && role !== 'adc') return
    buildItems[slotId] = placementsByFrequency(perPosition[i])
  })

  // --- Exclusions: only inferred with a reasonable sample, and only for items that are each
  // individually common enough that their total absence from each other's games is meaningful
  // rather than coincidental. ---
  const itemExclusions: ItemExclusionPair[] = []
  if (gameCoreSets.length >= 5) {
    const pool = [...new Set(perPosition.flatMap((arr) => arr))]
    const gameCount = (id: number) => gameCoreSets.filter((s) => s.has(id)).length
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const a = pool[i]
        const b = pool[j]
        const aCount = gameCount(a)
        const bCount = gameCount(b)
        if (aCount < 2 || bCount < 2) continue
        const coOccur = gameCoreSets.some((s) => s.has(a) && s.has(b))
        if (!coOccur) itemExclusions.push([String(a), String(b)])
      }
    }
  }

  return {
    id: newId(),
    roles: [role],
    runePages,
    itemSlots,
    items: buildItems,
    categories: [],
    exampleBuilds: exampleBuildsFromGames(games, role, itemSlots),
    itemExclusions,
    itemRequirements: [],
    itemNotes: {},
    itemSlotNotes: {},
    itemNoteGlobal: {},
    itemSituational: {},
  }
}

// isLegendaryItem (used everywhere else in the app) requires an item have no further upgrade
// at all — correct for e.g. the browser's "Legendary Item" filter, but some items (Whispering
// Circlet -> Diadem of Songs, same auto-upgrade-via-passive shape as the Tear line) list an
// `into` target that's non-purchasable and thus never reachable in our item pool. For import
// purposes those are effectively finished too: nothing the player could actually still buy.
function isCoreImportItem(item: DDragonItem, purchasableItems: DDragonItem[]): boolean {
  if (isBoots(item) || item.tags.includes('Trinket') || item.gold.total <= 500) return false
  if (item.into.length === 0) return true
  return item.into.every((intoId) => !purchasableItems.some((i) => i.id === intoId))
}

// Classifies one game's reconstructed purchase sequence into starter/boots/core buckets using
// the same item-attribute rules the rest of the app uses (isBoots, isStarterItem, etc.), so an
// imported build reads consistently with a hand-built one.
export function classifyGameItems(timeline: RiotTimeline, participantId: number, items: DDragonItem[]): Omit<RoleGameData, 'participant'> {
  const sequence = reconstructBuildOrder(timeline, participantId)
  const starterItems: number[] = []
  let bootsItem: number | undefined
  const coreItemsInOrder: number[] = []

  for (const { itemId, timestamp } of sequence) {
    const item = items.find((i) => i.id === String(itemId))
    if (!item) continue
    if (isBoots(item)) {
      bootsItem = itemId
    } else if (timestamp <= STARTER_PHASE_MS && isStarterItem(item) && !item.tags.includes('Trinket')) {
      starterItems.push(itemId)
    } else if (isCoreImportItem(item, items)) {
      coreItemsInOrder.push(itemId)
    }
  }
  return { starterItems, bootsItem, coreItemsInOrder }
}
