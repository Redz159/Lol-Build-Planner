import type { ItemSlot, ItemSlotKind } from '../types/items'
import { newId } from './id'

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
// current item-set has no items and hasn't gone through this picker yet). Applying one is purely
// additive — see newSlotsForLayout below — so picking a second layout later, or picking one for
// a different category that shares the same loadout-wide slot list, never removes or duplicates
// what's already there.
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
      { label: 'Situational Items', multiSelect: true },
      { label: 'Niche Items', multiSelect: true },
    ],
  },
  {
    id: 'blank',
    label: 'Blank',
    description: 'One empty slot to build from.',
    slots: [{ label: 'Slot 1' }],
  },
]

// Only the slots this layout calls for that don't already exist, matched by label the same
// case-insensitive way ItemsEditor's item-set import does — never modifies or duplicates an
// existing slot, so applying a layout on top of a loadout's already-customized slot list is
// always safe.
export function newSlotsForLayout(existingSlots: ItemSlot[], template: LayoutTemplate): ItemSlot[] {
  const existingLabels = new Set(existingSlots.map((s) => s.label.toLowerCase()))
  return template.slots
    .filter((s) => !existingLabels.has(s.label.toLowerCase()))
    .map((s) => ({
      id: newId(),
      label: s.label,
      ...(s.kind ? { kind: s.kind } : {}),
      ...(s.multiSelect ? { multiSelect: true } : {}),
    }))
}
