import { STAT_FILTERS } from '../../lib/itemAttributes'
import { StatIcon } from '../shared/StatIcon'

interface Props {
  selected: Set<string>
  onToggle: (id: string) => void
  onClear: () => void
}

// View mode's shop-style stat list: picking several narrows the build down to items with all of them.
export function StatFilterSidebar({ selected, onToggle, onClear }: Props) {
  return (
    <div className="panel" style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '2px 4px 6px' }}>
        <div style={{ color: 'var(--text-dim)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>Stats</div>
        {selected.size > 0 && (
          <button type="button" onClick={onClear} style={{ marginLeft: 'auto', padding: '1px 6px', fontSize: 11 }}>
            Clear
          </button>
        )}
      </div>
      {STAT_FILTERS.map((f) => {
        const active = selected.has(f.id)
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onToggle(f.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 6px',
              fontSize: 12,
              textAlign: 'left',
              borderRadius: 4,
              border: `1px solid ${active ? 'var(--gold)' : 'transparent'}`,
              background: active ? 'rgba(200, 170, 110, 0.18)' : 'transparent',
              color: active ? 'var(--gold-bright)' : 'var(--text-dim)',
              boxShadow: 'none',
              transform: 'none',
            }}
          >
            <StatIcon id={f.id.slice('stat:'.length)} size={16} />
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
