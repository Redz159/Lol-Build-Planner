import { EMPTY_COLLECTION, type Collection } from '../types/collection'

const STORAGE_KEY = 'lolbp:collection'

export function loadCollection(): Collection {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return EMPTY_COLLECTION
  try {
    const parsed = JSON.parse(raw) as Collection
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.builds)) return EMPTY_COLLECTION
    return parsed
  } catch {
    return EMPTY_COLLECTION
  }
}

export function saveCollection(collection: Collection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collection))
}
