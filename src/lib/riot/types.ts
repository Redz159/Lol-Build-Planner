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
