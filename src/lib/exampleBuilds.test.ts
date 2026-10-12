import { describe, expect, it } from 'vitest'
import type { BuildItems, ItemSlot } from '../types/items'
import { DEFAULT_ITEM_SLOTS } from '../types/items'
import { EXAMPLE_BUILD_SLOTS, exampleSlotCandidates, exampleSlotNote, migrateExampleBuildItems } from './exampleBuilds'

const exampleSlot = (id: string) => EXAMPLE_BUILD_SLOTS.find((s) => s.id === id)!

const coreBased: ItemSlot[] = [
  { id: 's', label: 'Starter Items', kind: 'starter' },
  { id: 'e', label: 'Early Components' },
  { id: 'c', label: 'Core Items' },
  { id: 'b', label: 'Boots', kind: 'boots' },
  { id: 'f', label: 'Follow-up Items' },
]

const place = (...itemIds: string[]) => itemIds.map((itemId) => ({ id: `p-${itemId}`, itemId }))

const corePool: BuildItems = { s: place('1056'), e: place('1052'), c: place('3089', '4645'), b: place('3020'), f: place('3135', '3089') }

const ids = (placements: { itemId: string }[]) => placements.map((p) => p.itemId)

describe('exampleSlotCandidates', () => {
  it('keeps starter, early components and boots to their own slots', () => {
    expect(ids(exampleSlotCandidates(exampleSlot('starter'), coreBased, corePool))).toEqual(['1056'])
    expect(ids(exampleSlotCandidates(exampleSlot('early'), coreBased, corePool))).toEqual(['1052'])
    expect(ids(exampleSlotCandidates(exampleSlot('boots'), coreBased, corePool))).toEqual(['3020'])
  })

  it('offers every core and follow-up item, once each, for every Nth item', () => {
    for (const id of ['item1', 'item4']) {
      expect(ids(exampleSlotCandidates(exampleSlot(id), coreBased, corePool))).toEqual(['3089', '4645', '3135'])
    }
  })

  it('uses the matching slot when the pool has one', () => {
    const pool: BuildItems = { item1: place('3089'), item2: place('4645') }
    expect(ids(exampleSlotCandidates(exampleSlot('item2'), DEFAULT_ITEM_SLOTS, pool))).toEqual(['4645'])
  })

  it('has no candidates for a basic slot the pool lacks', () => {
    expect(exampleSlotCandidates(exampleSlot('early'), [{ id: 'x', label: 'Core Items' }], { x: place('1') })).toEqual([])
  })
})

describe('exampleSlotNote', () => {
  it('finds a local note in a source slot', () => {
    const notes = { itemNotes: {}, itemSlotNotes: { 'f::3135': 'late' }, itemNoteGlobal: { '3135': false } }
    expect(exampleSlotNote(exampleSlot('item2'), coreBased, notes, '3135')).toBe('late')
  })
})

describe('migrateExampleBuildItems', () => {
  it('moves matching slots and puts the rest into the next free Nth item slots', () => {
    const migrated = migrateExampleBuildItems({ s: place('1056'), e: [], c: place('3089'), b: place('3020'), f: place('3135') }, coreBased)
    expect(Object.keys(migrated)).toEqual(EXAMPLE_BUILD_SLOTS.map((s) => s.id))
    expect(ids(migrated.starter)).toEqual(['1056'])
    expect(ids(migrated.boots)).toEqual(['3020'])
    expect(ids(migrated.item1)).toEqual(['3089'])
    expect(ids(migrated.item2)).toEqual(['3135'])
    expect(migrated.item3).toEqual([])
  })
})
