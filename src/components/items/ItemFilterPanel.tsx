import type { CSSProperties } from 'react'
import { ATTRIBUTE_FILTERS, STAT_FILTERS, type FilterMode } from '../../lib/itemAttributes'
import { StatIcon } from '../shared/StatIcon'

interface Props {
  selected: Set<string>
  mode: FilterMode
  onToggle: (id: string) => void
  onModeChange: (mode: FilterMode) => void
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

const SWITCH_HALF_WIDTH = 52

export function ItemFilterPanel({ selected, mode, onToggle, onModeChange, onClear }: Props) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
          Filters
        </div>
        <button
          type="button"
          onClick={() => onModeChange(mode === 'any' ? 'all' : 'any')}
          title={
            mode === 'any'
              ? 'Showing items matching any selected filter — click to require all of them'
              : 'Showing items matching all selected filters — click to require just one'
          }
          style={{
            position: 'relative',
            display: 'inline-flex',
            width: SWITCH_HALF_WIDTH * 2,
            borderRadius: 12,
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-panel-raised)',
            padding: 2,
            boxShadow: 'none',
            transform: 'none',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              bottom: 2,
              left: mode === 'any' ? 2 : SWITCH_HALF_WIDTH,
              width: SWITCH_HALF_WIDTH - 2,
              borderRadius: 10,
              background: 'var(--gold)',
              transition: 'left 150ms ease',
            }}
          />
          <span
            style={{
              position: 'relative',
              width: SWITCH_HALF_WIDTH,
              padding: '3px 0',
              fontSize: 11,
              fontWeight: 600,
              color: mode === 'any' ? 'var(--bg-panel)' : 'var(--text-dim)',
            }}
          >
            Any
          </span>
          <span
            style={{
              position: 'relative',
              width: SWITCH_HALF_WIDTH,
              padding: '3px 0',
              fontSize: 11,
              fontWeight: 600,
              color: mode === 'all' ? 'var(--bg-panel)' : 'var(--text-dim)',
            }}
          >
            All
          </span>
        </button>
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
