import { useEffect, useMemo, useState } from 'react'
import type { Build } from '../../types/build'
import type { DDragonItem } from '../../types/ddragon'
import { ITEM_SLOT_IDS, type ItemSlotId } from '../../types/items'
import { newId } from '../../lib/id'
import { isBoots } from '../../lib/itemAttributes'
import { builtinExclusionPairs, isExcludedPair, toggleExclusionPair } from '../../lib/itemExclusions'
import { useGameData } from '../../state/GameDataContext'
import { BuildSlotsPanel } from './BuildSlotsPanel'
import { ItemBrowser } from './ItemBrowser'
import { ItemAssignPopup } from './ItemAssignPopup'

interface Props {
  build: Build
  mode: 'view' | 'edit'
  onChange: (patch: Partial<Build>) => void
}

export function ItemsEditor({ build, mode, onChange }: Props) {
  const { items } = useGameData()
  const [activeSlotId, setActiveSlotId] = useState<ItemSlotId | null>(null)
  const [popupItemId, setPopupItemId] = useState<string | null>(null)
  const [preview, setPreview] = useState<Partial<Record<ItemSlotId, string>>>({})

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
      const placement = build.items[slotId].find((p) => p.id === placementId)
      if (placement) previewedItemIds.add(placement.itemId)
    }
    const result = new Set<string>()
    if (previewedItemIds.size === 0) return result
    for (const slotId of ITEM_SLOT_IDS) {
      for (const placement of build.items[slotId]) {
        if (previewedPlacementIds.has(placement.id)) continue
        const sameItemElsewhere = previewedItemIds.has(placement.itemId)
        const excluded = [...previewedItemIds].some(
          (pid) => isExcludedPair(build.itemExclusions, pid, placement.itemId) || isExcludedPair(builtinExclusions, pid, placement.itemId),
        )
        if (sameItemElsewhere || excluded) result.add(placement.id)
      }
    }
    return result
  }, [preview, build.items, build.itemExclusions, builtinExclusions])

  const toggleItemInSlot = (itemId: string, slotId: ItemSlotId) => {
    const current = build.items[slotId]
    const exists = current.some((p) => p.itemId === itemId)
    const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
    onChange({ items: { ...build.items, [slotId]: next } })
  }

  const fastToggle = (item: DDragonItem) => {
    if (!activeSlotId) return
    if (activeSlotId === 'boots' && !isBoots(item)) return
    toggleItemInSlot(item.id, activeSlotId)
  }

  const removePlacement = (slotId: ItemSlotId, placementId: string) => {
    onChange({ items: { ...build.items, [slotId]: build.items[slotId].filter((p) => p.id !== placementId) } })
    setPreview((prev) => {
      if (prev[slotId] !== placementId) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
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
    onChange({ itemExclusions: toggleExclusionPair(build.itemExclusions, itemId, otherItemId) })
  }

  const popupItem = popupItemId ? items.find((i) => i.id === popupItemId) : undefined

  if (mode === 'view') {
    return (
      <BuildSlotsPanel
        items={items}
        buildItems={build.items}
        mode="view"
        activeSlotId={null}
        onSetActiveSlot={() => {}}
        preview={preview}
        onTogglePreview={togglePreview}
        onRemovePlacement={() => {}}
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
            buildItems={build.items}
            mode="edit"
            activeSlotId={activeSlotId}
            onSetActiveSlot={setActiveSlotId}
            preview={preview}
            onTogglePreview={togglePreview}
            onRemovePlacement={removePlacement}
            excludedPlacementIds={excludedPlacementIds}
          />
        </div>
        <div style={{ flex: '2 1 420px', minWidth: 280 }}>
          <ItemBrowser
            items={items}
            buildItems={build.items}
            activeSlotId={activeSlotId}
            onFastToggle={fastToggle}
            onOpenPopup={(item) => setPopupItemId(item.id)}
          />
        </div>
      </div>
      {popupItem && (
        <ItemAssignPopup
          item={popupItem}
          items={items}
          buildItems={build.items}
          itemExclusions={build.itemExclusions}
          builtinExclusions={builtinExclusions}
          onToggleSlot={(slotId) => toggleItemInSlot(popupItem.id, slotId)}
          onToggleExclusion={(otherId) => toggleExclusion(popupItem.id, otherId)}
          onClose={() => setPopupItemId(null)}
        />
      )}
    </div>
  )
}
