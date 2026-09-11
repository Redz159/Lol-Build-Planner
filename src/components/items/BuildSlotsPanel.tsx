import type { MouseEvent } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import { ITEM_SLOT_LABELS, type BuildItems, type ItemNotes, type ItemSlotId } from '../../types/items'
import { ItemIcon } from './ItemIcon'
import './items.css'

interface Props {
  items: DDragonItem[]
  buildItems: BuildItems
  itemNotes: ItemNotes
  slotIds: readonly ItemSlotId[]
  mode: 'view' | 'edit'
  activeSlotId: ItemSlotId | null
  onSetActiveSlot: (slotId: ItemSlotId | null) => void
  preview: Partial<Record<ItemSlotId, string>>
  onTogglePreview: (slotId: ItemSlotId, placementId: string) => void
  onRemovePlacement: (slotId: ItemSlotId, placementId: string) => void
  onOpenPopup: (item: DDragonItem) => void
  excludedPlacementIds: Set<string>
}

export function BuildSlotsPanel({
  items,
  buildItems,
  itemNotes,
  slotIds,
  mode,
  activeSlotId,
  onSetActiveSlot,
  preview,
  onTogglePreview,
  onRemovePlacement,
  onOpenPopup,
  excludedPlacementIds,
}: Props) {
  const isEmpty = slotIds.every((slotId) => buildItems[slotId].length === 0)
  if (mode === 'view' && isEmpty) {
    return <div style={{ color: 'var(--text-dim)' }}>No items in this build yet.</div>
  }

  return (
    <div>
      {mode === 'edit' && activeSlotId && (
        <div
          className="panel"
          style={{ padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
        >
          <span style={{ color: 'var(--gold-bright)' }}>
            Fast-add: {ITEM_SLOT_LABELS[activeSlotId]} — click items below to add/remove
          </span>
          <button type="button" onClick={() => onSetActiveSlot(null)} style={{ marginLeft: 'auto', padding: '2px 8px' }}>
            Done
          </button>
        </div>
      )}
      {slotIds.map((slotId) => {
        const placements = buildItems[slotId]
        if (mode === 'view' && placements.length === 0) return null
        const active = activeSlotId === slotId
        return (
          <div
            key={slotId}
            className="panel"
            style={{
              padding: 14,
              marginBottom: 12,
              borderColor: active ? 'var(--gold)' : undefined,
            }}
          >
            <div style={{ marginBottom: 8 }}>
              {mode === 'edit' ? (
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
                  {ITEM_SLOT_LABELS[slotId]}
                </button>
              ) : (
                <div style={{ color: 'var(--gold)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {ITEM_SLOT_LABELS[slotId]}
                </div>
              )}
            </div>

            {placements.length === 0 ? (
              <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>Empty</div>
            ) : (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {placements.map((placement) => {
                  const item = items.find((i) => i.id === placement.itemId)
                  if (!item) return null
                  const handleClick = (e: MouseEvent) => {
                    if (mode === 'edit') {
                      if (e.ctrlKey || e.metaKey) {
                        onRemovePlacement(slotId, placement.id)
                        return
                      }
                      onOpenPopup(item)
                      return
                    }
                    onTogglePreview(slotId, placement.id)
                  }
                  return (
                    <div key={placement.id} className="item-tile">
                      <ItemIcon
                        item={item}
                        selected={preview[slotId] === placement.id}
                        excluded={excludedPlacementIds.has(placement.id)}
                        note={itemNotes[item.id]}
                        onClick={handleClick}
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
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
