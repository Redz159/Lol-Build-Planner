import { useState } from 'react'
import type { ExampleBuild } from '../../types/build'
import type { DDragonItem } from '../../types/ddragon'
import type { BuildItems, ItemSlot } from '../../types/items'
import { MAX_SIM_ITEMS, exampleBuildFinalItems } from '../../lib/simulatorLoadout'
import { ItemIcon } from '../items/ItemIcon'

export interface ItemSource {
  slots: ItemSlot[]
  items: BuildItems
  exampleBuilds: ExampleBuild[]
}

interface Props {
  allItems: DDragonItem[]
  selected: string[]
  onChange: (itemIds: string[]) => void
  // The build's own item pool and example builds, offered as one-click picks.
  source?: ItemSource
}

export function ItemLoadoutPicker({ allItems, selected, onChange, source }: Props) {
  const [search, setSearch] = useState('')
  const byId = (id: string) => allItems.find((i) => i.id === id)
  const full = selected.length >= MAX_SIM_ITEMS
  // Clicking an item that's already picked takes it back out.
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else if (!full) onChange([...selected, id])
  }
  const query = search.trim().toLowerCase()
  const results = query.length >= 2 ? allItems.filter((i) => i.name.toLowerCase().includes(query)).slice(0, 24) : []
  const slotsWithItems = source?.slots.filter((slot) => (source.items[slot.id] ?? []).length > 0) ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: MAX_SIM_ITEMS }, (_, i) => {
          const item = selected[i] ? byId(selected[i]) : undefined
          return item ? (
            <ItemIcon key={i} item={item} size={36} title={`${item.name} (click to remove)`} onClick={() => onChange(selected.filter((id) => id !== item.id))} />
          ) : (
            <div key={i} style={{ width: 44, height: 44, border: '1px dashed var(--border-strong)', borderRadius: 8 }} />
          )
        })}
        {selected.length > 0 && (
          <button type="button" className="sim-small-button" onClick={() => onChange([])} style={{ marginLeft: 6 }}>
            Clear
          </button>
        )}
      </div>

      {source && source.exampleBuilds.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 13 }}>
          <span style={{ color: 'var(--text-dim)' }}>Example builds:</span>
          {source.exampleBuilds.map((b) => (
            <button key={b.id} type="button" className="sim-small-button" onClick={() => onChange(exampleBuildFinalItems(b, source.slots, allItems))}>
              {b.label}
            </button>
          ))}
        </div>
      )}

      {slotsWithItems.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px' }}>
          {slotsWithItems.map((slot) => (
            <div key={slot.id}>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginBottom: 4 }}>{slot.label}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {source!.items[slot.id].map((p) => {
                  const item = byId(p.itemId)
                  if (!item) return null
                  return <ItemIcon key={p.id} item={item} size={26} selected={selected.includes(item.id)} excluded={full && !selected.includes(item.id)} onClick={() => toggle(item.id)} />
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div>
        <input type="text" placeholder="Search all items..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
            {results.map((item) => (
              <ItemIcon key={item.id} item={item} size={26} selected={selected.includes(item.id)} excluded={full && !selected.includes(item.id)} onClick={() => toggle(item.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
