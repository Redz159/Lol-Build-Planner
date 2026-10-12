import { describe, expect, it } from 'vitest'
import type { ItemSet, Loadout } from '../types/build'
import { itemSlotNoteKey, type ItemSlot } from '../types/items'
import { addCategory } from './categories'
import { ITEM_SET_LAYOUTS } from './itemSetLayouts'
import {
  addItemSlot,
  applyItemSetLayout,
  clearItemSet,
  deleteItemSlot,
  moveItemSlot,
  pruneItemSlotNotes,
  renameItemSlot,
  toggleItemSlotMultiSelect,
} from './itemSlots'
import { emptyLoadout } from './loadouts'

const slots: ItemSlot[] = [
  { id: 'starter', label: 'Starter Items', kind: 'starter' },
  { id: 'item1', label: '1st Item', multiSelect: true },
]

function makeSet(): ItemSet {
  return {
    itemSlots: slots,
    items: { starter: [{ id: 'p1', itemId: '1055' }], item1: [] },
    exampleBuilds: [{ id: 'e1', label: 'Example', items: { starter: [], item1: [] } }],
  }
}

describe('addItemSlot', () => {
  it('adds the slot to the item-set and every example build', () => {
    const patch = addItemSlot(makeSet())
    const added = patch.itemSlots!.at(-1)!
    expect(added.label).toBe('New Slot')
    expect(patch.items![added.id]).toEqual([])
    expect(patch.exampleBuilds![0].items[added.id]).toEqual([])
  })
})

describe('renameItemSlot', () => {
  it('clears the kind but keeps multiSelect', () => {
    const set = makeSet()
    expect(renameItemSlot(set, 'starter', ' Start ')!.itemSlots![0]).toEqual({ id: 'starter', label: 'Start' })
    expect(renameItemSlot(set, 'item1', 'First')!.itemSlots![1]).toEqual({ id: 'item1', label: 'First', multiSelect: true })
  })

  it('does nothing for a blank, unchanged or unknown slot', () => {
    const set = makeSet()
    expect(renameItemSlot(set, 'starter', '  ')).toBeUndefined()
    expect(renameItemSlot(set, 'starter', 'Starter Items')).toBeUndefined()
    expect(renameItemSlot(set, 'nope', 'X')).toBeUndefined()
  })
})

describe('toggleItemSlotMultiSelect', () => {
  it('turns multiSelect on and off', () => {
    const set = makeSet()
    expect(toggleItemSlotMultiSelect(set, 'starter')!.itemSlots![0].multiSelect).toBe(true)
    expect(toggleItemSlotMultiSelect(set, 'item1')!.itemSlots![1]).toEqual({ id: 'item1', label: '1st Item' })
  })
})

describe('deleteItemSlot', () => {
  it('removes the slot from the items and example builds', () => {
    const patch = deleteItemSlot(makeSet(), 'starter')
    expect(patch.itemSlots!.map((s) => s.id)).toEqual(['item1'])
    expect(Object.keys(patch.items!)).toEqual(['item1'])
    expect(Object.keys(patch.exampleBuilds![0].items)).toEqual(['item1'])
  })
})

describe('moveItemSlot', () => {
  const threeSlots = (): ItemSet => ({
    ...makeSet(),
    itemSlots: [...slots, { id: 'boots', label: 'Boots', kind: 'boots' }],
  })
  const ids = (patch: Partial<ItemSet> | undefined) => patch!.itemSlots!.map((s) => s.id)

  it('moves a slot before another one or to the end', () => {
    expect(ids(moveItemSlot(threeSlots(), 'boots', 'starter'))).toEqual(['boots', 'starter', 'item1'])
    expect(ids(moveItemSlot(threeSlots(), 'starter', 'boots'))).toEqual(['item1', 'starter', 'boots'])
    expect(ids(moveItemSlot(threeSlots(), 'starter', null))).toEqual(['item1', 'boots', 'starter'])
  })

  it('does nothing when the order would not change or a slot is unknown', () => {
    expect(moveItemSlot(threeSlots(), 'starter', 'item1')).toBeUndefined()
    expect(moveItemSlot(threeSlots(), 'boots', null)).toBeUndefined()
    expect(moveItemSlot(threeSlots(), 'starter', 'starter')).toBeUndefined()
    expect(moveItemSlot(threeSlots(), 'nope', null)).toBeUndefined()
    expect(moveItemSlot(threeSlots(), 'starter', 'nope')).toBeUndefined()
  })
})

describe('applyItemSetLayout', () => {
  it('replaces the slots with the layout, all empty', () => {
    const coreBased = ITEM_SET_LAYOUTS.find((t) => t.id === 'corebased')!
    const patch = applyItemSetLayout(makeSet(), coreBased)
    expect(patch.itemSlots!.map((s) => s.label)).toEqual(coreBased.slots.map((s) => s.label))
    expect(Object.values(patch.items!).every((p) => p.length === 0)).toBe(true)
    expect(Object.keys(patch.exampleBuilds![0].items)).toEqual(patch.itemSlots!.map((s) => s.id))
    expect(patch.layoutChosen).toBe(true)
  })
})

describe('clearItemSet', () => {
  it('drops everything and resets the layout choice', () => {
    expect(clearItemSet()).toEqual({ itemSlots: [], items: {}, exampleBuilds: [], layoutChosen: false })
  })
})

describe('pruneItemSlotNotes', () => {
  it('keeps notes of slots any item-set still uses and drops the rest', () => {
    const [category] = addCategory([], 'Poke', { ...emptyLoadout(), itemSlots: [{ id: 'core', label: 'Core' }] })
    const loadout: Loadout = {
      ...emptyLoadout(),
      itemSlots: slots,
      categories: [category],
      itemSlotNotes: {
        [itemSlotNoteKey('starter', '1055')]: 'plain',
        [itemSlotNoteKey('core', '3089')]: 'category',
        [itemSlotNoteKey('gone', '3089')]: 'stale',
      },
    }
    expect(Object.values(pruneItemSlotNotes(loadout))).toEqual(['plain', 'category'])
    const clean = { ...loadout, itemSlotNotes: { [itemSlotNoteKey('core', '1')]: 'x' } }
    expect(pruneItemSlotNotes(clean)).toBe(clean.itemSlotNotes)
  })
})
