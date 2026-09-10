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
}

export function StatShardRow({ options, selectedIds, preferredIds, readOnly, accentColor, onSelect }: Props) {
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
          <Tooltip key={opt.id} title={opt.name}>
            <button
              type="button"
              aria-label={opt.name}
              onClick={readOnly ? undefined : (e) => onSelect?.(opt.id, e.ctrlKey || e.metaKey)}
              style={{
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
            </button>
          </Tooltip>
        )
      })}
    </div>
  )
}
