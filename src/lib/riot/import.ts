import type { Build, Role } from '../../types/build'
import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import { newId } from '../id'
import { getAccountByRiotId, getMatch, getMatchIdsByPuuid, getMatchTimeline } from './client'
import { buildLoadoutForRole, classifyGameItems, findParticipant, roleForParticipant } from './aggregate'

export interface ImportProgress {
  stage: 'account' | 'scanning' | 'done'
  scanned: number
  found: number
  target: number
}

// Request pacing itself lives in client.ts, shared across every call — no per-request delay
// needed here.
const PAGE_SIZE = 100
// Riot's match list has no champion filter (see client.ts), so every candidate match costs a
// full match-detail fetch just to check who was played — this bounds worst case for a champion
// the player rarely picks, rather than scanning their whole history.
const MAX_MATCHES_TO_SCAN = 300

interface RoleGameEntry {
  participant: NonNullable<ReturnType<typeof findParticipant>>
  starterItems?: number[]
  bootsItem?: number
  coreItemsInOrder?: number[]
}

export async function importBuildFromRiot(
  regionHost: string,
  gameName: string,
  tagLine: string,
  champion: DDragonChampion,
  sampleSize: number,
  runeTrees: DDragonRuneTree[],
  items: DDragonItem[],
  onProgress: (p: ImportProgress) => void,
): Promise<Build> {
  onProgress({ stage: 'account', scanned: 0, found: 0, target: sampleSize })
  const account = await getAccountByRiotId(regionHost, gameName, tagLine)

  const championId = Number(champion.key)
  const byRole = new Map<Role, RoleGameEntry[]>()
  let scanned = 0
  let found = 0
  let start = 0

  while (found < sampleSize && scanned < MAX_MATCHES_TO_SCAN) {
    const page = await getMatchIdsByPuuid(regionHost, account.puuid, start, PAGE_SIZE)
    if (page.length === 0) break
    start += page.length

    for (const matchId of page) {
      if (found >= sampleSize || scanned >= MAX_MATCHES_TO_SCAN) break
      scanned++
      onProgress({ stage: 'scanning', scanned, found, target: sampleSize })
      try {
        const match = await getMatch(regionHost, matchId)
        const participant = findParticipant(match, account.puuid)
        if (!participant || participant.championId !== championId) continue
        found++
        onProgress({ stage: 'scanning', scanned, found, target: sampleSize })

        const role = roleForParticipant(participant)
        if (!role) continue

        let classified: { starterItems?: number[]; bootsItem?: number; coreItemsInOrder?: number[] } = {}
        try {
          const timeline = await getMatchTimeline(regionHost, matchId)
          classified = classifyGameItems(timeline, participant, items)
        } catch {
          // Timeline can 404/fail independently of the match itself — still keep the game for
          // rune aggregation, just without item data.
        }

        const list = byRole.get(role) ?? []
        list.push({ participant, ...classified })
        byRole.set(role, list)
      } catch {
        // One bad match shouldn't abort the whole import — skip and keep going.
        continue
      }
    }
    if (page.length < PAGE_SIZE) break
  }

  onProgress({ stage: 'done', scanned, found, target: sampleSize })

  if (found === 0) {
    throw new Error(`Checked ${scanned} recent games for ${gameName}#${tagLine} but found none played as ${champion.name}.`)
  }

  // Most-played role first, matching the same "most taken" ordering as everything else.
  const loadouts = [...byRole.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([role, games]) => buildLoadoutForRole(role, games, runeTrees))

  if (loadouts.length === 0) {
    throw new Error(`Found ${found} ${champion.name} games, but none had a usable role (ARAM/remakes are skipped).`)
  }

  const now = new Date().toISOString()
  return {
    id: newId(),
    champion: { id: champion.id, name: champion.name },
    title: `${champion.name} (${gameName}#${tagLine})`,
    loadouts,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}
