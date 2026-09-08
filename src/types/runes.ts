export interface RuneSelection {
  primaryTreeId: number
  keystoneId: number
  primaryRuneIds: number[]
  secondaryTreeId: number
  secondaryRuneIds: number[]
  shards: {
    offense: number
    flex: number
    defense: number
  }
}

export const EMPTY_RUNE_SELECTION: RuneSelection = {
  primaryTreeId: 0,
  keystoneId: 0,
  primaryRuneIds: [],
  secondaryTreeId: 0,
  secondaryRuneIds: [],
  shards: { offense: 0, flex: 0, defense: 0 },
}
