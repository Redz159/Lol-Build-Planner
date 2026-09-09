export interface ShardSelection {
  offense: number[]
  flex: number[]
  defense: number[]
}

export const EMPTY_SHARDS: ShardSelection = { offense: [], flex: [], defense: [] }

export interface RuneVariant {
  id: string
  secondaryTreeId: number
  secondaryRuneIds: number[]
  preferredSecondaryRuneIds: number[]
  shards: ShardSelection
  preferredShards: ShardSelection
}

export interface RunePage {
  id: string
  primaryTreeId: number
  keystoneId: number
  preferredKeystone: boolean
  primaryRuneIds: number[]
  preferredPrimaryRuneIds: number[]
  variants: RuneVariant[]
}
