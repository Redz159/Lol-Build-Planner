import { useRef } from 'react'
import type { Loadout } from '../../types/build'
import type { DDragonItem } from '../../types/ddragon'
import type { BuildItems, ItemSlot, ItemSlotNotes } from '../../types/items'
import { newId } from '../../lib/id'
import { isBoots } from '../../lib/itemAttributes'

type DragSource = { slotId: string; placementId: string }

interface Options {
  items: DDragonItem[]
  currentItems: BuildItems
  setCurrentItems: (nextItems: BuildItems, extra?: Partial<Loadout>) => void
  findSlot: (slotId: string) => ItemSlot | undefined
  withoutLocalNote: (slotId: string, itemId: string) => ItemSlotNotes
  removePlacement: (slotId: string, placementId: string) => void
}

// Drag-and-drop between the item browser and the build slots, and within a slot to reorder.
export function useItemDragDrop({ items, currentItems, setCurrentItems, findSlot, withoutLocalNote, removePlacement }: Options) {
  // A ref (not state) so a drag gesture doesn't trigger re-renders of its own.
  // `from: null` means the drag started in the item browser rather than an existing placement.
  const dragRef = useRef<{ itemId: string; from: DragSource | null } | null>(null)

  const startDragFromSlot = (slotId: string, placementId: string, itemId: string) => {
    dragRef.current = { itemId, from: { slotId, placementId } }
  }

  const startDragFromBrowser = (itemId: string) => {
    dragRef.current = { itemId, from: null }
  }

  const addItemToSlot = (itemId: string, slotId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (findSlot(slotId)?.kind === 'boots' && !isBoots(item)) return
    const current = currentItems[slotId] ?? []
    if (current.some((p) => p.itemId === itemId)) return
    setCurrentItems({ ...currentItems, [slotId]: [...current, { id: newId(), itemId }] })
  }

  const moveItemToSlot = (itemId: string, from: DragSource, toSlotId: string) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (findSlot(toSlotId)?.kind === 'boots' && !isBoots(item)) return
    const alreadyInTarget = (currentItems[toSlotId] ?? []).some((p) => p.itemId === itemId)
    const nextItems: BuildItems = {
      ...currentItems,
      [from.slotId]: (currentItems[from.slotId] ?? []).filter((p) => p.id !== from.placementId),
    }
    if (!alreadyInTarget) nextItems[toSlotId] = [...(nextItems[toSlotId] ?? []), { id: newId(), itemId }]
    setCurrentItems(nextItems, { itemSlotNotes: withoutLocalNote(from.slotId, itemId) })
  }

  const reorderItemInSlot = (slotId: string, placementId: string, targetPlacementId: string, side: 'before' | 'after') => {
    const current = currentItems[slotId] ?? []
    const fromIndex = current.findIndex((p) => p.id === placementId)
    if (fromIndex === -1 || placementId === targetPlacementId) return
    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    const targetIndex = next.findIndex((p) => p.id === targetPlacementId)
    if (targetIndex === -1) return
    next.splice(side === 'after' ? targetIndex + 1 : targetIndex, 0, moved)
    setCurrentItems({ ...currentItems, [slotId]: next })
  }

  const applyDrop = (toSlotId: string, drag: { itemId: string; from: DragSource | null }) => {
    if (drag.from) {
      if (drag.from.slotId === toSlotId) return
      moveItemToSlot(drag.itemId, drag.from, toSlotId)
    } else {
      addItemToSlot(drag.itemId, toSlotId)
    }
  }

  const dropOnSlot = (toSlotId: string) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    applyDrop(toSlotId, drag)
  }

  const dropOnPlacement = (toSlotId: string, targetPlacementId: string, side: 'before' | 'after') => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (drag.from && drag.from.slotId === toSlotId) {
      reorderItemInSlot(toSlotId, drag.from.placementId, targetPlacementId, side)
      return
    }
    applyDrop(toSlotId, drag)
  }

  const dropOnBrowser = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.from) return
    removePlacement(drag.from.slotId, drag.from.placementId)
  }

  return { startDragFromSlot, startDragFromBrowser, dropOnSlot, dropOnPlacement, dropOnBrowser }
}
