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
