import type { CSSProperties } from 'react'
import { ATTRIBUTE_FILTERS, STAT_FILTERS } from '../../lib/itemAttributes'
import { StatIcon } from '../shared/StatIcon'

interface Props {
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
}

function chipStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 9px',
    borderRadius: 12,
    fontSize: 11,
    fontWeight: 600,
    border: `1px solid ${active ? 'var(--gold)' : 'var(--border-strong)'}`,
    background: active ? 'rgba(200, 170, 110, 0.18)' : 'var(--bg-panel-raised)',
    color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
    boxShadow: 'none',
    transform: 'none',
  }
}

export function ItemFilterPanel({ selected, onToggle, onClear }: Props) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Filters
        </div>
        {selected.size > 0 && (
          <button type="button" onClick={onClear} style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: 11 }}>
            Clear ({selected.size})
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {ATTRIBUTE_FILTERS.map((f) => (
          <button key={f.id} type="button" style={chipStyle(selected.has(f.id))} onClick={() => onToggle(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {STAT_FILTERS.map((f) => (
          <button key={f.id} type="button" style={chipStyle(selected.has(f.id))} onClick={() => onToggle(f.id)}>
            <StatIcon id={f.id.slice('stat:'.length)} />
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
