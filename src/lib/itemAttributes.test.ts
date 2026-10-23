import { describe, expect, it } from 'vitest'
import type { DDragonItem } from '../types/ddragon'
import { filterBuildItemsByStats } from './itemAttributes'

function item(id: string, tags: string[]): DDragonItem {
  return { id, name: id, description: '', image: { full: `${id}.png` }, tags, gold: { total: 3000 }, into: [], stats: {} }
}

const items = [item('armorOnly', ['Armor']), item('both', ['Armor', 'SpellBlock']), item('mrOnly', ['MagicResist'])]
const buildItems = {
  item1: [
    { id: 'p1', itemId: 'armorOnly' },
    { id: 'p2', itemId: 'both' },
  ],
  item2: [{ id: 'p3', itemId: 'mrOnly' }],
}

describe('filterBuildItemsByStats', () => {
  it('returns the build untouched with no stats selected', () => {
    expect(filterBuildItemsByStats(buildItems, items, new Set())).toBe(buildItems)
  })

  it('keeps only items carrying every selected stat', () => {
    expect(filterBuildItemsByStats(buildItems, items, new Set(['stat:armor', 'stat:mr']))).toEqual({
      item1: [{ id: 'p2', itemId: 'both' }],
      item2: [],
    })
  })

  it('treats MagicResist and SpellBlock tags as the same stat', () => {
    expect(filterBuildItemsByStats(buildItems, items, new Set(['stat:mr']))).toEqual({
      item1: [{ id: 'p2', itemId: 'both' }],
      item2: [{ id: 'p3', itemId: 'mrOnly' }],
    })
  })
})
