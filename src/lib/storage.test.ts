import { describe, expect, it } from 'vitest'
import { migrateBuild } from './storage'

describe('migrateBuild rune tree notes', () => {
  it('keeps primary and secondary notes and drops blank ones', () => {
    const build = migrateBuild({
      id: 'b',
      champion: { id: 'Ahri', name: 'Ahri' },
      title: 'Test',
      loadouts: [
        {
          runePages: [
            {
              id: 'p',
              primaryTreeId: 8100,
              keystoneId: 8112,
              primaryNote: 'Into squishies',
              variants: [
                { id: 'v1', secondaryTreeId: 8300, secondaryNote: 'Lane vs poke' },
                { id: 'v2', secondaryTreeId: 8400, secondaryNote: '   ' },
              ],
            },
          ],
        },
      ],
    })
    const [page] = build.loadouts[0].runePages
    expect(page.primaryNote).toBe('Into squishies')
    expect(page.variants[0].secondaryNote).toBe('Lane vs poke')
    expect('secondaryNote' in page.variants[1]).toBe(false)
  })
})

describe('migrateBuild category item slots', () => {
  it('gives older categories a copy of the loadout slots and keeps their own when saved', () => {
    const slots = [{ id: 'core', label: 'Core Items' }]
    const build = migrateBuild({
      id: 'b',
      champion: { id: 'Ahri', name: 'Ahri' },
      title: 'Test',
      loadouts: [
        {
          itemSlots: slots,
          categories: [
            { id: 'old', label: 'Old', items: { core: [{ id: 'p', itemId: '3089' }] } },
            { id: 'new', label: 'New', itemSlots: [] },
          ],
        },
      ],
    })
    const [oldCategory, newCategory] = build.loadouts[0].categories
    expect(oldCategory.itemSlots).toEqual(slots)
    expect(oldCategory.items.core.map((p) => p.itemId)).toEqual(['3089'])
    expect(newCategory.itemSlots).toEqual([])
  })
})

describe('migrateBuild category item relations', () => {
  it('gives older categories a copy of the loadout-wide ones and keeps their own when saved', () => {
    const build = migrateBuild({
      id: 'b',
      champion: { id: 'Ahri', name: 'Ahri' },
      title: 'Test',
      loadouts: [
        {
          itemExclusions: [['1', '2']],
          itemRequirements: [['3', '4']],
          itemSituational: { '5': true },
          categories: [
            { id: 'old', label: 'Old' },
            { id: 'new', label: 'New', itemExclusions: [], itemRequirements: [], itemSituational: {} },
          ],
        },
      ],
    })
    const [oldCategory, newCategory] = build.loadouts[0].categories
    expect(oldCategory.itemExclusions).toEqual([['1', '2']])
    expect(oldCategory.itemRequirements).toEqual([['3', '4']])
    expect(oldCategory.itemSituational).toEqual({ '5': true })
    expect(newCategory.itemExclusions).toEqual([])
    expect(newCategory.itemRequirements).toEqual([])
    expect(newCategory.itemSituational).toEqual({})
  })
})

describe('migrateBuild example build slots', () => {
  it('moves example builds keyed by a Core-based layout onto the fixed example slots', () => {
    const build = migrateBuild({
      id: 'b',
      champion: { id: 'Ahri', name: 'Ahri' },
      title: 'Test',
      loadouts: [
        {
          itemSlots: [
            { id: 's', label: 'Starter Items', kind: 'starter' },
            { id: 'c', label: 'Core Items' },
          ],
          exampleBuilds: [{ id: 'e', label: 'Ex', items: { s: [{ id: 'p1', itemId: '1056' }], c: [{ id: 'p2', itemId: '3089' }] } }],
        },
      ],
    })
    const [example] = build.loadouts[0].exampleBuilds
    expect(example.items.starter.map((p) => p.itemId)).toEqual(['1056'])
    expect(example.items.item1.map((p) => p.itemId)).toEqual(['3089'])
  })
})

describe('migrateBuild boots slot', () => {
  it('drops a saved multiSelect flag from boots', () => {
    const build = migrateBuild({
      id: 'b',
      champion: { id: 'Ahri', name: 'Ahri' },
      title: 'Test',
      loadouts: [
        {
          itemSlots: [
            { id: 'b', label: 'Boots', kind: 'boots', multiSelect: true },
            { id: 'c', label: 'Core Items', multiSelect: true },
          ],
        },
      ],
    })
    expect(build.loadouts[0].itemSlots).toEqual([
      { id: 'b', label: 'Boots', kind: 'boots' },
      { id: 'c', label: 'Core Items', multiSelect: true },
    ])
  })
})
