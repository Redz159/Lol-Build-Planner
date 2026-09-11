import { useEffect, useMemo, useRef, useState } from 'react'
import type { Loadout } from '../../types/build'
import type { DDragonItem } from '../../types/ddragon'
import { ITEM_SLOT_IDS, type BuildItems, type ItemSlotId } from '../../types/items'
import { newId } from '../../lib/id'
import { isBoots } from '../../lib/itemAttributes'
import { builtinExclusionPairs, isExcludedPair, toggleExclusionPair } from '../../lib/itemExclusions'
import { useGameData } from '../../state/GameDataContext'
import { BuildSlotsPanel } from './BuildSlotsPanel'
import { ItemBrowser } from './ItemBrowser'
import { ItemAssignPopup } from './ItemAssignPopup'

interface Props {
  loadout: Loadout
  mode: 'view' | 'edit'
  onChange: (patch: Partial<Loadout>) => void
}

export function ItemsEditor({ loadout, mode, onChange }: Props) {
  const { items } = useGameData()
  const [activeSlotId, setActiveSlotId] = useState<ItemSlotId | null>(null)
  const [popupItemId, setPopupItemId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Partial<Record<ItemSlotId, string>>>({})

  // The 6th item slot is an ADC-only bonus slot, hidden everywhere else.
  const visibleSlotIds = useMemo(
    () => ITEM_SLOT_IDS.filter((slotId) => slotId !== 'item6' || loadout.roles.includes('adc')),
    [loadout.roles],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (popupItemId) setPopupItemId(null)
      else if (activeSlotId) setActiveSlotId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popupItemId, activeSlotId])

  const builtinExclusions = useMemo(() => builtinExclusionPairs(items), [items])

  const excludedPlacementIds = useMemo(() => {
    const previewedPlacementIds = new Set(Object.values(preview))
    const previewedItemIds = new Set<string>()
    for (const slotId of ITEM_SLOT_IDS) {
      const placementId = preview[slotId]
      if (!placementId) continue
      const placement = loadout.items[slotId].find((p) => p.id === placementId)
      if (placement) previewedItemIds.add(placement.itemId)
    }
    const result = new Set<string>()
    if (previewedItemIds.size === 0) return result
    for (const slotId of ITEM_SLOT_IDS) {
      for (const placement of loadout.items[slotId]) {
        if (previewedPlacementIds.has(placement.id)) continue
        const sameItemElsewhere = previewedItemIds.has(placement.itemId)
        const excluded = [...previewedItemIds].some(
          (pid) => isExcludedPair(loadout.itemExclusions, pid, placement.itemId) || isExcludedPair(builtinExclusions, pid, placement.itemId),
        )
        if (sameItemElsewhere || excluded) result.add(placement.id)
      }
    }
    return result
  }, [preview, loadout.items, loadout.itemExclusions, builtinExclusions])

  const toggleItemInSlot = (itemId: string, slotId: ItemSlotId) => {
    const current = loadout.items[slotId]
    const exists = current.some((p) => p.itemId === itemId)
    const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
    onChange({ items: { ...loadout.items, [slotId]: next } })
  }

  const fastToggle = (item: DDragonItem) => {
    if (!activeSlotId) return
    if (activeSlotId === 'boots' && !isBoots(item)) return
    toggleItemInSlot(item.id, activeSlotId)
  }

  const removePlacement = (slotId: ItemSlotId, placementId: string) => {
    onChange({ items: { ...loadout.items, [slotId]: loadout.items[slotId].filter((p) => p.id !== placementId) } })
    setPreview((prev) => {
      if (prev[slotId] !== placementId) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
  }

  // Drag-and-drop: a ref (not state) so a drag gesture doesn't trigger re-renders of its own.
  // `from: null` means the drag started in the item browser rather than an existing placement.
  const dragRef = useRef<{ itemId: string; from: { slotId: ItemSlotId; placementId: string } | null } | null>(null)

  const startDragFromSlot = (slotId: ItemSlotId, placementId: string, itemId: string) => {
    dragRef.current = { itemId, from: { slotId, placementId } }
  }

  const startDragFromBrowser = (itemId: string) => {
    dragRef.current = { itemId, from: null }
  }

  const addItemToSlot = (itemId: string, slotId: ItemSlotId) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (slotId === 'boots' && !isBoots(item)) return
    if (loadout.items[slotId].some((p) => p.itemId === itemId)) return
    onChange({ items: { ...loadout.items, [slotId]: [...loadout.items[slotId], { id: newId(), itemId }] } })
  }

  const moveItemToSlot = (itemId: string, from: { slotId: ItemSlotId; placementId: string }, toSlotId: ItemSlotId) => {
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    if (toSlotId === 'boots' && !isBoots(item)) return
    const alreadyInTarget = loadout.items[toSlotId].some((p) => p.itemId === itemId)
    const nextItems: BuildItems = { ...loadout.items, [from.slotId]: loadout.items[from.slotId].filter((p) => p.id !== from.placementId) }
    if (!alreadyInTarget) nextItems[toSlotId] = [...nextItems[toSlotId], { id: newId(), itemId }]
    onChange({ items: nextItems })
  }

  const dropOnSlot = (toSlotId: ItemSlotId) => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag) return
    if (drag.from) {
      if (drag.from.slotId === toSlotId) return
      moveItemToSlot(drag.itemId, drag.from, toSlotId)
    } else {
      addItemToSlot(drag.itemId, toSlotId)
    }
  }

  const dropOnBrowser = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag?.from) return
    removePlacement(drag.from.slotId, drag.from.placementId)
  }

  const togglePreview = (slotId: ItemSlotId, placementId: string) => {
    setPreview((prev) => {
      if (prev[slotId] === placementId) {
        const next = { ...prev }
        delete next[slotId]
        return next
      }
      return { ...prev, [slotId]: placementId }
    })
  }

  const toggleExclusion = (itemId: string, otherItemId: string) => {
    onChange({ itemExclusions: toggleExclusionPair(loadout.itemExclusions, itemId, otherItemId) })
  }

  const setItemNote = (itemId: string, note: string) => {
    const next = { ...loadout.itemNotes }
    if (note.trim() === '') delete next[itemId]
    else next[itemId] = note
    onChange({ itemNotes: next })
  }

  const popupItem = popupItemId ? items.find((i) => i.id === popupItemId) : undefined

  if (mode === 'view') {
    return (
      <BuildSlotsPanel
        items={items}
        buildItems={loadout.items}
        itemNotes={loadout.itemNotes}
        slotIds={visibleSlotIds}
        mode="view"
        activeSlotId={null}
        onSetActiveSlot={() => {}}
        preview={preview}
        onTogglePreview={togglePreview}
        onRemovePlacement={() => {}}
        onOpenPopup={() => {}}
        onDragStartPlacement={() => {}}
        onDropOnSlot={() => {}}
        excludedPlacementIds={excludedPlacementIds}
      />
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 320px', minWidth: 280 }}>
          <BuildSlotsPanel
            items={items}
            buildItems={loadout.items}
            itemNotes={loadout.itemNotes}
            slotIds={visibleSlotIds}
            mode="edit"
            activeSlotId={activeSlotId}
            onSetActiveSlot={setActiveSlotId}
            preview={preview}
            onTogglePreview={togglePreview}
            onRemovePlacement={removePlacement}
            onOpenPopup={(item) => setPopupItemId(item.id)}
            onDragStartPlacement={startDragFromSlot}
            onDropOnSlot={dropOnSlot}
            excludedPlacementIds={excludedPlacementIds}
          />
        </div>
        <div style={{ flex: '2 1 420px', minWidth: 280 }}>
          <ItemBrowser
            items={items}
            buildItems={loadout.items}
            itemNotes={loadout.itemNotes}
            roles={loadout.roles}
            activeSlotId={activeSlotId}
            onFastToggle={fastToggle}
            onOpenPopup={(item) => setPopupItemId(item.id)}
            onDragStartItem={startDragFromBrowser}
            onDropToBrowser={dropOnBrowser}
          />
        </div>
      </div>
      {popupItem && (
        <ItemAssignPopup
          item={popupItem}
          items={items}
          buildItems={loadout.items}
          slotIds={visibleSlotIds}
          itemExclusions={loadout.itemExclusions}
          builtinExclusions={builtinExclusions}
          note={loadout.itemNotes[popupItem.id] ?? ''}
          onToggleSlot={(slotId) => toggleItemInSlot(popupItem.id, slotId)}
          onToggleExclusion={(otherId) => toggleExclusion(popupItem.id, otherId)}
          onNoteChange={(note) => setItemNote(popupItem.id, note)}
          onClose={() => setPopupItemId(null)}
        />
      )}
    </div>
  )
}
