import type { Build } from './build'

export interface Collection {
  schemaVersion: 1
  builds: Build[]
}

export const EMPTY_COLLECTION: Collection = { schemaVersion: 1, builds: [] }
