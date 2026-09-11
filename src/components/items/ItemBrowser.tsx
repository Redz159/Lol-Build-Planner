import { useEffect, useMemo, useState, type DragEvent } from 'react'
import type { DDragonItem } from '../../types/ddragon'
import type { Role } from '../../types/build'
import { ITEM_SLOT_IDS, type BuildItems, type ItemNotes, type ItemSlotId } from '../../types/items'
import { ATTRIBUTE_FILTERS, STAT_FILTERS, isItemVisibleForRoles, itemMatchesFilters, type FilterMode } from '../../lib/itemAttributes'
import { ItemFilterPanel } from './ItemFilterPanel'
import { ItemIcon } from './ItemIcon'
import './items.css'

const ALL_FILTER_OPTIONS = [...ATTRIBUTE_FILTERS, ...STAT_FILTERS]

const SLOT_AUTO_FILTER: Partial<Record<ItemSlotId, string>> = {
  boots: 'attr:boots',
  starter: 'attr:starter',
}
const ALL_AUTO_FILTER_IDS = new Set(Object.values(SLOT_AUTO_FILTER))

interface Props {
  items: DDragonItem[]
  buildItems: BuildItems
  itemNotes: ItemNotes
  roles: Role[]
  activeSlotId: ItemSlotId | null
  onFastToggle: (item: DDragonItem) => void
  onOpenPopup: (item: DDragonItem) => void
  onDragStartItem: (itemId: string) => void
  onDropToBrowser: () => void
}

function placementCount(buildItems: BuildItems, itemId: string): number {
  return ITEM_SLOT_IDS.reduce((n, slotId) => n + buildItems[slotId].filter((p) => p.itemId === itemId).length, 0)
}

export function ItemBrowser({
  items,
  buildItems,
  itemNotes,
  roles,
  activeSlotId,
  onFastToggle,
  onOpenPopup,
  onDragStartItem,
  onDropToBrowser,
}: Props) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<Set<string>>(new Set())
  const [filterMode, setFilterMode] = useState<FilterMode>('any')
  const [dragOver, setDragOver] = useState(false)

  // Boots and Starter are slots where a non-matching item can never be placed, so jumping
  // into fast-add for one pre-filters the browser down to it; leaving it clears that back
  // out, unless the user has since changed the filter selection themselves.
  useEffect(() => {
    const autoFilterId = activeSlotId ? SLOT_AUTO_FILTER[activeSlotId] : undefined
    if (autoFilterId) {
      setFilters(new Set([autoFilterId]))
    } else {
      setFilters((prev) => (prev.size === 1 && ALL_AUTO_FILTER_IDS.has([...prev][0]) ? new Set() : prev))
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
      (item) =>
        (!query || item.name.toLowerCase().includes(query)) &&
        isItemVisibleForRoles(item, roles) &&
        itemMatchesFilters(item, filters, ALL_FILTER_OPTIONS, filterMode),
    )
  }, [items, search, filters, filterMode, roles])

  return (
    <div
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        if (!dragOver) setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e: DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        onDropToBrowser()
      }}
      style={{
        borderRadius: 10,
        outline: dragOver ? '2px dashed var(--gold)' : undefined,
        outlineOffset: 4,
      }}
    >
      <input
        type="text"
        placeholder="Search items..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', marginBottom: 10 }}
      />
      <div style={{ marginBottom: 10 }}>
        <ItemFilterPanel
          selected={filters}
          mode={filterMode}
          onToggle={toggleFilter}
          onModeChange={setFilterMode}
          onClear={() => setFilters(new Set())}
        />
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
                note={itemNotes[item.id]}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = 'copy'
                  onDragStartItem(item.id)
                }}
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
