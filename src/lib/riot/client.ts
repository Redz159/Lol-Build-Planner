import type { RiotAccount, RiotMatch, RiotTimeline } from './types'

// Talks only to the local dev proxy (vite.config.ts's riotApiDevProxy) — never to Riot
// directly, and never carries an API key. `host` is a Riot regional routing host, e.g.
// "europe.api.riotgames.com"; the proxy re-attaches the key server-side.
async function proxyFetch<T>(host: string, path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/riot-api/${host}${path}`)
    if (res.status === 429) {
      if (attempt >= 5) throw new Error('Riot API rate limit hit too many times in a row — try a smaller sample size.')
      const retryAfterSeconds = Number(res.headers.get('Retry-After')) || 1
      await new Promise((r) => setTimeout(r, retryAfterSeconds * 1000))
      continue
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Riot API error ${res.status}${body ? `: ${body}` : ''}`)
    }
    return res.json() as Promise<T>
  }
}

export function getAccountByRiotId(host: string, gameName: string, tagLine: string): Promise<RiotAccount> {
  return proxyFetch(host, `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`)
}

export function getMatchIdsByPuuid(host: string, puuid: string, championId: number, count: number): Promise<string[]> {
  return proxyFetch(host, `/lol/match/v5/matches/by-puuid/${puuid}/ids?champion=${championId}&count=${count}`)
}

export function getMatch(host: string, matchId: string): Promise<RiotMatch> {
  return proxyFetch(host, `/lol/match/v5/matches/${matchId}`)
}

export function getMatchTimeline(host: string, matchId: string): Promise<RiotTimeline> {
  return proxyFetch(host, `/lol/match/v5/matches/${matchId}/timeline`)
}

// A small fixed delay between sequential requests keeps well under a personal key's rate
// limit (20/sec, 100/2min) without needing a full token-bucket scheduler.
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
