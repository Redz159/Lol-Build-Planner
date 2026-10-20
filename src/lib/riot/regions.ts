// Account-v1 is global data: any of americas/asia/europe answers for every player (sea doesn't
// serve account-v1 at all and 403s), so account lookups always go through one fixed host.
export const ACCOUNT_HOST = 'europe.api.riotgames.com'

// Match-v5 only returns a player's games from the regional routing value their platform
// (server) belongs to — asking the wrong one silently returns an empty match list, not an
// error. The platform comes from account-v1's active-region lookup.
const ROUTING_BY_PLATFORM: Record<string, string> = {
  na1: 'americas',
  br1: 'americas',
  la1: 'americas',
  la2: 'americas',
  euw1: 'europe',
  eun1: 'europe',
  tr1: 'europe',
  ru: 'europe',
  me1: 'europe',
  kr: 'asia',
  jp1: 'asia',
  oc1: 'sea',
  ph2: 'sea',
  sg2: 'sea',
  th2: 'sea',
  tw2: 'sea',
  vn2: 'sea',
}

export function matchHostForPlatform(platform: string): string {
  const routing = ROUTING_BY_PLATFORM[platform.toLowerCase()]
  if (!routing) throw new Error(`Unknown League server "${platform}" for this account.`)
  return `${routing}.api.riotgames.com`
}
