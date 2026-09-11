// Account-v1 and match-v5 (the only APIs this feature needs) are addressed by Riot's
// regional routing values, not per-platform hosts — one of these four covers every platform.
export const RIOT_REGIONS = [
  { id: 'americas', label: 'Americas', host: 'americas.api.riotgames.com' },
  { id: 'europe', label: 'Europe', host: 'europe.api.riotgames.com' },
  { id: 'asia', label: 'Asia', host: 'asia.api.riotgames.com' },
  { id: 'sea', label: 'SEA', host: 'sea.api.riotgames.com' },
] as const

export type RiotRegionId = (typeof RIOT_REGIONS)[number]['id']
