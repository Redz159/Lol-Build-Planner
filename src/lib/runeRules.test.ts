import { describe, expect, it } from 'vitest'
import type { RunePage } from '../types/runes'
import {
  addVariant,
  createRunePage,
  duplicateRunePage,
  groupRunePages,
  removeVariant,
  selectPrimaryRune,
  selectPrimaryTree,
  selectSecondaryTree,
  selectShard,
  setPreferredKeystone,
  setPrimaryNote,
  setSecondaryNote,
} from './runeRules'

function page(keystoneId: number, extra: Partial<RunePage> = {}): RunePage {
  return { ...createRunePage(), primaryTreeId: 8100, keystoneId, ...extra }
}

describe('setPreferredKeystone', () => {
  it('keeps at most one preferred page', () => {
    const pages = [page(1, { preferredKeystone: true }), page(2)]
    const next = setPreferredKeystone(pages, pages[1].id, true)
    expect(next.map((p) => p.preferredKeystone)).toEqual([false, true])
  })

  it('unmarking leaves the other pages alone', () => {
    const pages = [page(1, { preferredKeystone: true }), page(2)]
    const next = setPreferredKeystone(pages, pages[1].id, false)
    expect(next.map((p) => p.preferredKeystone)).toEqual([true, false])
  })
})

describe('duplicateRunePage', () => {
  it('gives the copy new ids and clears the keystone', () => {
    const source = page(1, { preferredKeystone: true, primaryRuneIds: [8126] })
    const copy = duplicateRunePage(source)
    expect(copy.id).not.toBe(source.id)
    expect(copy.variants[0].id).not.toBe(source.variants[0].id)
    expect(copy.keystoneId).toBe(0)
    expect(copy.preferredKeystone).toBe(false)
    expect(copy.primaryRuneIds).toEqual([8126])
  })
})

describe('selectPrimaryRune', () => {
  it('toggles viability on a plain click, clearing preferred on removal', () => {
    const viable = selectPrimaryRune(page(1), 8126, false)
    expect(viable.primaryRuneIds).toEqual([8126])
    const preferred = selectPrimaryRune(viable, 8126, true)
    expect(preferred.preferredPrimaryRuneIds).toEqual([8126])
    const removed = selectPrimaryRune(preferred, 8126, false)
    expect(removed.primaryRuneIds).toEqual([])
    expect(removed.preferredPrimaryRuneIds).toEqual([])
  })

  it('marking preferred also makes the rune viable', () => {
    const next = selectPrimaryRune(page(1), 8126, true)
    expect(next.primaryRuneIds).toEqual([8126])
    expect(next.preferredPrimaryRuneIds).toEqual([8126])
  })
})

describe('trees', () => {
  it('picking the secondary tree as primary clears that variant', () => {
    let p = page(1)
    p = selectSecondaryTree(p, p.variants[0].id, 8300)
    p = selectPrimaryTree(p, 8300)
    expect(p.variants[0].secondaryTreeId).toBe(0)
    expect(p.keystoneId).toBe(0)
  })

  it('cannot pick the primary tree as secondary', () => {
    const p = page(1)
    expect(selectSecondaryTree(p, p.variants[0].id, 8100)).toBe(p)
  })
})

describe('selectShard', () => {
  it('toggles a shard per row', () => {
    const p = page(1)
    const vid = p.variants[0].id
    const on = selectShard(p, vid, 'offense', 5008, false)
    expect(on.variants[0].shards).toEqual({ offense: [5008], flex: [], defense: [] })
    expect(selectShard(on, vid, 'offense', 5008, false).variants[0].shards.offense).toEqual([])
  })
})

describe('variants', () => {
  it('new variants copy the last variant shards but not their preferred flags', () => {
    let p = page(1)
    p = selectShard(p, p.variants[0].id, 'flex', 5008, true)
    p = addVariant(p)
    expect(p.variants[1].shards.flex).toEqual([5008])
    expect(p.variants[1].preferredShards.flex).toEqual([])
  })

  it('never removes the last variant', () => {
    const p = page(1)
    expect(removeVariant(p, p.variants[0].id)).toBe(p)
  })
})

describe('groupRunePages', () => {
  it('merges pages sharing a keystone and skips drafts', () => {
    const groups = groupRunePages([page(1, { primaryRuneIds: [10] }), page(1, { primaryRuneIds: [10, 11] }), page(2), page(0)])
    expect(groups.map((g) => g.keystoneId)).toEqual([1, 2])
    expect(groups[0].primaryRuneIds).toEqual([10, 11])
  })
})

describe('rune tree notes', () => {
  it('stores a primary note and drops it again when blank', () => {
    const withNote = setPrimaryNote(page(1), 'Take this into tanks')
    expect(withNote.primaryNote).toBe('Take this into tanks')
    expect('primaryNote' in setPrimaryNote(withNote, '  ')).toBe(false)
  })

  it('stores a secondary note on just that variant', () => {
    const p = addVariant(page(1))
    const next = setSecondaryNote(p, p.variants[1].id, 'Only vs poke')
    expect(next.variants.map((v) => v.secondaryNote)).toEqual([undefined, 'Only vs poke'])
    expect('secondaryNote' in setSecondaryNote(next, p.variants[1].id, '').variants[1]).toBe(false)
  })

  it('does not copy a secondary note into a new variant', () => {
    const p = page(1)
    const noted = setSecondaryNote(p, p.variants[0].id, 'Only vs poke')
    expect(addVariant(noted).variants[1].secondaryNote).toBeUndefined()
  })

  it('merges the distinct notes of pages that share a keystone, per tree', () => {
    const a = page(1, { primaryNote: 'A' })
    a.variants[0] = { ...a.variants[0], secondaryTreeId: 8300, secondaryNote: 'S1' }
    const b = page(1, { primaryNote: 'B' })
    b.variants[0] = { ...b.variants[0], secondaryTreeId: 8300, secondaryNote: 'S1' }
    const c = page(1, { primaryNote: 'A' })
    c.variants[0] = { ...c.variants[0], secondaryTreeId: 8400 }
    const [group] = groupRunePages([a, b, c])
    expect(group.primaryNote).toBe('A\n\nB')
    expect(group.secondaryTrees.map((t) => t.note)).toEqual(['S1', undefined])
  })
})
