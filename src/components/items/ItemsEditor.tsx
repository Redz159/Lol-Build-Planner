import { useEffect, useMemo, useRef, useState } from 'react'
import type { Loadout } from '../../types/build'
import type { DDragonItem } from '../../types/ddragon'
import { effectiveItemNote, type BuildItems, type ItemSlot, type ItemSlotNotes, itemSlotNoteKey } from '../../types/items'
import { newId } from '../../lib/id'
import { isBoots } from '../../lib/itemAttributes'
import { builtinExclusionPairs, isExcludedPair, toggleExclusionPair } from '../../lib/itemExclusions'
import { isRequiredPair, requiredItemIds, toggleRequirementPair } from '../../lib/itemRequirements'
import { addCategory, deleteCategory, duplicateCategory, mergedCategoryItems, renameCategory, toggleCategoryPlacement } from '../../lib/itemCategories'
import { buildLeagueItemSet } from '../../lib/leagueItemSet'
import { useGameData } from '../../state/GameDataContext'
import { BuildSlotsPanel } from './BuildSlotsPanel'
import { ItemBrowser } from './ItemBrowser'
import { ItemAssignPopup, type ItemRelationMode } from './ItemAssignPopup'
import { ItemCategoryTabs } from './ItemCategoryTabs'
import { ExportItemSetPopup } from './ExportItemSetPopup'
import type { ItemRelationOutline } from './ItemIcon'

interface Props {
  loadout: Loadout
  mode: 'view' | 'edit'
  onChange: (patch: Partial<Loadout>) => void
  championKey: string | undefined
  buildTitle: string
}

export function ItemsEditor({ loadout, mode, onChange, championKey, buildTitle }: Props) {
  const { items } = useGameData()
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null)
  const [popupItemId, setPopupItemId] = useState<string | null>(null)
  // Which slot's placement opened the note popup, if any — lets the popup edit that slot's own
  // note instead of the item's global one. Null when opened from the browser with no specific
  // slot in context (e.g. no active fast-add slot).
  const [popupSlotId, setPopupSlotId] = useState<string | null>(null)
  // Which of the popup's "Excludes" / "Only include" checklists is shown — resets to Excludes
  // each time the popup opens, since it's a view toggle rather than a per-item setting.
  const [popupRelationMode, setPopupRelationMode] = useState<ItemRelationMode>('exclude')
  const [preview, setPreview] = useState<Partial<Record<string, string>>>({})
  // Raw tab selection — 'all' or a category id the user picked, or null before any pick. Falls
  // back to the first category once any exist, and to plain loadout.items when none do, so a
  // deleted or not-yet-chosen category never leaves the view on a dangling id.
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [showExportPopup, setShowExportPopup] = useState(false)

  const openPopup = (item: DDragonItem, slotId?: string) => {
    setPopupItemId(item.id)
    setPopupSlotId(slotId ?? null)
    setPopupRelationMode('exclude')
  }

  const closePopup = () => {
    setPopupItemId(null)
    setPopupSlotId(null)
  }

  // The 6th item slot (or any future adc-bonus slot) is an ADC-only bonus slot, hidden
  // everywhere else; every other slot is always visible once it exists.
  const visibleSlots = useMemo(
    () => loadout.itemSlots.filter((slot) => slot.kind !== 'adc-bonus' || loadout.roles.includes('adc')),
    [loadout.itemSlots, loadout.roles],
  )

  const findSlot = (slotId: string): ItemSlot | undefined => loadout.itemSlots.find((s) => s.id === slotId)

  // Which item-set is currently being shown/edited: a real category, the merged read-only "All"
  // view, or (no categories at all) the loadout's own plain item list — the pre-categories
  // behavior, left untouched so existing builds keep working unchanged.
  const effectiveCategoryId =
    loadout.itemCategories.length === 0
      ? null
      : selectedCategoryId === 'all' || loadout.itemCategories.some((c) => c.id === selectedCategoryId)
        ? selectedCategoryId
        : loadout.itemCategories[0].id
  const activeCategory =
    effectiveCategoryId && effectiveCategoryId !== 'all' ? loadout.itemCategories.find((c) => c.id === effectiveCategoryId) : undefined
  const isAllCategoryView = effectiveCategoryId === 'all'
  const currentItems: BuildItems = activeCategory
    ? activeCategory.items
    : isAllCategoryView
      ? mergedCategoryItems(loadout.itemCategories, loadout.itemSlots)
      : loadout.items

  // Writes go to whichever item-set is active; a no-op while viewing the merged "All" tab, since
  // it has no single category to write into.
  const setCurrentItems = (nextItems: BuildItems, extra: Partial<Loadout> = {}) => {
    if (activeCategory) {
      onChange({
        itemCategories: loadout.itemCategories.map((c) => (c.id === activeCategory.id ? { ...c, items: nextItems } : c)),
        ...extra,
      })
    } else if (!isAllCategoryView) {
      onChange({ items: nextItems, ...extra })
    }
  }

  const addItemCategory = (label: string) => {
    const categories = addCategory(loadout.itemCategories, loadout.itemSlots, label, loadout.itemCategories.length === 0 ? loadout.items : undefined)
    onChange({ itemCategories: categories })
    setSelectedCategoryId(categories[categories.length - 1].id)
  }

  const renameItemCategory = (id: string, label: string) => {
    onChange({ itemCategories: renameCategory(loadout.itemCategories, id, label) })
  }

  const deleteItemCategory = (id: string) => {
    onChange({ itemCategories: deleteCategory(loadout.itemCategories, id) })
  }

  const duplicateItemCategory = (id: string) => {
    const { categories, newId: clonedId } = duplicateCategory(loadout.itemCategories, loadout.itemSlots, id)
    onChange({ itemCategories: categories })
    setSelectedCategoryId(clonedId)
  }

  const toggleCategoryItem = (categoryId: string, slotId: string, itemId: string) => {
    onChange({
      itemCategories: loadout.itemCategories.map((c) => (c.id === categoryId ? { ...c, items: toggleCategoryPlacement(c.items, slotId, itemId) } : c)),
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (popupItemId) closePopup()
      else if (activeSlotId) setActiveSlotId(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popupItemId, activeSlotId])

  const builtinExclusions = useMemo(() => builtinExclusionPairs(items), [items])

  const excludedPlacementIds = useMemo(() => {
    const previewedPlacementIds = new Set(Object.values(preview))
    const previewedItemIds = new Set<string>()
    for (const slot of loadout.itemSlots) {
      const placementId = preview[slot.id]
      if (!placementId) continue
      const placement = currentItems[slot.id]?.find((p) => p.id === placementId)
      if (placement) previewedItemIds.add(placement.itemId)
    }
    const result = new Set<string>()
    if (previewedItemIds.size === 0) return result
    // A "requires" pair only counts while the required item is actually a candidate in this
    // item-set — a category that never includes it shouldn't be able to satisfy or block on it.
    const itemIdsInView = new Set(Object.values(currentItems).flatMap((placements) => placements.map((p) => p.itemId)))
    for (const slot of loadout.itemSlots) {
      for (const placement of currentItems[slot.id] ?? []) {
        if (previewedPlacementIds.has(placement.id)) continue
        const sameItemElsewhere = previewedItemIds.has(placement.itemId)
        const excluded = [...previewedItemIds].some(
          (pid) => isExcludedPair(loadout.itemExclusions, pid, placement.itemId) || isExcludedPair(builtinExclusions, pid, placement.itemId),
        )
        const applicableRequired = requiredItemIds(loadout.itemRequirements, placement.itemId).filter((id) => itemIdsInView.has(id))
        const requirementUnmet = applicableRequired.length > 0 && !applicableRequired.every((id) => previewedItemIds.has(id))
        if (sameItemElsewhere || excluded || requirementUnmet) result.add(placement.id)
      }
    }
    return result
  }, [preview, loadout.itemSlots, currentItems, loadout.itemExclusions, loadout.itemRequirements, builtinExclusions])

  // Hovering any placed item lightly rings every OTHER placement related to it: gold for the
  // same item elsewhere, red for a mutual exclusion, green for an item the hovered one requires,
  // blue for an item that in turn requires the hovered one. Tracked by placement id (not item
  // id) so the hovered tile itself never rings its own reflection.
  const [hoveredPlacementId, setHoveredPlacementId] = useState<string | null>(null)

  const hoverOutlines = useMemo(() => {
    const result = new Map<string, ItemRelationOutline>()
    if (!hoveredPlacementId) return result
    const hoveredItemId = Object.values(currentItems)
      .flat()
      .find((p) => p.id === hoveredPlacementId)?.itemId
    if (!hoveredItemId) return result
    for (const slot of loadout.itemSlots) {
      for (const placement of currentItems[slot.id] ?? []) {
        if (placement.id === hoveredPlacementId) continue
        if (placement.itemId === hoveredItemId) {
          result.set(placement.id, 'gold')
        } else if (
          isExcludedPair(loadout.itemExclusions, hoveredItemId, placement.itemId) ||
          isExcludedPair(builtinExclusions, hoveredItemId, placement.itemId)
        ) {
          result.set(placement.id, 'red')
        } else if (isRequiredPair(loadout.itemRequirements, hoveredItemId, placement.itemId)) {
          result.set(placement.id, 'green')
        } else if (isRequiredPair(loadout.itemRequirements, placement.itemId, hoveredItemId)) {
          result.set(placement.id, 'blue')
        }
      }
    }
    return result
  }, [hoveredPlacementId, loadout.itemSlots, currentItems, loadout.itemExclusions, loadout.itemRequirements, builtinExclusions])

  // A slot's local note only makes sense while the item is actually placed there, so every
  // path that removes a placement (toggling off, the × button, or dragging it elsewhere)
  // drops that slot's local note along with it rather than leaving it to resurface later.
  const withoutLocalNote = (slotId: string, itemId: string): ItemSlotNotes => {
    const key = itemSlotNoteKey(slotId, itemId)
    if (!(key in loadout.itemSlotNotes)) return loadout.itemSlotNotes
    const next = { ...loadout.itemSlotNotes }
    delete next[key]
    return next
  }

  const toggleItemInSlot = (itemId: string, slotId: string) => {
    const current = currentItems[slotId] ?? []
    const exists = current.some((p) => p.itemId === itemId)
    const next = exists ? current.filter((p) => p.itemId !== itemId) : [...current, { id: newId(), itemId }]
    setCurrentItems({ ...currentItems, [slotId]: next }, exists ? { itemSlotNotes: withoutLocalNote(slotId, itemId) } : {})
  }

  const fastToggle = (item: DDragonItem) => {
    if (!activeSlotId) return
    if (findSlot(activeSlotId)?.kind === 'boots' && !isBoots(item)) return
    toggleItemInSlot(item.id, activeSlotId)
  }

  const removePlacement = (slotId: string, placementId: string) => {
    const placement = (currentItems[slotId] ?? []).find((p) => p.id === placementId)
    setCurrentItems(
      { ...currentItems, [slotId]: (currentItems[slotId] ?? []).filter((p) => p.id !== placementId) },
      placement ? { itemSlotNotes: withoutLocalNote(slotId, placement.itemId) } : {},
    )
    setPreview((prev) => {
      if (prev[slotId] !== placementId) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
  }

  // Drag-and-drop: a ref (not state) so a drag gesture doesn't trigger re-renders of its own.
  // `from: null` means the drag started in the item browser rather than an existing placement.
  const dragRef = useRef<{ itemId: string; from: { slotId: string; placementId: string } | null } | null>(null)

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

  const moveItemToSlot = (itemId: string, from: { slotId: string; placementId: string }, toSlotId: string) => {
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

  const applyDrop = (toSlotId: string, drag: { itemId: string; from: { slotId: string; placementId: string } | null }) => {
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

  const togglePreview = (slotId: string, placementId: string) => {
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

  const toggleRequirement = (itemId: string, otherItemId: string) => {
    onChange({ itemRequirements: toggleRequirementPair(loadout.itemRequirements, itemId, otherItemId) })
  }

  const setGlobalNote = (itemId: string, note: string) => {
    const next = { ...loadout.itemNotes }
    if (note.trim() === '') delete next[itemId]
    else next[itemId] = note
    onChange({ itemNotes: next })
  }

  const setLocalNote = (slotId: string, itemId: string, note: string) => {
    const key = itemSlotNoteKey(slotId, itemId)
    const next = { ...loadout.itemSlotNotes }
    if (note.trim() === '') delete next[key]
    else next[key] = note
    onChange({ itemSlotNotes: next })
  }

  // Whether an item's note is global or local is one flag per item, so flipping it anywhere
  // flips it for every slot the item is placed in — never just the slot the popup happened to
  // open from. Either direction carries the currently effective text into its new home first,
  // so nothing visibly changes the instant you toggle; only later edits made in the new mode
  // can diverge from what it used to share.
  const toggleNoteGlobal = (itemId: string, makeGlobal: boolean, currentText: string) => {
    const nextFlags = { ...loadout.itemNoteGlobal }
    if (makeGlobal) delete nextFlags[itemId]
    else nextFlags[itemId] = false

    if (makeGlobal) {
      const nextGlobal = { ...loadout.itemNotes }
      if (currentText.trim() === '') delete nextGlobal[itemId]
      else nextGlobal[itemId] = currentText
      onChange({ itemNoteGlobal: nextFlags, itemNotes: nextGlobal })
    } else {
      // Seed every slot that currently holds this item (in the item-set being viewed) with the
      // same text it was just showing, so becoming local doesn't blank it out here.
      const nextLocal = { ...loadout.itemSlotNotes }
      for (const slot of loadout.itemSlots) {
        if (!(currentItems[slot.id] ?? []).some((p) => p.itemId === itemId)) continue
        const key = itemSlotNoteKey(slot.id, itemId)
        if (currentText.trim() === '') delete nextLocal[key]
        else nextLocal[key] = currentText
      }
      onChange({ itemNoteGlobal: nextFlags, itemSlotNotes: nextLocal })
    }
  }

  // Slots are shared across every category, so adding/removing one has to keep loadout.items
  // and every category's own item map in lockstep with loadout.itemSlots.
  const addSlot = () => {
    const slot: ItemSlot = { id: newId(), label: 'New Slot' }
    onChange({
      itemSlots: [...loadout.itemSlots, slot],
      items: { ...loadout.items, [slot.id]: [] },
      itemCategories: loadout.itemCategories.map((c) => ({ ...c, items: { ...c.items, [slot.id]: [] } })),
    })
  }

  const renameSlot = (slotId: string, label: string) => {
    const trimmed = label.trim()
    const slot = findSlot(slotId)
    if (!slot || !trimmed || trimmed === slot.label) return
    onChange({ itemSlots: loadout.itemSlots.map((s) => (s.id === slotId ? { id: s.id, label: trimmed } : s)) })
  }

  const deleteSlot = (slotId: string) => {
    const stripSlot = (buildItems: BuildItems): BuildItems => {
      const next = { ...buildItems }
      delete next[slotId]
      return next
    }
    const prefix = itemSlotNoteKey(slotId, '')
    const nextSlotNotes = Object.fromEntries(Object.entries(loadout.itemSlotNotes).filter(([key]) => !key.startsWith(prefix)))
    onChange({
      itemSlots: loadout.itemSlots.filter((s) => s.id !== slotId),
      items: stripSlot(loadout.items),
      itemCategories: loadout.itemCategories.map((c) => ({ ...c, items: stripSlot(c.items) })),
      itemSlotNotes: nextSlotNotes,
    })
    if (activeSlotId === slotId) setActiveSlotId(null)
    setPreview((prev) => {
      if (!(slotId in prev)) return prev
      const next = { ...prev }
      delete next[slotId]
      return next
    })
  }

  const popupItem = popupItemId ? items.find((i) => i.id === popupItemId) : undefined
  // isGlobalNote is a per-item flag (synced across every slot), independent of which slot the
  // popup opened from; only the note *text* shown for a local item still depends on that slot.
  const popupIsGlobalNote = popupItem ? (loadout.itemNoteGlobal[popupItem.id] ?? true) : true
  const popupNote = popupItem
    ? popupSlotId
      ? (effectiveItemNote(loadout.itemNotes, loadout.itemSlotNotes, loadout.itemNoteGlobal, popupSlotId, popupItem.id) ?? '')
      : (loadout.itemNotes[popupItem.id] ?? '')
    : ''

  const categoryTabs = (
    <ItemCategoryTabs
      categories={loadout.itemCategories}
      slots={loadout.itemSlots}
      items={items}
      mode={mode}
      activeId={effectiveCategoryId}
      onSelect={setSelectedCategoryId}
      onAdd={addItemCategory}
      onRename={renameItemCategory}
      onDelete={deleteItemCategory}
      onDuplicate={duplicateItemCategory}
      onToggleCategoryItem={toggleCategoryItem}
    />
  )

  // Exports whatever item-set is currently on screen — a specific category, the "All" merge, or
  // the plain item list when there are no categories — same scoping the rest of the editor uses.
  const exportTitleSuffix = activeCategory ? ` - ${activeCategory.label}` : isAllCategoryView ? ' - All' : ''
  const exportButton = (
    <button type="button" onClick={() => setShowExportPopup(true)} style={{ padding: '4px 10px', fontSize: 12, marginBottom: 12 }}>
      Export item set
    </button>
  )

  if (mode === 'view') {
    return (
      <div>
        {categoryTabs}
        {exportButton}
        <BuildSlotsPanel
          items={items}
          buildItems={currentItems}
          itemNotes={loadout.itemNotes}
          itemSlotNotes={loadout.itemSlotNotes}
          itemNoteGlobal={loadout.itemNoteGlobal}
          slots={visibleSlots}
          mode="view"
          activeSlotId={null}
          onSetActiveSlot={() => {}}
          preview={preview}
          onTogglePreview={togglePreview}
          onRemovePlacement={() => {}}
          onOpenPopup={() => {}}
          onDragStartPlacement={() => {}}
          onDropOnSlot={() => {}}
          onDropOnPlacement={() => {}}
          onAddSlot={() => {}}
          onRenameSlot={() => {}}
          onDeleteSlot={() => {}}
          excludedPlacementIds={excludedPlacementIds}
          hoverOutlines={hoverOutlines}
          onHoverPlacement={setHoveredPlacementId}
        />
        {showExportPopup && (
          <ExportItemSetPopup
            itemSet={buildLeagueItemSet(`${buildTitle}${exportTitleSuffix}`, championKey, visibleSlots, currentItems)}
            onClose={() => setShowExportPopup(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div>
      {categoryTabs}
      {exportButton}
      {isAllCategoryView ? (
        <>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 10 }}>
            "All" is a read-only merge of every category — pick a category to edit its items.
          </div>
          <BuildSlotsPanel
            items={items}
            buildItems={currentItems}
            itemNotes={loadout.itemNotes}
            itemSlotNotes={loadout.itemSlotNotes}
            itemNoteGlobal={loadout.itemNoteGlobal}
            slots={visibleSlots}
            mode="view"
            activeSlotId={null}
            onSetActiveSlot={() => {}}
            preview={{}}
            onTogglePreview={() => {}}
            onRemovePlacement={() => {}}
            onOpenPopup={() => {}}
            onDragStartPlacement={() => {}}
            onDropOnSlot={() => {}}
            onDropOnPlacement={() => {}}
            onAddSlot={() => {}}
            onRenameSlot={() => {}}
            onDeleteSlot={() => {}}
            excludedPlacementIds={new Set()}
            hoverOutlines={hoverOutlines}
            onHoverPlacement={setHoveredPlacementId}
          />
        </>
      ) : (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 320px', minWidth: 280 }}>
            <BuildSlotsPanel
              items={items}
              buildItems={currentItems}
              itemNotes={loadout.itemNotes}
              itemSlotNotes={loadout.itemSlotNotes}
              itemNoteGlobal={loadout.itemNoteGlobal}
              slots={visibleSlots}
              mode="edit"
              activeSlotId={activeSlotId}
              onSetActiveSlot={setActiveSlotId}
              preview={preview}
              onTogglePreview={togglePreview}
              onRemovePlacement={removePlacement}
              onOpenPopup={openPopup}
              onDragStartPlacement={startDragFromSlot}
              onDropOnSlot={dropOnSlot}
              onDropOnPlacement={dropOnPlacement}
              onAddSlot={addSlot}
              onRenameSlot={renameSlot}
              onDeleteSlot={deleteSlot}
              excludedPlacementIds={excludedPlacementIds}
              hoverOutlines={hoverOutlines}
              onHoverPlacement={setHoveredPlacementId}
            />
          </div>
          <div style={{ flex: '2 1 420px', minWidth: 280 }}>
            <ItemBrowser
              items={items}
              buildItems={currentItems}
              itemNotes={loadout.itemNotes}
              itemSlotNotes={loadout.itemSlotNotes}
              itemNoteGlobal={loadout.itemNoteGlobal}
              roles={loadout.roles}
              activeSlot={activeSlotId ? (findSlot(activeSlotId) ?? null) : null}
              onFastToggle={fastToggle}
              onOpenPopup={openPopup}
              onDragStartItem={startDragFromBrowser}
              onDropToBrowser={dropOnBrowser}
            />
          </div>
        </div>
      )}
      {popupItem && !isAllCategoryView && (
        <ItemAssignPopup
          item={popupItem}
          items={items}
          buildItems={currentItems}
          slots={visibleSlots}
          itemExclusions={loadout.itemExclusions}
          builtinExclusions={builtinExclusions}
          itemRequirements={loadout.itemRequirements}
          relationMode={popupRelationMode}
          note={popupNote}
          isGlobalNote={popupIsGlobalNote}
          hasSlotContext={!!popupSlotId}
          onToggleSlot={(slotId) => toggleItemInSlot(popupItem.id, slotId)}
          onToggleExclusion={(otherId) => toggleExclusion(popupItem.id, otherId)}
          onToggleRequirement={(otherId) => toggleRequirement(popupItem.id, otherId)}
          onRelationModeChange={setPopupRelationMode}
          onNoteChange={(note) =>
            !popupIsGlobalNote && popupSlotId ? setLocalNote(popupSlotId, popupItem.id, note) : setGlobalNote(popupItem.id, note)
          }
          onToggleNoteGlobal={(makeGlobal) => toggleNoteGlobal(popupItem.id, makeGlobal, popupNote)}
          onClose={closePopup}
        />
      )}
      {showExportPopup && (
        <ExportItemSetPopup
          itemSet={buildLeagueItemSet(`${buildTitle}${exportTitleSuffix}`, championKey, visibleSlots, currentItems)}
          onClose={() => setShowExportPopup(false)}
        />
      )}
    </div>
  )
}
