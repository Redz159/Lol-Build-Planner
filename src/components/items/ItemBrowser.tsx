import { useEffect, useMemo, useState } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import { ITEM_SLOT_IDS, type BuildItems, type ItemSlotId } from '../../types/items'
import { ATTRIBUTE_FILTERS, STAT_FILTERS, itemMatchesFilters } from '../../lib/itemAttributes'
import { ItemFilterPanel } from './ItemFilterPanel'
import { ItemIcon } from './ItemIcon'
import './items.css'

const ALL_FILTER_OPTIONS = [...ATTRIBUTE_FILTERS, ...STAT_FILTERS]

interface Props {
  items: DDragonItem[]
  buildItems: BuildItems
  activeSlotId: ItemSlotId | null
  onFastToggle: (item: DDragonItem) => void
  onOpenPopup: (item: DDragonItem) => void
}

function placementCount(buildItems: BuildItems, itemId: string): number {
  return ITEM_SLOT_IDS.reduce((n, slotId) => n + buildItems[slotId].filter((p) => p.itemId === itemId).length, 0)
}

export function ItemBrowser({ items, buildItems, activeSlotId, onFastToggle, onOpenPopup }: Props) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Set<string>>(new Set())

  // Boots is the only slot where a non-matching item can never be placed, so jumping into
  // fast-add for it pre-filters the browser down to boots; leaving it clears that back out,
  // unless the user has since changed the filter selection themselves.
  useEffect(() => {
    if (activeSlotId === 'boots') {
      setFilters(new Set(['attr:boots']))
    } else {
      setFilters((prev) => (prev.size === 1 && prev.has('attr:boots') ? new Set() : prev))
    }
  }, [activeSlotId])

  const toggleFilter = (id: string) => {
    setFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return items.filter(
      (item) => (!query || item.name.toLowerCase().includes(query)) && itemMatchesFilters(item, filters, ALL_FILTER_OPTIONS),
    )
  }, [items, search, filters])

  return (
    <div>
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <div style={{ marginBottom: 10 }}>
        <ItemFilterPanel selected={filters} onToggle={toggleFilter} onClear={() => setFilters(new Set())} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {visible.map((item) => {
          const count = placementCount(buildItems, item.id)
          return (
            <div key={item.id} className="item-tile">
              <ItemIcon
                item={item}
                size={40}
                badge={count > 0 ? count : undefined}
                title={activeSlotId ? `${item.name} — click to toggle in active slot` : item.name}
                onClick={() => (activeSlotId ? onFastToggle(item) : onOpenPopup(item))}
              />
              {activeSlotId && (
                <button
                  type="button"
                  className="item-tile-action"
                  aria-label={`Manage ${item.name}`}
                  title="Manage slots & exclusions"
                  onClick={() => onOpenPopup(item)}
                >
                  ⋯
                </button>
              )}
            </div>
          )
        })}
        {visible.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>No items match.</div>}
      </div>
    </div>
  )
}
