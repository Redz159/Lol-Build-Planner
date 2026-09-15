import { Fragment, useState, type DragEvent, type MouseEvent } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import {
  effectiveItemNote,
  type BuildItems,
  type ItemNoteGlobalFlags,
  type ItemNotes,
  type ItemSituationalFlags,
  type ItemSlot,
  type ItemSlotNotes,
} from '../../types/items'
import { ItemIcon, type ItemRelationOutline } from './ItemIcon'
import './items.css'

interface Props {
  items: DDragonItem[]
  buildItems: BuildItems
  itemNotes: ItemNotes
  itemSlotNotes: ItemSlotNotes
  itemNoteGlobal: ItemNoteGlobalFlags
  itemSituational: ItemSituationalFlags
  slots: ItemSlot[]
  mode: 'view' | 'edit'
  activeSlotId: string | null
  onSetActiveSlot: (slotId: string | null) => void
  preview: Partial<Record<string, string>>
  onTogglePreview: (slotId: string, placementId: string) => void
  onRemovePlacement: (slotId: string, placementId: string) => void
  onOpenPopup: (item: DDragonItem, slotId: string) => void
  onDragStartPlacement: (slotId: string, placementId: string, itemId: string) => void
  onDropOnSlot: (slotId: string) => void
  onDropOnPlacement: (slotId: string, placementId: string, side: 'before' | 'after') => void
  onAddSlot: () => void
  onRenameSlot: (slotId: string, label: string) => void
  onDeleteSlot: (slotId: string) => void
  excludedPlacementIds: Set<string>
  hoverOutlines: Map<string, ItemRelationOutline>
  onHoverPlacement: (placementId: string | null) => void
  // Overrides the normal single-per-slot preview selection in view mode: any placement whose id
  // is in this set renders with the "selected" gold ring, and clicking a placement calls
  // onToggleSelection instead of onTogglePreview. Used by the category quick-add view, where
  // several items in the same slot can all already belong to the category at once — something
  // the one-placement-per-slot `preview` map can't represent. Omit both to get the normal
  // single-selection preview behavior.
  selectedPlacementIds?: Set<string>
  onToggleSelection?: (slotId: string, placementId: string) => void
  // "(x) games" overlay from an API import — undefined when there's none, or the toggle is off.
  itemGameCounts?: Record<string, Record<string, number>>
}

export function BuildSlotsPanel({
  items,
  buildItems,
  itemNotes,
  itemSlotNotes,
  itemNoteGlobal,
  itemSituational,
  slots,
  mode,
  activeSlotId,
  onSetActiveSlot,
  preview,
  onTogglePreview,
  onRemovePlacement,
  onOpenPopup,
  onDragStartPlacement,
  onDropOnSlot,
  onDropOnPlacement,
  onAddSlot,
  onRenameSlot,
  onDeleteSlot,
  excludedPlacementIds,
  hoverOutlines,
  onHoverPlacement,
  selectedPlacementIds,
  onToggleSelection,
  itemGameCounts,
}: Props) {
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null)
  const [dragOverPlacement, setDragOverPlacement] = useState<{ id: string; side: 'before' | 'after' } | null>(null)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  const isEmpty = slots.every((slot) => (buildItems[slot.id] ?? []).length === 0)
  if (mode === 'view' && isEmpty) {
    return <div style={{ color: 'var(--text-dim)' }}>No items in this build yet.</div>
  }

  const activeSlot = slots.find((s) => s.id === activeSlotId)

  const startRename = (slot: ItemSlot) => {
    setEditingSlotId(slot.id)
    setLabelDraft(slot.label)
  }

  const commitRename = () => {
    if (editingSlotId) onRenameSlot(editingSlotId, labelDraft)
    setEditingSlotId(null)
  }

  return (
    <div>
      {mode === 'edit' && activeSlot && (
        <div
          className="panel"
          style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
        >
          <span style={{ color: 'var(--gold-bright)' }}>
            Fast-add: {activeSlot.label} — click items below to add/remove
          </span>
          <button type="button" onClick={() => onSetActiveSlot(null)} style={{ marginLeft: 'auto', padding: '2px 8px' }}>
            Done
          </button>
        </div>
      )}
      {slots.map((slot) => {
        const slotId = slot.id
        const placements = buildItems[slotId] ?? []
        if (mode === 'view' && placements.length === 0) return null
        // Three groups, in order: regular included items, situational-but-included items (split
        // off by a dashed divider), then excluded ones (split off by the solid divider) — a
        // stable sort keeps each group's own relative order intact. An excluded item never
        // counts as merely "situational" even if it's also flagged that way.
        const rank = (p: { id: string; itemId: string }) => {
          if (excludedPlacementIds.has(p.id)) return 2
          if (itemSituational[p.itemId]) return 1
          return 0
        }
        const orderedPlacements = mode === 'view' ? [...placements].sort((a, b) => rank(a) - rank(b)) : placements
        const situationalDividerIndex = mode === 'view' ? orderedPlacements.findIndex((p) => rank(p) >= 1) : -1
        const excludedDividerIndex = mode === 'view' ? orderedPlacements.findIndex((p) => rank(p) >= 2) : -1
        const active = activeSlotId === slotId
        const dragOver = mode === 'edit' && dragOverSlotId === slotId
        const editing = editingSlotId === slotId
        return (
          <div
            key={slotId}
            className="panel"
            onDragOver={
              mode === 'edit'
                ? (e: DragEvent) => {
                    e.preventDefault()
                    if (dragOverSlotId !== slotId) setDragOverSlotId(slotId)
                  }
                : undefined
            }
            onDragLeave={mode === 'edit' ? () => setDragOverSlotId((prev) => (prev === slotId ? null : prev)) : undefined}
            onDrop={
              mode === 'edit'
                ? (e: DragEvent) => {
                    e.preventDefault()
                    setDragOverSlotId(null)
                    onDropOnSlot(slotId)
                  }
                : undefined
            }
            style={{
              padding: 14,
              marginBottom: 12,
              borderColor: active || dragOver ? 'var(--gold)' : undefined,
              boxShadow: dragOver ? '0 0 0 3px rgba(200, 170, 110, 0.18)' : undefined,
            }}
          >
            <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              {mode === 'edit' && editing ? (
                <input
                  type="text"
                  autoFocus
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    else if (e.key === 'Escape') setEditingSlotId(null)
                  }}
                  style={{ fontSize: 12, fontWeight: 600, padding: '4px 8px', flex: 1, minWidth: 0 }}
                />
              ) : mode === 'edit' ? (
                <button
                  type="button"
                  onClick={() => onSetActiveSlot(active ? null : slotId)}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    padding: '4px 10px',
                    color: active ? 'var(--gold-bright)' : 'var(--gold)',
                    borderColor: active ? 'var(--gold)' : undefined,
                  }}
                >
                  {slot.label}
                </button>
              ) : (
                <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {slot.label}
                </div>
              )}
              {mode === 'edit' && !editing && (
                <>
                  <button
                    type="button"
                    aria-label={`Rename ${slot.label}`}
                    title="Rename slot"
                    onClick={() => startRename(slot)}
                    style={{ marginLeft: 'auto', padding: '2px 7px', fontSize: 12 }}
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${slot.label}`}
                    title="Delete slot"
                    onClick={() => onDeleteSlot(slotId)}
                    style={{ padding: '2px 7px', fontSize: 12, color: 'var(--danger)' }}
                  >
                    ×
                  </button>
                </>
              )}
            </div>

            {placements.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Empty</div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                {orderedPlacements.map((placement, index) => {
                  const item = items.find((i) => i.id === placement.itemId)
                  if (!item) return null
                  const showSituationalDivider =
                    index === situationalDividerIndex && index > 0 && situationalDividerIndex !== excludedDividerIndex
                  const showExcludedDivider = index === excludedDividerIndex && index > 0
                  const handleClick = (e: MouseEvent) => {
                    if (mode === 'edit') {
                      if (e.ctrlKey || e.metaKey) {
                        onRemovePlacement(slotId, placement.id)
                        return
                      }
                      onOpenPopup(item, slotId)
                      return
                    }
                    if (onToggleSelection) onToggleSelection(slotId, placement.id)
                    else onTogglePreview(slotId, placement.id)
                  }
                  const placementDragOver = mode === 'edit' && dragOverPlacement?.id === placement.id ? dragOverPlacement.side : null
                  const sideFromEvent = (e: DragEvent): 'before' | 'after' => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    return e.clientX - rect.left < rect.width / 2 ? 'before' : 'after'
                  }
                  return (
                    <Fragment key={placement.id}>
                      {showSituationalDivider && (
                        <div
                          aria-hidden="true"
                          style={{ position: 'relative', alignSelf: 'stretch', width: 0, borderLeft: '2px dotted var(--gold)' }}
                        >
                          <span
                            style={{
                              position: 'absolute',
                              top: -26,
                              left: 5,
                              whiteSpace: 'nowrap',
                              fontSize: 12,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: 0.5,
                              color: 'var(--gold)',
                            }}
                          >
                            Situational
                          </span>
                        </div>
                      )}
                      {showExcludedDivider && (
                        <div aria-hidden="true" style={{ alignSelf: 'stretch', width: 1, background: 'var(--gold)', opacity: 0.5 }} />
                      )}
                      <div
                        className="item-tile"
                        style={
                          placementDragOver
                            ? {
                                boxShadow:
                                  placementDragOver === 'before'
                                    ? 'inset 3px 0 0 var(--gold)'
                                    : 'inset -3px 0 0 var(--gold)',
                                borderRadius: 8,
                              }
                            : undefined
                        }
                        onDragOver={
                          mode === 'edit'
                            ? (e: DragEvent) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const side = sideFromEvent(e)
                                if (dragOverPlacement?.id !== placement.id || dragOverPlacement.side !== side) {
                                  setDragOverPlacement({ id: placement.id, side })
                                }
                              }
                            : undefined
                        }
                        onDragLeave={
                          mode === 'edit'
                            ? () => setDragOverPlacement((prev) => (prev?.id === placement.id ? null : prev))
                            : undefined
                        }
                        onDrop={
                          mode === 'edit'
                            ? (e: DragEvent) => {
                                e.preventDefault()
                                e.stopPropagation()
                                const side = sideFromEvent(e)
                                setDragOverPlacement(null)
                                setDragOverSlotId(null)
                                onDropOnPlacement(slotId, placement.id, side)
                              }
                            : undefined
                        }
                      >
                        <ItemIcon
                          item={item}
                          selected={
                            mode === 'view' &&
                            (selectedPlacementIds ? selectedPlacementIds.has(placement.id) : preview[slotId] === placement.id)
                          }
                          excluded={mode === 'view' && excludedPlacementIds.has(placement.id)}
                          outline={hoverOutlines.get(placement.id)}
                          badge={itemGameCounts?.[slotId]?.[item.id]}
                          note={effectiveItemNote(itemNotes, itemSlotNotes, itemNoteGlobal, slotId, item.id)}
                          draggable={mode === 'edit'}
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move'
                            onDragStartPlacement(slotId, placement.id, item.id)
                          }}
                          onClick={handleClick}
                          onMouseEnter={() => onHoverPlacement(placement.id)}
                          onMouseLeave={() => onHoverPlacement(null)}
                        />
                        {mode === 'edit' && (
                          <button
                            type="button"
                            className="item-tile-action"
                            aria-label={`Remove ${item.name}`}
                            title="Remove (or Ctrl+click the icon)"
                            onClick={() => onRemovePlacement(slotId, placement.id)}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </Fragment>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
      {mode === 'edit' && (
        <button type="button" onClick={onAddSlot} style={{ width: '100%', padding: '8px 0' }}>
          + Add slot
        </button>
      )}
    </div>
  )
}
