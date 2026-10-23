import { describe, expect, it } from 'vitest'
import type { DDragonItem } from '../types/ddragon'
import { filterBuildItemsByStats, STAT_FILTERS } from './itemAttributes'

function item(id: string, statLines: string[], tags: string[] = []): DDragonItem {
  const stats = statLines.map((line) => line.replace(/^([\d.]+%?)/, '<attention>$1</attention>')).join('<br>')
  return { id, name: id, description: `<mainText><stats>${stats}</stats><br><br></mainText>`, image: { full: `${id}.png` }, tags, gold: { total: 3000 }, into: [], stats: {} }
}

const items = [item('armorOnly', ['40 Armor']), item('both', ['30 Armor', '30 Magic Resist']), item('mrOnly', ['50 Magic Resist'])]
const buildItems = {
  item1: [
    { id: 'p1', itemId: 'armorOnly' },
    { id: 'p2', itemId: 'both' },
  ],
  item2: [{ id: 'p3', itemId: 'mrOnly' }],
}

const statFilter = (id: string) => STAT_FILTERS.find((f) => f.id === `stat:${id}`)!

describe('STAT_FILTERS', () => {
  it('goes by the <stats> block, not the item tags', () => {
    const passiveHealer = item('healer', ['60 Attack Damage'], ['LifeSteal'])
    expect(statFilter('lifesteal').test(passiveHealer)).toBe(false)
    expect(statFilter('ad').test(passiveHealer)).toBe(true)
  })

  it('covers flat and percent forms of the same stat', () => {
    expect(statFilter('magicpen').test(item('shoes', ['12 Magic Penetration']))).toBe(true)
    expect(statFilter('magicpen').test(item('voidStaff', ['40% Magic Penetration']))).toBe(true)
  })
})

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
})
