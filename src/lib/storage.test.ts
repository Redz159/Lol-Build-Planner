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
