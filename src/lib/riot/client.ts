import type { RiotAccount, RiotMatch, RiotTimeline } from './types'

// A personal Riot API key's real limit is two separate buckets: 20 requests/sec AND 100
// requests/2min. The sustained one is the binding one for anything but a tiny scan — a flat
// per-request delay tuned only for the per-second limit blows through the 2-minute budget almost
// immediately on a real import. Waiting just long enough before each request to keep every
// window under its own cap lets requests burst up to the per-second limit whenever the sustained
// budget has room, instead of always pacing at the slower rate.
const RATE_LIMITS = [
  { max: 20, windowMs: 1_000 },
  { max: 100, windowMs: 120_000 },
]
const requestTimestamps: number[] = []
const widestWindowMs = Math.max(...RATE_LIMITS.map((l) => l.windowMs))

async function waitForRateLimit(): Promise<void> {
  for (;;) {
    const now = Date.now()
    while (requestTimestamps.length > 0 && now - requestTimestamps[0] > widestWindowMs) requestTimestamps.shift()

    let waitMs = 0
    for (const { max, windowMs } of RATE_LIMITS) {
      const inWindow = requestTimestamps.filter((t) => now - t < windowMs)
      if (inWindow.length >= max) waitMs = Math.max(waitMs, windowMs - (now - inWindow[0]) + 5)
    }
    if (waitMs <= 0) {
      requestTimestamps.push(now)
      return
    }
    await new Promise((r) => setTimeout(r, waitMs))
  }
}

// Talks only to the local dev proxy (vite.config.ts's riotApiDevProxy) — never to Riot
// directly, and never carries an API key. `host` is a Riot regional routing host, e.g.
// "europe.api.riotgames.com"; the proxy re-attaches the key server-side.
async function proxyFetch<T>(host: string, path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await waitForRateLimit()
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

// Riot's match-v5 list endpoint has no champion filter — despite some docs/tools implying
// otherwise, a `champion` query param is silently ignored (verified against live data: it
// returns the same ids regardless). Champion has to be filtered client-side per match, so
// callers page through recent matches with `start`/`count` and check each one themselves.
export function getMatchIdsByPuuid(host: string, puuid: string, start: number, count: number): Promise<string[]> {
  return proxyFetch(host, `/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`)
}

export function getMatch(host: string, matchId: string): Promise<RiotMatch> {
  return proxyFetch(host, `/lol/match/v5/matches/${matchId}`)
}

export function getMatchTimeline(host: string, matchId: string): Promise<RiotTimeline> {
  return proxyFetch(host, `/lol/match/v5/matches/${matchId}/timeline`)
}
