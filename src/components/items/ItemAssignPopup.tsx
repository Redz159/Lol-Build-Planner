import type { DDragonItem } from '../../types/ddragon'
import { ITEM_SLOT_IDS, ITEM_SLOT_LABELS, type BuildItems, type ItemExclusionPair, type ItemSlotId } from '../../types/items'
import { isBoots } from '../../lib/itemAttributes'
import { isExcludedPair } from '../../lib/itemExclusions'
import { itemImageUrl } from '../../lib/ddragon'

interface Props {
  item: DDragonItem
  items: DDragonItem[]
  buildItems: BuildItems
  itemExclusions: ItemExclusionPair[]
  builtinExclusions: ItemExclusionPair[]
  onToggleSlot: (slotId: ItemSlotId) => void
  onToggleExclusion: (otherItemId: string) => void
  onClose: () => void
}

export function ItemAssignPopup({
  item,
  items,
  buildItems,
  itemExclusions,
  builtinExclusions,
  onToggleSlot,
  onToggleExclusion,
  onClose,
}: Props) {
  const otherItemIds = [
    ...new Set(
      ITEM_SLOT_IDS.flatMap((slotId) => buildItems[slotId].map((p) => p.itemId)).filter((id) => id !== item.id),
    ),
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 11, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        className="panel"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: 18, width: 300, maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <img
            src={itemImageUrl(item.image.full)}
            alt={item.name}
            width={40}
            height={40}
            style={{ borderRadius: 6, border: '1px solid var(--border-strong)' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600 }}>{item.name}</div>
            <div className="tooltip-gold" style={{ fontSize: 12 }}>
              {item.gold.total}g
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" style={{ padding: '4px 9px' }}>
            ✕
          </button>
        </div>

        <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
          Add to slot
        </div>
        <div style={{ marginBottom: 14 }}>
          {ITEM_SLOT_IDS.filter((slotId) => slotId !== 'boots' || isBoots(item)).map((slotId) => (
            <label key={slotId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
              <input
                type="checkbox"
                checked={buildItems[slotId].some((p) => p.itemId === item.id)}
                onChange={() => onToggleSlot(slotId)}
              />
              {ITEM_SLOT_LABELS[slotId]}
            </label>
          ))}
        </div>

        {otherItemIds.length > 0 && (
          <>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Excludes
            </div>
            <div>
              {otherItemIds.map((otherId) => {
                const other = items.find((i) => i.id === otherId)
                const builtin = isExcludedPair(builtinExclusions, item.id, otherId)
                return (
                  <label key={otherId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                    <input
                      type="checkbox"
                      checked={builtin || isExcludedPair(itemExclusions, item.id, otherId)}
                      disabled={builtin}
                      onChange={() => onToggleExclusion(otherId)}
                    />
                    {other && (
                      <img
                        src={itemImageUrl(other.image.full)}
                        alt=""
                        width={18}
                        height={18}
                        style={{ borderRadius: 3 }}
                      />
                    )}
                    {other?.name ?? otherId}
                    {builtin && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(game rule)</span>}
                  </label>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
