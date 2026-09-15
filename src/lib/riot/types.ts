// Minimal shapes for the Riot API responses this feature actually reads — not a full mirror
// of Riot's schema.

export interface RiotAccount {
  puuid: string
  gameName: string
  tagLine: string
}

export interface RiotPerkSelection {
  perk: number
}

export interface RiotPerkStyle {
  description: 'primaryStyle' | 'subStyle' | string
  style: number
  selections: RiotPerkSelection[]
}

export interface RiotPerks {
  statPerks: { offense: number; flex: number; defense: number }
  styles: RiotPerkStyle[]
}

export interface RiotParticipant {
  puuid: string
  participantId: number
  championId: number
  teamPosition: string
  perks: RiotPerks
  // End-of-game inventory slots (0 means empty). Used as a fallback for items whose acquisition
  // never shows up as a real purchase in the timeline (e.g. the support item quest line's free
  // upgrades) — the final inventory is authoritative regardless of how (or whether) a given item
  // got there.
  item0: number
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
}

export interface RiotMatch {
  metadata: { matchId: string }
  info: { participants: RiotParticipant[]; gameDuration: number }
}

export interface RiotTimelineEvent {
  type: string
  timestamp: number
  participantId?: number
  itemId?: number
  beforeId?: number
  afterId?: number
}

export interface RiotTimeline {
  info: { frames: { events: RiotTimelineEvent[] }[] }
}
