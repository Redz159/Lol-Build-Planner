import type { DDragonItem } from '../../types/ddragon'
import type { BuildItems, ItemExclusionPair, ItemSlot } from '../../types/items'
import { isBoots } from '../../lib/itemAttributes'
import { isExcludedPair } from '../../lib/itemExclusions'
import { itemImageUrl } from '../../lib/ddragon'

interface Props {
  item: DDragonItem
  items: DDragonItem[]
  buildItems: BuildItems
  slots: ItemSlot[]
  itemExclusions: ItemExclusionPair[]
  builtinExclusions: ItemExclusionPair[]
  note: string
  onToggleSlot: (slotId: string) => void
  onToggleExclusion: (otherItemId: string) => void
  onNoteChange: (note: string) => void
  onClose: () => void
}

export function ItemAssignPopup({
  item,
  items,
  buildItems,
  slots,
  itemExclusions,
  builtinExclusions,
  note,
  onToggleSlot,
  onToggleExclusion,
  onNoteChange,
  onClose,
}: Props) {
  const otherItemIds = [...new Set(slots.flatMap((slot) => (buildItems[slot.id] ?? []).map((p) => p.itemId)))].filter(
    (id) => id !== item.id,
  )
  const otherItems = otherItemIds.map((id) => items.find((i) => i.id === id)).filter((i): i is DDragonItem => !!i)

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
          {slots
            .filter((slot) => slot.kind !== 'boots' || isBoots(item))
            .map((slot) => (
              <label key={slot.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <input
                  type="checkbox"
                  checked={(buildItems[slot.id] ?? []).some((p) => p.itemId === item.id)}
                  onChange={() => onToggleSlot(slot.id)}
                />
                {slot.label}
              </label>
            ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>Note</div>
          {note && (
            <button
              type="button"
              onClick={() => onNoteChange('')}
              style={{ marginLeft: 'auto', padding: '1px 8px', fontSize: 11 }}
            >
              Clear
            </button>
          )}
        </div>
        <textarea
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Shown on this item's tooltip..."
          rows={3}
          style={{ width: '100%', resize: 'vertical', marginBottom: 14, fontSize: 13 }}
        />

        {otherItems.length > 0 && (
          <>
            <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>
              Excludes
            </div>
            <div>
              {otherItems.map((other) => {
                const builtin = isExcludedPair(builtinExclusions, item.id, other.id)
                return (
                  <label key={other.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                    <input
                      type="checkbox"
                      checked={builtin || isExcludedPair(itemExclusions, item.id, other.id)}
                      disabled={builtin}
                      onChange={() => onToggleExclusion(other.id)}
                    />
                    <img src={itemImageUrl(other.image.full)} alt="" width={18} height={18} style={{ borderRadius: 3 }} />
                    {other.name}
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
