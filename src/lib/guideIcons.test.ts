import { describe, expect, it } from 'vitest'
import { buildIconIndex, findExactIcon, searchIcons } from './guideIcons'
import type { IconSources } from './guideIcons'

const sources: IconSources = {
  champions: [
    { id: 'Volibear', key: '106', name: 'Volibear', title: '', image: { full: 'Volibear.png' } },
    { id: 'Kaisa', key: '145', name: "Kai'Sa", title: '', image: { full: 'Kaisa.png' } },
  ],
  items: [
    { id: '6699', name: 'Voltaic Cyclosword', description: '', image: { full: '6699.png' }, tags: [], gold: { total: 0 }, into: [], stats: {} },
    { id: '3031', name: 'Infinity Edge', description: '', image: { full: '3031.png' }, tags: [], gold: { total: 0 }, into: [], stats: {} },
  ],
  runeTrees: [
    {
      id: 8100,
      key: 'Domination',
      icon: '',
      name: 'Domination',
      slots: [{ runes: [{ id: 8112, key: 'Electrocute', icon: 'perk/Electrocute.png', name: 'Electrocute', shortDesc: '' }] }],
    },
  ],
  summonerSpells: [{ id: 'SummonerFlash', name: 'Flash', description: '', image: { full: 'SummonerFlash.png' }, modes: [] }],
}

const index = buildIconIndex(sources, [
  { champion: 'Volibear', slot: 'P', name: 'The Relentless Storm', icon: 'Volibear_Icon_P.png' },
  { champion: 'Volibear', slot: 'R', name: 'Stormbringer', icon: 'VolibearR.png' },
  { champion: 'Kaisa', slot: 'Q', name: 'Icathian Rain', icon: 'KaisaQ.png' },
])

const byRef = new Map(index.map((e) => [e.ref, e]))
const resolveIconRef = (_: unknown, ref: string) => byRef.get(ref)

const names = (query: string, limit?: number) => searchIcons(index, query, limit).map((e) => e.name)

describe('buildIconIndex', () => {
  it('builds a ref, subtitle and icon for every kind', () => {
    expect(resolveIconRef(index, 'champion:Volibear')?.subtitle).toBe('Champion')
    expect(resolveIconRef(index, 'item:6699')?.iconUrl).toMatch(/\/img\/item\/6699\.png$/)
    expect(resolveIconRef(index, 'rune:8112')?.subtitle).toBe('Domination rune')
    expect(resolveIconRef(index, 'spell:SummonerFlash')?.name).toBe('Flash')
    expect(resolveIconRef(index, 'ability:Kaisa:Q')?.subtitle).toBe("Kai'Sa Q")
    expect(resolveIconRef(index, 'ability:Volibear:P')?.iconUrl).toMatch(/\/img\/passive\/Volibear_Icon_P\.png$/)
    expect(resolveIconRef(index, 'ability:Volibear:R')?.iconUrl).toMatch(/\/img\/spell\/VolibearR\.png$/)
  })

  it('returns undefined for unknown refs', () => {
    expect(resolveIconRef(index, 'item:1')).toBeUndefined()
  })
})

describe('findExactIcon', () => {
  it('matches a whole name, ignoring case and punctuation', () => {
    expect(findExactIcon(index, 'volibear')?.ref).toBe('champion:Volibear')
    expect(findExactIcon(index, 'infinityedge')?.ref).toBe('item:3031')
    expect(findExactIcon(index, 'kaisa')?.ref).toBe('champion:Kaisa')
  })

  it('ignores partial names', () => {
    expect(findExactIcon(index, 'vol')).toBeUndefined()
    expect(findExactIcon(index, '')).toBeUndefined()
  })
})

describe('searchIcons', () => {
  it('ranks name prefixes first, shorter names before longer ones', () => {
    expect(names('vol')).toEqual(['Volibear', 'Voltaic Cyclosword'])
  })

  it('ranks word starts before matches inside a word', () => {
    expect(names('storm')).toEqual(['Stormbringer', 'The Relentless Storm'])
  })

  it('ignores case, spaces and punctuation', () => {
    expect(names('KAISA')).toEqual(["Kai'Sa"])
    expect(names('voltaiccyclo')).toEqual(['Voltaic Cyclosword'])
    expect(names('infinity edge')).toEqual(['Infinity Edge'])
  })

  it('returns nothing for an empty query and respects the limit', () => {
    expect(names('')).toEqual([])
    expect(names('e', 2)).toHaveLength(2)
  })
})
