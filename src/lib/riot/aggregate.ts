import type { Loadout, Role } from '../../types/build'
import type { DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import type { ItemExclusionPair, ItemPlacement } from '../../types/items'
import { DEFAULT_ITEM_SLOTS, emptyBuildItems } from '../../types/items'
import { isBoots, isLegendaryItem, isStarterItem } from '../itemAttributes'
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
  const placementsFor = (ids: Iterable<number>): ItemPlacement[] => [...new Set(ids)].map((id) => ({ id: newId(), itemId: String(id) }))

  const starterIds = games.flatMap((g) => g.starterItems ?? [])
  buildItems.starter = placementsFor(starterIds)

  const bootsIds = games.map((g) => g.bootsItem).filter((id): id is number => id !== undefined)
  buildItems.boots = placementsFor(bootsIds)

  const perPosition: Set<number>[] = CORE_SLOT_IDS.map(() => new Set())
  const gameCoreSets: Set<number>[] = []
  for (const g of games) {
    if (!g.coreItemsInOrder) continue
    const seenThisGame = new Set<number>()
    g.coreItemsInOrder.forEach((itemId, position) => {
      if (position >= CORE_SLOT_IDS.length) return
      perPosition[position].add(itemId)
      seenThisGame.add(itemId)
    })
    if (seenThisGame.size > 0) gameCoreSets.push(seenThisGame)
  }
  CORE_SLOT_IDS.forEach((slotId, i) => {
    if (slotId === 'item6' && role !== 'adc') return
    buildItems[slotId] = placementsFor(perPosition[i])
  })

  // --- Exclusions: only inferred with a reasonable sample, and only for items that are each
  // individually common enough that their total absence from each other's games is meaningful
  // rather than coincidental. ---
  const itemExclusions: ItemExclusionPair[] = []
  if (gameCoreSets.length >= 5) {
    const pool = [...new Set(perPosition.flatMap((s) => [...s]))]
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
    itemExclusions,
    itemNotes: {},
  }
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
    } else if (isLegendaryItem(item)) {
      coreItemsInOrder.push(itemId)
    }
  }
  return { starterItems, bootsItem, coreItemsInOrder }
}
