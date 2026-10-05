import { describe, expect, it } from 'vitest'
import type { Loadout } from '../types/build'
import { itemSlotNoteKey, type ItemSlot } from '../types/items'
import { addCategory } from './categories'
import { addItemSlot, deleteItemSlot, moveItemSlot, renameItemSlot, toggleItemSlotMultiSelect } from './itemSlots'
import { emptyLoadout } from './loadouts'

const slots: ItemSlot[] = [
  { id: 'starter', label: 'Starter Items', kind: 'starter' },
  { id: 'item1', label: '1st Item', multiSelect: true },
]

function makeLoadout(): Loadout {
  const base = emptyLoadout(['mid'])
  return {
    ...base,
    itemSlots: slots,
    items: { starter: [{ id: 'p1', itemId: '1055' }], item1: [] },
    categories: addCategory([], slots, 'Poke'),
    exampleBuilds: [{ id: 'e1', label: 'Example', items: { starter: [], item1: [] } }],
    itemSlotNotes: { [itemSlotNoteKey('starter', '1055')]: 'local', [itemSlotNoteKey('item1', '3089')]: 'keep' },
  }
}

describe('addItemSlot', () => {
  it('adds the slot to the loadout, every category and every example build', () => {
    const patch = addItemSlot(makeLoadout())
    const added = patch.itemSlots!.at(-1)!
    expect(added.label).toBe('New Slot')
    expect(patch.items![added.id]).toEqual([])
    expect(patch.categories![0].items[added.id]).toEqual([])
    expect(patch.exampleBuilds![0].items[added.id]).toEqual([])
  })
})

describe('renameItemSlot', () => {
  it('clears the kind but keeps multiSelect', () => {
    const loadout = makeLoadout()
    expect(renameItemSlot(loadout, 'starter', ' Start ')!.itemSlots![0]).toEqual({ id: 'starter', label: 'Start' })
    expect(renameItemSlot(loadout, 'item1', 'First')!.itemSlots![1]).toEqual({ id: 'item1', label: 'First', multiSelect: true })
  })

  it('does nothing for a blank, unchanged or unknown slot', () => {
    const loadout = makeLoadout()
    expect(renameItemSlot(loadout, 'starter', '  ')).toBeUndefined()
    expect(renameItemSlot(loadout, 'starter', 'Starter Items')).toBeUndefined()
    expect(renameItemSlot(loadout, 'nope', 'X')).toBeUndefined()
  })
})

describe('toggleItemSlotMultiSelect', () => {
  it('turns multiSelect on and off', () => {
    const loadout = makeLoadout()
    expect(toggleItemSlotMultiSelect(loadout, 'starter')!.itemSlots![0].multiSelect).toBe(true)
    expect(toggleItemSlotMultiSelect(loadout, 'item1')!.itemSlots![1]).toEqual({ id: 'item1', label: '1st Item' })
  })
})

describe('deleteItemSlot', () => {
  it('removes the slot everywhere along with its local notes', () => {
    const patch = deleteItemSlot(makeLoadout(), 'starter')
    expect(patch.itemSlots!.map((s) => s.id)).toEqual(['item1'])
    expect(Object.keys(patch.items!)).toEqual(['item1'])
    expect(Object.keys(patch.categories![0].items)).toEqual(['item1'])
    expect(Object.keys(patch.exampleBuilds![0].items)).toEqual(['item1'])
    expect(patch.itemSlotNotes).toEqual({ [itemSlotNoteKey('item1', '3089')]: 'keep' })
  })
})

describe('moveItemSlot', () => {
  const threeSlots = (): Loadout => ({
    ...makeLoadout(),
    itemSlots: [...slots, { id: 'boots', label: 'Boots', kind: 'boots' }],
  })
  const ids = (patch: Partial<Loadout> | undefined) => patch!.itemSlots!.map((s) => s.id)

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
