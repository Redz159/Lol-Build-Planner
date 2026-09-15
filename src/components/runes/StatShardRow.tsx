import type { StatShardOption } from '../../data/statShards'
import { runeIconUrl } from '../../lib/ddragon'
import { Tooltip } from '../shared/Tooltip'

interface Props {
  options: StatShardOption[]
  selectedIds: number[]
  preferredIds?: number[]
  readOnly?: boolean
  accentColor?: string
  onSelect?: (id: number, preferred: boolean) => void
  // "(x) games" overlay from an API import — undefined when there's none, or the toggle is off.
  gameCounts?: Record<number, number>
}

export function StatShardRow({ options, selectedIds, preferredIds, readOnly, accentColor, onSelect, gameCounts }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {options.map((opt) => {
        const selected = selectedIds.includes(opt.id)
        const preferred = preferredIds?.includes(opt.id) ?? false

        let border: string
        let opacity: number
        if (preferred) {
          border = '3px solid var(--preferred)'
          opacity = 1
        } else if (selected) {
          border = `2px solid ${accentColor ?? 'var(--gold)'}`
          opacity = readOnly ? 0.85 : 1
        } else {
          border = '1px solid var(--border-strong)'
          opacity = readOnly ? 0.6 : 0.85
        }

        return (
          <Tooltip
            key={opt.id}
            title={opt.name}
            extra={
              !readOnly && (
                <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 12, marginBottom: 6 }}>
                  Ctrl+click to mark as preferred
                </div>
              )
            }
          >
            <button
              type="button"
              aria-label={opt.name}
              onClick={readOnly ? undefined : (e) => onSelect?.(opt.id, e.ctrlKey || e.metaKey)}
              style={{
                position: 'relative',
                border,
                borderRadius: '50%',
                padding: 3,
                opacity,
                background: 'var(--bg-panel-raised)',
                cursor: readOnly ? 'default' : 'pointer',
                boxShadow: preferred || selected ? 'var(--shadow-sm)' : 'none',
              }}
            >
              <img
                src={runeIconUrl(opt.icon)}
                alt={opt.name}
                width={22}
                height={22}
                style={{
                  display: 'block',
                  borderRadius: '50%',
                  filter: selected ? 'none' : 'grayscale(1) brightness(1.3)',
                }}
              />
              {gameCounts?.[opt.id] !== undefined && (
                <span
                  style={{
                    position: 'absolute',
                    top: -6,
                    right: -6,
                    fontSize: 10,
                    minWidth: 16,
                    height: 16,
                    padding: '0 2px',
                    background: 'var(--accent)',
                    color: '#0a0e14',
                    fontWeight: 700,
                    borderRadius: '50%',
                    lineHeight: '16px',
                    textAlign: 'center',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {gameCounts[opt.id]}
                </span>
              )}
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
