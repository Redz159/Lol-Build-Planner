import type { ItemSlotKind } from '../types/items'

export interface LayoutSlotTemplate {
  label: string
  kind?: ItemSlotKind
  multiSelect?: boolean
}

export interface LayoutTemplate {
  id: 'standard' | 'corebased' | 'blank'
  label: string
  description: string
  slots: LayoutSlotTemplate[]
}

// The starting choices offered by the item-set layout picker (ItemsEditor, shown whenever the
// current item-set has no items and hasn't gone through this picker yet, e.g. after "Clear
// items"). Applying one replaces that item-set's slots — see applyItemSetLayout in itemSlots.ts.
export const ITEM_SET_LAYOUTS: LayoutTemplate[] = [
  {
    id: 'standard',
    label: 'Standard',
    description: "Item-slot based layout.",
    slots: [
      { label: 'Starter Items', kind: 'starter' },
      { label: 'Early Components' },
      { label: '1st Item' },
      { label: 'Boots', kind: 'boots' },
      { label: '2nd Item' },
      { label: '3rd Item' },
      { label: '4th Item' },
      { label: '5th Item' },
      { label: '6th Item', kind: 'adc-bonus' },
    ],
  },
  {
    id: 'corebased',
    label: 'Core-based',
    description: 'Core- and follow-up item based layout',
    slots: [
      { label: 'Starter Items', kind: 'starter', multiSelect: true },
      { label: 'Early Components', multiSelect: true },
      { label: 'Core Items', multiSelect: true },
      { label: 'Boots', kind: 'boots', multiSelect: true },
      { label: 'Follow-up Items', multiSelect: true },
    ],
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'One empty slot to build from.',
    slots: [{ label: 'Slot 1' }],
  },
]
