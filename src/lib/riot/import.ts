import type { Build, Role } from '../../types/build'
import type { DDragonChampion, DDragonItem, DDragonRuneTree } from '../../types/ddragon'
import { newId } from '../id'
import { getAccountByRiotId, getMatch, getMatchIdsByPuuid, getMatchTimeline, sleep } from './client'
import { buildLoadoutForRole, classifyGameItems, findParticipant, roleForParticipant } from './aggregate'
import { ROLES } from '../loadouts'

export interface ImportProgress {
  stage: 'account' | 'match-list' | 'match-details' | 'done'
  current: number
  total: number
}

const REQUEST_DELAY_MS = 90

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
  onProgress({ stage: 'account', current: 0, total: 1 })
  const account = await getAccountByRiotId(regionHost, gameName, tagLine)
  await sleep(REQUEST_DELAY_MS)

  onProgress({ stage: 'match-list', current: 0, total: 1 })
  const matchIds = await getMatchIdsByPuuid(regionHost, account.puuid, Number(champion.key), sampleSize)
  await sleep(REQUEST_DELAY_MS)

  if (matchIds.length === 0) {
    throw new Error(`No recent ${champion.name} games found for ${gameName}#${tagLine} in this region.`)
  }

  const byRole = new Map<Role, { participant: ReturnType<typeof findParticipant>; starterItems?: number[]; bootsItem?: number; coreItemsInOrder?: number[] }[]>()

  for (let i = 0; i < matchIds.length; i++) {
    onProgress({ stage: 'match-details', current: i, total: matchIds.length })
    const matchId = matchIds[i]
    try {
      const match = await getMatch(regionHost, matchId)
      await sleep(REQUEST_DELAY_MS)
      const participant = findParticipant(match, account.puuid)
      if (!participant || participant.championId !== Number(champion.key)) continue
      const role = roleForParticipant(participant)
      if (!role) continue

      let classified: { starterItems?: number[]; bootsItem?: number; coreItemsInOrder?: number[] } = {}
      try {
        const timeline = await getMatchTimeline(regionHost, matchId)
        await sleep(REQUEST_DELAY_MS)
        classified = classifyGameItems(timeline, participant.participantId, items)
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

  onProgress({ stage: 'done', current: matchIds.length, total: matchIds.length })

  const loadouts = ROLES.filter((r) => byRole.has(r)).map((role) => {
    const games = byRole.get(role)!.filter((g): g is typeof g & { participant: NonNullable<typeof g.participant> } => !!g.participant)
    return buildLoadoutForRole(
      role,
      games.map((g) => ({ participant: g.participant, starterItems: g.starterItems, bootsItem: g.bootsItem, coreItemsInOrder: g.coreItemsInOrder })),
      runeTrees,
    )
  })

  if (loadouts.length === 0) {
    throw new Error(`Found ${matchIds.length} ${champion.name} games, but none had a usable role (ARAM/remakes are skipped).`)
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
